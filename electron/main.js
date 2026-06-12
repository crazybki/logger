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
  shell,
  session,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const { autoUpdater } = require("electron-updater");

let mainWindow;
let tray;
let isQuitting = false;
let secureStoreWriteQueue = Promise.resolve();
let updateCheckPromise = null;
let isUpdateDownloaded = false;
let hasStartedUpdateCheck = false;

const NORMAL_SIZE = { width: 400, height: 700 };
const MINI_SIZE = { width: 420, height: 305 };
const MAX_EXPORT_ENTRIES = 20000;
const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ROWS = 5000;
const MAX_CELL_LENGTH = 300;
const MAX_NOTIFICATION_LENGTH = 160;
const MAX_JIRA_SYNC_ENTRIES = 100;
const MAX_TEMPO_SYNC_ENTRIES = 100;
const MAX_JIRA_PROJECTS = 100;
const MAX_JIRA_FETCH_TICKETS = 5000;
const BUG_REPORT_URL = "https://github.com/crazybki/logger/issues/new/choose";
const TEMPO_API_BASE_URL = "https://api.tempo.io/4";
const SECURE_STORE_KEYS = new Set([
  "timeEntries",
  "jiraTickets",
  "todoTasks",
  "activeEntryId",
  "countdownResetOffset",
  "countdownResetDate",
]);
const JIRA_SECURE_STORE_KEYS = new Set([
  "jiraMode",
  "jiraAuthMethod",
  "jiraBaseUrl",
  "jiraEmail",
  "jiraApiToken",
]);
const TEMPO_SECURE_STORE_KEYS = new Set([
  "tempoApiToken",
]);
const DEV_SERVER_URL = "http://localhost:5173";

autoUpdater.autoDownload = true;

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

function sanitizeUpdateInfo(info = {}) {
  return {
    version: truncateText(info.version, 80),
    releaseName: truncateText(info.releaseName, 160),
    releaseDate: truncateText(info.releaseDate, 80),
  };
}

function sanitizeDownloadProgress(progress = {}) {
  const percent = Number(progress.percent);
  const bytesPerSecond = Number(progress.bytesPerSecond);
  const transferred = Number(progress.transferred);
  const total = Number(progress.total);

  return {
    percent: Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0,
    bytesPerSecond: Number.isFinite(bytesPerSecond) ? Math.max(0, bytesPerSecond) : 0,
    transferred: Number.isFinite(transferred) ? Math.max(0, transferred) : 0,
    total: Number.isFinite(total) ? Math.max(0, total) : 0,
  };
}

function sendUpdateStatus(status, payload = {}) {
  mainWindow?.webContents.send("updates:status", {
    status,
    ...payload,
  });
}

