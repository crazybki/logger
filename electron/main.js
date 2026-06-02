const {
  app,
  BrowserWindow,
  Menu,
  Notification,
  safeStorage,
  Tray,
  ipcMain,
  globalShortcut,
  dialog,
  powerMonitor,
} = require("electron");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");

let mainWindow;
let tray;
let isQuitting = false;
let secureStoreWriteQueue = Promise.resolve();

const NORMAL_SIZE = { width: 400, height: 700 };
const MINI_SIZE = { width: 420, height: 305 };
const MAX_EXPORT_ENTRIES = 20000;
const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ROWS = 5000;
const MAX_CELL_LENGTH = 300;
const MAX_NOTIFICATION_LENGTH = 160;
const MAX_JIRA_SYNC_ENTRIES = 100;
const MAX_JIRA_PROJECTS = 100;
const MAX_JIRA_FETCH_TICKETS = 100;
const SECURE_STORE_KEYS = new Set([
  "timeEntries",
  "jiraTickets",
  "todoTasks",
  "activeEntryId",
  "countdownResetOffset",
  "countdownResetDate",
]);
const JIRA_SECURE_STORE_KEYS = new Set([
  "jiraBaseUrl",
  "jiraEmail",
  "jiraApiToken",
]);

if (process.platform === "win32") {
  app.setAppUserModelId("com.attensi.timelogger");
}

function getIconPath() {
  const candidates = [
    path.join(__dirname, "..", "build", "icon.ico"),
    path.join(app.getAppPath(), "build", "icon.ico"),
    path.join(process.resourcesPath || "", "build", "icon.ico"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

function showMainWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function sendRendererAction(channel) {
  showMainWindow();
  mainWindow?.webContents.send(channel);
}

function createTray() {
  if (tray) return;

  try {
    tray = new Tray(getIconPath());
  } catch (error) {
    console.error("Could not create tray icon:", error);
    return;
  }

  tray.setToolTip("Time Logger");
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: "Show Time Logger",
      click: showMainWindow,
    },
    { type: "separator" },
    {
      label: "Start current ticket",
      click: () => sendRendererAction("shortcut:start"),
    },
    {
      label: "Pause",
      click: () => sendRendererAction("shortcut:pause"),
    },
    {
      label: "Finish current ticket",
      click: () => sendRendererAction("shortcut:finish"),
    },
    {
      label: "Toggle mini mode",
      click: () => sendRendererAction("tray:toggle-mini-mode"),
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]));

  tray.on("click", showMainWindow);
  tray.on("double-click", showMainWindow);
}

function csvEscape(value) {
  const text = String(value ?? "");
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function truncateText(value, maxLength = MAX_CELL_LENGTH) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeExportEntry(entry) {
  if (!entry || typeof entry !== "object") return null;

  const seconds = Number(entry.seconds);
  if (!Number.isFinite(seconds) || seconds < 0) return null;

  return {
    ticketName: truncateText(entry.ticketName),
    seconds: Math.round(seconds),
    formatted: truncateText(entry.formatted, 80),
    createdAt: truncateText(entry.createdAt, 80),
  };
}

function ensureImportFileAllowed(filePath) {
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    throw new Error("Selected path is not a file");
  }

  if (stat.size > MAX_IMPORT_FILE_BYTES) {
    throw new Error("Import file is too large");
  }
}

function getSecureStorePath() {
  return path.join(app.getPath("userData"), "secure-store.json");
}

async function readSecureStore() {
  try {
    const content = await fs.promises.readFile(getSecureStorePath(), "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") return {};
    if (error instanceof SyntaxError) {
      const corruptPath = `${getSecureStorePath()}.corrupt-${Date.now()}`;
      await fs.promises.rename(getSecureStorePath(), corruptPath);
      console.error("Secure store JSON was invalid and has been backed up:", corruptPath);
      return {};
    }
    throw error;
  }
}

async function writeSecureStore(store) {
  secureStoreWriteQueue = secureStoreWriteQueue.catch(() => {}).then(async () => {
    const storePath = getSecureStorePath();
    const temporaryPath = `${storePath}.tmp`;

    await fs.promises.mkdir(path.dirname(storePath), { recursive: true });
    await fs.promises.writeFile(temporaryPath, JSON.stringify(store, null, 2), "utf8");
    await fs.promises.rename(temporaryPath, storePath);
  });

  return secureStoreWriteQueue;
}

