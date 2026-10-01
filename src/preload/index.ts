import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannel, type JoltBridge, type UpdateStatus } from '../shared/bridge';

const bridge: JoltBridge = {
  platform: process.platform,
  appVersion: () => ipcRenderer.invoke(IpcChannel.AppVersion),
  secureStore: {
    get: (key) => ipcRenderer.invoke(IpcChannel.StoreGet, key),
    set: (key, value) => ipcRenderer.invoke(IpcChannel.StoreSet, key, value),
    delete: (key) => ipcRenderer.invoke(IpcChannel.StoreDelete, key),
  },
  deviceName: () => ipcRenderer.invoke(IpcChannel.DeviceName),
  openExternal: (url) => ipcRenderer.invoke(IpcChannel.OpenExternal, url),
  setTitleBarTheme: (theme) => ipcRenderer.send(IpcChannel.TitleBarTheme, theme),
  onDeepLink: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, url: string) => callback(url);
    ipcRenderer.on(IpcChannel.DeepLink, listener);
    return () => ipcRenderer.removeListener(IpcChannel.DeepLink, listener);
  },
  takePendingDeepLink: () => ipcRenderer.invoke(IpcChannel.TakeDeepLink),
  updates: {
    status: () => ipcRenderer.invoke(IpcChannel.UpdateStatus),
    check: () => ipcRenderer.invoke(IpcChannel.UpdateCheck),
    install: () => ipcRenderer.send(IpcChannel.UpdateInstall),
    onStatus: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, status: UpdateStatus) => callback(status);
      ipcRenderer.on(IpcChannel.UpdateChanged, listener);
      return () => ipcRenderer.removeListener(IpcChannel.UpdateChanged, listener);
    },
  },
};

contextBridge.exposeInMainWorld('jolt', bridge);