function registerAutoUpdaterEvents() {
  autoUpdater.on("checking-for-update", () => {
    sendUpdateStatus("checking");
  });

  autoUpdater.on("update-available", (info) => {
    isUpdateDownloaded = false;
    sendUpdateStatus("update-available", {
      update: sanitizeUpdateInfo(info),
    });
  });

  autoUpdater.on("update-not-available", (info) => {
    sendUpdateStatus("update-not-available", {
      update: sanitizeUpdateInfo(info),
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    sendUpdateStatus("download-progress", {
      progress: sanitizeDownloadProgress(progress),
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    isUpdateDownloaded = true;
    sendUpdateStatus("update-downloaded", {
      update: sanitizeUpdateInfo(info),
    });
  });

  autoUpdater.on("error", (error) => {
    sendUpdateStatus("error", {
      error: truncateText(error?.message || "Update failed", MAX_NOTIFICATION_LENGTH),
    });
  });
}

async function checkForUpdates() {
  if (!app.isPackaged) {
    return {
      ok: false,
      skipped: true,
      reason: "Updates are only checked in packaged builds.",
    };
  }

  if (updateCheckPromise) {
    return updateCheckPromise;
  }

  updateCheckPromise = autoUpdater.checkForUpdates()
    .then(() => ({ ok: true }))
    .catch((error) => {
      sendUpdateStatus("error", {
        error: truncateText(error?.message || "Update failed", MAX_NOTIFICATION_LENGTH),
      });

      return {
        ok: false,
        error: truncateText(error?.message || "Update failed", MAX_NOTIFICATION_LENGTH),
      };
    })
    .finally(() => {
      updateCheckPromise = null;
    });

  return updateCheckPromise;
}

function checkForUpdatesAtStartup() {
  if (hasStartedUpdateCheck) return;

  hasStartedUpdateCheck = true;
  checkForUpdates();
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

function assertTempoSecureStoreKey(key) {
  if (!TEMPO_SECURE_STORE_KEYS.has(key)) {
    throw new Error("Tempo secure store key is not allowed");
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

async function getTempoSecureValues() {
  assertSecureStoreAvailable();

  const store = await readSecureStore();
  const values = {};

  TEMPO_SECURE_STORE_KEYS.forEach((key) => {
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

  return `${parsedUrl.origin}${parsedUrl.pathname}`.replace(/\/+$/, "");
}

function sanitizeJiraMode(value) {
  return value === "server" ? "server" : "cloud";
}

function sanitizeJiraAuthMethod(value) {
  return value === "basic" ? "basic" : "bearer";
}

function sanitizeJiraEmail(value) {
  const email = truncateText(value, 300);
  if (!email) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Jira email is invalid");
  }

  return email;
}

function sanitizeJiraUsername(value) {
  return truncateText(value, 300);
}

function sanitizeJiraApiToken(value) {
  return truncateText(value, 1000);
}

function sanitizeTempoApiToken(value) {
  return truncateText(value, 1000);
}

function getJiraCredentialsStatus(values) {
  const jiraMode = sanitizeJiraMode(values.jiraMode);

  return {
    jiraMode,
    jiraAuthMethod: jiraMode === "server" ? sanitizeJiraAuthMethod(values.jiraAuthMethod) : "bearer",
    jiraBaseUrl: values.jiraBaseUrl || "",
    jiraEmail: values.jiraEmail || "",
    hasJiraApiToken: Boolean(values.jiraApiToken),
  };
}

function getTempoCredentialsStatus(values) {
  return {
    hasTempoApiToken: Boolean(values.tempoApiToken),
  };
}

function getJiraAuthHeader(email, apiToken) {
  return `Basic ${Buffer.from(`${email}:${apiToken}`, "utf8").toString("base64")}`;
}

function getJiraServerAuthHeader(authMethod, username, secret) {
  if (authMethod === "basic") {
    return getJiraAuthHeader(username, secret);
  }

  return `Bearer ${secret}`;
}

function getTempoAuthHeader(apiToken) {
  return `Bearer ${apiToken}`;
}

async function getJiraConnectionDetails() {
  const values = await getJiraSecureValues();
  const jiraMode = sanitizeJiraMode(values.jiraMode);
  const jiraAuthMethod = jiraMode === "server" ? sanitizeJiraAuthMethod(values.jiraAuthMethod) : "bearer";
  const jiraBaseUrl = sanitizeJiraBaseUrl(values.jiraBaseUrl);
  const jiraEmail = jiraMode === "cloud" ? sanitizeJiraEmail(values.jiraEmail) : sanitizeJiraUsername(values.jiraEmail);
  const jiraApiToken = sanitizeJiraApiToken(values.jiraApiToken);
  const requiresUser = jiraMode === "cloud" || jiraAuthMethod === "basic";

  if (!jiraBaseUrl || (requiresUser && !jiraEmail) || !jiraApiToken) {
    throw new Error("Jira credentials are incomplete");
  }

  return {
    jiraMode,
    jiraAuthMethod,
    jiraBaseUrl,
    authHeader: jiraMode === "server"
      ? getJiraServerAuthHeader(jiraAuthMethod, jiraEmail, jiraApiToken)
      : getJiraAuthHeader(jiraEmail, jiraApiToken),
  };
}

async function getTempoConnectionDetails() {
  const values = await getTempoSecureValues();
  const tempoApiToken = sanitizeTempoApiToken(values.tempoApiToken);

  if (!tempoApiToken) {
    throw new Error("Tempo credentials are incomplete");
  }

  return {
    tempoApiBaseUrl: TEMPO_API_BASE_URL,
    authHeader: getTempoAuthHeader(tempoApiToken),
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

function formatTempoDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;

  return [
    padDatePart(safeDate.getFullYear(), 4),
    "-",
    padDatePart(safeDate.getMonth() + 1),
    "-",
    padDatePart(safeDate.getDate()),
  ].join("");
}

function formatTempoTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;

  return [
    padDatePart(safeDate.getHours()),
    ":",
    padDatePart(safeDate.getMinutes()),
    ":",
    padDatePart(safeDate.getSeconds()),
  ].join("");
}

function getTempoStartDetails(value, fallbackDateKey = "") {
  const rawValue = truncateText(value || fallbackDateKey, 80);
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
      0
    );
  } else {
    date = rawValue ? new Date(rawValue) : new Date();
  }

  if (Number.isNaN(date.getTime())) {
    date = new Date();
  }

  return {
    startDate: formatTempoDate(date),
    startTime: formatTempoTime(date),
  };
}

function getJiraIssueDetails(entry) {
  const explicitIssueKey = truncateText(entry.jiraIssueKey, 80) || truncateText(entry.issueKey, 80);
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
    issueId: truncateText(issue.id, 80),
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

  if (safeQuery && isJiraIssueKey(safeQuery)) {
    clauses.push(`issuekey = ${safeQuery.toUpperCase()}`);
  } else if (safeQuery) {
    clauses.push(`summary ~ "${escapeJiraJqlText(safeQuery)}"`);
  }

  return `${clauses.length ? `${clauses.join(" AND ")} ` : ""}ORDER BY updated DESC`;
}

function jiraTicketMatchesTextQuery(ticket, query) {
  const safeQuery = truncateText(query, 120).toLowerCase();
  if (!safeQuery) return true;

  const id = String(ticket.id ?? "").toLowerCase();
  const title = String(ticket.title ?? "").toLowerCase();
  const combined = `${id} ${title}`;

  if (id === safeQuery) return true;
  if (combined.includes(safeQuery)) return true;

  const combinedParts = combined
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const queryParts = safeQuery
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!queryParts.length) return false;

  function partMatches(queryPart) {
    const aliases = queryPart === "support"
      ? ["support", "supp"]
      : queryPart === "supp"
        ? ["supp", "support"]
        : [queryPart];

    return aliases.some((alias) =>
      combinedParts.some((part) => part.includes(alias) || alias.includes(part))
    );
  }

  return queryParts.every(partMatches);
}

async function resolveJiraIssueDetails(jiraBaseUrl, jiraMode, authHeader, entry) {
  if (isJiraIssueKey(entry.issueKey)) return entry;

  const summary = truncateText(entry.title || entry.issueKey, 220);
  if (!summary) return entry;
  const isServer = jiraMode === "server";

  const response = await fetch(`${jiraBaseUrl}/rest/api/${isServer ? "2/search" : "3/search/jql"}`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: ["summary"],
      jql: `summary ~ "${escapeJiraJqlText(summary)}"`,
      ...(isServer ? { startAt: 0 } : {}),
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

async function getJiraCurrentUser(jiraBaseUrl, authHeader) {
  const response = await fetch(`${jiraBaseUrl}/rest/api/3/myself`, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(await getJiraResponseError(response));
  }

  return response.json();
}

async function resolveJiraIssueByKey(jiraBaseUrl, authHeader, issueKey) {
  const response = await fetch(`${jiraBaseUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=summary`, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(await getJiraResponseError(response));
  }

  return response.json();
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

function getTempoIssueDetails(entry) {
  const jiraDetails = getJiraIssueDetails(entry);
  const explicitIssueId =
    truncateText(entry.tempoIssueId, 80) ||
    truncateText(entry.jiraIssueId, 80) ||
    truncateText(entry.issueId, 80);
  const issueId = /^\d+$/.test(explicitIssueId) ? Number(explicitIssueId) : null;
  const issueKey = truncateText(entry.tempoIssueKey, 80) || jiraDetails.issueKey;
  const authorAccountId =
    truncateText(entry.tempoAuthorAccountId, 120) ||
    truncateText(entry.authorAccountId, 120) ||
    truncateText(entry.jiraAuthorAccountId, 120);

  return {
    issueId,
    issueKey,
    authorAccountId,
    title: jiraDetails.title,
    displayName: jiraDetails.displayName,
  };
}

function normalizeTempoWorklogEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return { valid: false, error: "Invalid entry" };
  }

  const { issueId, issueKey, authorAccountId, title, displayName } = getTempoIssueDetails(entry);
  if (!issueId && !issueKey) {
    return { valid: false, id: entry.id ?? null, error: "Entry has no Tempo issue id or issue key" };
  }

  const timeSpentSeconds = Math.round(Number(entry.seconds));
  if (!Number.isFinite(timeSpentSeconds) || timeSpentSeconds <= 0) {
    return {
      valid: false,
      id: entry.id ?? null,
      issueId,
      issueKey,
      authorAccountId,
      error: "Entry has no logged time",
    };
  }

  if (entry.deletedAt) {
    return {
      valid: false,
      id: entry.id ?? null,
      issueId,
      issueKey,
      authorAccountId,
      error: "Entry is deleted",
    };
  }

  if (entry.tempoWorklogId) {
    return {
      valid: false,
      id: entry.id ?? null,
      issueId,
      issueKey,
      authorAccountId,
      error: "Entry is already synced to Tempo",
    };
  }

  const { startDate, startTime } = getTempoStartDetails(entry.createdAt, entry.dateKey);

  return {
    valid: true,
    id: entry.id ?? null,
    issueId,
    issueKey,
    authorAccountId,
    title,
    displayName,
    timeSpentSeconds,
    startDate,
    startTime,
    description: truncateText(`Logged from Time Logger: ${displayName}`, 500),
  };
}

async function resolveTempoWorklogEntry(entry, getJiraDetails, getCurrentJiraUser) {
  let nextEntry = entry;

  if (!nextEntry.authorAccountId) {
    const user = await getCurrentJiraUser();
    const accountId = truncateText(user.accountId, 120);
    if (!accountId) {
      return {
        ...nextEntry,
        resolveError: "Could not resolve Jira author account id",
      };
    }

    nextEntry = {
      ...nextEntry,
      authorAccountId: accountId,
    };
  }

  if (!nextEntry.issueId) {
    if (!isJiraIssueKey(nextEntry.issueKey)) {
      return {
        ...nextEntry,
        resolveError: "Entry needs a Jira issue key so Tempo issue id can be resolved",
      };
    }

    const { jiraBaseUrl, authHeader } = await getJiraDetails();
    const issue = await resolveJiraIssueByKey(jiraBaseUrl, authHeader, nextEntry.issueKey);
    const issueId = Number(issue.id);

    if (!Number.isFinite(issueId) || issueId <= 0) {
      return {
        ...nextEntry,
        resolveError: `Could not resolve Jira issue id for ${nextEntry.issueKey}`,
      };
    }

    const title = truncateText(issue.fields?.summary || nextEntry.title, 220);

    nextEntry = {
      ...nextEntry,
      issueId,
      issueKey: truncateText(issue.key || nextEntry.issueKey, 80),
      title,
      displayName: title ? `${issue.key || nextEntry.issueKey} - ${title}` : nextEntry.displayName,
    };
  }

  return nextEntry;
}

function createTempoWorklogPayload(entry) {
  return {
    issueId: entry.issueId,
    authorAccountId: entry.authorAccountId,
    timeSpentSeconds: entry.timeSpentSeconds,
    startDate: entry.startDate,
    startTime: entry.startTime,
    description: entry.description,
  };
}

function normalizeTempoWorklogResult(entry, responseBody = {}) {
  const tempoWorklogId = truncateText(responseBody.id || responseBody.tempoWorklogId, 80);

  return {
    entryId: entry.id,
    success: true,
    tempoWorklogId,
    issueId: entry.issueId || null,
    issueKey: entry.issueKey || "",
    worklog: {
      id: tempoWorklogId,
      self: truncateText(responseBody.self, 300),
      timeSpentSeconds: Number(responseBody.timeSpentSeconds) || entry.timeSpentSeconds,
      startDate: truncateText(responseBody.startDate, 80) || entry.startDate,
      startTime: truncateText(responseBody.startTime, 80) || entry.startTime,
    },
  };
}

function normalizeTempoConnectionInfo(body = {}) {
  const result = Array.isArray(body.results) ? body.results.find(Boolean) : null;
  const author = body.author || result?.author || null;
  const account = body.account || result?.account || null;
  const info = {};

  if (body.self) {
    info.self = truncateText(body.self, 300);
  }

  if (body.metadata && typeof body.metadata === "object") {
    info.metadata = {
      count: Number(body.metadata.count) || 0,
      limit: Number(body.metadata.limit) || 0,
    };
  }

  if (author && typeof author === "object") {
    info.user = {
      accountId: truncateText(author.accountId || author.id, 120),
      displayName: truncateText(author.displayName || author.name, 160),
      self: truncateText(author.self, 300),
    };
  }

  if (account && typeof account === "object") {
    info.account = {
      id: truncateText(account.id, 80),
      key: truncateText(account.key, 120),
      name: truncateText(account.name, 180),
      self: truncateText(account.self, 300),
    };
  }

  return info;
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

async function getTempoResponseError(response) {
  const fallback = `Tempo request failed with status ${response.status}`;

  try {
    const body = await response.json();
    const messages = [];

    if (Array.isArray(body.errors)) {
      messages.push(...body.errors.map((error) => {
        if (typeof error === "string") return truncateText(error, 220);
        return truncateText(error.message || error.detail || error.title || error.code, 220);
      }));
    }

    if (Array.isArray(body.errorMessages)) {
      messages.push(...body.errorMessages.map((message) => truncateText(message, 220)));
    }

    if (body.errors && typeof body.errors === "object" && !Array.isArray(body.errors)) {
      Object.entries(body.errors).forEach(([field, message]) => {
        messages.push(`${truncateText(field, 80)}: ${truncateText(message, 220)}`);
      });
    }

    if (typeof body.message === "string") {
      messages.push(truncateText(body.message, 220));
    }

    if (typeof body.error === "string") {
      messages.push(truncateText(body.error, 220));
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

function getProductionAppUrl() {
  return pathToFileURL(path.join(__dirname, "..", "dist", "index.html")).href;
}

function isAllowedAppNavigation(targetUrl, isDev) {
  try {
    const parsedUrl = new URL(targetUrl);

    if (isDev) {
      return parsedUrl.origin === DEV_SERVER_URL;
    }

    return targetUrl === getProductionAppUrl();
  } catch {
    return false;
  }
}

function createWindow() {
  const isDev = !app.isPackaged;

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
      sandbox: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  mainWindow.webContents.on("will-navigate", (event, targetUrl) => {
    if (isAllowedAppNavigation(targetUrl, isDev)) return;

    event.preventDefault();
  });

  mainWindow.webContents.once("did-finish-load", checkForUpdatesAtStartup);

  if (isDev) {
    mainWindow.loadURL(DEV_SERVER_URL);
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

  if (!app.isPackaged) {
    globalShortcut.register("CommandOrControl+Shift+I", () => {
      mainWindow?.webContents.toggleDevTools();
    });
  }
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

ipcMain.handle("updates:check", () => checkForUpdates());

ipcMain.handle("updates:quit-and-install", () => {
  if (!isUpdateDownloaded) {
    return {
      ok: false,
      error: "No downloaded update is ready to install.",
    };
  }

  isQuitting = true;
  autoUpdater.quitAndInstall(false, true);
  return { ok: true };
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

ipcMain.handle("bug-report:open-issue-template", async () => {
  try {
    await shell.openExternal(BUG_REPORT_URL);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
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

    if (Object.prototype.hasOwnProperty.call(credentials, "jiraMode")) {
      nextValues.jiraMode = sanitizeJiraMode(credentials.jiraMode);
    }

    if (Object.prototype.hasOwnProperty.call(credentials, "jiraAuthMethod")) {
      nextValues.jiraAuthMethod = sanitizeJiraAuthMethod(credentials.jiraAuthMethod);
    }

    if (Object.prototype.hasOwnProperty.call(credentials, "jiraBaseUrl")) {
      nextValues.jiraBaseUrl = sanitizeJiraBaseUrl(credentials.jiraBaseUrl);
    }

    if (Object.prototype.hasOwnProperty.call(credentials, "jiraEmail")) {
      const jiraMode = sanitizeJiraMode(credentials.jiraMode || nextValues.jiraMode);
      nextValues.jiraEmail = jiraMode === "server"
        ? sanitizeJiraUsername(credentials.jiraEmail)
        : sanitizeJiraEmail(credentials.jiraEmail);
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

ipcMain.handle("tempo-secure-store:get", async () => {
  try {
    const values = await getTempoSecureValues();
    return { ok: true, values: getTempoCredentialsStatus(values) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("tempo-secure-store:set", async (_, credentials = {}) => {
  try {
    assertSecureStoreAvailable();

    if (!credentials || typeof credentials !== "object") {
      throw new Error("Invalid Tempo credentials");
    }

    const nextValues = {};

    if (Object.prototype.hasOwnProperty.call(credentials, "tempoApiToken")) {
      nextValues.tempoApiToken = sanitizeTempoApiToken(credentials.tempoApiToken);
    }

    Object.keys(nextValues).forEach(assertTempoSecureStoreKey);

    const store = await readSecureStore();

    Object.entries(nextValues).forEach(([key, value]) => {
      if (value) {
        store[key] = encryptValue(value);
      } else {
        delete store[key];
      }
    });

    await writeSecureStore(store);

    const values = await getTempoSecureValues();
    return { ok: true, values: getTempoCredentialsStatus(values) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("tempo-secure-store:delete", async (_, key) => {
  try {
    assertSecureStoreAvailable();

    const keys = key ? [key] : Array.from(TEMPO_SECURE_STORE_KEYS);
    keys.forEach(assertTempoSecureStoreKey);

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

ipcMain.handle("tempo:test-connection", async () => {
  try {
    const { tempoApiBaseUrl, authHeader } = await getTempoConnectionDetails();
    const today = formatTempoDate();
    const response = await fetch(`${tempoApiBaseUrl}/worklogs?from=${today}&to=${today}&limit=1`, {
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
        error: await getTempoResponseError(response),
      };
    }

    const body = await response.json();
    return {
      ok: true,
      success: true,
      info: normalizeTempoConnectionInfo(body),
    };
  } catch (error) {
    return {
      ok: false,
      success: false,
      error: error.message,
    };
  }
});

ipcMain.handle("tempo:sync-worklogs", async (_, entries = []) => {
  try {
    if (!Array.isArray(entries)) {
      throw new Error("Invalid Tempo worklog entries");
    }

    const { tempoApiBaseUrl, authHeader } = await getTempoConnectionDetails();
    const limitedEntries = entries.slice(0, MAX_TEMPO_SYNC_ENTRIES);
    const results = [];
    let jiraDetailsPromise = null;
    let currentJiraUserPromise = null;

    const getJiraDetailsForTempo = () => {
      if (!jiraDetailsPromise) {
        jiraDetailsPromise = getJiraConnectionDetails();
      }

      return jiraDetailsPromise;
    };

    const getCurrentJiraUserForTempo = async () => {
      if (!currentJiraUserPromise) {
        currentJiraUserPromise = getJiraDetailsForTempo().then(({ jiraBaseUrl, authHeader: jiraAuthHeader }) =>
          getJiraCurrentUser(jiraBaseUrl, jiraAuthHeader)
        );
      }

      return currentJiraUserPromise;
    };

    for (const originalEntry of limitedEntries) {
      let entry = normalizeTempoWorklogEntry(originalEntry);

      if (!entry.valid) {
        results.push({
          entryId: entry.id ?? null,
          success: false,
          issueId: entry.issueId || null,
          issueKey: entry.issueKey || "",
          error: entry.error,
        });
        continue;
      }

      try {
        entry = await resolveTempoWorklogEntry(
          entry,
          getJiraDetailsForTempo,
          getCurrentJiraUserForTempo
        );

        if (entry.resolveError) {
          results.push({
            entryId: entry.id,
            success: false,
            issueId: entry.issueId || null,
            issueKey: entry.issueKey || "",
            error: entry.resolveError,
          });
          continue;
        }

        const response = await fetch(`${tempoApiBaseUrl}/worklogs`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(createTempoWorklogPayload(entry)),
        });

        if (!response.ok) {
          results.push({
            entryId: entry.id,
            success: false,
            issueId: entry.issueId || null,
            issueKey: entry.issueKey || "",
            status: response.status,
            error: await getTempoResponseError(response),
          });
          continue;
        }

        const responseBody = await response.json();
        results.push(normalizeTempoWorklogResult(entry, responseBody));
      } catch (error) {
        results.push({
          entryId: entry.id,
          success: false,
          issueId: entry.issueId || null,
          issueKey: entry.issueKey || "",
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

ipcMain.handle("jira:test-connection", async () => {
  try {
    const { jiraBaseUrl, jiraMode, authHeader } = await getJiraConnectionDetails();
    const apiVersion = jiraMode === "server" ? "2" : "3";

    const response = await fetch(`${jiraBaseUrl}/rest/api/${apiVersion}/myself`, {
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
    const { jiraBaseUrl, jiraMode, authHeader } = await getJiraConnectionDetails();
    const headers = {
      Authorization: authHeader,
      Accept: "application/json",
    };
    let response;
    let usesProjectArrayResponse = false;

    if (jiraMode === "server") {
      response = await fetch(
        `${jiraBaseUrl}/rest/api/2/project/search?maxResults=${MAX_JIRA_PROJECTS}&orderBy=key`,
        {
          method: "GET",
          headers,
        }
      );

      if ([404, 405, 501].includes(response.status)) {
        response = await fetch(`${jiraBaseUrl}/rest/api/2/project`, {
          method: "GET",
          headers,
        });
        usesProjectArrayResponse = true;
      }
    } else {
      response = await fetch(
        `${jiraBaseUrl}/rest/api/3/project/search?maxResults=${MAX_JIRA_PROJECTS}&orderBy=key`,
        {
          method: "GET",
          headers,
        }
      );
    }

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
    const projectItems = usesProjectArrayResponse
      ? (Array.isArray(body) ? body : [])
      : (Array.isArray(body.values) ? body.values : []);
    const projects = projectItems
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
    const { jiraBaseUrl, jiraMode, authHeader } = await getJiraConnectionDetails();
    const projectKeys = sanitizeJiraProjectKeys(options?.projectKeys);
    const query = truncateText(options?.query, 120);
    const maxResults = Math.max(
      1,
      Math.min(MAX_JIRA_FETCH_TICKETS, Math.floor(Number(options?.maxResults) || 50))
    );
    const jql = buildJiraTicketJql(projectKeys, query);
    const issues = [];
    let hasMore = false;

    async function fetchIssuesForJql(searchJql) {
      const nextIssues = [];
      let nextHasMore;

      if (jiraMode === "server") {
        let startAt = 0;

        do {
          const pageSize = Math.min(50, maxResults - nextIssues.length);
          const response = await fetch(`${jiraBaseUrl}/rest/api/2/search`, {
            method: "POST",
            headers: {
              Authorization: authHeader,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fields: ["summary"],
              jql: searchJql,
              startAt,
              maxResults: pageSize,
            }),
          });

          if (!response.ok) {
            return {
              ok: false,
              status: response.status,
              error: await getJiraResponseError(response),
              issues: [],
              hasMore: false,
            };
          }

          const body = await response.json();
          const pageIssues = Array.isArray(body.issues) ? body.issues : [];
          nextIssues.push(...pageIssues);

          const received = startAt + pageIssues.length;
          const total = Number(body.total);
          nextHasMore = Number.isFinite(total) ? received < total : pageIssues.length === pageSize;
          startAt = received;
        } while (nextHasMore && nextIssues.length < maxResults && startAt > 0);
      } else {
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
              jql: searchJql,
              maxResults: Math.min(50, maxResults - nextIssues.length),
              ...(nextPageToken ? { nextPageToken } : {}),
            }),
          });

          if (!response.ok) {
            return {
              ok: false,
              status: response.status,
              error: await getJiraResponseError(response),
              issues: [],
              hasMore: false,
            };
          }

          const body = await response.json();
          nextIssues.push(...(Array.isArray(body.issues) ? body.issues : []));
          nextPageToken = body.nextPageToken || "";
          nextHasMore = Boolean(nextPageToken);
        } while (nextPageToken && nextIssues.length < maxResults);
      }

      return {
        ok: true,
        issues: nextIssues,
        hasMore: nextHasMore,
      };
    }

    const primaryResult = await fetchIssuesForJql(jql);
    if (!primaryResult.ok) {
      return {
        ok: false,
        success: false,
        status: primaryResult.status,
        error: primaryResult.error,
        tickets: [],
      };
    }

    issues.push(...primaryResult.issues);
    hasMore = primaryResult.hasMore;

    if (query) {
      const broadJql = buildJiraTicketJql(projectKeys, "");
      const broadResult = await fetchIssuesForJql(broadJql);

      if (!broadResult.ok) {
        return {
          ok: false,
          success: false,
          status: broadResult.status,
          error: broadResult.error,
          tickets: [],
        };
      }

      const existingIssueKeys = new Set(issues.map((issue) => String(issue.key ?? "").toUpperCase()));
      broadResult.issues.forEach((issue) => {
        const issueKey = String(issue.key ?? "").toUpperCase();
        if (!issueKey || existingIssueKeys.has(issueKey)) return;
        existingIssueKeys.add(issueKey);
        issues.push(issue);
      });
      hasMore = hasMore || broadResult.hasMore;
    }

    const tickets = issues
      .map(normalizeJiraTicket)
      .filter(Boolean)
      .filter((ticket) => jiraTicketMatchesTextQuery(ticket, query))
      .slice(0, maxResults);

    return {
      ok: true,
      success: true,
      tickets,
      jql,
      query,
      projectKeys,
      maxResults,
      hasMore,
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

    const { jiraBaseUrl, jiraMode, authHeader } = await getJiraConnectionDetails();
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
        entry = await resolveJiraIssueDetails(jiraBaseUrl, jiraMode, authHeader, entry);

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
          `${jiraBaseUrl}/rest/api/${jiraMode === "server" ? "2" : "3"}/issue/${encodeURIComponent(entry.issueKey)}/worklog?adjustEstimate=leave`,
          {
            method: "POST",
            headers: {
              Authorization: authHeader,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(
              jiraMode === "server"
                ? {
                  started: entry.started,
                  timeSpentSeconds: entry.timeSpentSeconds,
                }
                : {
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
                }
            ),
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
      { name: "CSV, TSV or Text", extensions: ["csv", "tsv", "txt"] },
    ],
  });

  if (result.canceled || !result.filePaths?.[0]) {
    return { ok: false, canceled: true };
  }

  try {
    const filePath = result.filePaths[0];
    const extension = path.extname(filePath).toLowerCase();
    ensureImportFileAllowed(filePath);

    if ([".csv", ".tsv", ".txt"].includes(extension)) {
      return { ok: true, ...parseTextTickets(filePath), filePath };
    }

    throw new Error("Unsupported import file type");
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  registerAutoUpdaterEvents();
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