function assertSecureStoreAvailable() {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("OS encryption is not available");
  }
}

function assertSecureStoreKey(key) {
  if (!SECURE_STORE_KEYS.has(key)) {
    throw new Error("Secure store key is not allowed");
  }
}

function assertJiraSecureStoreKey(key) {
  if (!JIRA_SECURE_STORE_KEYS.has(key)) {
    throw new Error("Jira secure store key is not allowed");
  }
}

function encryptValue(value) {
  assertSecureStoreAvailable();
  return safeStorage.encryptString(JSON.stringify(value)).toString("base64");
}

function decryptValue(encryptedValue) {
  assertSecureStoreAvailable();
  return JSON.parse(safeStorage.decryptString(Buffer.from(encryptedValue, "base64")));
}

async function getJiraSecureValues() {
  assertSecureStoreAvailable();

  const store = await readSecureStore();
  const values = {};

  JIRA_SECURE_STORE_KEYS.forEach((key) => {
    if (store[key]) {
      values[key] = decryptValue(store[key]);
    }
  });

  return values;
}

function sanitizeJiraBaseUrl(value) {
  const trimmedValue = truncateText(value, 300).replace(/\/+$/, "");
  if (!trimmedValue) return "";

  const parsedUrl = new URL(trimmedValue);
  if (parsedUrl.protocol !== "https:") {
    throw new Error("Jira base URL must use HTTPS");
  }

  return parsedUrl.origin;
}

function sanitizeJiraEmail(value) {
  const email = truncateText(value, 300);
  if (!email) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Jira email is invalid");
  }

  return email;
}

function sanitizeJiraApiToken(value) {
  return truncateText(value, 1000);
}

function getJiraCredentialsStatus(values) {
  return {
    jiraBaseUrl: values.jiraBaseUrl || "",
    jiraEmail: values.jiraEmail || "",
    hasJiraApiToken: Boolean(values.jiraApiToken),
  };
}

function getJiraAuthHeader(email, apiToken) {
  return `Basic ${Buffer.from(`${email}:${apiToken}`, "utf8").toString("base64")}`;
}

async function getJiraConnectionDetails() {
  const values = await getJiraSecureValues();
  const jiraBaseUrl = sanitizeJiraBaseUrl(values.jiraBaseUrl);
  const jiraEmail = sanitizeJiraEmail(values.jiraEmail);
  const jiraApiToken = sanitizeJiraApiToken(values.jiraApiToken);

  if (!jiraBaseUrl || !jiraEmail || !jiraApiToken) {
    throw new Error("Jira credentials are incomplete");
  }

  return {
    jiraBaseUrl,
    authHeader: getJiraAuthHeader(jiraEmail, jiraApiToken),
  };
}

function normalizeJiraUserInfo(user = {}) {
  return {
    accountId: truncateText(user.accountId, 120),
    displayName: truncateText(user.displayName, 160),
    emailAddress: truncateText(user.emailAddress, 300),
    active: Boolean(user.active),
  };
}

function padDatePart(value, size = 2) {
  return String(value).padStart(size, "0");
}

function getTimezoneOffsetText(date) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  return `${sign}${padDatePart(hours)}${padDatePart(minutes)}`;
}

function formatJiraStarted(value) {
  const rawValue = truncateText(value, 80);
  let date;

  const dateOnlyMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const now = new Date();
    const selectedYear = Number(dateOnlyMatch[1]);
    const selectedMonth = Number(dateOnlyMatch[2]) - 1;
    const selectedDay = Number(dateOnlyMatch[3]);
    const isToday =
      selectedYear === now.getFullYear() &&
      selectedMonth === now.getMonth() &&
      selectedDay === now.getDate();

    date = new Date(
      selectedYear,
      selectedMonth,
      selectedDay,
      isToday ? now.getHours() : 9,
      isToday ? now.getMinutes() : 0,
      isToday ? now.getSeconds() : 0,
      isToday ? now.getMilliseconds() : 0
    );
  } else {
    date = rawValue ? new Date(rawValue) : new Date();
  }

  if (Number.isNaN(date.getTime())) {
    date = new Date();
  }

  return [
    padDatePart(date.getFullYear(), 4),
    "-",
    padDatePart(date.getMonth() + 1),
    "-",
    padDatePart(date.getDate()),
    "T",
    padDatePart(date.getHours()),
    ":",
    padDatePart(date.getMinutes()),
    ":",
    padDatePart(date.getSeconds()),
    ".",
    padDatePart(date.getMilliseconds(), 3),
    getTimezoneOffsetText(date),
  ].join("");
}

