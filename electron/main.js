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

const NORMAL_SIZE = { width: 400, height: 700 };
const MINI_SIZE = { width: 420, height: 305 };
const MAX_EXPORT_ENTRIES = 20000;
const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ROWS = 5000;
const MAX_CELL_LENGTH = 300;
const MAX_NOTIFICATION_LENGTH = 160;
const SECURE_STORE_KEYS = new Set([
  "timeEntries",
  "jiraTickets",
  "todoTasks",
  "activeEntryId",
  "countdownResetOffset",
  "countdownResetDate",
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
    throw error;
  }
}

async function writeSecureStore(store) {
  await fs.promises.mkdir(path.dirname(getSecureStorePath()), { recursive: true });
  await fs.promises.writeFile(getSecureStorePath(), JSON.stringify(store, null, 2), "utf8");
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

function encryptValue(value) {
  assertSecureStoreAvailable();
  return safeStorage.encryptString(JSON.stringify(value)).toString("base64");
}

function decryptValue(encryptedValue) {
  assertSecureStoreAvailable();
  return JSON.parse(safeStorage.decryptString(Buffer.from(encryptedValue, "base64")));
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
