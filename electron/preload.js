const { contextBridge, ipcRenderer } = require("electron");

const makeShortcutListener = (channel) => (callback) => {
  const handler = () => callback();
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld("loggerAPI", {
  exportEntriesToCSV: (entries) => ipcRenderer.invoke("log:export-entries", entries),
  importTicketsFromFile: () => ipcRenderer.invoke("tickets:import-file"),
  showNotification: (options) => ipcRenderer.invoke("notification:show", options),
  secureStoreGetAll: (keys) => ipcRenderer.invoke("secure-store:get-all", keys),
  secureStoreSet: (key, value) => ipcRenderer.invoke("secure-store:set", key, value),
  secureStoreDelete: (key) => ipcRenderer.invoke("secure-store:delete", key),

  setMiniMode: (isMini) => ipcRenderer.send("window:set-mini-mode", isMini),
  minimizeWindow: () => ipcRenderer.send("window:minimize"),
  closeWindow: () => ipcRenderer.send("window:close"),

  onShortcutStart: makeShortcutListener("shortcut:start"),
  onShortcutPause: makeShortcutListener("shortcut:pause"),
  onShortcutFinish: makeShortcutListener("shortcut:finish"),
  onToggleMiniMode: makeShortcutListener("tray:toggle-mini-mode"),
  onPowerResume: makeShortcutListener("power:resume"),
  onPowerSuspend: makeShortcutListener("power:suspend"),
});