function createJiraCommentDocument(text) {
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: truncateText(text, 300),
          },
        ],
      },
    ],
  };
}

function getJiraIssueDetails(entry) {
  const explicitIssueKey = truncateText(entry.jiraIssueKey, 80);
  const ticketName = truncateText(entry.ticketName, 160);
  const ticketTitle = truncateText(entry.jiraTicketTitle, 220);
  const combinedMatch = ticketName.match(/^([A-Z][A-Z0-9]+-\d+)(?:\s+-\s+(.+))?$/i);
  const issueKey = explicitIssueKey || (combinedMatch ? combinedMatch[1].toUpperCase() : ticketName);
  const title = ticketTitle || (combinedMatch?.[2] ? truncateText(combinedMatch[2], 220) : "");
  const displayName = title ? `${issueKey} - ${title}` : issueKey;

  return {
    issueKey,
    title,
    displayName,
  };
}

function isJiraIssueKey(value) {
  return /^[A-Z][A-Z0-9]+-\d+$/i.test(String(value ?? "").trim());
}

function escapeJiraJqlText(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function sanitizeJiraProjectKeys(projectKeys) {
  if (!Array.isArray(projectKeys)) return [];

  return [...new Set(projectKeys
    .map((key) => truncateText(key, 40).toUpperCase())
    .filter((key) => /^[A-Z][A-Z0-9_]*$/.test(key)))]
    .slice(0, 20);
}

function normalizeJiraProject(project = {}) {
  const key = truncateText(project.key, 40).toUpperCase();
  if (!key) return null;

  return {
    id: truncateText(project.id, 80),
    key,
    name: truncateText(project.name, 180),
    projectTypeKey: truncateText(project.projectTypeKey, 80),
  };
}

function normalizeJiraTicket(issue = {}) {
  const id = truncateText(issue.key, 80).toUpperCase();
  if (!id) return null;

  return {
    id,
    title: truncateText(issue.fields?.summary, 220),
    favorite: false,
  };
}

function buildJiraTicketJql(projectKeys, query) {
  const clauses = [];
  const safeProjectKeys = sanitizeJiraProjectKeys(projectKeys);
  const safeQuery = truncateText(query, 120);

  if (safeProjectKeys.length === 1) {
    clauses.push(`project = ${safeProjectKeys[0]}`);
  } else if (safeProjectKeys.length > 1) {
    clauses.push(`project in (${safeProjectKeys.join(", ")})`);
  }

  if (safeQuery) {
    clauses.push(`summary ~ "${escapeJiraJqlText(safeQuery)}"`);
  }

  return `${clauses.length ? `${clauses.join(" AND ")} ` : ""}ORDER BY updated DESC`;
}

async function resolveJiraIssueDetails(jiraBaseUrl, authHeader, entry) {
  if (isJiraIssueKey(entry.issueKey)) return entry;

  const summary = truncateText(entry.title || entry.issueKey, 220);
  if (!summary) return entry;

  const response = await fetch(`${jiraBaseUrl}/rest/api/3/search/jql`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: ["summary"],
      jql: `summary ~ "${escapeJiraJqlText(summary)}"`,
      maxResults: 5,
    }),
  });

  if (!response.ok) {
    return {
      ...entry,
      resolveError: await getJiraResponseError(response),
    };
  }

  const body = await response.json();
  const issues = Array.isArray(body.issues) ? body.issues : [];
  const exactMatch = issues.find((issue) =>
    String(issue.fields?.summary ?? "").trim().toLowerCase() === summary.toLowerCase()
  );
  const issue = exactMatch || (issues.length === 1 ? issues[0] : null);

  if (!issue?.key) {
    return {
      ...entry,
      resolveError: issues.length
        ? `Found ${issues.length} Jira issues matching "${summary}". Use the issue key, for example ${issues[0].key}.`
        : `Could not find a Jira issue with summary "${summary}".`,
    };
  }

  const title = truncateText(issue.fields?.summary || summary, 220);

  return {
    ...entry,
    issueKey: truncateText(issue.key, 80),
    title,
    displayName: `${issue.key} - ${title}`,
  };
}

function normalizeJiraWorklogEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return { valid: false, error: "Invalid entry" };
  }

  const { issueKey, title, displayName } = getJiraIssueDetails(entry);
  if (!issueKey) {
    return { valid: false, id: entry.id ?? null, error: "Entry has no Jira issue key" };
  }

  const timeSpentSeconds = Math.round(Number(entry.seconds));
  if (!Number.isFinite(timeSpentSeconds) || timeSpentSeconds <= 0) {
    return { valid: false, id: entry.id ?? null, issueKey, error: "Entry has no logged time" };
  }

  if (entry.deletedAt) {
    return { valid: false, id: entry.id ?? null, issueKey, error: "Entry is deleted" };
  }

  return {
    valid: true,
    id: entry.id ?? null,
    issueKey,
    title,
    displayName,
    started: formatJiraStarted(entry.createdAt),
    timeSpentSeconds,
  };
}

function normalizeJiraWorklogResult(entry, responseBody = {}) {
  return {
    entryId: entry.id,
    issueKey: entry.issueKey,
    displayName: entry.displayName,
    success: true,
    worklog: {
      id: truncateText(responseBody.id, 80),
      issueId: truncateText(responseBody.issueId, 80),
      self: truncateText(responseBody.self, 300),
      started: truncateText(responseBody.started, 80),
      timeSpentSeconds: Number(responseBody.timeSpentSeconds) || entry.timeSpentSeconds,
    },
  };
}

