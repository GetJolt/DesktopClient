export type UpdateStatus =
  | { state: 'unsupported' }
  | { state: 'idle'; checkedAt: number | null }
  | { state: 'checking' }
  | { state: 'downloading'; version: string; percent: number }
  | { state: 'ready'; version: string }
  | { state: 'error'; message: string };

/** The only surface the renderer gets from Electron. Keep it small: everything here is reachable from page JS. */
export interface JoltBridge {
  platform: string;
  appVersion(): Promise<string>;
  secureStore: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
  };
  deviceName(): Promise<string>;
  openExternal(url: string): Promise<void>;
  setTitleBarTheme(theme: { color: string; symbolColor: string }): void;
  /** Returns the jolt:// link the app was launched with, if any, and subscribes to later ones. */
  onDeepLink(callback: (url: string) => void): () => void;
  takePendingDeepLink(): Promise<string | null>;
  updates: {
    status(): Promise<UpdateStatus>;
    check(): Promise<void>;
    /** Quits and installs a downloaded update. */
    install(): void;
    onStatus(callback: (status: UpdateStatus) => void): () => void;
  };
}

export const IpcChannel = {
  StoreGet: 'store:get',
  StoreSet: 'store:set',
  StoreDelete: 'store:delete',
  DeviceName: 'app:device-name',
  AppVersion: 'app:version',
  OpenExternal: 'app:open-external',
  TitleBarTheme: 'window:title-bar-theme',
  DeepLink: 'app:deep-link',
  TakeDeepLink: 'app:take-deep-link',
  UpdateStatus: 'updates:status',
  UpdateCheck: 'updates:check',
  UpdateInstall: 'updates:install',
  UpdateChanged: 'updates:changed',
} as const;

export const TITLE_BAR_HEIGHT = 32;
