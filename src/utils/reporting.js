export const DEFAULT_DAILY_TARGET_SECONDS = 27000;

export function getDateParts(value) {
  const raw = String(value ?? "").split(",")[0].trim();

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return {
      year: isoMatch[1],
      month: isoMatch[2].padStart(2, "0"),
      day: isoMatch[3].padStart(2, "0"),
    };
  }

  const dottedMatch = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dottedMatch) {
    return {
      year: dottedMatch[3],
      month: dottedMatch[2].padStart(2, "0"),
      day: dottedMatch[1].padStart(2, "0"),
    };
  }

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const isMonthFirst = first <= 12 && second > 12;
    const month = isMonthFirst ? slashMatch[1] : slashMatch[2];
    const day = isMonthFirst ? slashMatch[2] : slashMatch[1];

    return {
      year: slashMatch[3],
      month: month.padStart(2, "0"),
      day: day.padStart(2, "0"),
    };
  }

  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    return {
      year: String(date.getFullYear()),
      month: String(date.getMonth() + 1).padStart(2, "0"),
      day: String(date.getDate()).padStart(2, "0"),
    };
  }

  return null;
}

export function getDateKey(entry) {
  if (entry?.dateKey) return entry.dateKey;
  const parts = getDateParts(entry?.createdAt);
  if (!parts) return String(entry?.createdAt ?? "");
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getDateKeyFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentWeekdayKeys(timestamp = Date.now()) {
  const today = new Date(timestamp);
  today.setHours(12, 0, 0, 0);

  const monday = new Date(today);
  const dayIndex = (today.getDay() + 6) % 7;
  monday.setDate(today.getDate() - dayIndex);

  const keys = [];
  for (let index = 0; index < 5; index += 1) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    if (date > today) break;
    keys.push(getDateKeyFromDate(date));
  }

  return keys;
}

export function getMonthDateKeys(timestamp = Date.now()) {
  const today = new Date(timestamp);
  today.setHours(12, 0, 0, 0);

  const first = new Date(today.getFullYear(), today.getMonth(), 1, 12);
  const keys = [];

  for (let date = first; date <= today; date.setDate(date.getDate() + 1)) {
    const day = date.getDay();
    if (day !== 0 && day !== 6) keys.push(getDateKeyFromDate(date));
  }

  return keys;
}

export function getWeekdayLabel(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export function formatMissingDayLabel(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatMissingDelta(seconds) {
  const sign = seconds < 0 ? "-" : "";
  const absoluteSeconds = Math.abs(seconds);
  const hours = Math.floor(absoluteSeconds / 3600);
  const minutes = Math.floor((absoluteSeconds % 3600) / 60);
  return `${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

export function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function formatTimeShort(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function formatDateShort(value) {
  const key = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : getDateKey({ createdAt: value });
  const date = new Date(`${key}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value ?? "");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function applyElapsedTime(entry, timestamp = Date.now()) {
  if (!entry || entry.status !== "running" || !entry.lastTickAt) return entry;

  const elapsedSeconds = Math.max(0, Math.floor((timestamp - entry.lastTickAt) / 1000));
  if (elapsedSeconds === 0) return entry;

  return {
    ...entry,
    seconds: entry.seconds + elapsedSeconds,
    lastTickAt: timestamp,
  };
}

export function buildReportSummary(entries, timestamp, dailyTargetSeconds, period = "week") {
  const dateKeys = period === "month" ? getMonthDateKeys(timestamp) : getCurrentWeekdayKeys(timestamp);
  const dateSet = new Set(dateKeys);
  const totalsByDate = new Map(dateKeys.map((dateKey) => [dateKey, 0]));
  const totalsByTicket = new Map();

  entries.forEach((entry) => {
    if (entry.deletedAt) return;

    const syncedEntry = applyElapsedTime(entry, timestamp);
    const dateKey = getDateKey(syncedEntry);
    if (!dateSet.has(dateKey)) return;

    const seconds = syncedEntry.seconds || 0;
    totalsByDate.set(dateKey, (totalsByDate.get(dateKey) || 0) + seconds);

    const ticketName = String(syncedEntry.ticketName || "Untitled").trim() || "Untitled";
    totalsByTicket.set(ticketName, (totalsByTicket.get(ticketName) || 0) + seconds);
  });

  const days = dateKeys.map((dateKey) => {
    const loggedSeconds = totalsByDate.get(dateKey) || 0;
    return {
      dateKey,
      loggedSeconds,
      targetSeconds: dailyTargetSeconds,
      deltaSeconds: loggedSeconds - dailyTargetSeconds,
      percent: dailyTargetSeconds ? Math.min(100, Math.round((loggedSeconds / dailyTargetSeconds) * 100)) : 0,
    };
  });

  const tickets = Array.from(totalsByTicket.entries())
    .map(([ticketName, seconds]) => ({ ticketName, seconds }))
    .sort((a, b) => b.seconds - a.seconds);

  const totalLoggedSeconds = days.reduce((sum, day) => sum + day.loggedSeconds, 0);
  const totalTargetSeconds = days.length * dailyTargetSeconds;

  return {
    days,
    tickets,
    totalLoggedSeconds,
    totalTargetSeconds,
    missingSeconds: Math.max(0, totalTargetSeconds - totalLoggedSeconds),
    overSeconds: Math.max(0, totalLoggedSeconds - totalTargetSeconds),
  };
}