async function getJiraResponseError(response) {
  const fallback = `Jira request failed with status ${response.status}`;

  try {
    const body = await response.json();
    const messages = [];

    if (Array.isArray(body.errorMessages)) {
      messages.push(...body.errorMessages.map((message) => truncateText(message, 220)));
    }

    if (body.errors && typeof body.errors === "object") {
      Object.entries(body.errors).forEach(([field, message]) => {
        messages.push(`${truncateText(field, 80)}: ${truncateText(message, 220)}`);
      });
    }

    return messages.filter(Boolean).join("; ") || fallback;
  } catch {
    try {
      return truncateText(await response.text(), 300) || fallback;
    } catch {
      return fallback;
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: NORMAL_SIZE.width,
    height: NORMAL_SIZE.height,
    minWidth: 360,
    minHeight: 220,
    resizable: true,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    frame: false,
    icon: getIconPath(),
    backgroundColor: "#111111",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.on("close", (event) => {
    if (isQuitting) return;

    event.preventDefault();
    mainWindow.hide();
  });
}

function setMiniMode(isMini) {
  if (!mainWindow) return;

  const target = isMini ? MINI_SIZE : NORMAL_SIZE;

  mainWindow.setResizable(true);
  mainWindow.setMinimumSize(360, isMini ? 180 : 220);
  mainWindow.setSize(target.width, target.height, true);
  mainWindow.center();
}

function registerShortcuts() {
  globalShortcut.register("CommandOrControl+Alt+S", () => {
    mainWindow?.webContents.send("shortcut:start");
  });

  globalShortcut.register("CommandOrControl+Alt+P", () => {
    mainWindow?.webContents.send("shortcut:pause");
  });

  globalShortcut.register("CommandOrControl+Alt+F", () => {
    mainWindow?.webContents.send("shortcut:finish");
  });

  globalShortcut.register("CommandOrControl+Shift+I", () => {
    mainWindow?.webContents.toggleDevTools();
  });
}

ipcMain.on("window:set-mini-mode", (_, isMini) => {
  setMiniMode(Boolean(isMini));
});

ipcMain.on("window:minimize", () => {
  mainWindow?.minimize();
});

ipcMain.on("window:close", () => {
  mainWindow?.close();
});

ipcMain.handle("notification:show", (_, options = {}) => {
  if (!Notification.isSupported()) {
    return { ok: false, unsupported: true };
  }

  const notification = new Notification({
    title: truncateText(options.title || "Time Logger", MAX_NOTIFICATION_LENGTH),
    body: truncateText(options.body || "", MAX_NOTIFICATION_LENGTH),
    icon: getIconPath(),
    silent: Boolean(options.silent),
  });

  notification.on("click", showMainWindow);
  notification.show();

  return { ok: true };
});

ipcMain.handle("secure-store:get-all", async (_, keys = []) => {
  try {
    assertSecureStoreAvailable();

    const requestedKeys = Array.isArray(keys) ? keys : [];
    requestedKeys.forEach(assertSecureStoreKey);

    const store = await readSecureStore();
    const values = {};

    requestedKeys.forEach((key) => {
      if (store[key]) {
        values[key] = decryptValue(store[key]);
      }
    });

    return { ok: true, values };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("secure-store:set", async (_, key, value) => {
  try {
    assertSecureStoreKey(key);
    const store = await readSecureStore();
    store[key] = encryptValue(value);
    await writeSecureStore(store);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("secure-store:delete", async (_, key) => {
  try {
    assertSecureStoreKey(key);
    const store = await readSecureStore();
    delete store[key];
    await writeSecureStore(store);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("jira-secure-store:get", async () => {
  try {
    const values = await getJiraSecureValues();
    return { ok: true, values: getJiraCredentialsStatus(values) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("jira-secure-store:set", async (_, credentials = {}) => {
  try {
    assertSecureStoreAvailable();

    if (!credentials || typeof credentials !== "object") {
      throw new Error("Invalid Jira credentials");
    }

    const nextValues = {};

    if (Object.prototype.hasOwnProperty.call(credentials, "jiraBaseUrl")) {
      nextValues.jiraBaseUrl = sanitizeJiraBaseUrl(credentials.jiraBaseUrl);
    }

    if (Object.prototype.hasOwnProperty.call(credentials, "jiraEmail")) {
      nextValues.jiraEmail = sanitizeJiraEmail(credentials.jiraEmail);
    }

    if (Object.prototype.hasOwnProperty.call(credentials, "jiraApiToken")) {
      nextValues.jiraApiToken = sanitizeJiraApiToken(credentials.jiraApiToken);
    }

    Object.keys(nextValues).forEach(assertJiraSecureStoreKey);

    const store = await readSecureStore();

    Object.entries(nextValues).forEach(([key, value]) => {
      if (value) {
        store[key] = encryptValue(value);
      } else {
        delete store[key];
      }
    });

    await writeSecureStore(store);

    const values = await getJiraSecureValues();
    return { ok: true, values: getJiraCredentialsStatus(values) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("jira-secure-store:delete", async (_, key) => {
  try {
    assertSecureStoreAvailable();

    const keys = key ? [key] : Array.from(JIRA_SECURE_STORE_KEYS);
    keys.forEach(assertJiraSecureStoreKey);

    const store = await readSecureStore();
    keys.forEach((storeKey) => {
      delete store[storeKey];
    });

    await writeSecureStore(store);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("jira:test-connection", async () => {
  try {
    const { jiraBaseUrl, authHeader } = await getJiraConnectionDetails();

    const response = await fetch(`${jiraBaseUrl}/rest/api/3/myself`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        success: false,
        status: response.status,
        error: await getJiraResponseError(response),
      };
    }

    const user = await response.json();
    return {
      ok: true,
      success: true,
      user: normalizeJiraUserInfo(user),
    };
  } catch (error) {
    return {
      ok: false,
      success: false,
      error: error.message,
    };
  }
});

ipcMain.handle("jira:list-projects", async () => {
  try {
    const { jiraBaseUrl, authHeader } = await getJiraConnectionDetails();
    const response = await fetch(
      `${jiraBaseUrl}/rest/api/3/project/search?maxResults=${MAX_JIRA_PROJECTS}&orderBy=key`,
      {
        method: "GET",
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      return {
        ok: false,
        success: false,
        status: response.status,
        error: await getJiraResponseError(response),
        projects: [],
      };
    }

    const body = await response.json();
    const projects = (Array.isArray(body.values) ? body.values : [])
      .map(normalizeJiraProject)
      .filter(Boolean);

    return {
      ok: true,
      success: true,
      projects,
    };
  } catch (error) {
    return {
      ok: false,
      success: false,
      error: error.message,
      projects: [],
    };
  }
});

ipcMain.handle("jira:fetch-tickets", async (_, options = {}) => {
  try {
    const { jiraBaseUrl, authHeader } = await getJiraConnectionDetails();
    const projectKeys = sanitizeJiraProjectKeys(options?.projectKeys);
    const query = truncateText(options?.query, 120);
    const maxResults = Math.max(
      1,
      Math.min(MAX_JIRA_FETCH_TICKETS, Math.floor(Number(options?.maxResults) || 50))
    );
    const jql = buildJiraTicketJql(projectKeys, query);
    const issues = [];
    let nextPageToken = "";

    do {
      const response = await fetch(`${jiraBaseUrl}/rest/api/3/search/jql`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: ["summary"],
          jql,
          maxResults: Math.min(50, maxResults - issues.length),
          ...(nextPageToken ? { nextPageToken } : {}),
        }),
      });

      if (!response.ok) {
        return {
          ok: false,
          success: false,
          status: response.status,
          error: await getJiraResponseError(response),
          tickets: [],
        };
      }

      const body = await response.json();
      issues.push(...(Array.isArray(body.issues) ? body.issues : []));
      nextPageToken = body.nextPageToken || "";
    } while (nextPageToken && issues.length < maxResults);

    const tickets = issues
      .slice(0, maxResults)
      .map(normalizeJiraTicket)
      .filter(Boolean);

    return {
      ok: true,
      success: true,
      tickets,
      jql,
      query,
      projectKeys,
      maxResults,
      hasMore: Boolean(nextPageToken),
    };
  } catch (error) {
    return {
      ok: false,
      success: false,
      error: error.message,
      tickets: [],
    };
  }
});

ipcMain.handle("jira:sync-worklogs", async (_, entries = []) => {
  try {
    if (!Array.isArray(entries)) {
      throw new Error("Invalid Jira worklog entries");
    }

    const { jiraBaseUrl, authHeader } = await getJiraConnectionDetails();
    const limitedEntries = entries.slice(0, MAX_JIRA_SYNC_ENTRIES);
    const results = [];

    for (const originalEntry of limitedEntries) {
      let entry = normalizeJiraWorklogEntry(originalEntry);

      if (!entry.valid) {
        results.push({
          entryId: entry.id ?? null,
          issueKey: entry.issueKey || "",
          success: false,
          error: entry.error,
        });
        continue;
      }

      try {
        entry = await resolveJiraIssueDetails(jiraBaseUrl, authHeader, entry);

        if (entry.resolveError) {
          results.push({
            entryId: entry.id,
            issueKey: entry.issueKey,
            success: false,
            error: entry.resolveError,
          });
          continue;
        }

        const response = await fetch(
          `${jiraBaseUrl}/rest/api/3/issue/${encodeURIComponent(entry.issueKey)}/worklog?adjustEstimate=leave`,
          {
            method: "POST",
            headers: {
              Authorization: authHeader,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              comment: createJiraCommentDocument(`Logged from Time Logger: ${entry.displayName}`),
              started: entry.started,
              timeSpentSeconds: entry.timeSpentSeconds,
              properties: [
                {
                  key: "timeLoggerEntryId",
                  value: {
                    entryId: String(entry.id ?? ""),
                    issueKey: entry.issueKey,
                    title: entry.title,
                  },
                },
              ],
            }),
          }
        );

        if (!response.ok) {
          results.push({
            entryId: entry.id,
            issueKey: entry.issueKey,
            success: false,
            status: response.status,
            error: await getJiraResponseError(response),
          });
          continue;
        }

        const responseBody = await response.json();
        results.push(normalizeJiraWorklogResult(entry, responseBody));
      } catch (error) {
        results.push({
          entryId: entry.id,
          issueKey: entry.issueKey,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      ok: true,
      success: results.every((result) => result.success),
      results,
    };
  } catch (error) {
    return {
      ok: false,
      success: false,
      error: error.message,
      results: [],
    };
  }
});

ipcMain.handle("log:export-entries", async (_, entries) => {
  if (!Array.isArray(entries)) {
    return { ok: false, error: "Invalid export data" };
  }

  const exportEntries = entries
    .slice(0, MAX_EXPORT_ENTRIES)
    .map(normalizeExportEntry)
    .filter(Boolean);

  if (!exportEntries.length) {
    return { ok: false, error: "No valid entries to export" };
  }

  const result = await dialog.showSaveDialog({
    title: "Save CSV file",
    defaultPath: "time-logs.csv",
    filters: [{ name: "CSV Files", extensions: ["csv"] }],
  });

  if (result.canceled || !result.filePath) {
    return { ok: false, canceled: true };
  }

  const header = "Ticket,Seconds,Formatted Time,Created At\n";

  const rows = exportEntries.map((entry) =>
    [
      csvEscape(entry.ticketName),
      csvEscape(entry.seconds),
      csvEscape(entry.formatted),
      csvEscape(entry.createdAt),
    ].join(",")
  );

  const csvContent = header + rows.join("\n") + "\n";

  try {
    await fs.promises.writeFile(result.filePath, csvContent, "utf8");
    return { ok: true, filePath: result.filePath };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

function normalizeHeader(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getCell(row, headers, names, fallbackIndex) {
  const index = headers.findIndex((header) => names.includes(header));
  const value = index >= 0 ? row[index] : row[fallbackIndex];
  return truncateText(value);
}

function getRawCell(row, headers, names, fallbackIndex) {
  const index = headers.findIndex((header) => names.includes(header));
  return index >= 0 ? row[index] : row[fallbackIndex];
}

function parseFavorite(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["yes", "y", "true", "1", "ja", "x"].includes(normalized);
}

function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeImportDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return [
        String(parsed.y).padStart(4, "0"),
        String(parsed.m).padStart(2, "0"),
        String(parsed.d).padStart(2, "0"),
      ].join("-");
    }
  }

  const raw = truncateText(value, 80);
  if (!raw) return todayDateKey();

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }

  const dottedMatch = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dottedMatch) {
    return `${dottedMatch[3]}-${dottedMatch[2].padStart(2, "0")}-${dottedMatch[1].padStart(2, "0")}`;
  }

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[1].padStart(2, "0")}-${slashMatch[2].padStart(2, "0")}`;
  }

  return raw;
}

function parseNumber(value) {
  const normalized = truncateText(value, 80).replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function parseDurationSeconds(durationValue, hoursValue, minutesValue) {
  const hours = parseNumber(hoursValue);
  const minutes = parseNumber(minutesValue);
  if (hours > 0 || minutes > 0) {
    return Math.round(hours * 3600 + minutes * 60);
  }

  if (typeof durationValue === "number" && Number.isFinite(durationValue)) {
    return Math.round(durationValue * 3600);
  }

  const raw = truncateText(durationValue, 80).toLowerCase();
  if (!raw) return 0;

  const colonMatch = raw.match(/^(\d+)(?::(\d{1,2}))(?::(\d{1,2}))?$/);
  if (colonMatch) {
    const parsedHours = Number(colonMatch[1]) || 0;
    const parsedMinutes = Number(colonMatch[2]) || 0;
    const parsedSeconds = Number(colonMatch[3]) || 0;
    return parsedHours * 3600 + parsedMinutes * 60 + parsedSeconds;
  }

  const hourMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:t|h|hr|hrs|hour|hours|timer)/);
  const minuteMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:m|min|mins|minute|minutes|minutter)/);
  const parsedHours = hourMatch ? parseNumber(hourMatch[1]) : 0;
  const parsedMinutes = minuteMatch ? parseNumber(minuteMatch[1]) : 0;

  if (parsedHours > 0 || parsedMinutes > 0) {
    return Math.round(parsedHours * 3600 + parsedMinutes * 60);
  }

  return Math.round(parseNumber(raw) * 3600);
}

function parseTicketRows(rows) {
  if (!rows.length) return [];

  const limitedRows = rows.slice(0, MAX_IMPORT_ROWS);

  const firstRow = limitedRows[0].map(normalizeHeader);
  const hasHeader = firstRow.some((header) =>
    [
      "ticket",
      "ticket id",
      "id",
      "key",
      "title",
      "summary",
      "favorite",
      "favourite",
      "date",
      "day",
      "time",
      "duration",
      "hours",
      "minutes",
    ].includes(header)
  );
  const headers = hasHeader ? firstRow : [];
  const dataRows = hasHeader ? limitedRows.slice(1) : limitedRows;

  const tickets = [];
  const entries = [];

  dataRows
    .map((row) => {
      const id = hasHeader
        ? getCell(row, headers, ["ticket", "ticket id", "id", "key"], 0)
        : truncateText(row[0]);
      const title = hasHeader
        ? getCell(row, headers, ["title", "summary", "description"], 1)
        : truncateText(row[1]);
      const favoriteValue = hasHeader
        ? getCell(row, headers, ["favorite", "favourite", "star"], 2)
        : truncateText(row[2], 80);
      const dateValue = hasHeader
        ? getRawCell(row, headers, ["date", "day", "created", "created at"], 3)
        : row[3];
      const durationValue = hasHeader
        ? getRawCell(row, headers, ["time", "duration", "logged", "logged time"], 4)
        : row[4];
      const hoursValue = hasHeader
        ? getRawCell(row, headers, ["hours", "hrs", "h", "timer"], 5)
        : row[5];
      const minutesValue = hasHeader
        ? getRawCell(row, headers, ["minutes", "mins", "min", "m", "minutter"], 6)
        : row[6];
      const seconds = parseDurationSeconds(durationValue, hoursValue, minutesValue);

      return {
        id,
        title,
        favorite: parseFavorite(favoriteValue),
        createdAt: normalizeImportDate(dateValue),
        seconds,
      };
    })
    .filter((ticket) => ticket.id)
    .forEach((ticket) => {
      tickets.push({
        id: ticket.id,
        title: ticket.title,
        favorite: ticket.favorite,
      });

      if (ticket.seconds > 0) {
        entries.push({
          ticketName: ticket.id,
          seconds: ticket.seconds,
          status: "done",
          createdAt: ticket.createdAt,
          source: "manual",
        });
      }
    });

  return { tickets, entries };
}

function parseTextTickets(filePath) {
  ensureImportFileAllowed(filePath);

  const content = fs.readFileSync(filePath, "utf8");
  const rows = content
    .split(/\r?\n/)
    .slice(0, MAX_IMPORT_ROWS)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.includes("\t")) return line.split("\t");
      if (line.includes(";")) return line.split(";");
      if (line.includes(",")) return line.split(",");
      return [line];
    });

  return parseTicketRows(rows);
}

ipcMain.handle("tickets:import-file", async () => {
  const result = await dialog.showOpenDialog({
    title: "Import tickets",
    properties: ["openFile"],
    filters: [
      { name: "Excel, CSV or Text", extensions: ["xlsx", "xls", "csv", "txt"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (result.canceled || !result.filePaths?.[0]) {
    return { ok: false, canceled: true };
  }

  try {
    const filePath = result.filePaths[0];
    const extension = path.extname(filePath).toLowerCase();
    ensureImportFileAllowed(filePath);

    if (extension === ".txt") {
      return { ok: true, ...parseTextTickets(filePath), filePath };
    }

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }).slice(0, MAX_IMPORT_ROWS);

    if (!rows.length) {
      return { ok: true, tickets: [], entries: [], filePath };
    }

    return { ok: true, ...parseTicketRows(rows), filePath };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  registerShortcuts();

  powerMonitor.on("resume", () => {
    mainWindow?.webContents.send("power:resume");
  });

  powerMonitor.on("suspend", () => {
    mainWindow?.webContents.send("power:suspend");
  });

  powerMonitor.on("unlock-screen", () => {
    mainWindow?.webContents.send("power:resume");
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("will-quit", () => {
  isQuitting = true;
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (isQuitting && process.platform !== "darwin") {
    app.quit();
  }
});
