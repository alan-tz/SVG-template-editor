"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { loadGoogleApis } from "@/src/lib/google/loadGoogleApis";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

export type GooglePickerSelection = {
  accessToken: string;
  fileId: string;
  name: string;
  mimeType: string;
};

type TokenClient = {
  callback: (response: { access_token?: string; error?: string }) => void;
  requestAccessToken: (options?: { prompt?: string }) => void;
};

type PickerDocument = {
  id?: string;
  name?: string;
  mimeType?: string;
};

function getGoogleConfig() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;

  if (!clientId || !apiKey || !appId) {
    throw new Error(
      "Google Drive Picker is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID, NEXT_PUBLIC_GOOGLE_API_KEY, and NEXT_PUBLIC_GOOGLE_APP_ID.",
    );
  }

  return { clientId, apiKey, appId };
}

export function useGooglePicker() {
  const [isBusy, setIsBusy] = useState(false);
  const tokenClientRef = useRef<TokenClient | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  const ensurePickerApiLoaded = useCallback(async () => {
    await loadGoogleApis();

    await new Promise<void>((resolve, reject) => {
      window.gapi.load("picker", {
        callback: () => resolve(),
        onerror: () => reject(new Error("Google Picker failed to load.")),
        timeout: 10000,
        ontimeout: () => reject(new Error("Google Picker load timed out.")),
      });
    });
  }, []);

  const getAccessToken = useCallback(async () => {
    const { clientId } = getGoogleConfig();

    await loadGoogleApis();

    if (!tokenClientRef.current) {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_SCOPE,
        callback: () => {
          // callback is assigned per request below.
        },
      });
    }

    return new Promise<string>((resolve, reject) => {
      if (!tokenClientRef.current) {
        reject(new Error("Google token client failed to initialize."));
        return;
      }

      tokenClientRef.current.callback = (response) => {
        if (response.error) {
          reject(new Error(`Google authorization failed: ${response.error}`));
          return;
        }

        if (!response.access_token) {
          reject(new Error("Google authorization did not return an access token."));
          return;
        }

        accessTokenRef.current = response.access_token;
        resolve(response.access_token);
      };

      try {
        tokenClientRef.current.requestAccessToken({
          prompt: accessTokenRef.current ? "" : "consent",
        });
      } catch {
        reject(new Error("Google sign-in popup was blocked. Allow popups and try again."));
      }
    });
  }, []);

  const chooseFile = useCallback(async (): Promise<GooglePickerSelection | null> => {
    const { apiKey, appId } = getGoogleConfig();
    setIsBusy(true);

    try {
      await ensurePickerApiLoaded();
      const accessToken = await getAccessToken();

      return await new Promise<GooglePickerSelection | null>((resolve) => {
        const imageView = new window.google.picker.DocsView(
          window.google.picker.ViewId.DOCS_IMAGES,
        )
          .setIncludeFolders(false)
          .setSelectFolderEnabled(false)
          .setMode(window.google.picker.DocsViewMode.GRID);

        const svgView = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
          .setMimeTypes("image/svg+xml")
          .setIncludeFolders(false)
          .setSelectFolderEnabled(false)
          .setMode(window.google.picker.DocsViewMode.GRID);

        const picker = new window.google.picker.PickerBuilder()
          .setDeveloperKey(apiKey)
          .setAppId(appId)
          .setOAuthToken(accessToken)
          .addView(imageView)
          .addView(svgView)
          .setTitle("Choose from Google Drive")
          .setCallback((data) => {
            const action = data[window.google.picker.Response.ACTION];

            if (action === window.google.picker.Action.CANCEL) {
              resolve(null);
              return;
            }

            if (action !== window.google.picker.Action.PICKED) {
              return;
            }

            const docsRaw = data[window.google.picker.Response.DOCUMENTS];
            const docs = Array.isArray(docsRaw) ? (docsRaw as PickerDocument[]) : [];
            const doc = docs[0];

            if (!doc?.id || !doc.name || !doc.mimeType) {
              resolve(null);
              return;
            }

            resolve({
              accessToken,
              fileId: doc.id,
              name: doc.name,
              mimeType: doc.mimeType,
            });
          })
          .build();

        picker.setVisible(true);
      });
    } finally {
      setIsBusy(false);
    }
  }, [ensurePickerApiLoaded, getAccessToken]);

  return useMemo(
    () => ({
      chooseFile,
      isBusy,
      driveScope: DRIVE_SCOPE,
    }),
    [chooseFile, isBusy],
  );
}
