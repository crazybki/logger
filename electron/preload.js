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
  openBugReportEmail: (options) => ipcRenderer.invoke("bug-report:open-email", options),
  secureStoreGetAll: (keys) => ipcRenderer.invoke("secure-store:get-all", keys),
  secureStoreSet: (key, value) => ipcRenderer.invoke("secure-store:set", key, value),
  secureStoreDelete: (key) => ipcRenderer.invoke("secure-store:delete", key),
  jiraGetStatus: () => ipcRenderer.invoke("jira-secure-store:get"),
  jiraSaveCredentials: (credentials) => ipcRenderer.invoke("jira-secure-store:set", credentials),
  jiraClearCredentials: () => ipcRenderer.invoke("jira-secure-store:delete"),
  jiraTestConnection: () => ipcRenderer.invoke("jira:test-connection"),
  jiraSyncWorklogs: (entries) => ipcRenderer.invoke("jira:sync-worklogs", entries),
  jiraListProjects: () => ipcRenderer.invoke("jira:list-projects"),
  jiraFetchTickets: (options) => ipcRenderer.invoke("jira:fetch-tickets", options),
  tempoGetStatus: () => ipcRenderer.invoke("tempo-secure-store:get"),
  tempoSaveCredentials: (credentials) => ipcRenderer.invoke("tempo-secure-store:set", credentials),
  tempoClearCredentials: () => ipcRenderer.invoke("tempo-secure-store:delete"),
  tempoTestConnection: () => ipcRenderer.invoke("tempo:test-connection"),
  tempoSyncWorklogs: (entries) => ipcRenderer.invoke("tempo:sync-worklogs", entries),

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
