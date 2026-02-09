const GAPI_SCRIPT_ID = "google-api-script";
const GSI_SCRIPT_ID = "google-gsi-script";

let loaderPromise: Promise<void> | null = null;

function injectScript(id: string, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;

    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load script: ${src}`)),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };

    script.onerror = () => {
      reject(new Error(`Failed to load script: ${src}`));
    };

    document.head.appendChild(script);
  });
}

export async function loadGoogleApis(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Google APIs can only be loaded in the browser.");
  }

  if (loaderPromise) {
    return loaderPromise;
  }

  loaderPromise = (async () => {
    await Promise.all([
      injectScript(GAPI_SCRIPT_ID, "https://apis.google.com/js/api.js"),
      injectScript(GSI_SCRIPT_ID, "https://accounts.google.com/gsi/client"),
    ]);

    if (!window.gapi) {
      throw new Error("Google API client did not initialize.");
    }

    if (!window.google?.accounts?.oauth2) {
      throw new Error("Google Identity Services did not initialize.");
    }
  })();

  try {
    await loaderPromise;
  } catch (error) {
    loaderPromise = null;
    throw error;
  }
}
