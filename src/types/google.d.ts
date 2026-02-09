type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
};

type GoogleTokenClient = {
  callback: (response: GoogleTokenResponse) => void;
  requestAccessToken: (options?: { prompt?: string }) => void;
};

type GoogleAccountsApi = {
  oauth2: {
    initTokenClient: (config: {
      client_id: string;
      scope: string;
      callback: (response: GoogleTokenResponse) => void;
      error_callback?: (error: { type?: string }) => void;
    }) => GoogleTokenClient;
  };
};

type GoogleDocsView = {
  setIncludeFolders: (value: boolean) => GoogleDocsView;
  setSelectFolderEnabled: (value: boolean) => GoogleDocsView;
  setMode: (value: string) => GoogleDocsView;
  setMimeTypes: (value: string) => GoogleDocsView;
};

type GooglePickerBuilder = {
  setDeveloperKey: (key: string) => GooglePickerBuilder;
  setAppId: (appId: string) => GooglePickerBuilder;
  setOAuthToken: (token: string) => GooglePickerBuilder;
  addView: (view: GoogleDocsView) => GooglePickerBuilder;
  setTitle: (title: string) => GooglePickerBuilder;
  setCallback: (callback: (data: Record<string, unknown>) => void) => GooglePickerBuilder;
  build: () => { setVisible: (value: boolean) => void };
};

type GooglePickerApi = {
  DocsView: new (viewId: string) => GoogleDocsView;
  DocsViewMode: { GRID: string };
  ViewId: { DOCS_IMAGES: string; DOCS: string };
  PickerBuilder: new () => GooglePickerBuilder;
  Action: { CANCEL: string; PICKED: string };
  Response: { ACTION: string; DOCUMENTS: string };
};

type GoogleGapi = {
  load: (
    library: string,
    options: {
      callback: () => void;
      onerror: () => void;
      timeout: number;
      ontimeout: () => void;
    },
  ) => void;
};

declare global {
  interface Window {
    gapi: GoogleGapi;
    google: {
      accounts: GoogleAccountsApi;
      picker: GooglePickerApi;
    };
  }
}

export {};
