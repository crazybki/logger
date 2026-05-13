const {
  app,
  BrowserWindow,
  Menu,
  Notification,
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

if (process.platform === "win32") {
  app.setAppUserModelId("com.attensi.timelogger");
}

function getIconPath() {
  return path.join(app.getAppPath(), "build", "icon.ico");
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

  tray = new Tray(getIconPath());
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
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
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
    title: String(options.title || "Time Logger"),
    body: String(options.body || ""),
    icon: getIconPath(),
    silent: Boolean(options.silent),
  });

  notification.on("click", showMainWindow);
  notification.show();

  return { ok: true };
});

ipcMain.handle("log:export-entries", async (_, entries) => {
  const result = await dialog.showSaveDialog({
    title: "Save CSV file",
    defaultPath: "time-logs.csv",
    filters: [{ name: "CSV Files", extensions: ["csv"] }],
  });

  if (result.canceled || !result.filePath) {
    return { ok: false, canceled: true };
  }

  const header = "Ticket,Seconds,Formatted Time,Created At\n";

  const rows = entries.map((entry) =>
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
  return String(value ?? "").trim();
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

  const raw = String(value ?? "").trim();
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
  const normalized = String(value ?? "").trim().replace(",", ".");
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

  const raw = String(durationValue ?? "").trim().toLowerCase();
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

  const firstRow = rows[0].map(normalizeHeader);
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
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const tickets = [];
  const entries = [];

  dataRows
    .map((row) => {
      const id = hasHeader
        ? getCell(row, headers, ["ticket", "ticket id", "id", "key"], 0)
        : String(row[0] ?? "").trim();
      const title = hasHeader
        ? getCell(row, headers, ["title", "summary", "description"], 1)
        : String(row[1] ?? "").trim();
      const favoriteValue = hasHeader
        ? getCell(row, headers, ["favorite", "favourite", "star"], 2)
        : String(row[2] ?? "").trim();
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
  const content = fs.readFileSync(filePath, "utf8");
  const rows = content
    .split(/\r?\n/)
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

    if (extension === ".txt") {
      return { ok: true, ...parseTextTickets(filePath), filePath };
    }

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

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
