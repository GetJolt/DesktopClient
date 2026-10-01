import { hostname } from 'node:os';
import { join } from 'node:path';
import { app, BrowserWindow, ipcMain, nativeTheme, session, shell } from 'electron';
import { IpcChannel, TITLE_BAR_HEIGHT } from '../shared/bridge';
import { SecureStore } from './secure-store';
import { setUpUpdates } from './updater';

const PROTOCOL = 'jolt';
const isDev = !app.isPackaged && Boolean(process.env.ELECTRON_RENDERER_URL);

let mainWindow: BrowserWindow | null = null;
let pendingDeepLink: string | null = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // In development Electron runs as `electron .`, so Windows needs the script path to relaunch us.
  if (process.defaultApp && process.argv[1]) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [join(process.argv[1])]);
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }
  pendingDeepLink = findDeepLink(process.argv);

  app.on('second-instance', (_event, argv) => {
    const link = findDeepLink(argv);
    if (link) deliverDeepLink(link);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on('open-url', (event, url) => {
    event.preventDefault();
    deliverDeepLink(url);
  });

  void app.whenReady().then(() => {
    registerIpc();
    hardenSessions();
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

function findDeepLink(argv: string[]): string | null {
  return argv.find((arg) => arg.startsWith(`${PROTOCOL}://`)) ?? null;
}

function deliverDeepLink(url: string) {
  if (mainWindow && !mainWindow.webContents.isLoading()) {
    mainWindow.webContents.send(IpcChannel.DeepLink, url);
  } else {
    pendingDeepLink = url;
  }
}

function isSafeExternalUrl(url: string): boolean {
  try {
    return ['https:', 'http:', 'mailto:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

function createWindow() {
  const dark = nativeTheme.shouldUseDarkColors;
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 940,
    minHeight: 560,
    show: false,
    title: 'Jolt',
    backgroundColor: dark ? '#111214' : '#f1f2f5',
    titleBarStyle: 'hidden',
    titleBarOverlay:
      process.platform === 'darwin'
        ? undefined
        : {
            color: dark ? '#0d0e10' : '#e4e5ea',
            symbolColor: dark ? '#b4b6bf' : '#43464f',
            height: TITLE_BAR_HEIGHT,
          },
    trafficLightPosition: { x: 12, y: 9 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => (mainWindow = null));

  const contents = mainWindow.webContents;
  contents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  contents.on('will-navigate', (event, url) => {
    if (isDev && url.startsWith(process.env.ELECTRON_RENDERER_URL!)) return;
    event.preventDefault();
    if (isSafeExternalUrl(url)) void shell.openExternal(url);
  });
  contents.on('will-attach-webview', (event) => event.preventDefault());

  if (isDev) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL!);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

function hardenSessions() {
  const allowed = new Set(['notifications', 'clipboard-sanitized-write', 'fullscreen']);
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) =>
    callback(allowed.has(permission)),
  );
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => allowed.has(permission));
}

function registerIpc() {
  const store = new SecureStore();
  const fromMainFrame = (event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent) =>
    event.senderFrame !== null && event.senderFrame === mainWindow?.webContents.mainFrame;

  ipcMain.handle(IpcChannel.StoreGet, (event, key: string) => (fromMainFrame(event) ? store.get(key) : null));
  ipcMain.handle(IpcChannel.StoreSet, (event, key: string, value: string) => {
    if (fromMainFrame(event)) store.set(key, value);
  });
  ipcMain.handle(IpcChannel.StoreDelete, (event, key: string) => {
    if (fromMainFrame(event)) store.delete(key);
  });
  ipcMain.handle(IpcChannel.DeviceName, () => `Jolt Desktop on ${hostname()}`);
  ipcMain.handle(IpcChannel.AppVersion, () => app.getVersion());
  ipcMain.handle(IpcChannel.OpenExternal, async (_event, url: string) => {
    if (isSafeExternalUrl(url)) await shell.openExternal(url);
  });
  ipcMain.handle(IpcChannel.TakeDeepLink, () => {
    const link = pendingDeepLink;
    pendingDeepLink = null;
    return link;
  });
  setUpUpdates(fromMainFrame);

  ipcMain.on(IpcChannel.TitleBarTheme, (event, theme: { color: string; symbolColor: string }) => {
    if (!fromMainFrame(event) || process.platform === 'darwin') return;
    const isColor = (v: unknown) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
    if (isColor(theme?.color) && isColor(theme?.symbolColor)) {
      mainWindow?.setTitleBarOverlay({
        color: theme.color,
        symbolColor: theme.symbolColor,
        height: TITLE_BAR_HEIGHT,
      });
    }
  });
}
