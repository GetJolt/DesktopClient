// Background auto-updates. Checks shortly after launch and every few hours, downloads silently, and lets the
// renderer offer a restart; anything left over installs on the next quit.

import { app, BrowserWindow, ipcMain } from 'electron';
import electronUpdater from 'electron-updater';
import { IpcChannel, type UpdateStatus } from '../shared/bridge';

const { autoUpdater } = electronUpdater;

const FIRST_CHECK_DELAY_MS = 15_000;
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

let status: UpdateStatus = { state: 'unsupported' };

function setStatus(next: UpdateStatus) {
  status = next;
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send(IpcChannel.UpdateChanged, status);
}

async function check() {
  if (status.state === 'unsupported' || status.state === 'downloading' || status.state === 'ready') return;
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    setStatus({ state: 'error', message: error instanceof Error ? error.message : String(error) });
  }
}

export function setUpUpdates(
  isTrustedSender: (event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent) => boolean,
) {
  ipcMain.handle(IpcChannel.UpdateStatus, () => status);
  ipcMain.handle(IpcChannel.UpdateCheck, (event) => (isTrustedSender(event) ? check() : undefined));
  ipcMain.on(IpcChannel.UpdateInstall, (event) => {
    if (isTrustedSender(event) && status.state === 'ready') autoUpdater.quitAndInstall(false, true);
  });

  // Development builds and unpacked runs have nothing to update from.
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = null;

  autoUpdater.on('checking-for-update', () => setStatus({ state: 'checking' }));
  autoUpdater.on('update-not-available', () => setStatus({ state: 'idle', checkedAt: Date.now() }));
  autoUpdater.on('update-available', (info) =>
    setStatus({ state: 'downloading', version: info.version, percent: 0 }),
  );
  autoUpdater.on('download-progress', (progress) => {
    if (status.state === 'downloading') setStatus({ ...status, percent: Math.round(progress.percent) });
  });
  autoUpdater.on('update-downloaded', (info) => setStatus({ state: 'ready', version: info.version }));
  autoUpdater.on('error', (error) => setStatus({ state: 'error', message: error.message }));

  setStatus({ state: 'idle', checkedAt: null });
  setTimeout(() => void check(), FIRST_CHECK_DELAY_MS);
  setInterval(() => void check(), CHECK_INTERVAL_MS);
}
