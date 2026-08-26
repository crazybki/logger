import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardCheck, FilePenLine, Trash2 } from "lucide-react";
import "../../styles/logger.css";
import WindowTitleBar from "../main logger/WindowTitleBar";
import { PillMenu } from "../components/PillMenu";
import { Btn } from "../components/Buttons";
import { Icon } from "../components/Icons";
import { ReportsView } from "../components/ReportsView";
import { SettingsView } from "../components/SettingsView";
import {
  DEFAULT_DAILY_TARGET_SECONDS,
  formatMissingDayLabel,
  formatMissingDelta,
  getCurrentWeekdayKeys,
  getDateParts,
  getDateKey,
  getDateKeyFromDate,
  getWeekdayLabel,
} from "../utils/reporting";
import { ACCENT_COLORS, applyTheme } from "../utils/themes";

const SECURE_STORE_KEYS = [
  "timeEntries",
  "jiraTickets",
  "todoTasks",
  "activeEntryId",
  "countdownResetOffset",
  "countdownResetDate",
];
const DEMO_TICKET_IDS = new Set(["ABC-123", "ABC-456", "ABC-789", "ABC-321", "ABC-654"]);
const SHOW_COUNTDOWN_SECTION = false;

const UI_TEXT = {
  no: {
    reminders: "Påminnelser",
    tasks: "Tasks",
    review: "Review",
    endDay: "Avslutt dag",
    export: "Eksport",
    dueNow: "Nå",
    scheduled: "Planlagt",
    noReminders: "Ingen task-påminnelser",
    snoozedUntil: "Utsatt til",
    done: "Ferdig",
    logged: "Logget",
    remaining: "Gjenstår",
    add: "Legg til",
    closeDay: "Lukk dag",
    noActiveOrTasks: "Ingen aktiv timer eller åpne tasks",
    today: "I dag",
    thisWeek: "Denne uka",
    tasksOnly: "Kun tasks",
    allActive: "Alle aktive",
    copyJira: "Kopier Jira",
    copyHandover: "Kopier handover",
    handover: "Handover",
    preview: "Preview",
    noEntriesPreset: "Ingen entries i valgt preset",
    all: "All",
    overdue: "Overdue",
    noReminder: "Uten tid",
    back: "Tilbake",
    activeTicket: "Aktiv ticket",
    noActiveTicket: "Ingen aktiv ticket",
    running: "Kjører",
    startOrSelect: "Start eller velg ticket under",
    switchTicket: "Bytt",
    remainingToday: "Gjenstår i dag",
    addTask: "Legg til",
    newTaskPlaceholder: "Ny task...",
    startTicketPlaceholder: "Start ticket...",
    longTimer: "Lang timer",
    loggedWord: "logget",
    isThisRight: "Stemmer dette?",
    looksRight: "Stemmer",
    adjust: "Juster",
    open: "Åpne",
    hide: "Skjul",
    active: "aktive",
    noneActiveTasks: "Ingen aktive tasks",
    loggedTime: "Logget tid",
    notifications: "Varsler",
    unread: "ulest",
    allRead: "Alt lest",
    markAllRead: "Marker alle lest",
    clearAll: "Tøm alle",
    noNotifications: "Ingen varsler",
    jiraSync: "Jira Sync",
    synced: "Synket",
    pending: "venter",
    sync: "Synk",
    syncTicket: "Synk ticket",
    ticketSearchPlaceholder: "Søk eller skriv ticket (f.eks. KAN-9)",
    recentActivity: "Siste aktivitet",
    viewAll: "Vis alle",
    noTimeLoggedYet: "Ingen tid logget ennå",
    deleteDay: "Slett dag",
    confirmDeleteDay: "Flytte alle entries for denne dagen til papirkurven?",
    dayEntriesDeleted: "Dagens entries flyttet til papirkurv",
  },
  en: {
    reminders: "Reminders",
    tasks: "Tasks",
    review: "Review",
    endDay: "End day",
    export: "Export",
    dueNow: "Due now",
    scheduled: "Scheduled",
    noReminders: "No task reminders",
    snoozedUntil: "Snoozed until",
    done: "Done",
    logged: "Logged",
    remaining: "Remaining",
    add: "Add",
    closeDay: "Close day",
    noActiveOrTasks: "No active timer or open tasks",
    today: "Today",
    thisWeek: "This week",
    tasksOnly: "Tasks only",
    allActive: "All active",
    copyJira: "Copy Jira",
    copyHandover: "Copy handover",
    handover: "Handover",
    preview: "Preview",
    noEntriesPreset: "No entries in selected preset",
    all: "All",
    overdue: "Overdue",
    noReminder: "No reminder",
    back: "Back",
    activeTicket: "Active ticket",
    noActiveTicket: "No active ticket",
    running: "Running",
    startOrSelect: "Start or select a ticket below",
    switchTicket: "Switch",
    remainingToday: "Remaining today",
    addTask: "Add",
    newTaskPlaceholder: "Capture task...",
    startTicketPlaceholder: "Start ticket...",
    longTimer: "Long timer",
    loggedWord: "logged",
    isThisRight: "Is this right?",
    looksRight: "Looks right",
    adjust: "Adjust",
    open: "Open",
    hide: "Hide",
    active: "active",
    noneActiveTasks: "No active tasks",
    loggedTime: "Logged time",
    notifications: "Notifications",
    unread: "unread",
    allRead: "All read",
    markAllRead: "Mark all read",
    clearAll: "Clear all",
    noNotifications: "No notifications",
    jiraSync: "Jira Sync",
    synced: "Synced",
    pending: "pending",
    sync: "Sync",
    syncTicket: "Sync ticket",
    ticketSearchPlaceholder: "Search or type ticket (e.g. KAN-9)",
    recentActivity: "Recent Activity",
    viewAll: "View all",
    noTimeLoggedYet: "No time logged yet",
    deleteDay: "Delete day",
    confirmDeleteDay: "Move all entries for this day to trash?",
    dayEntriesDeleted: "Day entries moved to trash",
  },
};

function Logger() {
  const [search, setSearch] = useState("");
  const [selectedTicket, setSelectedTicket] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("default");
  const [notifications, setNotifications] = useState([]);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showImportGuide, setShowImportGuide] = useState(false);
  const [isMiniMode, setIsMiniMode] = useState(false);
  const [showTrashView, setShowTrashView] = useState(false);
  const [showMissingTimeView, setShowMissingTimeView] = useState(false);
  const [showReportsView, setShowReportsView] = useState(false);
  const [showSettingsView, setShowSettingsView] = useState(false);
  const [showReminderInbox, setShowReminderInbox] = useState(false);
  const [showEndDayView, setShowEndDayView] = useState(false);
  const [showExportView, setShowExportView] = useState(false);
  const [missingTimeFilter, setMissingTimeFilter] = useState("missing");
  const [trashTab, setTrashTab] = useState("tickets");
  const [trashSearch, setTrashSearch] = useState("");
  const [todoFilter, setTodoFilter] = useState("all");
  const [dismissedLongTimerId, setDismissedLongTimerId] = useState(null);
  const [exportPreset, setExportPreset] = useState(() => {
    try {
      return localStorage.getItem("exportPreset") || "today";
    } catch {
      return "today";
    }
  });
  const [secureStoreReady, setSecureStoreReady] = useState(() => {
    return !window.loggerAPI?.secureStoreGetAll;
  });
  const [themePreset, setThemePreset] = useState(() => {
    try {
      return localStorage.getItem("themePreset") || "default";
    } catch {
      return "default";
    }
  });
  const [themeAccentColor, setThemeAccentColor] = useState(() => {
    try {
      return localStorage.getItem("themeAccentColor") || "";
    } catch {
      return "";
    }
  });
  const [dailyTargetSeconds, setDailyTargetSeconds] = useState(() => {
    try {
      return Number(localStorage.getItem("dailyTargetSeconds")) || DEFAULT_DAILY_TARGET_SECONDS;
    } catch {
      return DEFAULT_DAILY_TARGET_SECONDS;
    }
  });
  const [trashRetentionDays, setTrashRetentionDays] = useState(() => {
    try {
      return Number(localStorage.getItem("trashRetentionDays")) || 7;
    } catch {
      return 7;
    }
  });
  const [appLanguage, setAppLanguage] = useState(() => {
    try {
      return localStorage.getItem("appLanguage") || "en";
    } catch {
      return "en";
    }
  });
  const [jiraStatus, setJiraStatus] = useState({
    jiraMode: "cloud",
    jiraAuthMethod: "bearer",
    jiraBaseUrl: "",
    jiraEmail: "",
    hasJiraApiToken: false,
  });
  const [jiraFeedback, setJiraFeedback] = useState("");
  const [jiraFeedbackTone, setJiraFeedbackTone] = useState("default");
  const [isJiraBusy, setIsJiraBusy] = useState(false);
  const [isJiraFetchingTickets, setIsJiraFetchingTickets] = useState(false);
  const [tempoStatus, setTempoStatus] = useState({
    hasTempoApiToken: false,
  });
  const [tempoFeedback, setTempoFeedback] = useState("");
  const [isTempoBusy, setIsTempoBusy] = useState(false);
  const [tempoSyncResults, setTempoSyncResults] = useState([]);
  const [jiraProjects, setJiraProjects] = useState([]);
  const [selectedJiraProjectKeys, setSelectedJiraProjectKeys] = useState(() => {
    try {
      const saved = localStorage.getItem("selectedJiraProjectKeys");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [jiraTicketQuery, setJiraTicketQuery] = useState("");
  const [miniTicket, setMiniTicket] = useState("");
  const [isMiniTicketFocused, setIsMiniTicketFocused] = useState(false);
  const [miniHighlightedTicketIndex, setMiniHighlightedTicketIndex] = useState(-1);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [storagePercent, setStoragePercent] = useState(100);
  const [countdownResetOffset, setCountdownResetOffset] = useState(() => {
    try {
      const saved = localStorage.getItem("countdownResetOffset");
      return saved ? JSON.parse(saved) : 0;
    } catch {
      return 0;
    }
  });
  const [countdownResetDate, setCountdownResetDate] = useState(() => {
    try {
      return localStorage.getItem("countdownResetDate") || "";
    } catch {
      return "";
    }
  });

  const [entries, setEntries] = useState(() => {
    try {
      const savedEntries = localStorage.getItem("timeEntries");
      return savedEntries ? JSON.parse(savedEntries) : [];
    } catch {
      return [];
    }
  });

  const [activeEntryId, setActiveEntryId] = useState(() => {
    try {
      const savedId = localStorage.getItem("activeEntryId");
      if (savedId) return JSON.parse(savedId);
    } catch {
      // Ignore corrupted persisted active id.
    }

    return entries.find((entry) => entry.status === "running" && !entry.deletedAt)?.id ?? null;
  });
  const [showTodoPanel, setShowTodoPanel] = useState(false);
  const [todoView, setTodoView] = useState("list");
  const [todoContextMenu, setTodoContextMenu] = useState(null);
  const [mergeSourceEntryId, setMergeSourceEntryId] = useState(null);
  const [mergedEntryId, setMergedEntryId] = useState(null);
  const [mergingEntries, setMergingEntries] = useState(null);
  const [lastMergeUndo, setLastMergeUndo] = useState(null);
  const [deletingEntryId, setDeletingEntryId] = useState(null);
  const [countdownPulse, setCountdownPulse] = useState(false);
  const [showTodoSnoozeMenu, setShowTodoSnoozeMenu] = useState(false);
  const [storageWarningDismissedUntil, setStorageWarningDismissedUntil] = useState(() => {
    try {
      return localStorage.getItem("storageWarningDismissedUntil") || "";
    } catch {
      return "";
    }
  });
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [todoTasks, setTodoTasks] = useState(() => {
    try {
      const savedTasks = localStorage.getItem("todoTasks");
      return savedTasks ? JSON.parse(savedTasks) : [];
    } catch {
      return [];
    }
  });
  const [todoDraft, setTodoDraft] = useState({
    title: "",
    priority: "normal",
    reminder: "",
    notes: "",
    sourceTicket: "",
  });

  const [manualTicket, setManualTicket] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedTicketIndex, setHighlightedTicketIndex] = useState(-1);
  const [manualHighlightedTicketIndex, setManualHighlightedTicketIndex] = useState(-1);
  const [manualEntryType, setManualEntryType] = useState("ticket");
  const [manualDate, setManualDate] = useState("");
  const [manualHours, setManualHours] = useState("");
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualFocused, setManualFocused] = useState(null);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editTicket, setEditTicket] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editHours, setEditHours] = useState("");
  const [editMinutes, setEditMinutes] = useState("");
  const [editFocused, setEditFocused] = useState(null);
  const [handoverEntryId, setHandoverEntryId] = useState(null);
  const [handoverStatus, setHandoverStatus] = useState("");
  const [handoverWorkCompleted, setHandoverWorkCompleted] = useState("");
  const [handoverNextSteps, setHandoverNextSteps] = useState("");
  const [handoverEditMode, setHandoverEditMode] = useState(false);

  const text = UI_TEXT[appLanguage] || UI_TEXT.en;

  const manualTicketRef = useRef(null);
  const mainSearchRef = useRef(null);
  const miniTicketRef = useRef(null);
  const dailyTargetNotificationRef = useRef("");
  const taskNotificationRef = useRef("");
  const notifyRef = useRef(null);

  const [jiraTickets, setJiraTickets] = useState(() => {
    try {
      const saved = localStorage.getItem("jiraTickets");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  function sanitizeNotificationText(value, maxLength = 240) {
    const text = String(value ?? "")
      .replace(/https?:\/\/[^\s)]+/gi, "[url removed]")
      .replace(/\bwww\.[^\s)]+/gi, "[url removed]")
      .replace(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g, "[email removed]")
      .replace(/\b(?:token|api key|apikey|pat|password|credential|secret)\s*[:=]\s*[^\s,;.]+/gi, "$1: [secret removed]")
      .replace(/\b[A-Za-z0-9_./+=-]{32,}\b/g, "[secret removed]")
      .replace(/\s+/g, " ")
      .trim();

    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
  }

  function normalizeExternalErrorText(value) {
    return String(value ?? "")
      .replace(/Arbeidslogg kan ikke være null\.?/gi, "Worklog cannot be null.")
      .replace(/Du må angi ([A-Za-z0-9_.-]+)\.?/gi, "You must provide $1.")
      .replace(/\bbrukt arbeidstid\b/gi, "time spent")
      .replace(/kan ikke være null\.?/gi, "cannot be null.")
      .replace(/må være større enn 0\.?/gi, "must be greater than 0.")
      .replace(/må være større enn null\.?/gi, "must be greater than zero.");
  }

  function getDisplayErrorMessage(value) {
    const message = String(value ?? "");
    if (appLanguage !== "en") return message;
    return normalizeExternalErrorText(message);
  }

  function addNotification({ type = "info", title = "", message = "", source = "app" } = {}) {
    const allowedTypes = new Set(["error", "warning", "success", "info"]);
    const allowedSources = new Set(["jira", "tempo", "app", "import", "update"]);
    const notification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: allowedTypes.has(type) ? type : "info",
      title: sanitizeNotificationText(title || message || "Notification", 80),
      message: sanitizeNotificationText(message || title || "Notification", 240),
      timestamp: new Date().toISOString(),
      source: allowedSources.has(source) ? source : "app",
      read: false,
    };

    setNotifications((prev) => [notification, ...prev].slice(0, 50));
    return notification;
  }

  function notify({ type = "info", title = "", message: notificationMessage = "", source = "app", toastMessage = "" } = {}) {
    const displayMessage = type === "error" ? getDisplayErrorMessage(notificationMessage) : notificationMessage;
    const displayToastMessage = type === "error" ? getDisplayErrorMessage(toastMessage || displayMessage || title) : toastMessage;
    const toast = sanitizeNotificationText(displayToastMessage || displayMessage || title, 160);
    setMessageTone(type === "success" || type === "error" ? type : "default");
    setMessage(toast);
    addNotification({
      type,
      title,
      message: displayMessage || toast,
      source,
    });
  }

  notifyRef.current = notify;

  function markNotificationRead(id) {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  }

  function markAllNotificationsRead() {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
  }

  function clearNotifications() {
    setNotifications([]);
    setShowNotificationCenter(false);
  }

  function formatNotificationTimestamp(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const recentNotifications = notifications.slice(0, 20);
  const unreadNotificationCount = notifications.filter((notification) => !notification.read).length;
  const unreadErrorCount = notifications.filter((notification) => !notification.read && notification.type === "error").length;
  const notificationBadgeCount = unreadErrorCount || unreadNotificationCount;

  function getTodayDate() {
    return getDateKeyFromDate(new Date());
  }

  function getDefaultTodoReminder() {
    const date = new Date();
    date.setSeconds(0, 0);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function getDaysUntilPermanentDelete(deletedAt) {
    const deletedTime = new Date(deletedAt).getTime();
    if (Number.isNaN(deletedTime)) return trashRetentionDays;

    const deleteAt = deletedTime + trashRetentionDays * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.ceil((deleteAt - nowTick) / (24 * 60 * 60 * 1000)));
  }

  function getJiraIssueKeyFromTicketName(ticketName) {
    const value = String(ticketName ?? "").trim();
    const match = value.match(/^([A-Z][A-Z0-9]+-\d+)(?:\s+-\s+.+)?$/i);
    return match ? match[1].toUpperCase() : value;
  }

  function getSafeJiraIssueKey(ticketName) {
    const value = String(ticketName ?? "").trim();
    const match = value.match(/\b([A-Z][A-Z0-9]+-\d+)\b/i);
    return match ? match[1].toUpperCase() : "";
  }

  function getWorkingTicketStatus(ticketName) {
    const issueKey = getSafeJiraIssueKey(ticketName);
    return issueKey ? `Working on issue ${issueKey}` : String(ticketName ?? "").trim();
  }

  function getTicketMergeIdentity(entry) {
    const explicitIssueKey = String(entry?.jiraIssueKey || entry?.issueKey || "").trim();
    const issueKey = getJiraIssueKeyFromTicketName(explicitIssueKey || entry?.ticketName);

    if (/^[A-Z][A-Z0-9]+-\d+$/i.test(issueKey)) {
      return `issue:${issueKey.toUpperCase()}`;
    }

    return `name:${String(entry?.ticketName ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ")}`;
  }

  function getTicketMergeKey(entry) {
    return `${getDateKey(entry)}::${getTicketMergeIdentity(entry)}`;
  }

  function canMergeTicketEntry(entry) {
    return (
      entry &&
      !entry.deletedAt &&
      entry.status === "done" &&
      entry.source !== "todo" &&
      !entry.todoTaskId &&
      !entry.jiraWorklogId &&
      !entry.tempoWorklogId &&
      String(entry.ticketName ?? "").trim()
    );
  }

  function canContinueTicketEntry(entry) {
    return (
      entry &&
      !entry.deletedAt &&
      entry.status === "paused" &&
      entry.source !== "todo" &&
      !entry.todoTaskId &&
      !entry.jiraWorklogId &&
      !entry.tempoWorklogId &&
      String(entry.ticketName ?? "").trim()
    );
  }

  function mergeHandoverText(currentValue, nextValue) {
    const current = String(currentValue || "").trim();
    const next = String(nextValue || "").trim();

    if (!current) return next;
    if (!next || current === next) return current;
    return `${current}\n${next}`;
  }

  function mergeHandoverFields(targetEntry, sourceEntry) {
    return {
      handoverStatus: mergeHandoverText(targetEntry.handoverStatus, sourceEntry.handoverStatus),
      handoverWorkCompleted: mergeHandoverText(
        targetEntry.handoverWorkCompleted,
        sourceEntry.handoverWorkCompleted
      ),
      handoverNextSteps: mergeHandoverText(targetEntry.handoverNextSteps, sourceEntry.handoverNextSteps),
    };
  }

  function mergeCompletedTicketEntry(entryList, entryId) {
    const completedEntry = entryList.find((entry) => entry.id === entryId);
    if (!canMergeTicketEntry(completedEntry)) return entryList;

    const mergeKey = getTicketMergeKey(completedEntry);
    const targetEntry = entryList.find(
      (entry) =>
        entry.id !== entryId &&
        canMergeTicketEntry(entry) &&
        getTicketMergeKey(entry) === mergeKey
    );

    if (!targetEntry) return entryList;

    return entryList
      .map((entry) =>
        entry.id === targetEntry.id
          ? {
            ...entry,
            seconds: entry.seconds + completedEntry.seconds,
            ...mergeHandoverFields(entry, completedEntry),
          }
          : entry
      )
      .filter((entry) => entry.id !== entryId);
  }

  function addOrMergeCompletedTicketEntry(entryList, newEntry) {
    if (!canMergeTicketEntry(newEntry)) return [newEntry, ...entryList];

    const mergeKey = getTicketMergeKey(newEntry);
    const targetEntry = entryList.find(
      (entry) => canMergeTicketEntry(entry) && getTicketMergeKey(entry) === mergeKey
    );

    if (!targetEntry) return [newEntry, ...entryList];

    return entryList.map((entry) =>
      entry.id === targetEntry.id
        ? {
          ...entry,
          seconds: entry.seconds + newEntry.seconds,
          ...mergeHandoverFields(entry, newEntry),
        }
        : entry
    );
  }

  const activeEntries = useMemo(() => {
    return entries.filter((entry) => !entry.deletedAt);
  }, [entries]);

  const pendingJiraWorklogEntries = useMemo(() => {
    const ticketById = new Map(
      jiraTickets.map((ticket) => [String(ticket.id ?? "").trim().toUpperCase(), ticket])
    );
    const ticketByTitle = new Map(
      jiraTickets
        .filter((ticket) => String(ticket.title ?? "").trim())
        .map((ticket) => [String(ticket.title ?? "").trim().toLowerCase(), ticket])
    );
    const ticketByFullName = new Map(
      jiraTickets
        .filter((ticket) => String(ticket.id ?? "").trim())
        .map((ticket) => [
          `${String(ticket.id ?? "").trim()} - ${String(ticket.title ?? "").trim()}`.toLowerCase(),
          ticket,
        ])
    );

    return activeEntries
      .filter((entry) =>
        entry.status === "done" &&
        entry.source !== "todo" &&
        !entry.todoTaskId &&
        !entry.jiraWorklogId &&
        String(entry.ticketName ?? "").trim() &&
        Number(entry.seconds) > 0
      )
      .map((entry) => {
        const entryName = String(entry.ticketName ?? "").trim();
        const parsedIssueKey = getJiraIssueKeyFromTicketName(entryName);
        const matchingTicket =
          ticketById.get(parsedIssueKey) ||
          ticketByFullName.get(entryName.toLowerCase()) ||
          ticketByTitle.get(entryName.toLowerCase());
        const jiraIssueKey = matchingTicket?.id || parsedIssueKey;

        return {
          ...entry,
          jiraIssueKey,
          jiraTicketTitle: matchingTicket?.title || "",
        };
      });
  }, [activeEntries, jiraTickets]);

  const pendingJiraWorklogEntryById = useMemo(() => {
    return new Map(pendingJiraWorklogEntries.map((entry) => [entry.id, entry]));
  }, [pendingJiraWorklogEntries]);

  const pendingTempoWorklogEntries = useMemo(() => {
    const ticketById = new Map(
      jiraTickets.map((ticket) => [String(ticket.id ?? "").trim().toUpperCase(), ticket])
    );
    const ticketByTitle = new Map(
      jiraTickets
        .filter((ticket) => String(ticket.title ?? "").trim())
        .map((ticket) => [String(ticket.title ?? "").trim().toLowerCase(), ticket])
    );
    const ticketByFullName = new Map(
      jiraTickets
        .filter((ticket) => String(ticket.id ?? "").trim())
        .map((ticket) => [
          `${String(ticket.id ?? "").trim()} - ${String(ticket.title ?? "").trim()}`.toLowerCase(),
          ticket,
        ])
    );

    return activeEntries
      .filter((entry) =>
        entry.status === "done" &&
        entry.source !== "todo" &&
        !entry.todoTaskId &&
        !entry.tempoWorklogId &&
        String(entry.ticketName ?? "").trim() &&
        Number(entry.seconds) > 0
      )
      .map((entry) => {
        const entryName = String(entry.ticketName ?? "").trim();
        const parsedIssueKey = getJiraIssueKeyFromTicketName(entryName);
        const matchingTicket =
          ticketById.get(parsedIssueKey) ||
          ticketByFullName.get(entryName.toLowerCase()) ||
          ticketByTitle.get(entryName.toLowerCase());

        return {
          ...entry,
          issueKey: matchingTicket?.id || parsedIssueKey,
          jiraIssueId: matchingTicket?.issueId || "",
          jiraTicketTitle: matchingTicket?.title || "",
        };
      });
  }, [activeEntries, jiraTickets]);

  const savedJiraMode = jiraStatus.jiraMode || "cloud";
  const savedJiraAuthMethod = jiraStatus.jiraAuthMethod || "bearer";
  const savedJiraIdentityRequired = savedJiraMode !== "server" || savedJiraAuthMethod === "basic";
  const hasSavedJiraCredentials =
    Boolean(jiraStatus.jiraBaseUrl) &&
    (!savedJiraIdentityRequired || Boolean(jiraStatus.jiraEmail)) &&
    Boolean(jiraStatus.hasJiraApiToken);
  const canSyncJiraFromHome =
    hasSavedJiraCredentials &&
    pendingJiraWorklogEntries.length > 0 &&
    !isJiraBusy;

  const todayDateKey = useMemo(() => {
    return getDateKeyFromDate(new Date(nowTick));
  }, [nowTick]);

  const countdownSeconds = useMemo(() => {
    const totalSeconds = activeEntries.reduce(
      (sum, entry) =>
        getDateKey(entry) === todayDateKey
          ? sum + applyElapsedTime(entry, nowTick).seconds
          : sum,
      0
    );
    const resetOffset =
      countdownResetDate === todayDateKey && countdownResetOffset <= totalSeconds
        ? countdownResetOffset
        : 0;
    const countedSeconds = Math.max(0, totalSeconds - resetOffset);
    return Math.max(0, dailyTargetSeconds - countedSeconds);
  }, [activeEntries, countdownResetDate, countdownResetOffset, nowTick, todayDateKey]);

  const todayEntries = useMemo(() => {
    return activeEntries.filter((entry) => getDateKey(entry) === todayDateKey);
  }, [activeEntries, todayDateKey]);

  const todayLoggedSeconds = useMemo(() => {
    return todayEntries.reduce(
      (sum, entry) => sum + applyElapsedTime(entry, nowTick).seconds,
      0
    );
  }, [nowTick, todayEntries]);

  useEffect(() => {
    if (countdownResetDate !== todayDateKey) return;
    if (countdownResetOffset <= todayLoggedSeconds) return;

    setCountdownResetOffset(0);
    setCountdownResetDate("");
  }, [countdownResetDate, countdownResetOffset, todayDateKey, todayLoggedSeconds]);

  const deletedEntries = useMemo(() => {
    return entries.filter((entry) => entry.deletedAt);
  }, [entries]);

  const activeTodoTasks = useMemo(() => {
    return todoTasks.filter((task) => !task.deletedAt);
  }, [todoTasks]);

  const deletedTodoTasks = useMemo(() => {
    return todoTasks.filter((task) => task.deletedAt);
  }, [todoTasks]);

  const missingTimeDays = useMemo(() => {
    const totalsByDate = activeEntries.reduce((totals, entry) => {
      const key = getDateKey(entry);
      totals[key] = (totals[key] || 0) + applyElapsedTime(entry, nowTick).seconds;
      return totals;
    }, {});

    return getCurrentWeekdayKeys().map((dateKey) => {
      const loggedSeconds = totalsByDate[dateKey] || 0;
      const deltaSeconds = loggedSeconds - dailyTargetSeconds;
      let status = "done";

      if (loggedSeconds === 0) {
        status = "reset";
      } else if (deltaSeconds < 0) {
        status = "partial";
      } else if (deltaSeconds > 0) {
        status = "over";
      }

      return {
        dateKey,
        loggedSeconds,
        deltaSeconds,
        missingSeconds: Math.max(0, dailyTargetSeconds - loggedSeconds),
        status,
        percent: Math.min(100, Math.round((loggedSeconds / dailyTargetSeconds) * 100)),
      };
    }).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [activeEntries, nowTick]);

  const visibleMissingTimeDays = useMemo(() => {
    if (missingTimeFilter === "all") return missingTimeDays;
    return missingTimeDays.filter((day) => day.missingSeconds > 0);
  }, [missingTimeDays, missingTimeFilter]);

  const totalMissingSeconds = useMemo(() => {
    return missingTimeDays.reduce((sum, day) => sum + day.missingSeconds, 0);
  }, [missingTimeDays]);

  const totalWeekLoggedSeconds = useMemo(() => {
    return missingTimeDays.reduce((sum, day) => sum + day.loggedSeconds, 0);
  }, [missingTimeDays]);

  const totalWeekTargetSeconds = missingTimeDays.length * dailyTargetSeconds;
  const mergeSourceEntry = useMemo(() => {
    return activeEntries.find((entry) => entry.id === mergeSourceEntryId) || null;
  }, [activeEntries, mergeSourceEntryId]);

  const groupedLoggedEntries = useMemo(() => {
    const groups = {};

    const sortedEntries = [...activeEntries].sort((a, b) => {
      const dateCompare = getDateKey(b).localeCompare(getDateKey(a));
      if (dateCompare !== 0) return dateCompare;
      return Number(b.id || 0) - Number(a.id || 0);
    });

    sortedEntries.forEach((entry) => {
      const key = getDateKey(entry);
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });

    return groups;
  }, [activeEntries]);

  function getMatchingJiraTickets(queryValue) {
    const query = String(queryValue ?? "").trim().toLowerCase();
    if (!query) return jiraTickets;

    function getSearchParts(value) {
      return String(value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    }

    function searchPartMatches(queryPart, ticketParts) {
      const aliases = queryPart === "support"
        ? ["support", "supp"]
        : queryPart === "supp"
          ? ["supp", "support"]
          : [queryPart];

      return aliases.some((alias) =>
        ticketParts.some((part) => part.includes(alias) || alias.includes(part))
      );
    }

    function fuzzyMatches(combined) {
      const queryParts = getSearchParts(query);
      if (!queryParts.length) return false;

      const ticketParts = getSearchParts(combined);
      return queryParts.every((part) => searchPartMatches(part, ticketParts));
    }

    function scoreTicket(ticket) {
      const id = String(ticket.id ?? "").toLowerCase();
      const title = String(ticket.title ?? "").toLowerCase();
      const combined = `${id} ${title}`;

      if (id === query) return 0;
      if (id.startsWith(query)) return 1;
      if (title.startsWith(query)) return 2;
      if (combined.includes(query)) return 3;
      if (fuzzyMatches(combined)) return 4;
      return 99;
    }

    return jiraTickets
      .map((ticket, index) => ({ ticket, index, score: scoreTicket(ticket) }))
      .filter((item) => item.score < 99)
      .sort((a, b) => a.score - b.score || a.index - b.index)
      .map((item) => item.ticket);
  }

  const filteredTickets = getMatchingJiraTickets(search);
  const visibleSearchTickets = isSearchOpen && search.trim() ? filteredTickets.slice(0, 5) : [];
  const miniTicketSuggestions = miniTicket.trim() ? getMatchingJiraTickets(miniTicket).slice(0, 5) : [];
  const manualTicketSuggestions = manualEntryType === "ticket"
    ? getMatchingJiraTickets(manualTicket).slice(0, 5)
    : [];

  const selectedFavoriteTicket = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return null;

    return jiraTickets.find(
      (ticket) =>
        ticket.id.toLowerCase() === value ||
        `${ticket.id} - ${ticket.title}`.toLowerCase() === value
    ) || null;
  }, [jiraTickets, search]);

  const activeEntry = useMemo(() => {
    return activeEntries.find((entry) => entry.id === activeEntryId) || null;
  }, [activeEntries, activeEntryId]);
  const activeTicketStatusText = activeEntry ? getWorkingTicketStatus(activeEntry.ticketName) : "";

  const longRunningEntry = useMemo(() => {
    if (!activeEntry || activeEntry.status !== "running") return null;
    if (dismissedLongTimerId === activeEntry.id) return null;

    const syncedEntry = applyElapsedTime(activeEntry, nowTick);
    return syncedEntry.seconds >= 3 * 60 * 60 ? syncedEntry : null;
  }, [activeEntry, dismissedLongTimerId, nowTick]);

  const activeTodoCount = useMemo(() => {
    return activeTodoTasks.filter((task) => !task.done).length;
  }, [activeTodoTasks]);

  function getTodoReminderDayStatus(task) {
    if (!task.reminder) return "none";

    const reminderDate = new Date(task.reminder);
    const reminderTime = reminderDate.getTime();
    if (Number.isNaN(reminderTime)) return "none";

    const reminderDateKey = getDateKeyFromDate(reminderDate);
    if (reminderTime <= nowTick) return "overdue";
    if (reminderDateKey === todayDateKey) return "today";
    return "later";
  }

  const visibleTodoTasks = useMemo(() => {
    return activeTodoTasks.filter((task) => {
      if (task.done) return false;
      const reminderStatus = getTodoReminderDayStatus(task);

      if (todoFilter === "today") {
        return reminderStatus === "today" || reminderStatus === "overdue";
      }
      if (todoFilter === "overdue") return reminderStatus === "overdue";
      if (todoFilter === "none") return reminderStatus === "none";
      return true;
    });
  }, [activeTodoTasks, nowTick, todayDateKey, todoFilter]);

  const activeReminderTask = useMemo(() => {
    return activeTodoTasks.find((task) => {
      if (task.done || task.reminderDismissed || !task.reminder) return false;

      const reminderTime = new Date(task.reminder).getTime();
      if (Number.isNaN(reminderTime) || reminderTime > nowTick) return false;

      const snoozedUntil = task.snoozedUntil
        ? new Date(task.snoozedUntil).getTime()
        : 0;

      return !snoozedUntil || snoozedUntil <= nowTick;
    }) || null;
  }, [activeTodoTasks, nowTick]);

  const reminderInboxTasks = useMemo(() => {
    return activeTodoTasks
      .filter((task) => !task.done && task.reminder)
      .map((task) => {
        const reminderTime = new Date(task.reminder).getTime();
        const snoozedUntil = task.snoozedUntil
          ? new Date(task.snoozedUntil).getTime()
          : 0;
        const isSnoozed = snoozedUntil > nowTick;
        const isDue = !Number.isNaN(reminderTime) && reminderTime <= nowTick;

        return {
          ...task,
          reminderTime,
          snoozedUntilTime: snoozedUntil,
          reminderStatus: isSnoozed ? "snoozed" : isDue ? "due" : "upcoming",
        };
      })
      .sort((a, b) => {
        const aTime = a.snoozedUntilTime || a.reminderTime || 0;
        const bTime = b.snoozedUntilTime || b.reminderTime || 0;
        return aTime - bTime;
      });
  }, [activeTodoTasks, nowTick]);

  const dueReminderCount = useMemo(() => {
    return reminderInboxTasks.filter((task) => task.reminderStatus === "due").length;
  }, [reminderInboxTasks]);

  const showStorageWarning = useMemo(() => {
    if (storagePercent > 20) return false;

    const dismissedUntil = storageWarningDismissedUntil
      ? new Date(storageWarningDismissedUntil).getTime()
      : 0;

    return !dismissedUntil || dismissedUntil <= nowTick;
  }, [storagePercent, storageWarningDismissedUntil, nowTick]);

  const filteredDeletedEntries = useMemo(() => {
    const query = trashSearch.trim().toLowerCase();
    if (!query) return deletedEntries;

    return deletedEntries.filter((entry) =>
      `${entry.ticketName} ${entry.status} ${entry.createdAt}`.toLowerCase().includes(query)
    );
  }, [deletedEntries, trashSearch]);

  const filteredDeletedTodoTasks = useMemo(() => {
    const query = trashSearch.trim().toLowerCase();
    if (!query) return deletedTodoTasks;

    return deletedTodoTasks.filter((task) =>
      `${task.title} ${task.priority} ${task.notes || ""}`.toLowerCase().includes(query)
    );
  }, [deletedTodoTasks, trashSearch]);

  function persistSecureValue(key, value) {
    if (window.loggerAPI?.secureStoreSet) {
      window.loggerAPI.secureStoreSet(key, value).then((result) => {
        if (!result?.ok) {
          localStorage.setItem(key, JSON.stringify(value));
        }
      });
      return;
    }

    localStorage.setItem(key, JSON.stringify(value));
  }

  function removeSecureValue(key) {
    if (window.loggerAPI?.secureStoreDelete) {
      window.loggerAPI.secureStoreDelete(key).then((result) => {
        if (!result?.ok) localStorage.removeItem(key);
      });
      return;
    }

    localStorage.removeItem(key);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSecureStore() {
      if (!window.loggerAPI?.secureStoreGetAll) {
        setSecureStoreReady(true);
        return;
      }

      const result = await window.loggerAPI.secureStoreGetAll(SECURE_STORE_KEYS);
      if (cancelled) return;

      if (!result?.ok) {
        setMessage("Secure storage unavailable; using browser storage");
        setSecureStoreReady(true);
        return;
      }

      const values = result.values || {};

      if (Array.isArray(values.timeEntries)) setEntries(values.timeEntries);
      if (Array.isArray(values.jiraTickets)) setJiraTickets(values.jiraTickets);
      if (Array.isArray(values.todoTasks)) setTodoTasks(values.todoTasks);
      if (Object.prototype.hasOwnProperty.call(values, "activeEntryId")) {
        setActiveEntryId(values.activeEntryId);
      }
      if (typeof values.countdownResetOffset === "number") {
        setCountdownResetOffset(values.countdownResetOffset);
      }
      if (typeof values.countdownResetDate === "string") {
        setCountdownResetDate(values.countdownResetDate);
      }

      const hasSecureData = Object.keys(values).length > 0;
      if (!hasSecureData) {
        await Promise.all(SECURE_STORE_KEYS.map(async (key) => {
          const rawValue = localStorage.getItem(key);
          if (rawValue == null) return;

          try {
            await window.loggerAPI.secureStoreSet(key, JSON.parse(rawValue));
          } catch {
            // Ignore malformed legacy values.
          }
        }));
      }

      SECURE_STORE_KEYS.forEach((key) => localStorage.removeItem(key));
      setSecureStoreReady(true);
    }

    loadSecureStore();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadJiraStatus() {
      if (!window.loggerAPI?.jiraGetStatus) return;

      const result = await window.loggerAPI.jiraGetStatus();
      if (cancelled || !result?.ok) return;

      setJiraStatus({
        jiraMode: result.values?.jiraMode || "cloud",
        jiraAuthMethod: result.values?.jiraAuthMethod || "bearer",
        jiraBaseUrl: result.values?.jiraBaseUrl || "",
        jiraEmail: result.values?.jiraEmail || "",
        hasJiraApiToken: Boolean(result.values?.hasJiraApiToken),
      });
    }

    loadJiraStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTempoStatus() {
      if (!window.loggerAPI?.tempoGetStatus) return;

      const result = await window.loggerAPI.tempoGetStatus();
      if (cancelled || !result?.ok) return;

      setTempoStatus({
        hasTempoApiToken: Boolean(result.values?.hasTempoApiToken),
      });
    }

    loadTempoStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!secureStoreReady) return;
    persistSecureValue("jiraTickets", jiraTickets);
  }, [jiraTickets, secureStoreReady]);

  useEffect(() => {
    if (!secureStoreReady) return;
    persistSecureValue("todoTasks", todoTasks);
  }, [secureStoreReady, todoTasks]);

  useEffect(() => {
    localStorage.setItem("trashRetentionDays", String(trashRetentionDays));
  }, [trashRetentionDays]);

  useEffect(() => {
    localStorage.setItem("appLanguage", appLanguage);
  }, [appLanguage]);

  useEffect(() => {
    localStorage.setItem("selectedJiraProjectKeys", JSON.stringify(selectedJiraProjectKeys));
  }, [selectedJiraProjectKeys]);

  useEffect(() => {
    localStorage.setItem("exportPreset", exportPreset);
  }, [exportPreset]);

  useEffect(() => {
    localStorage.setItem("dailyTargetSeconds", String(dailyTargetSeconds));
  }, [dailyTargetSeconds]);

  useEffect(() => {
    if (!secureStoreReady) return;
    persistSecureValue("countdownResetOffset", countdownResetOffset);
  }, [countdownResetOffset, secureStoreReady]);

  useEffect(() => {
    if (!secureStoreReady) return;

    if (countdownResetDate) {
      persistSecureValue("countdownResetDate", countdownResetDate);
    } else {
      removeSecureValue("countdownResetDate");
    }
  }, [countdownResetDate, secureStoreReady]);

  useEffect(() => {
    if (!secureStoreReady) return;

    if (activeEntryId == null) {
      removeSecureValue("activeEntryId");
    } else {
      persistSecureValue("activeEntryId", activeEntryId);
    }
  }, [activeEntryId, secureStoreReady]);

  useEffect(() => {
    if (storageWarningDismissedUntil) {
      localStorage.setItem("storageWarningDismissedUntil", storageWarningDismissedUntil);
    } else {
      localStorage.removeItem("storageWarningDismissedUntil");
    }
  }, [storageWarningDismissedUntil]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const cutoff = nowTick - trashRetentionDays * 24 * 60 * 60 * 1000;

    setEntries((prev) => {
      const next = prev.filter((entry) => {
        if (!entry.deletedAt) return true;

        const deletedTime = new Date(entry.deletedAt).getTime();
        return Number.isNaN(deletedTime) || deletedTime > cutoff;
      });

      return next.length === prev.length ? prev : next;
    });

    setTodoTasks((prev) => {
      const next = prev.filter((task) => {
        if (!task.deletedAt) return true;

        const deletedTime = new Date(task.deletedAt).getTime();
        return Number.isNaN(deletedTime) || deletedTime > cutoff;
      });

      return next.length === prev.length ? prev : next;
    });
  }, [nowTick, trashRetentionDays]);

  useEffect(() => {
    if (!secureStoreReady) return;
    persistSecureValue("timeEntries", entries);
  }, [entries, secureStoreReady]);

  useEffect(() => {
    try {
      let totalSize = 0;

      const timeEntriesStr = JSON.stringify(entries);
      const jiraTicketsStr = JSON.stringify(jiraTickets);
      const todoTasksStr = JSON.stringify(todoTasks);
      const countdownResetOffsetStr = JSON.stringify(countdownResetOffset);
      const countdownResetDateStr = countdownResetDate;

      if (timeEntriesStr) {
        totalSize += timeEntriesStr.length;
      }
      if (jiraTicketsStr) {
        totalSize += jiraTicketsStr.length;
      }
      if (todoTasksStr) {
        totalSize += todoTasksStr.length;
      }
      if (countdownResetOffsetStr) {
        totalSize += countdownResetOffsetStr.length;
      }
      if (countdownResetDateStr) {
        totalSize += countdownResetDateStr.length;
      }

      const estimatedLimit = 1048576;
      const usedPercent = (totalSize / estimatedLimit) * 100;
      const remainingPercent = 100 - usedPercent;

      console.log(`Storage: ${totalSize} bytes used, ${remainingPercent.toFixed(1)}% remaining`);

      setStoragePercent(remainingPercent);

      if (remainingPercent < 10) {
        setMessage(`Local storage: ${remainingPercent.toFixed(1)}% remaining`);
      }
    } catch (error) {
      console.error("Could not check storage:", error);
    }
  }, [entries, jiraTickets, todoTasks]);

  useEffect(() => {
    if (!message) return;

    const timeout = setTimeout(() => {
      setMessage("");
      setMessageTone("default");
    }, 2000);

    return () => clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    if (mergedEntryId == null) return;

    const timeout = setTimeout(() => {
      setMergedEntryId(null);
    }, 850);

    return () => clearTimeout(timeout);
  }, [mergedEntryId]);

  useEffect(() => {
    if (!countdownPulse) return;

    const timeout = setTimeout(() => {
      setCountdownPulse(false);
    }, 760);

    return () => clearTimeout(timeout);
  }, [countdownPulse]);

  useEffect(() => {
    if (showManualModal) {
      manualTicketRef.current?.focus();
    }
  }, [showManualModal]);

  useEffect(() => {
    if (!todoContextMenu) return;

    function closeContextMenu() {
      setTodoContextMenu(null);
    }

    window.addEventListener("click", closeContextMenu);
    window.addEventListener("keydown", closeContextMenu);

    return () => {
      window.removeEventListener("click", closeContextMenu);
      window.removeEventListener("keydown", closeContextMenu);
    };
  }, [todoContextMenu]);

  useEffect(() => {
    if (!showManualModal && !isMiniMode) {
      mainSearchRef.current?.focus();
    }
  }, [showManualModal, isMiniMode]);

  useEffect(() => {
    if (isMiniMode && !showManualModal) {
      miniTicketRef.current?.focus();
    }
  }, [isMiniMode, showManualModal]);

  useEffect(() => {
    window.loggerAPI?.setMiniMode?.(isMiniMode);
  }, [isMiniMode]);

  useEffect(() => {
    applyTheme(themePreset, themeAccentColor);
    localStorage.setItem("themePreset", themePreset);

    if (themeAccentColor) {
      localStorage.setItem("themeAccentColor", themeAccentColor);
    } else {
      localStorage.removeItem("themeAccentColor");
    }
  }, [themePreset, themeAccentColor]);

  useEffect(() => {
    if (!window.loggerAPI?.showNotification) return;

    const notificationKey = `${todayDateKey}:${dailyTargetSeconds}`;

    if (todayLoggedSeconds < dailyTargetSeconds) {
      if (dailyTargetNotificationRef.current.startsWith(`${todayDateKey}:`)) {
        dailyTargetNotificationRef.current = "";
      }
      return;
    }

    if (dailyTargetNotificationRef.current === notificationKey) return;

    dailyTargetNotificationRef.current = notificationKey;
    window.loggerAPI.showNotification({
      title: "Daily target reached",
      body: `Logged ${formatTimeShort(todayLoggedSeconds)} today.`,
    });
  }, [dailyTargetSeconds, todayDateKey, todayLoggedSeconds]);

  useEffect(() => {
    if (!window.loggerAPI?.showNotification || !activeReminderTask) return;

    const notificationKey = [
      activeReminderTask.id,
      activeReminderTask.reminder,
      activeReminderTask.snoozedUntil || "",
    ].join(":");

    if (taskNotificationRef.current === notificationKey) return;

    taskNotificationRef.current = notificationKey;
    window.loggerAPI.showNotification({
      title: "Task reminder",
      body: activeReminderTask.title,
    });
  }, [activeReminderTask]);

  useEffect(() => {
    if (!window.loggerAPI?.onUpdateStatus) return;

    return window.loggerAPI.onUpdateStatus((payload = {}) => {
      if (payload.status === "update-available") {
        notifyRef.current?.({
          type: "info",
          title: "Update available",
          message: `Version ${payload.update?.version || "new"} is available.`,
          source: "update",
        });
      }

      if (payload.status === "update-downloaded") {
        notifyRef.current?.({
          type: "success",
          title: "Update ready",
          message: `Version ${payload.update?.version || "new"} is ready. Restart to install.`,
          source: "update",
        });
      }

      if (payload.status === "error") {
        notifyRef.current?.({
          type: "error",
          title: "Update failed",
          message: payload.error || "Could not check for updates",
          source: "update",
        });
      }
    });
  }, []);

  useEffect(() => {
    const runningEntry = activeEntries.find((entry) => entry.status === "running");

    if (!runningEntry) {
      if (activeEntryId != null) setActiveEntryId(null);
      return;
    }

    if (activeEntryId == null || !activeEntries.some((entry) => entry.id === activeEntryId)) {
      setActiveEntryId(runningEntry.id);
    }
  }, [activeEntries, activeEntryId]);

  useEffect(() => {
    function syncAfterWake() {
      syncRunningEntries(Date.now());
    }

    function handleVisibilityChange() {
      if (!document.hidden) syncAfterWake();
    }

    syncAfterWake();
    window.addEventListener("focus", syncAfterWake);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const offPowerResume = window.loggerAPI?.onPowerResume?.(syncAfterWake);
    const offPowerSuspend = window.loggerAPI?.onPowerSuspend?.(syncAfterWake);

    return () => {
      window.removeEventListener("focus", syncAfterWake);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      offPowerResume?.();
      offPowerSuspend?.();
    };
  }, []);

  useEffect(() => {
    if (activeEntryId == null) return;

    const interval = setInterval(() => {
      const timestamp = Date.now();
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === activeEntryId
            ? applyElapsedTime(entry, timestamp)
            : entry
        )
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [activeEntryId]);

  useEffect(() => {
    function handleKeyDown(e) {
      const key = e.key.toLowerCase();
      const tag = e.target?.tagName;
      const isTyping =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        e.target.isContentEditable;

      if (handoverEntryId != null) {
        if (key === "escape") {
          e.preventDefault();
          if (handoverEditMode && hasHandoverNotes({
            handoverStatus,
            handoverWorkCompleted,
            handoverNextSteps,
          })) {
            setHandoverEditMode(false);
          } else {
            closeHandoverEntry();
          }
        }

        return;
      }

      if (isTyping) return;

      if ((e.ctrlKey || e.metaKey) && key === "z" && !e.shiftKey && !isTyping && lastMergeUndo) {
        e.preventDefault();
        undoLastMerge();
        return;
      }

      if ((e.ctrlKey || e.metaKey || e.altKey) && key === "t") {
        e.preventDefault();
        setIsMiniMode(false);
        setShowTodoPanel((prev) => {
          if (!prev) setTodoView("list");
          return !prev;
        });
        setShowTrashView(false);
        setShowMissingTimeView(false);
        setShowManualModal(false);
        return;
      }

      if ((e.ctrlKey || e.metaKey || e.altKey) && key === "m") {
        e.preventDefault();
        setShowMissingTimeView((prev) => !prev);
        setShowTrashView(false);
        setShowTodoPanel(false);
        setShowManualModal(false);
        setIsMiniMode(false);
        return;
      }

      if (e.altKey && key === "n") {
        e.preventDefault();
        setIsMiniMode(false);
        setShowTodoPanel(true);
        setShowTrashView(false);
        setShowMissingTimeView(false);
        setShowManualModal(false);
        openNewTodoView();
        return;
      }

      if (e.altKey && key === "r") {
        e.preventDefault();
        openReminderInbox();
        return;
      }

      if (e.altKey && key === "e") {
        e.preventDefault();
        openEndDayView();
        return;
      }

      if (e.altKey && key === "x") {
        e.preventDefault();
        openExportView();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && key === "k") {
        e.preventDefault();
        closePrimaryViews();
        setIsMiniMode(false);
        setTimeout(() => mainSearchRef.current?.focus(), 0);
        return;
      }

      if (!showManualModal && activeEntryId != null && (key === "d" || key === "f")) {
        e.preventDefault();
        handleFinish(activeEntryId);
        return;
      }

      if (key === "?") {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
        return;
      }

      if (key === "s") {
        e.preventDefault();
        if (isMiniMode) {
          handleStartMiniTicket();
        } else {
          handleStartNewTicket();
        }
      }

      if (key === "q") {
        e.preventDefault();
        setShowManualModal(false);
        setIsMiniMode((prev) => !prev);
      }

      if (key === "p") {
        e.preventDefault();
        if (activeEntryId != null) {
          handlePauseCurrent();
        }
      }

      if (key === "d" || key === "f") {
        e.preventDefault();
        if (activeEntryId != null) {
          handleFinish(activeEntryId);
        }
      }

      if (key === "m") {
        e.preventDefault();
        setManualTicket(selectedTicket || activeEntry?.ticketName || "");
        setManualDate(getTodayDate());
        setShowManualModal(true);
      }

      if (key === "escape") {
        if (showShortcuts) {
          e.preventDefault();
          setShowShortcuts(false);
          return;
        }

        if (showManualModal) {
          e.preventDefault();
          setShowManualModal(false);
        } else if (showReminderInbox || showEndDayView || showExportView) {
          e.preventDefault();
          closePrimaryViews();
        } else if (isMiniMode) {
          e.preventDefault();
          setIsMiniMode(false);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeEntryId, selectedTicket, showManualModal, isMiniMode, activeEntry, showShortcuts, miniTicket, lastMergeUndo, showReminderInbox, showEndDayView, showExportView, handoverEntryId, handoverEditMode, handoverStatus, handoverWorkCompleted, handoverNextSteps]);

  useEffect(() => {
    if (!window.loggerAPI) return;

    const offStart = window.loggerAPI.onShortcutStart(() => {
      handleStartFromValue(isMiniMode ? miniTicket : selectedTicket);
    });

    const offPause = window.loggerAPI.onShortcutPause(() => {
      handlePauseCurrent();
    });

    const offFinish = window.loggerAPI.onShortcutFinish(() => {
      if (activeEntryId != null) {
        handleFinish(activeEntryId);
      }
    });

    const offToggleMiniMode = window.loggerAPI.onToggleMiniMode?.(() => {
      setIsMiniMode((prev) => !prev);
    });

    return () => {
      offStart?.();
      offPause?.();
      offFinish?.();
      offToggleMiniMode?.();
    };
  }, [activeEntryId, selectedTicket, isMiniMode, miniTicket]);

  function toggleFavorite(id) {
    let updatedTicket = null;

    setJiraTickets((prev) =>
      prev.map((ticket) => {
        if (ticket.id !== id) return ticket;

        updatedTicket = { ...ticket, favorite: !ticket.favorite };
        return updatedTicket;
      })
    );

    if (updatedTicket) {
      setMessage(
        updatedTicket.favorite
          ? `Added ${updatedTicket.id} to favorites`
          : `Removed ${updatedTicket.id} from favorites`
      );
    }
  }

  function handleAddFavoriteFromInput() {
    const value = search.trim();

    if (!value) {
      setMessage("Type a ticket first");
      return;
    }

    const existing = jiraTickets.find(
      (t) =>
        `${t.id} - ${t.title}`.toLowerCase() === value.toLowerCase() ||
        t.id.toLowerCase() === value.toLowerCase()
    );

    if (existing) {
      if (existing.favorite) {
        toggleFavorite(existing.id);
        return;
      }

      setJiraTickets((prev) =>
        prev.map((t) =>
          t.id === existing.id ? { ...t, favorite: true } : t
        )
      );
      setMessage(`Added ${existing.id} to favorites`);
      return;
    }

    const newTicket = {
      id: value,
      title: "",
      favorite: true,
    };

    setJiraTickets((prev) => [newTicket, ...prev]);
    setMessage(`Added ${value} to favorites`);
  }

  function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
      .map((unit) => String(unit).padStart(2, "0"))
      .join(":");
  }

  function formatTimeShort(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      if (minutes === 0) return `${hours}t`;
      return `${hours}t ${minutes}m`;
    }

    return `${minutes}m`;
  }

  function formatDateShort(value) {
    const parts = getDateParts(value);
    if (!parts) return value || "";
    return `${parts.day}-${parts.month}`;
  }

  function toNumber(value) {
    if (value === "") return 0;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function onlyDigits(value, maxLength = 2) {
    return value.replace(/\D/g, "").slice(0, maxLength);
  }

  function secondsToDurationParts(seconds) {
    const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    return {
      hours: String(Math.floor(safeSeconds / 3600)),
      minutes: String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, "0"),
    };
  }

  function applyElapsedTime(entry, timestamp = Date.now()) {
    if (!entry || entry.status !== "running") return entry;

    const createdAtTime = new Date(entry.createdAt).getTime();
    const startedAtTime = Number(entry.startedAt);
    const fallbackTickAt =
      startedAtTime ||
      (Number.isNaN(createdAtTime) ? timestamp : createdAtTime);
    const lastTickAt = Number(entry.lastTickAt || fallbackTickAt);
    const elapsedSeconds = Math.max(0, Math.floor((timestamp - lastTickAt) / 1000));

    if (elapsedSeconds <= 0) {
      return { ...entry, lastTickAt };
    }

    return {
      ...entry,
      seconds: entry.seconds + elapsedSeconds,
      lastTickAt: lastTickAt + elapsedSeconds * 1000,
    };
  }

  function hasHandoverNotes(entry) {
    return Boolean(
      String(entry?.handoverStatus || "").trim() ||
      String(entry?.handoverWorkCompleted || "").trim() ||
      String(entry?.handoverNextSteps || "").trim()
    );
  }

  function formatHandoverList(value) {
    return getHandoverListItems(value).map((line) => `- ${line}`);
  }

  function getHandoverListItems(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^[-*]\s*/, ""));
  }

  function getHandoverPreview(entryOrDraft = {}) {
    const ticketName = String(entryOrDraft.ticketName || "").trim() || "Ticket";
    const status = String(entryOrDraft.handoverStatus || "").trim();
    const workCompleted = formatHandoverList(entryOrDraft.handoverWorkCompleted);
    const nextSteps = formatHandoverList(entryOrDraft.handoverNextSteps);

    return [
      ticketName,
      "",
      "Status:",
      status,
      "",
      "Work completed:",
      ...workCompleted,
      "",
      "Next steps:",
      ...nextSteps,
    ].join("\n").trimEnd();
  }

  function getHandoverDraftPreview() {
    const entry = entries.find((item) => item.id === handoverEntryId);

    return getHandoverPreview({
      ticketName: entry?.ticketName,
      handoverStatus,
      handoverWorkCompleted,
      handoverNextSteps,
    });
  }

  function openHandoverEntry(entry) {
    if (!entry) return;

    setHandoverEntryId(entry.id);
    setHandoverStatus(entry.handoverStatus || "");
    setHandoverWorkCompleted(entry.handoverWorkCompleted || "");
    setHandoverNextSteps(entry.handoverNextSteps || "");
    setHandoverEditMode(!hasHandoverNotes(entry));
  }

  function closeHandoverEntry() {
    setHandoverEntryId(null);
    setHandoverStatus("");
    setHandoverWorkCompleted("");
    setHandoverNextSteps("");
    setHandoverEditMode(false);
  }

  function saveHandoverEntry() {
    if (handoverEntryId == null) return;

    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === handoverEntryId
          ? {
            ...entry,
            handoverStatus: handoverStatus.trim(),
            handoverWorkCompleted: handoverWorkCompleted.trim(),
            handoverNextSteps: handoverNextSteps.trim(),
          }
          : entry
      )
    );
  }

  function updateHandoverField(fieldName, value) {
    if (fieldName === "handoverStatus") setHandoverStatus(value);
    if (fieldName === "handoverWorkCompleted") setHandoverWorkCompleted(value);
    if (fieldName === "handoverNextSteps") setHandoverNextSteps(value);

    if (handoverEntryId == null) return;

    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === handoverEntryId
          ? {
            ...entry,
            [fieldName]: value,
          }
          : entry
      )
    );
  }

  async function handleCopyHandover() {
    const preview = getHandoverDraftPreview();

    if (!preview.trim()) {
      setMessage("No handover to copy");
      return;
    }

    try {
      saveHandoverEntry();
      await navigator.clipboard.writeText(preview);
      setMessageTone("success");
      setMessage("Copied handover");
    } catch (error) {
      console.error("Could not copy handover:", error);
      setMessage("Could not copy handover");
    }
  }

  function syncRunningEntries(timestamp = Date.now()) {
    setEntries((prev) =>
      {
        const next = prev.map((entry) =>
        entry.status === "running" && !entry.deletedAt
          ? applyElapsedTime(entry, timestamp)
          : entry
        );

        return next;
      }
    );
  }

  function handleSelectTicket(ticket) {
    const fullName = `${ticket.id} - ${ticket.title}`;
    setSelectedTicket(fullName);
    setSearch(fullName);
    setIsSearchOpen(false);
    setHighlightedTicketIndex(-1);
    setMessage(getWorkingTicketStatus(fullName));
  }

  function handleSearchChange(value) {
    setSearch(value);
    setSelectedTicket(value);
    setIsSearchOpen(Boolean(value.trim()));
    setHighlightedTicketIndex(-1);
  }

  function handleSearchKeyDown(event) {
    if (event.key === "ArrowDown") {
      if (!visibleSearchTickets.length) return;
      event.preventDefault();
      setIsSearchOpen(true);
      setHighlightedTicketIndex((index) => (index + 1) % visibleSearchTickets.length);
      return;
    }

    if (event.key === "ArrowUp") {
      if (!visibleSearchTickets.length) return;
      event.preventDefault();
      setIsSearchOpen(true);
      setHighlightedTicketIndex((index) =>
        index <= 0 ? visibleSearchTickets.length - 1 : index - 1
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (isSearchOpen && highlightedTicketIndex >= 0 && visibleSearchTickets[highlightedTicketIndex]) {
        handleSelectTicket(visibleSearchTickets[highlightedTicketIndex]);
        return;
      }

      handleStartNewTicket();
    }

    if (event.key === "Escape") {
      setIsSearchOpen(false);
      setHighlightedTicketIndex(-1);
    }
  }

  function selectMiniTicket(ticket) {
    const fullName = `${ticket.id} - ${ticket.title}`;
    setMiniTicket(fullName);
    setSelectedTicket(fullName);
    setIsMiniTicketFocused(false);
    setMiniHighlightedTicketIndex(-1);
  }

  function handleMiniTicketChange(value) {
    setMiniTicket(value);
    setMiniHighlightedTicketIndex(-1);
  }

  function handleMiniTicketKeyDown(event) {
    if (event.key === "ArrowDown") {
      if (!miniTicketSuggestions.length) return;
      event.preventDefault();
      setIsMiniTicketFocused(true);
      setMiniHighlightedTicketIndex((index) => (index + 1) % miniTicketSuggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      if (!miniTicketSuggestions.length) return;
      event.preventDefault();
      setIsMiniTicketFocused(true);
      setMiniHighlightedTicketIndex((index) =>
        index <= 0 ? miniTicketSuggestions.length - 1 : index - 1
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (miniHighlightedTicketIndex >= 0 && miniTicketSuggestions[miniHighlightedTicketIndex]) {
        selectMiniTicket(miniTicketSuggestions[miniHighlightedTicketIndex]);
        return;
      }

      handleStartMiniTicket();
      return;
    }

    if (event.key === "Escape") {
      setIsMiniTicketFocused(false);
      setMiniHighlightedTicketIndex(-1);
    }
  }

  function selectManualTicket(ticket) {
    const fullName = `${ticket.id} - ${ticket.title}`;
    setManualTicket(fullName);
    setSelectedTicket(fullName);
    setManualFocused(null);
    setManualHighlightedTicketIndex(-1);
  }

  function handleManualTicketChange(value) {
    setManualTicket(value);
    setManualHighlightedTicketIndex(-1);
  }

  function handleManualTicketKeyDown(event) {
    if (manualEntryType !== "ticket") return;

    if (event.key === "ArrowDown") {
      if (!manualTicketSuggestions.length) return;
      event.preventDefault();
      setManualFocused("ticket");
      setManualHighlightedTicketIndex((index) => (index + 1) % manualTicketSuggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      if (!manualTicketSuggestions.length) return;
      event.preventDefault();
      setManualFocused("ticket");
      setManualHighlightedTicketIndex((index) =>
        index <= 0 ? manualTicketSuggestions.length - 1 : index - 1
      );
      return;
    }

    if (event.key === "Enter" && manualFocused === "ticket") {
      if (manualHighlightedTicketIndex >= 0 && manualTicketSuggestions[manualHighlightedTicketIndex]) {
        event.preventDefault();
        selectManualTicket(manualTicketSuggestions[manualHighlightedTicketIndex]);
      }
      return;
    }

    if (event.key === "Escape") {
      setManualFocused(null);
      setManualHighlightedTicketIndex(-1);
    }
  }

  function startEntry(ticketName, entryMeta = {}) {
    const value = String(ticketName ?? "").trim();
    const timestamp = Date.now();

    if (!value) {
      setMessage("Velg eller skriv inn en ticket først");
      return;
    }

    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === activeEntryId && entry.status === "running"
          ? { ...applyElapsedTime(entry, timestamp), status: "paused", lastTickAt: undefined }
          : entry
      )
    );

    const newEntry = {
      id: Date.now(),
      ticketName: value,
      seconds: 0,
      status: "running",
      createdAt: getDateKeyFromDate(new Date(timestamp)),
      dateKey: getDateKeyFromDate(new Date(timestamp)),
      startedAt: timestamp,
      lastTickAt: timestamp,
      source: "timer",
      ...entryMeta,
    };

    const newEntryMergeKey = getTicketMergeKey(newEntry);
    const activeEntry = entries.find((entry) => entry.id === activeEntryId && entry.status === "running");

    if (activeEntry && getTicketMergeKey(activeEntry) === newEntryMergeKey) {
      setMessage("Ticket is already running");
      return;
    }

    const existingPausedEntry = entries.find(
      (entry) => entry.id !== activeEntryId && canContinueTicketEntry(entry) && getTicketMergeKey(entry) === newEntryMergeKey
    );

    if (existingPausedEntry) {
      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.id === activeEntryId && entry.status === "running") {
            return { ...applyElapsedTime(entry, timestamp), status: "paused", lastTickAt: undefined };
          }

          if (entry.id === existingPausedEntry.id) {
            return { ...entry, status: "running", lastTickAt: timestamp };
          }

          return entry;
        })
      );
      setActiveEntryId(existingPausedEntry.id);
      setSelectedTicket(existingPausedEntry.ticketName || value);
      setSearch("");
      setMiniTicket("");
      setIsMiniTicketFocused(false);
      setMiniHighlightedTicketIndex(-1);
      setMessage("Ticket resumed");
      return;
    }

    setEntries((prev) => addOrMergeCompletedTicketEntry(prev, newEntry));
    setActiveEntryId(newEntry.id);
    setSelectedTicket(value);
    setSearch("");
    setMiniTicket("");
    setIsMiniTicketFocused(false);
    setMiniHighlightedTicketIndex(-1);
    setMessage("New ticket started");
  }

  function handleStartFromValue(value) {
    startEntry(value);
  }

  function handleStartNewTicket() {
    startEntry(selectedTicket);
  }

  function handleStartMiniTicket() {
    startEntry(miniTicket);
  }

  function notifyDailyTargetReached(loggedSeconds, dateKey = todayDateKey) {
    if (!window.loggerAPI?.showNotification) return;
    if (loggedSeconds < dailyTargetSeconds) return;

    const notificationKey = `${dateKey}:${dailyTargetSeconds}`;
    if (dailyTargetNotificationRef.current === notificationKey) return;

    dailyTargetNotificationRef.current = notificationKey;
    window.loggerAPI.showNotification({
      title: "Daily target reached",
      body: `Logged ${formatTimeShort(loggedSeconds)} today.`,
    });
  }

  function handleToggleMiniTimer() {
    if (activeEntryId != null) {
      handlePauseCurrent();
      return;
    }

    handleStartMiniTicket();
  }

  function handlePauseCurrent() {
    if (activeEntryId == null) {
      setMessage("Ingen aktiv ticket");
      return;
    }

    const timestamp = Date.now();
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === activeEntryId
          ? { ...applyElapsedTime(entry, timestamp), status: "paused", lastTickAt: undefined }
          : entry
      )
    );

    setActiveEntryId(null);
    setMessage("Current ticket paused");
  }

  function handleResume(id) {
    const timestamp = Date.now();
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id === activeEntryId && entry.status === "running") {
          return { ...applyElapsedTime(entry, timestamp), status: "paused", lastTickAt: undefined };
        }

        if (entry.id === id) {
          return { ...entry, status: "running", lastTickAt: timestamp };
        }

        return entry;
      })
    );

    setActiveEntryId(id);
    setMessage("Ticket resumed");
  }

  function handleFinish(id) {
    const finishedEntry = entries.find((entry) => entry.id === id);
    const timestamp = Date.now();

    if (id === activeEntryId) {
      setActiveEntryId(null);
    }

    setEntries((prev) => {
      const finishedEntries = prev.map((entry) =>
        entry.id === id
          ? { ...applyElapsedTime(entry, timestamp), status: "done", lastTickAt: undefined }
          : entry
      );

      return mergeCompletedTicketEntry(finishedEntries, id);
    });

    if (finishedEntry?.todoTaskId) {
      setTodoTasks((prev) =>
        prev.map((task) =>
          task.id === finishedEntry.todoTaskId
            ? { ...task, done: true, reminderDismissed: true }
            : task
        )
      );
      setMessage("Task finished");
      return;
    }

    setMessage("Ticket finished");
  }

  function handleDeleteEntry(id) {
    const timestamp = Date.now();
    if (id === activeEntryId) {
      setActiveEntryId(null);
    }

    setDeletingEntryId(id);

    setTimeout(() => {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === id
            ? {
              ...applyElapsedTime(entry, timestamp),
              status: entry.status === "running" ? "paused" : entry.status,
              lastTickAt: undefined,
              deletedAt: new Date().toISOString(),
            }
            : entry
        )
      );
      setDeletingEntryId(null);
      setCountdownPulse(true);
      setMessageTone("success");
      setMessage("Entry deleted");
    }, 240);
  }

  function handleDeleteDayEntries(dateKey) {
    const dayEntries = activeEntries.filter((entry) => getDateKey(entry) === dateKey);
    if (!dayEntries.length) return;

    const displayDate = formatDateShort(dateKey);
    const confirmed = window.confirm(`${text.confirmDeleteDay}\n\n${displayDate} - ${dayEntries.length} entries`);
    if (!confirmed) return;

    const timestamp = Date.now();
    const deletedAt = new Date().toISOString();
    const dayEntryIds = new Set(dayEntries.map((entry) => entry.id));

    if (dayEntries.some((entry) => entry.id === activeEntryId)) {
      setActiveEntryId(null);
    }

    setEntries((prev) =>
      prev.map((entry) =>
        dayEntryIds.has(entry.id)
          ? {
            ...applyElapsedTime(entry, timestamp),
            status: entry.status === "running" ? "paused" : entry.status,
            lastTickAt: undefined,
            deletedAt,
          }
          : entry
      )
    );
    setCountdownPulse(true);
    setMessageTone("success");
    setMessage(`${text.dayEntriesDeleted}: ${displayDate}`);
  }

  function openTodoFromTicket(entry) {
    const ticketName = entry?.ticketName || "";

    setTodoDraft({
      title: ticketName,
      priority: "normal",
      reminder: getDefaultTodoReminder(),
      notes: "",
      sourceTicket: ticketName,
    });
    setShowTodoPanel(true);
    setTodoView("new");
    setTodoContextMenu(null);
  }

  function handleAddTodoTask() {
    const title = todoDraft.title.trim();

    if (!title) {
      setMessage("Skriv inn en task");
      return;
    }

    const newTask = {
      id: Date.now(),
      title,
      priority: todoDraft.priority,
      reminder: todoDraft.reminder,
      notes: todoDraft.notes.trim(),
      sourceTicket: todoDraft.sourceTicket,
      done: false,
      createdAt: new Date().toISOString(),
    };

    setTodoTasks((prev) => [newTask, ...prev]);
    setTodoDraft({
      title: "",
      priority: "normal",
      reminder: getDefaultTodoReminder(),
      notes: "",
      sourceTicket: "",
    });
    setTodoView("list");
    setMessage("Task lagt til");
  }

  function getTodoTimerEntry(taskId) {
    return activeEntries.find(
      (entry) => entry.todoTaskId === taskId && entry.status !== "done"
    );
  }

  function getTodoEntryNotes(entry) {
    if (entry.todoNotes) return entry.todoNotes;

    const task = todoTasks.find((item) => item.id === entry.todoTaskId);
    return task?.notes || "";
  }

  function handleStartTodoTimer(task) {
    const existingEntry = getTodoTimerEntry(task.id);

    if (existingEntry?.id === activeEntryId) {
      handlePauseCurrent();
      return;
    }

    if (existingEntry) {
      handleResume(existingEntry.id);
      return;
    }

    startEntry(task.title, {
      source: "todo",
      todoTaskId: task.id,
      todoNotes: task.notes || "",
    });
    setMessage("Task timer startet");
  }

  function toggleTodoTask(id) {
    const task = todoTasks.find((item) => item.id === id);
    const willBeDone = !task?.done;

    setTodoTasks((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      )
    );

    if (willBeDone) {
      const unfinishedTodoEntries = entries.filter(
        (entry) => entry.todoTaskId === id && entry.status !== "done"
      );

      if (unfinishedTodoEntries.some((entry) => entry.id === activeEntryId)) {
        setActiveEntryId(null);
      }

      setEntries((prev) =>
        prev.map((entry) =>
          entry.todoTaskId === id && entry.status !== "done"
            ? { ...applyElapsedTime(entry), status: "done", lastTickAt: undefined }
            : entry
        )
      );
    }
  }

  function deleteTodoTask(id) {
    setTodoTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? { ...task, done: true, deletedAt: new Date().toISOString(), reminderDismissed: true }
          : task
      )
    );
  }

  function openNewTodoView() {
    setTodoDraft({
      title: "",
      priority: "normal",
      reminder: getDefaultTodoReminder(),
      notes: "",
      sourceTicket: "",
    });
    setTodoView("new");
  }

  function formatReminderTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function snoozeTaskReminder(task, minutes) {
    if (!task) return;

    const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();

    setTodoTasks((prev) =>
      prev.map((item) =>
        item.id === task.id
          ? { ...item, snoozedUntil, reminderDismissed: false }
          : item
      )
    );
    setShowTodoSnoozeMenu(false);
  }

  function snoozeTodoReminder(minutes) {
    snoozeTaskReminder(activeReminderTask, minutes);
  }

  function snoozeTaskReminderUntilTomorrow(task) {
    if (!task) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    setTodoTasks((prev) =>
      prev.map((item) =>
        item.id === task.id
          ? { ...item, snoozedUntil: tomorrow.toISOString(), reminderDismissed: false }
          : item
      )
    );
    setShowTodoSnoozeMenu(false);
  }

  function snoozeTodoReminderUntilTomorrow() {
    snoozeTaskReminderUntilTomorrow(activeReminderTask);
  }

  function dismissTaskReminder(task) {
    if (!task) return;

    setTodoTasks((prev) =>
      prev.map((item) =>
        item.id === task.id ? { ...item, reminderDismissed: true } : item
      )
    );
    setShowTodoSnoozeMenu(false);
  }

  function dismissTodoReminder() {
    dismissTaskReminder(activeReminderTask);
  }

  function startTaskReminder(task) {
    if (!task) return;

    const existingEntry = getTodoTimerEntry(task.id);

    if (existingEntry?.id === activeEntryId) {
      setMessage("Task timer kjører allerede");
    } else {
      handleStartTodoTimer(task);
    }

    setTodoTasks((prev) =>
      prev.map((item) =>
        item.id === task.id ? { ...item, reminderDismissed: true } : item
      )
    );
    setShowTodoSnoozeMenu(false);
  }

  function startTodoReminder() {
    startTaskReminder(activeReminderTask);
  }

  function completeTaskReminder(task) {
    if (!task) return;

    setTodoTasks((prev) =>
      prev.map((item) =>
        item.id === task.id ? { ...item, done: true, reminderDismissed: true } : item
      )
    );
    setShowTodoSnoozeMenu(false);
  }

  function completeTodoReminder() {
    completeTaskReminder(activeReminderTask);
  }

  function snoozeStorageWarning(hours = 24) {
    const dismissedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    setStorageWarningDismissedUntil(dismissedUntil);
  }

  function dismissStorageWarning() {
    snoozeStorageWarning(24);
  }

  function openTrashView() {
    setShowTrashView(true);
    setShowMissingTimeView(false);
    setShowReportsView(false);
    setShowSettingsView(false);
    setShowReminderInbox(false);
    setShowEndDayView(false);
    setShowExportView(false);
    setIsMiniMode(false);
    setShowManualModal(false);
    setShowTodoPanel(false);
    setTrashTab("tickets");
  }

  function openMissingTimeView() {
    setShowMissingTimeView(true);
    setShowTrashView(false);
    setShowReportsView(false);
    setShowSettingsView(false);
    setShowReminderInbox(false);
    setShowEndDayView(false);
    setShowExportView(false);
    setIsMiniMode(false);
    setShowManualModal(false);
    setShowTodoPanel(false);
  }

  function openReportsView() {
    setShowReportsView(true);
    setShowTrashView(false);
    setShowMissingTimeView(false);
    setShowSettingsView(false);
    setShowReminderInbox(false);
    setShowEndDayView(false);
    setShowExportView(false);
    setIsMiniMode(false);
    setShowManualModal(false);
    setShowTodoPanel(false);
  }

  function openSettingsView() {
    setShowSettingsView(true);
    setShowTrashView(false);
    setShowMissingTimeView(false);
    setShowReportsView(false);
    setShowReminderInbox(false);
    setShowEndDayView(false);
    setShowExportView(false);
    setIsMiniMode(false);
    setShowManualModal(false);
    setShowTodoPanel(false);
  }

  function restoreEntry(id) {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, deletedAt: undefined } : entry
      )
    );
  }

  function permanentlyDeleteEntry(id) {
    if (id === activeEntryId) setActiveEntryId(null);
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }

  function restoreTodoTask(id) {
    setTodoTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, deletedAt: undefined, done: false } : task
      )
    );
  }

  function permanentlyDeleteTodoTask(id) {
    setTodoTasks((prev) => prev.filter((task) => task.id !== id));
  }

  function emptyTrash() {
    setEntries((prev) => prev.filter((entry) => !entry.deletedAt));
    setTodoTasks((prev) => prev.filter((task) => !task.deletedAt));
    setMessage("Trash emptied");
  }

  function openEntryContextMenu(event, entry) {
    event.preventDefault();
    setTodoContextMenu({
      x: event.clientX,
      y: event.clientY,
      entry,
    });
  }

  function canMergeEntryPair(sourceEntry, targetEntry) {
    return (
      sourceEntry &&
      targetEntry &&
      sourceEntry.id !== targetEntry.id &&
      !sourceEntry.deletedAt &&
      !targetEntry.deletedAt &&
      sourceEntry.status !== "running" &&
      targetEntry.status !== "running" &&
      sourceEntry.source !== "todo" &&
      targetEntry.source !== "todo" &&
      !sourceEntry.todoTaskId &&
      !targetEntry.todoTaskId
    );
  }

  function startMergeEntry(entry) {
    if (entry.status === "running") {
      setMessage("Pause eller fullfør ticket før merge");
      setTodoContextMenu(null);
      return;
    }

    if (entry.source === "todo" || entry.todoTaskId) {
      setMessage("Task-logger kan ikke merges med tickets");
      setTodoContextMenu(null);
      return;
    }

    setMergeSourceEntryId(entry.id);
    setTodoContextMenu(null);
    setMessage("Velg ticket å merge inn i");
  }

  function mergeEntryInto(targetEntry) {
    if (!canMergeEntryPair(mergeSourceEntry, targetEntry)) {
      setMessage("Disse ticketene kan ikke merges");
      setTodoContextMenu(null);
      return;
    }

    const sourceEntry = mergeSourceEntry;
    setMergingEntries({ sourceId: sourceEntry.id, targetId: targetEntry.id });
    setMergeSourceEntryId(null);
    setTodoContextMenu(null);

    setTimeout(() => {
      setEntries((prev) => {
        const currentTargetEntry = prev.find((entry) => entry.id === targetEntry.id) || targetEntry;
        const currentSourceEntry = prev.find((entry) => entry.id === sourceEntry.id) || sourceEntry;

        setLastMergeUndo({
          sourceEntry: currentSourceEntry,
          targetEntry: currentTargetEntry,
          mergedAt: Date.now(),
        });

        return prev
          .map((entry) =>
            entry.id === targetEntry.id
              ? {
                  ...entry,
                  seconds: entry.seconds + sourceEntry.seconds,
                  status: entry.status === "paused" ? "paused" : "done",
                }
              : entry
          )
          .filter((entry) => entry.id !== sourceEntry.id);
      });

      setMergedEntryId(targetEntry.id);
      setMergingEntries(null);
      setMessageTone("success");
      setMessage("Tickets merged");
    }, 260);
  }

  function undoLastMerge() {
    if (!lastMergeUndo) return;

    const { sourceEntry, targetEntry } = lastMergeUndo;

    setEntries((prev) => {
      const hasSource = prev.some((entry) => entry.id === sourceEntry.id);
      const nextEntries = prev.map((entry) =>
        entry.id === targetEntry.id
          ? {
              ...entry,
              seconds: Math.max(0, entry.seconds - sourceEntry.seconds),
              status: targetEntry.status,
            }
          : entry
      );

      return hasSource ? nextEntries : [sourceEntry, ...nextEntries];
    });

    setLastMergeUndo(null);
    setMergedEntryId(null);
    setMergingEntries(null);
    setMessageTone("success");
    setMessage("Merge undone");
  }

  function cancelMergeEntry() {
    setMergeSourceEntryId(null);
    setTodoContextMenu(null);
    setMessage("Merge cancelled");
  }

  function handleClearAll() {
    openTrashView();
  }

  function handleClearLoggedTickets() {
    const timestamp = Date.now();
    const deletedAt = new Date().toISOString();
    setEntries((prev) =>
      prev.map((entry) =>
        entry.deletedAt ? entry : {
          ...applyElapsedTime(entry, timestamp),
          status: entry.status === "running" ? "paused" : entry.status,
          lastTickAt: undefined,
          deletedAt,
        }
      )
    );
    setActiveEntryId(null);
    setMessage("Logged tickets moved to trash");
  }

  function handleResetCountdown() {
    const timestamp = Date.now();
    const resetDateKey = getDateKeyFromDate(new Date(timestamp));
    const totalSeconds = activeEntries.reduce(
      (sum, entry) =>
        getDateKey(entry) === resetDateKey
          ? sum + applyElapsedTime(entry, timestamp).seconds
          : sum,
      0
    );
    setCountdownResetOffset(totalSeconds);
    setCountdownResetDate(resetDateKey);
    setMessage("Countdown reset");
  }

  function closePrimaryViews() {
    setShowTrashView(false);
    setShowMissingTimeView(false);
    setShowReportsView(false);
    setShowSettingsView(false);
    setShowReminderInbox(false);
    setShowEndDayView(false);
    setShowExportView(false);
    setShowManualModal(false);
    setEditingEntryId(null);
  }

  function openReminderInbox() {
    closePrimaryViews();
    setShowReminderInbox(true);
    setIsMiniMode(false);
  }

  function openEndDayView() {
    closePrimaryViews();
    setShowEndDayView(true);
    setIsMiniMode(false);
  }

  function openExportView() {
    closePrimaryViews();
    setShowExportView(true);
    setIsMiniMode(false);
  }

  function openManual(prefill = "", entryType = "ticket") {
    setShowTrashView(false);
    setShowMissingTimeView(false);
    setShowReportsView(false);
    setShowSettingsView(false);
    setShowReminderInbox(false);
    setShowEndDayView(false);
    setShowExportView(false);
    setEditingEntryId(null);
    setManualTicket(prefill);
    setManualEntryType(entryType);
    setManualDate(getTodayDate());
    setManualHours("");
    setManualMinutes("");
    setManualFocused(null);
    setManualHighlightedTicketIndex(-1);
    setShowManualModal(true);
  }

  function openEditEntry(entry) {
    const syncedEntry = applyElapsedTime(entry, Date.now());
    const duration = secondsToDurationParts(syncedEntry.seconds);

    setShowTrashView(false);
    setShowMissingTimeView(false);
    setShowReportsView(false);
    setShowSettingsView(false);
    setShowReminderInbox(false);
    setShowEndDayView(false);
    setShowExportView(false);
    setShowManualModal(false);
    setTodoContextMenu(null);
    setEditingEntryId(entry.id);
    setEditTicket(syncedEntry.ticketName || "");
    setEditDate(getDateKey(syncedEntry) || getTodayDate());
    setEditHours(duration.hours);
    setEditMinutes(duration.minutes);
    setEditFocused(null);
  }

  function closeEditEntry() {
    setEditingEntryId(null);
    setEditTicket("");
    setEditDate("");
    setEditHours("");
    setEditMinutes("");
    setEditFocused(null);
  }

  function handleSaveSettings(nextSettings) {
    setDailyTargetSeconds(nextSettings.dailyTargetSeconds);
    setTrashRetentionDays(nextSettings.trashRetentionDays);
    setThemePreset(nextSettings.themePreset);
    setThemeAccentColor(nextSettings.themeAccentColor);
    setAppLanguage(nextSettings.appLanguage || "en");
    setShowSettingsView(false);
    notify({
      type: "success",
      title: "Settings saved",
      message: nextSettings.appLanguage === "en" ? "Settings saved" : "Innstillinger lagret",
      source: "app",
    });
  }

  function setJiraErrorFeedback(message, title = "Jira failed") {
    const displayMessage = getDisplayErrorMessage(message);
    notify({
      type: "error",
      title,
      message: displayMessage,
      source: "jira",
    });
    setJiraFeedbackTone("error");
    setJiraFeedback(displayMessage);
  }

  function setJiraDefaultFeedback(message) {
    setJiraFeedbackTone("default");
    setJiraFeedback(message);
  }

  function setJiraSuccessFeedback(message, title = "Jira updated") {
    notify({
      type: "success",
      title,
      message,
      source: "jira",
    });
    setJiraFeedbackTone("success");
    setJiraFeedback(message);
  }

  async function handleSaveJiraCredentials(credentials) {
    if (!window.loggerAPI?.jiraSaveCredentials) {
      setMessage("Jira storage is not available");
      setJiraFeedback("Jira storage is not available");
      return false;
    }

    setIsJiraBusy(true);
    setJiraDefaultFeedback("Saving Jira credentials...");

    try {
      const result = await window.loggerAPI.jiraSaveCredentials(credentials);

      if (!result?.ok) {
        setJiraErrorFeedback(result?.error || "Could not save Jira credentials", "Jira credentials failed");
        return false;
      }

      setJiraStatus({
        jiraMode: result.values?.jiraMode || "cloud",
        jiraAuthMethod: result.values?.jiraAuthMethod || "bearer",
        jiraBaseUrl: result.values?.jiraBaseUrl || "",
        jiraEmail: result.values?.jiraEmail || "",
        hasJiraApiToken: Boolean(result.values?.hasJiraApiToken),
      });
      setJiraSuccessFeedback("Jira credentials saved. You can test the connection now.", "Jira credentials saved");
      return true;
    } catch (error) {
      console.error("Could not save Jira credentials:", error);
      setJiraErrorFeedback("Could not save Jira credentials", "Jira credentials failed");
      return false;
    } finally {
      setIsJiraBusy(false);
    }
  }

  async function handleTestJiraConnection() {
    if (!window.loggerAPI?.jiraTestConnection) {
      setMessage("Jira test is not available");
      setJiraFeedback("Jira test is not available");
      return;
    }

    setIsJiraBusy(true);
    setJiraDefaultFeedback("Testing Jira connection...");

    try {
      const result = await window.loggerAPI.jiraTestConnection();

      if (!result?.success) {
        setJiraErrorFeedback(result?.error || "Jira connection failed", "Jira connection failed");
        return;
      }

      setJiraSuccessFeedback(`Connected to Jira as ${result.user?.displayName || result.user?.emailAddress || "user"}.`, "Jira connected");
    } catch (error) {
      console.error("Could not test Jira connection:", error);
      setJiraErrorFeedback("Could not test Jira connection", "Jira connection failed");
    } finally {
      setIsJiraBusy(false);
    }
  }

  async function handleClearJiraCredentials() {
    if (!window.loggerAPI?.jiraClearCredentials) {
      setMessage("Jira storage is not available");
      setJiraFeedback("Jira storage is not available");
      return;
    }

    setIsJiraBusy(true);
    setJiraDefaultFeedback("Clearing Jira credentials...");

    try {
      const result = await window.loggerAPI.jiraClearCredentials();

      if (!result?.ok) {
        setJiraErrorFeedback(result?.error || "Could not clear Jira credentials", "Jira credentials failed");
        return;
      }

      setJiraStatus({
        jiraMode: "cloud",
        jiraAuthMethod: "bearer",
        jiraBaseUrl: "",
        jiraEmail: "",
        hasJiraApiToken: false,
      });
      setJiraSuccessFeedback("Jira credentials cleared.", "Jira credentials cleared");
    } catch (error) {
      console.error("Could not clear Jira credentials:", error);
      setJiraErrorFeedback("Could not clear Jira credentials", "Jira credentials failed");
    } finally {
      setIsJiraBusy(false);
    }
  }

  async function handleSyncJiraWorklogs(targetEntries) {
    const entriesToSync = Array.isArray(targetEntries) ? targetEntries : pendingJiraWorklogEntries;

    if (!window.loggerAPI?.jiraSyncWorklogs) {
      setJiraErrorFeedback("Jira sync is not available", "Jira sync failed");
      return;
    }

    if (!entriesToSync.length) {
      setMessage("No Jira worklogs to sync");
      setJiraDefaultFeedback("No Jira worklogs to sync.");
      return;
    }

    const isSingleEntrySync = entriesToSync.length === 1;
    setIsJiraBusy(true);
    setJiraDefaultFeedback(
      isSingleEntrySync
        ? `Syncing ${entriesToSync[0].jiraIssueKey || entriesToSync[0].ticketName} to Jira...`
        : `Syncing ${entriesToSync.length} Jira worklogs...`
    );

    try {
      const result = await window.loggerAPI.jiraSyncWorklogs(entriesToSync);
      const results = Array.isArray(result?.results) ? result.results : [];
      const successfulResults = results.filter((item) => item.success && item.worklog?.id);
      const syncedAt = new Date().toISOString();

      if (successfulResults.length) {
        const resultByEntryId = new Map(successfulResults.map((item) => [item.entryId, item]));

        setEntries((prev) =>
          prev.map((entry) => {
            const syncedResult = resultByEntryId.get(entry.id);
            if (!syncedResult) return entry;

            return {
              ...entry,
              jiraWorklogId: syncedResult.worklog.id,
              jiraWorklogSelf: syncedResult.worklog.self,
              jiraSyncedAt: syncedAt,
            };
          })
        );
      }

      const failedCount = results.filter((item) => !item.success).length;
      const firstFailure = results.find((item) => !item.success);
      const failureText = firstFailure
        ? ` First failure: ${firstFailure.issueKey || "entry"} - ${getDisplayErrorMessage(firstFailure.error || "Unknown error")}`
        : "";

      if (!result?.ok || failedCount) {
        setJiraErrorFeedback(
          result?.error ||
          `Synced ${successfulResults.length} Jira worklogs${failedCount ? `, ${failedCount} failed` : ""}.${failureText}`,
          "Jira sync failed"
        );
        return;
      }

      setJiraSuccessFeedback(
        isSingleEntrySync
          ? `Synced ${entriesToSync[0].jiraIssueKey || entriesToSync[0].ticketName} to Jira.`
          : `Synced ${successfulResults.length} Jira worklogs.`,
        "Jira sync completed"
      );
    } catch (error) {
      console.error("Could not sync Jira worklogs:", error);
      setJiraErrorFeedback("Could not sync Jira worklogs", "Jira sync failed");
    } finally {
      setIsJiraBusy(false);
    }
  }

  async function handleSaveTempoCredentials(credentials = {}) {
    if (!window.loggerAPI?.tempoSaveCredentials) {
      setMessage("Tempo storage is not available");
      setTempoFeedback("Tempo storage is not available");
      return false;
    }

    setIsTempoBusy(true);
    setTempoFeedback("Saving Tempo token...");

    try {
      const result = await window.loggerAPI.tempoSaveCredentials(credentials);

      if (!result?.ok) {
        setMessage(result?.error || "Could not save Tempo token");
        setTempoFeedback(result?.error || "Could not save Tempo token");
        return false;
      }

      setTempoStatus({
        hasTempoApiToken: Boolean(result.values?.hasTempoApiToken),
      });
      setMessageTone("success");
      setMessage("Tempo token saved");
      setTempoFeedback("Tempo token saved. You can test the connection now.");
      return true;
    } catch (error) {
      console.error("Could not save Tempo token:", error);
      setMessage("Could not save Tempo token");
      setTempoFeedback("Could not save Tempo token");
      return false;
    } finally {
      setIsTempoBusy(false);
    }
  }

  async function handleTestTempoConnection() {
    if (!window.loggerAPI?.tempoTestConnection) {
      setMessage("Tempo test is not available");
      setTempoFeedback("Tempo test is not available");
      return;
    }

    setIsTempoBusy(true);
    setTempoFeedback("Testing Tempo connection...");

    try {
      const result = await window.loggerAPI.tempoTestConnection();

      if (!result?.success) {
        notify({
          type: "error",
          title: "Tempo connection failed",
          message: result?.error || "Tempo connection failed",
          source: "tempo",
        });
        setTempoFeedback(result?.error || "Tempo connection failed");
        return;
      }

      const userText =
        result.info?.user?.displayName ||
        result.info?.user?.accountId ||
        result.info?.account?.name ||
        "Tempo";
      notify({
        type: "success",
        title: "Tempo connected",
        message: `Connected to ${userText}.`,
        source: "tempo",
      });
      setTempoFeedback(`Connected to ${userText}.`);
    } catch (error) {
      console.error("Could not test Tempo connection:", error);
      notify({
        type: "error",
        title: "Tempo connection failed",
        message: "Could not test Tempo connection",
        source: "tempo",
      });
      setTempoFeedback("Could not test Tempo connection");
    } finally {
      setIsTempoBusy(false);
    }
  }

  async function handleClearTempoCredentials() {
    if (!window.loggerAPI?.tempoClearCredentials) {
      setMessage("Tempo storage is not available");
      setTempoFeedback("Tempo storage is not available");
      return;
    }

    setIsTempoBusy(true);
    setTempoFeedback("Clearing Tempo token...");

    try {
      const result = await window.loggerAPI.tempoClearCredentials();

      if (!result?.ok) {
        setMessage(result?.error || "Could not clear Tempo token");
        setTempoFeedback(result?.error || "Could not clear Tempo token");
        return;
      }

      setTempoStatus({ hasTempoApiToken: false });
      setTempoSyncResults([]);
      setMessageTone("success");
      setMessage("Tempo token cleared");
      setTempoFeedback("Tempo token cleared.");
    } catch (error) {
      console.error("Could not clear Tempo token:", error);
      setMessage("Could not clear Tempo token");
      setTempoFeedback("Could not clear Tempo token");
    } finally {
      setIsTempoBusy(false);
    }
  }

  async function handleSyncTempoWorklogs() {
    if (!window.loggerAPI?.tempoSyncWorklogs) {
      setMessage("Tempo sync is not available");
      setTempoFeedback("Tempo sync is not available");
      return;
    }

    if (!pendingTempoWorklogEntries.length) {
      setMessage("No Tempo worklogs to sync");
      setTempoFeedback("No Tempo worklogs to sync.");
      setTempoSyncResults([]);
      return;
    }

    setIsTempoBusy(true);
    setTempoFeedback(`Syncing ${pendingTempoWorklogEntries.length} Tempo worklogs...`);

    try {
      const result = await window.loggerAPI.tempoSyncWorklogs(pendingTempoWorklogEntries);
      const results = Array.isArray(result?.results) ? result.results : [];
      const successfulResults = results.filter((item) => item.success && item.tempoWorklogId);
      const syncedAt = new Date().toISOString();
      setTempoSyncResults(results);

      if (successfulResults.length) {
        const resultByEntryId = new Map(successfulResults.map((item) => [item.entryId, item]));

        setEntries((prev) =>
          prev.map((entry) => {
            const syncedResult = resultByEntryId.get(entry.id);
            if (!syncedResult) return entry;

            return {
              ...entry,
              tempoWorklogId: syncedResult.tempoWorklogId,
              tempoWorklogSelf: syncedResult.worklog?.self || "",
              tempoSyncedAt: syncedAt,
            };
          })
        );
      }

      const failedCount = results.filter((item) => !item.success).length;
      const firstFailure = results.find((item) => !item.success);
      const failureText = firstFailure
        ? ` First failure: ${firstFailure.issueKey || firstFailure.issueId || "entry"} - ${firstFailure.error || "Unknown error"}`
        : "";

      if (!result?.ok || failedCount) {
        const syncMessage = `Synced ${successfulResults.length} Tempo worklogs${failedCount ? `, ${failedCount} failed` : ""}.${failureText}`;
        notify({
          type: "error",
          title: "Tempo sync failed",
          message: syncMessage,
          source: "tempo",
        });
        setTempoFeedback(syncMessage);
        return;
      }

      notify({
        type: "success",
        title: "Tempo sync completed",
        message: `Synced ${successfulResults.length} Tempo worklogs.`,
        source: "tempo",
      });
      setTempoFeedback(`Synced ${successfulResults.length} Tempo worklogs.`);
    } catch (error) {
      console.error("Could not sync Tempo worklogs:", error);
      notify({
        type: "error",
        title: "Tempo sync failed",
        message: "Could not sync Tempo worklogs",
        source: "tempo",
      });
      setTempoFeedback("Could not sync Tempo worklogs");
    } finally {
      setIsTempoBusy(false);
    }
  }

  async function handleLoadJiraProjects() {
    if (!window.loggerAPI?.jiraListProjects) {
      setJiraErrorFeedback("Jira project loading is not available", "Jira projects failed");
      return;
    }

    setIsJiraFetchingTickets(true);
    setJiraDefaultFeedback("Loading Jira projects...");

    try {
      const result = await window.loggerAPI.jiraListProjects();

      if (!result?.success) {
        setJiraErrorFeedback(result?.error || "Could not load Jira projects", "Jira projects failed");
        return;
      }

      const projects = Array.isArray(result.projects) ? result.projects : [];
      setJiraProjects(projects);
      setSelectedJiraProjectKeys((prev) => {
        const availableKeys = new Set(projects.map((project) => project.key));
        return prev.filter((key) => availableKeys.has(key));
      });
      setJiraSuccessFeedback(`Loaded ${projects.length} Jira projects. Select projects, then fetch tickets.`, "Jira projects loaded");
    } catch (error) {
      console.error("Could not load Jira projects:", error);
      setJiraErrorFeedback("Could not load Jira projects", "Jira projects failed");
    } finally {
      setIsJiraFetchingTickets(false);
    }
  }

  function handleToggleJiraProject(projectKey) {
    const key = String(projectKey ?? "").trim().toUpperCase();
    if (!key) return;

    setSelectedJiraProjectKeys((prev) =>
      prev.includes(key)
        ? prev.filter((item) => item !== key)
        : [...prev, key]
    );
  }

  async function handleFetchJiraTickets() {
    if (!window.loggerAPI?.jiraFetchTickets) {
      setJiraErrorFeedback("Jira ticket fetching is not available", "Jira ticket fetch failed");
      return;
    }

    setIsJiraFetchingTickets(true);
    setJiraDefaultFeedback("Fetching Jira tickets...");

    try {
      const result = await window.loggerAPI.jiraFetchTickets({
        projectKeys: selectedJiraProjectKeys,
        query: jiraTicketQuery,
        maxResults: 5000,
      });

      if (!result?.success) {
        setJiraErrorFeedback(result?.error || "Could not fetch Jira tickets", "Jira ticket fetch failed");
        return;
      }

      const fetchedTickets = Array.isArray(result.tickets) ? result.tickets : [];
      const activeFilter = String(result.query || jiraTicketQuery || "").trim();
      const selectedProjectsText = selectedJiraProjectKeys.length
        ? selectedJiraProjectKeys.join(", ")
        : "all accessible projects";
      let addedCount = 0;
      let updatedCount = 0;

      setJiraTickets((prev) => {
        const existingById = new Map(prev.map((ticket) => [String(ticket.id).toUpperCase(), ticket]));
        const fetchedIds = new Set();
        const fetchedFirst = [];

        fetchedTickets.forEach((ticket) => {
          const id = String(ticket.id ?? "").trim().toUpperCase();
          if (!id) return;

          const existing = existingById.get(id);
          fetchedIds.add(id);

          if (existing) {
            const nextTitle = ticket.title || existing.title;
            const nextIssueId = ticket.issueId || existing.issueId || "";
            if (nextTitle !== existing.title) updatedCount += 1;
            fetchedFirst.push({ ...existing, id, issueId: nextIssueId, title: nextTitle });
            return;
          }

          fetchedFirst.push({
            id,
            issueId: String(ticket.issueId ?? "").trim(),
            title: String(ticket.title ?? "").trim(),
            favorite: false,
          });
          addedCount += 1;
        });

        const remaining = prev.filter((ticket) => {
          const id = String(ticket.id ?? "").trim().toUpperCase();
          return !fetchedIds.has(id) && !DEMO_TICKET_IDS.has(id);
        });

        return [...fetchedFirst, ...remaining];
      });

      setJiraSuccessFeedback(
        `Fetched ${fetchedTickets.length} Jira tickets from ${selectedProjectsText}${activeFilter ? ` with filter "${activeFilter}"` : ""}${addedCount ? `, added ${addedCount}` : ""}${updatedCount ? `, updated ${updatedCount}` : ""}${result.hasMore ? ", more available" : ""}.`,
        "Tickets fetched"
      );
    } catch (error) {
      console.error("Could not fetch Jira tickets:", error);
      setJiraErrorFeedback("Could not fetch Jira tickets", "Jira ticket fetch failed");
    } finally {
      setIsJiraFetchingTickets(false);
    }
  }

  async function handleOpenBugReport() {
    if (!window.loggerAPI?.openBugReportIssue) {
      setMessage("Bug reporting is not available");
      return;
    }

    try {
      const result = await window.loggerAPI.openBugReportIssue();

      if (!result?.ok) {
        setMessage(result?.error || "Could not open bug report template");
        return;
      }

      setMessageTone("success");
      setMessage("Bug report template opened");
    } catch (error) {
      console.error("Could not open bug report template:", error);
      setMessage("Could not open bug report template");
    }
  }

  function handleSaveManualEntry() {
    if (!manualTicket.trim()) {
      setMessage(manualEntryType === "task" ? "Skriv inn task-navn" : "Skriv inn ticket-navn");
      return;
    }

    if (!manualDate) {
      setMessage("Velg en dato");
      return;
    }

    const hours = toNumber(manualHours);
    const minutes = toNumber(manualMinutes);
    const totalSeconds = hours * 3600 + minutes * 60;

    if (totalSeconds <= 0) {
      setMessage("Manuell tid må være større enn 0");
      return;
    }

    const crossesDailyTarget =
      manualDate === todayDateKey &&
      todayLoggedSeconds < dailyTargetSeconds &&
      todayLoggedSeconds + totalSeconds >= dailyTargetSeconds;
    const timestamp = Date.now();
    const newEntry = {
      id: timestamp,
      ticketName: manualTicket.trim(),
      seconds: totalSeconds,
      status: "done",
      createdAt: manualDate,
      dateKey: manualDate,
      source: manualEntryType === "task" ? "todo" : "manual",
      ...(manualEntryType === "task" ? { todoTaskId: `manual-task-${timestamp}` } : {}),
    };

    setEntries((prev) => {
      const syncedEntries = prev.map((entry) =>
        entry.status === "running" && !entry.deletedAt
          ? applyElapsedTime(entry, timestamp)
          : entry
      );

      return addOrMergeCompletedTicketEntry(syncedEntries, newEntry);
    });
    setNowTick(timestamp);
    setCountdownPulse(true);
    setManualTicket("");
    setManualEntryType("ticket");
    setManualDate("");
    setManualHours("");
    setManualMinutes("");
    setManualFocused(null);
    setManualHighlightedTicketIndex(-1);
    setShowManualModal(false);
    setMessageTone("success");
    setMessage(manualEntryType === "task" ? "Manual task saved" : "Manual entry saved");

    if (crossesDailyTarget) {
      notifyDailyTargetReached(todayLoggedSeconds + totalSeconds);
    }
  }

  function handleSaveEditedEntry() {
    if (!editingEntryId) return;

    if (!editTicket.trim()) {
      setMessage("Skriv inn ticket-navn");
      return;
    }

    if (!editDate) {
      setMessage("Velg en dato");
      return;
    }

    const hours = toNumber(editHours);
    const minutes = toNumber(editMinutes);
    const totalSeconds = hours * 3600 + minutes * 60;

    if (totalSeconds <= 0) {
      setMessage("Time must be greater than 0");
      return;
    }

    const timestamp = Date.now();
    setEntries((prev) => {
      let syncedTimeAdjustment = null;

      const updatedEntries = prev.map((entry) => {
        if (entry.id !== editingEntryId) {
          return entry.status === "running" && !entry.deletedAt
            ? applyElapsedTime(entry, timestamp)
            : entry;
        }

        const syncedEntry = applyElapsedTime(entry, timestamp);
        const wasSyncedExternally = Boolean(syncedEntry.jiraWorklogId || syncedEntry.tempoWorklogId);
        const timeDeltaSeconds = totalSeconds - Number(syncedEntry.seconds || 0);

        if (wasSyncedExternally && timeDeltaSeconds > 0) {
          syncedTimeAdjustment = {
            id: timestamp,
            ticketName: editTicket.trim(),
            seconds: timeDeltaSeconds,
            status: "done",
            createdAt: editDate,
            dateKey: editDate,
            source: "manual",
          };

          return syncedEntry.status === "running"
            ? { ...syncedEntry, status: "paused", lastTickAt: undefined }
            : syncedEntry;
        }

        return {
          ...syncedEntry,
          ticketName: editTicket.trim(),
          seconds: totalSeconds,
          createdAt: editDate,
          dateKey: editDate,
          status: syncedEntry.status === "running" ? "paused" : syncedEntry.status,
          lastTickAt: undefined,
        };
      });

      return syncedTimeAdjustment
        ? addOrMergeCompletedTicketEntry(updatedEntries, syncedTimeAdjustment)
        : updatedEntries;
    });

    if (editingEntryId === activeEntryId) {
      setActiveEntryId(null);
    }

    closeEditEntry();
    setMessageTone("success");
    setMessage("Entry updated");
  }

  function getExportEntriesForPreset(preset = exportPreset) {
    const weekdayKeys = new Set(getCurrentWeekdayKeys());

    return activeEntries.filter((entry) => {
      const dateKey = getDateKey(entry);

      if (preset === "today") return dateKey === todayDateKey;
      if (preset === "week") return weekdayKeys.has(dateKey);
      if (preset === "tasks") return entry.source === "todo" || entry.todoTaskId;
      return true;
    });
  }

  function getJiraCopyText(preset = exportPreset) {
    const entriesToCopy = getExportEntriesForPreset(preset)
      .map((entry) => applyElapsedTime(entry, nowTick))
      .sort((a, b) => {
        const dateCompare = getDateKey(a).localeCompare(getDateKey(b));
        if (dateCompare !== 0) return dateCompare;
        return String(a.ticketName || "").localeCompare(String(b.ticketName || ""));
      });

    const lines = entriesToCopy.map((entry) => {
      const dateKey = getDateKey(entry);
      return `${dateKey} | ${entry.ticketName} | ${formatTimeShort(entry.seconds)}`;
    });

    const totalSeconds = entriesToCopy.reduce((sum, entry) => sum + entry.seconds, 0);
    return [...lines, `Total | ${formatTimeShort(totalSeconds)}`].join("\n");
  }

  async function handleCopyJiraFormat(preset = exportPreset) {
    const text = getJiraCopyText(preset);

    if (!text || text.startsWith("Total | 0m")) {
      setMessage("Ingen entries å kopiere");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setMessageTone("success");
      setMessage("Copied Jira format");
    } catch (error) {
      console.error("Could not copy Jira format:", error);
      setMessage("Could not copy Jira format");
    }
  }

  function getExportPreviewLines(preset = exportPreset) {
    return getJiraCopyText(preset).split("\n").filter(Boolean).slice(0, 5);
  }

  function handleCloseDay() {
    const timestamp = Date.now();

    setEntries((prev) =>
      prev.map((entry) =>
        entry.status === "running" && !entry.deletedAt
          ? { ...applyElapsedTime(entry, timestamp), status: "paused", lastTickAt: undefined }
          : entry
      )
    );
    setActiveEntryId(null);
    setNowTick(timestamp);
    setMessageTone("success");
    setMessage("Day reviewed");
  }

  async function handleExportCSV(preset = exportPreset) {
    const entriesToExport = getExportEntriesForPreset(preset);

    if (!entriesToExport.length) {
      setMessage("Ingen entries å eksportere");
      return;
    }

    try {
      const exportEntries = entriesToExport.map((entry) => ({
        ...entry,
        formatted: formatTime(applyElapsedTime(entry, nowTick).seconds),
        seconds: applyElapsedTime(entry, nowTick).seconds,
      }));

      const result = await window.loggerAPI?.exportEntriesToCSV(exportEntries);

      if (result?.canceled) {
        setMessage("Export canceled");
        return;
      }

      if (result?.ok) {
        setMessage("CSV exported");
      }
    } catch (error) {
      console.error("Could not export CSV:", error);
      setMessage("Could not export CSV");
    }
  }

  async function handleImportTickets() {
    setShowImportGuide(false);

    if (!window.loggerAPI?.importTicketsFromFile) {
      notify({
        type: "error",
        title: "Import failed",
        message: "Import is not available",
        source: "import",
      });
      return;
    }

    const result = await window.loggerAPI.importTicketsFromFile();

    if (!result?.ok) {
      if (!result?.canceled) {
        notify({
          type: "error",
          title: "Import failed",
          message: "Could not import tickets",
          source: "import",
        });
      }
      return;
    }

    const importedTickets = Array.isArray(result.tickets) ? result.tickets : [];
    const importedEntries = Array.isArray(result.entries) ? result.entries : [];

    if (!importedTickets.length && !importedEntries.length) {
      notify({
        type: "warning",
        title: "Import completed",
        message: "No tickets found",
        source: "import",
      });
      return;
    }

    let addedCount = 0;
    let updatedCount = 0;

    setJiraTickets((prev) => {
      const existingById = new Map(prev.map((ticket) => [ticket.id.toLowerCase(), ticket]));
      const next = [...prev];

      importedTickets.forEach((ticket) => {
        const id = String(ticket.id ?? "").trim();
        if (!id) return;

        const key = id.toLowerCase();
        const existing = existingById.get(key);

        if (existing) {
          const nextTitle = ticket.title || existing.title;
          const nextFavorite = existing.favorite || Boolean(ticket.favorite);
          if (nextTitle !== existing.title || nextFavorite !== existing.favorite) {
            const index = next.findIndex((item) => item.id.toLowerCase() === key);
            next[index] = { ...existing, title: nextTitle, favorite: nextFavorite };
            updatedCount += 1;
          }
          return;
        }

        const newTicket = {
          id,
          title: String(ticket.title ?? "").trim(),
          favorite: Boolean(ticket.favorite),
        };
        existingById.set(key, newTicket);
        next.push(newTicket);
        addedCount += 1;
      });

      return next;
    });

    const now = Date.now();
    let entryCount = 0;

    if (importedEntries.length) {
      setEntries((prev) => {
        let next = prev;

        importedEntries.forEach((entry, index) => {
          const seconds = Number(entry.seconds) || 0;
          const ticketName = String(entry.ticketName ?? "").trim();
          if (!ticketName || seconds <= 0) return;

          const newEntry = {
            id: now + index,
            ticketName,
            seconds,
            status: "done",
            createdAt: entry.createdAt || getTodayDate(),
            dateKey: getDateKey({ createdAt: entry.createdAt || getTodayDate() }),
            source: "manual",
          };

          next = addOrMergeCompletedTicketEntry(next, newEntry);
          entryCount += 1;
        });

        return next;
      });
    }

    notify({
      type: "success",
      title: "Import completed",
      message: `Imported ${addedCount} tickets${updatedCount ? `, updated ${updatedCount}` : ""}${entryCount ? `, ${entryCount} entries` : ""}`,
      source: "import",
    });
  }

  function openImportGuide() {
    setShowImportGuide(true);
  }

  function toggleTodoPanel() {
    setShowTodoPanel((prev) => {
      if (!prev) setTodoView("list");
      return !prev;
    });
    setShowTrashView(false);
    setShowMissingTimeView(false);
    setShowReminderInbox(false);
    setShowEndDayView(false);
    setShowExportView(false);
    setShowManualModal(false);
  }

  const miniTicketSuggestionList = isMiniTicketFocused && miniTicketSuggestions.length > 0 && (
    <ul className="mini-ticket-suggestions" id="mini-ticket-suggestions" role="listbox">
      {miniTicketSuggestions.map((ticket, index) => (
        <li
          key={ticket.id}
          id={`mini-ticket-suggestion-${ticket.id}`}
          className={miniHighlightedTicketIndex === index ? "highlighted" : ""}
          role="option"
          aria-selected={miniHighlightedTicketIndex === index}
        >
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              selectMiniTicket(ticket);
            }}
          >
            <strong>{ticket.id}</strong>
            {ticket.title && <span>{ticket.title}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
  const canSaveManual = Boolean(manualTicket.trim() && (manualHours || manualMinutes));
  const manualTicketSuggestionList = manualTicketSuggestions.length > 0 && (
    <ul className="manual-ticket-suggestions" id="manual-ticket-suggestions" role="listbox">
      {manualTicketSuggestions.map((ticket, index) => (
        <li
          key={ticket.id}
          id={`manual-ticket-suggestion-${ticket.id}`}
          className={manualHighlightedTicketIndex === index ? "highlighted" : ""}
          role="option"
          aria-selected={manualHighlightedTicketIndex === index}
        >
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              selectManualTicket(ticket);
            }}
          >
            <strong>{ticket.id}</strong>
            {ticket.title && <span>{ticket.title}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
  const canSaveEdit = Boolean(editTicket.trim() && editDate && (editHours || editMinutes));
  const miniHasTicket = miniTicket.trim() !== "";
  const miniIsRunning = activeEntryId != null;
  const remainingPercent = Math.max(0, Math.min(100, (countdownSeconds / dailyTargetSeconds) * 100));
  const importGuide = showImportGuide && (
    <div className="import-guide-backdrop" onClick={() => setShowImportGuide(false)}>
      <div className="import-guide" onClick={(event) => event.stopPropagation()}>
        <div className="import-guide-header">
          <div>
            <h2>Import format</h2>
            <p>CSV, TSV og TXT støttes</p>
          </div>
          <button type="button" onClick={() => setShowImportGuide(false)} aria-label="Close import guide">
            <Icon name="close" size={13} />
          </button>
        </div>

        <div className="import-guide-body">
          <div>
            <span>Required</span>
            <strong>Ticket</strong>
            <p>Kan også hete Ticket ID, ID eller Key.</p>
          </div>

          <div>
            <span>Optional</span>
            <strong>Title, Favorite, Date, Duration, Hours, Minutes</strong>
            <p>Favorite støtter yes, true, 1, ja eller x.</p>
          </div>

          <pre>{`Ticket;Date;Duration
PROJ-123;2026-05-11;1:30
PROJ-456;2026-05-11;2t`}</pre>
        </div>

        <div className="import-guide-actions">
          <button type="button" className="import-guide-cancel" onClick={() => setShowImportGuide(false)}>
            Cancel
          </button>
          <button type="button" className="import-guide-primary" onClick={handleImportTickets}>
            <Icon name="import" size={13} />
            Choose file
          </button>
        </div>
      </div>
    </div>
  );
  const shortcutPanel = (
    <div className={`shortcut-layer ${isMiniMode ? "mini" : "full"}`}>
      {showShortcuts && (
        <div className="shortcuts-panel">
          <h3>{isMiniMode ? "Shortcuts" : "Keyboard shortcuts"}</h3>
          <div className="shortcuts-list">
            <div>
              <span>Start ticket</span>
              <span><kbd>S</kbd></span>
            </div>
            <div>
              <span>Pause</span>
              <span><kbd>P</kbd></span>
            </div>
            <div>
              <span>Done</span>
              <span><kbd>D</kbd><em>/</em><kbd>F</kbd></span>
            </div>
            <div>
              <span>Manual entry</span>
              <span><kbd>M</kbd></span>
            </div>
            <div>
              <span>To-do panel</span>
              <span><kbd>Alt</kbd><em>+</em><kbd>T</kbd></span>
            </div>
            <div>
              <span>Hurtigfangst</span>
              <span><kbd>Ctrl</kbd><em>+</em><kbd>K</kbd></span>
            </div>
            <div>
              <span>Påminnelser</span>
              <span><kbd>Alt</kbd><em>+</em><kbd>R</kbd></span>
            </div>
            <div>
              <span>Avslutt dag</span>
              <span><kbd>Alt</kbd><em>+</em><kbd>E</kbd></span>
            </div>
            <div>
              <span>Eksport</span>
              <span><kbd>Alt</kbd><em>+</em><kbd>X</kbd></span>
            </div>
            <div>
              <span>Missing time</span>
              <span><kbd>Alt</kbd><em>+</em><kbd>M</kbd></span>
            </div>
          </div>
          <div className="shortcuts-panel-footer">
            <span>This panel</span>
            <kbd>?</kbd>
          </div>
        </div>
      )}

      <button
        type="button"
        className="shortcut-floating-btn"
        onClick={() => setShowShortcuts((prev) => !prev)}
        title="Keyboard shortcuts"
        aria-label="Keyboard shortcuts"
      >
        ?
      </button>
    </div>
  );
  const todoReminder = activeReminderTask && (
    <div className={`todo-reminder ${isMiniMode ? "mini" : "full"}`}>
      <div className="todo-reminder-main">
        <span className="todo-reminder-icon"><Icon name="bell" size={13} /></span>
        <div>
          <strong>{activeReminderTask.title}</strong>
          <span>
            Kl. {formatReminderTime(activeReminderTask.reminder)}
            {activeReminderTask.priority ? ` - ${activeReminderTask.priority} priority` : ""}
          </span>
        </div>
      </div>

      <div className="todo-reminder-actions">
        <button
          type="button"
          className="todo-reminder-start"
          onClick={startTodoReminder}
        >
          Start
        </button>

        <button
          type="button"
          className="todo-reminder-snooze"
          onClick={() => setShowTodoSnoozeMenu((prev) => !prev)}
        >
          Utsett
        </button>

        <button
          type="button"
          className="todo-reminder-close"
          onClick={dismissTodoReminder}
        >
          Lukk
        </button>
      </div>

      {showTodoSnoozeMenu && (
        <div className="todo-snooze-menu">
          <span>Utsett påminnelse</span>

          <div className="todo-snooze-grid">
            <button type="button" onClick={() => snoozeTodoReminder(5)}>5 min</button>
            <button type="button" onClick={() => snoozeTodoReminder(15)}>15 min</button>
            <button type="button" onClick={() => snoozeTodoReminder(30)}>30 min</button>
            <button type="button" onClick={() => snoozeTodoReminder(60)}>1 time</button>
            <button type="button" onClick={snoozeTodoReminderUntilTomorrow}>I morgen</button>
          </div>

          <div className="todo-snooze-footer">
            <button type="button" className="todo-snooze-dismiss" onClick={dismissTodoReminder}>
              Avvis
            </button>
            <button type="button" className="todo-snooze-done" onClick={completeTodoReminder}>
              Merk som ferdig
            </button>
          </div>
        </div>
      )}
    </div>
  );
  const storageWarning = showStorageWarning && (
    <div className={`todo-reminder storage-warning ${isMiniMode ? "mini" : "full"}`}>
      <div className="todo-reminder-main">
        <span className="todo-reminder-icon"><Icon name="warning" size={13} /></span>
        <div>
          <strong>Lagring begynner å bli full</strong>
          <span>{storagePercent.toFixed(1)}% ledig lagring igjen</span>
        </div>
      </div>

      <div className="todo-reminder-actions">
        <button
          type="button"
          className="todo-reminder-snooze"
          onClick={() => snoozeStorageWarning(24)}
        >
          Utsett
        </button>

        <button
          type="button"
          className="todo-reminder-close"
          onClick={dismissStorageWarning}
        >
          Lukk
        </button>
      </div>
    </div>
  );

  const reminderInboxView = (
    <section className="smart-view">
      <div className="smart-view-header">
        <div>
          <span>Tasks</span>
          <h2>{text.reminders}</h2>
        </div>
        <button type="button" className="todo-close-btn" onClick={() => setShowReminderInbox(false)}>
          <Icon name="close" size={13} />
        </button>
      </div>

      <div className="smart-summary-grid">
        <div>
          <span>{text.dueNow}</span>
          <strong>{dueReminderCount}</strong>
        </div>
        <div>
          <span>{text.scheduled}</span>
          <strong>{reminderInboxTasks.length}</strong>
        </div>
      </div>

      <div className="smart-list">
        {reminderInboxTasks.length === 0 ? (
          <p className="smart-empty">{text.noReminders}</p>
        ) : (
          reminderInboxTasks.map((task) => (
            <div key={task.id} className={`smart-item ${task.reminderStatus}`}>
              <div className="smart-item-main">
                <strong>{task.title}</strong>
                <span>
                  {task.reminderStatus === "snoozed"
                    ? `${text.snoozedUntil} ${formatReminderTime(task.snoozedUntil)}`
                    : `${task.reminderStatus} - ${task.reminder?.replace("T", " ")}`}
                </span>
              </div>
              <div className="smart-item-actions">
                <button type="button" onClick={() => startTaskReminder(task)}>Start</button>
                <button type="button" onClick={() => snoozeTaskReminder(task, 15)}>15 min</button>
                <button type="button" onClick={() => dismissTaskReminder(task)}>Lukk</button>
                <button type="button" className="success" onClick={() => completeTaskReminder(task)}>{text.done}</button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );

  const endDayView = (
    <section className="smart-view">
      <div className="smart-view-header">
        <div>
          <span>Review</span>
          <h2>{text.endDay}</h2>
        </div>
        <button type="button" className="todo-close-btn" onClick={() => setShowEndDayView(false)}>
          <Icon name="close" size={13} />
        </button>
      </div>

      <div className="smart-summary-grid">
        <div>
          <span>{text.logged}</span>
          <strong>{formatTimeShort(todayLoggedSeconds)}</strong>
        </div>
        <div>
          <span>{text.remaining}</span>
          <strong>{formatTimeShort(countdownSeconds)}</strong>
        </div>
      </div>

      <div className="end-day-actions">
        <button type="button" onClick={() => openManual("", "ticket")}>
          <Icon name="plus" size={12} />
          <span>{text.add}</span>
        </button>
        <button type="button" onClick={() => handleExportCSV("today")}>
          <Icon name="export" size={12} />
          <span>{text.export}</span>
        </button>
        <button type="button" className="success" onClick={handleCloseDay}>
          <Icon name="finish" size={12} />
          <span>{text.closeDay}</span>
        </button>
      </div>

      <div className="end-day-checklist">
        <div className={activeEntry ? "warning" : "done"}>
          <Icon name={activeEntry ? "warning" : "check"} size={12} />
          <span>{activeEntry ? (appLanguage === "en" ? "Active timer needs review" : "Aktiv timer må vurderes") : (appLanguage === "en" ? "No active timer" : "Ingen aktiv timer")}</span>
        </div>
        <div className={countdownSeconds > 0 ? "warning" : "done"}>
          <Icon name={countdownSeconds > 0 ? "warning" : "check"} size={12} />
          <span>{countdownSeconds > 0 ? `${formatTimeShort(countdownSeconds)} ${appLanguage === "en" ? "remaining" : "mangler"}` : (appLanguage === "en" ? "Daily target reached" : "Dagsmål nådd")}</span>
        </div>
        <div className={visibleTodoTasks.length > 0 ? "warning" : "done"}>
          <Icon name={visibleTodoTasks.length > 0 ? "warning" : "check"} size={12} />
          <span>{visibleTodoTasks.length > 0 ? `${visibleTodoTasks.length} ${appLanguage === "en" ? "open tasks" : "åpne tasks"}` : (appLanguage === "en" ? "Tasks cleared" : "Tasks ryddet")}</span>
        </div>
      </div>

      <div className="smart-list compact">
        {activeEntry && (
          <div className="smart-item due">
            <div className="smart-item-main">
              <strong>{activeEntry.ticketName}</strong>
              <span>{text.running} - {formatTime(activeEntry.seconds)}</span>
            </div>
            <div className="smart-item-actions">
              <button type="button" onClick={handlePauseCurrent}>Pause</button>
              <button type="button" onClick={() => handleFinish(activeEntry.id)}>{text.done}</button>
            </div>
          </div>
        )}

        {visibleTodoTasks.slice(0, 5).map((task) => (
          <div key={task.id} className="smart-item">
            <div className="smart-item-main">
              <strong>{task.title}</strong>
              <span>{task.priority} {appLanguage === "en" ? "priority" : "prioritet"}</span>
            </div>
            <div className="smart-item-actions">
              <button type="button" onClick={() => startTaskReminder(task)}>Start</button>
              <button type="button" className="success" onClick={() => completeTaskReminder(task)}>{text.done}</button>
            </div>
          </div>
        ))}

        {!activeEntry && visibleTodoTasks.length === 0 && (
          <p className="smart-empty">{text.noActiveOrTasks}</p>
        )}
      </div>
    </section>
  );

  const exportPresetOptions = [
    { id: "today", label: text.today, detail: `${getExportEntriesForPreset("today").length} entries` },
    { id: "week", label: text.thisWeek, detail: `${getExportEntriesForPreset("week").length} entries` },
    { id: "tasks", label: text.tasksOnly, detail: `${getExportEntriesForPreset("tasks").length} entries` },
    { id: "all", label: text.allActive, detail: `${getExportEntriesForPreset("all").length} entries` },
  ];

  const exportView = (
    <section className="smart-view">
      <div className="smart-view-header">
        <div>
          <span>CSV</span>
          <h2>{text.export}</h2>
        </div>
        <button type="button" className="todo-close-btn" onClick={() => setShowExportView(false)}>
          <Icon name="close" size={13} />
        </button>
      </div>

      <div className="export-preset-list">
        {exportPresetOptions.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={exportPreset === preset.id ? "active" : ""}
            onClick={() => setExportPreset(preset.id)}
          >
            <span>{preset.label}</span>
            <strong>{preset.detail}</strong>
          </button>
        ))}
      </div>

      <div className="export-actions">
        <button type="button" className="success" onClick={() => handleExportCSV(exportPreset)}>
          <Icon name="export" size={12} />
          <span>{text.export}</span>
        </button>
        <button type="button" onClick={() => handleCopyJiraFormat(exportPreset)}>
          <Icon name="check" size={12} />
          <span>{text.copyJira}</span>
        </button>
      </div>

      <div className="export-preview">
        <span>{text.preview}</span>
        {getExportPreviewLines(exportPreset).length ? (
          getExportPreviewLines(exportPreset).map((line) => (
            <code key={line}>{line}</code>
          ))
        ) : (
          <p>{text.noEntriesPreset}</p>
        )}
      </div>
    </section>
  );

  const missingTimeView = (
    <section className="missing-time-view">
      <div className="missing-time-header">
        <div className="missing-time-title">
          <Icon name="missingTime" size={14} />
          <h2>Missing time</h2>
        </div>

        <button
          type="button"
          className="todo-close-btn"
          onClick={() => setShowMissingTimeView(false)}
          title="Close missing time"
        >
          <Icon name="close" size={13} />
        </button>
      </div>

      <div className="missing-time-summary">
        <span>Total owed</span>
        <strong>{formatMissingDelta(totalMissingSeconds)}</strong>
        <p>
          Across {missingTimeDays.filter((day) => day.missingSeconds > 0).length} days - Target {formatTimeShort(dailyTargetSeconds)} / day
        </p>
      </div>

      <div className="missing-week-card">
        <div className="missing-week-row">
          <span>This week</span>
          <strong>
            {formatTimeShort(totalWeekLoggedSeconds)} / {formatTimeShort(totalWeekTargetSeconds)}
          </strong>
        </div>
        <div className="missing-progress-track">
          <div
            className="missing-progress-fill"
            style={{
              width: `${totalWeekTargetSeconds ? Math.min(100, (totalWeekLoggedSeconds / totalWeekTargetSeconds) * 100) : 0}%`,
            }}
          />
        </div>
        <div className="missing-week-row muted">
          <span>
            {totalWeekTargetSeconds
              ? Math.round((totalWeekLoggedSeconds / totalWeekTargetSeconds) * 100)
              : 0}% logged
          </span>
          <span>Missing <strong>{formatTimeShort(totalMissingSeconds)}</strong></span>
        </div>
      </div>

      <div className="missing-toolbar">
        <div className="missing-tabs">
          <button
            type="button"
            className={missingTimeFilter === "missing" ? "active" : ""}
            onClick={() => setMissingTimeFilter("missing")}
          >
            Missing
          </button>
          <button
            type="button"
            className={missingTimeFilter === "all" ? "active" : ""}
            onClick={() => setMissingTimeFilter("all")}
          >
            All days
          </button>
        </div>

        <button type="button" className="missing-period-btn">
          <Icon name="todo" size={12} />
          <span>This week</span>
        </button>
      </div>

      <div className="missing-day-list">
        {visibleMissingTimeDays.length === 0 ? (
          <p className="missing-empty">No missing time this week</p>
        ) : (
          visibleMissingTimeDays.map((day) => (
            <div key={day.dateKey} className={`missing-day ${day.status}`}>
              <div className="missing-day-main">
                <div className="missing-day-label">
                  <strong>{formatMissingDayLabel(day.dateKey)}</strong>
                  <span>{getWeekdayLabel(day.dateKey)}</span>
                  <em>
                    {day.status === "reset"
                      ? "RESET"
                      : day.status === "partial"
                        ? "PARTIAL"
                        : day.status === "over"
                          ? `+${Math.round(day.deltaSeconds / 60)}M`
                          : "DONE"}
                  </em>
                </div>
                <div className="missing-day-track">
                  <div
                    className="missing-day-fill"
                    style={{ width: `${day.percent}%` }}
                  />
                </div>
              </div>

              <div className="missing-day-side">
                <strong>{formatMissingDelta(day.deltaSeconds)}</strong>
                <span>of {formatMissingDelta(dailyTargetSeconds)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="missing-footer">
        <span>Goal: <strong>{formatTimeShort(dailyTargetSeconds)}</strong> / day</span>
        <button type="button" onClick={() => openManual("", "ticket")}>
          <Icon name="play" size={12} />
          <span>Make up time</span>
        </button>
      </div>
    </section>
  );
  const trashView = (
    <section className="trash-view">
      <div className="trash-header">
        <div className="trash-title">
          <Icon name="trashCan" size={13} />
          <h2>Trash</h2>
        </div>

        <button
          type="button"
          className="todo-close-btn"
          onClick={() => setShowTrashView(false)}
          title="Close trash"
        >
          <Icon name="close" size={13} />
        </button>
      </div>

      <div className="trash-tabs">
        <button
          type="button"
          className={trashTab === "tickets" ? "active" : ""}
          onClick={() => setTrashTab("tickets")}
        >
          Tickets <span>{deletedEntries.length}</span>
        </button>
        <button
          type="button"
          className={trashTab === "tasks" ? "active" : ""}
          onClick={() => setTrashTab("tasks")}
        >
          Tasks <span>{deletedTodoTasks.length}</span>
        </button>
      </div>

      <div className="trash-toolbar">
        <input
          type="text"
          value={trashSearch}
          onChange={(event) => setTrashSearch(event.target.value)}
          placeholder="Search deleted..."
        />

        <button type="button" className="trash-empty-btn" onClick={emptyTrash}>
          <Icon name="trashCan" size={11} />
          <span>Empty all</span>
        </button>
      </div>

      <div className="trash-list">
        {trashTab === "tickets" && (
          filteredDeletedEntries.length === 0 ? (
            <p className="trash-empty-state">No deleted tickets</p>
          ) : (
            filteredDeletedEntries.map((entry) => (
              <div key={entry.id} className="trash-item">
                <div className="trash-item-main">
                  <strong>{entry.ticketName}</strong>
                  <span>Deletes in {getDaysUntilPermanentDelete(entry.deletedAt)}d</span>
                </div>

                <span className="trash-item-time">{formatTimeShort(entry.seconds)}</span>

                <button type="button" onClick={() => restoreEntry(entry.id)} title="Restore">
                  <Icon name="restore" size={12} />
                </button>
                <button type="button" onClick={() => permanentlyDeleteEntry(entry.id)} title="Delete permanently">
                  <Icon name="close" size={12} />
                </button>
              </div>
            ))
          )
        )}

        {trashTab === "tasks" && (
          filteredDeletedTodoTasks.length === 0 ? (
            <p className="trash-empty-state">No deleted tasks</p>
          ) : (
            filteredDeletedTodoTasks.map((task) => (
              <div key={task.id} className="trash-item">
                <div className="trash-item-main">
                  <strong>{task.title}</strong>
                  <span>Deletes in {getDaysUntilPermanentDelete(task.deletedAt)}d</span>
                </div>

                <span className="trash-item-time">{task.priority}</span>

                <button type="button" onClick={() => restoreTodoTask(task.id)} title="Restore">
                  <Icon name="restore" size={12} />
                </button>
                <button type="button" onClick={() => permanentlyDeleteTodoTask(task.id)} title="Delete permanently">
                  <Icon name="close" size={12} />
                </button>
              </div>
            ))
          )
        )}
      </div>

      <div className="trash-footer">
        <span>
          {deletedEntries.length + deletedTodoTasks.length} items
        </span>
        <select
          value={trashRetentionDays}
          onChange={(event) => setTrashRetentionDays(Number(event.target.value))}
          aria-label="Trash retention"
        >
          <option value={7}>Keep for 7 days</option>
          <option value={14}>Keep for 14 days</option>
        </select>
      </div>
    </section>
  );

  const todoPanel = (
    <section className="todo-panel">
      <div className="todo-panel-header">
        <div>
          <h2>{todoView === "new" ? (appLanguage === "en" ? "New task" : "Ny task") : text.tasks}</h2>
          <span>{activeTodoCount} active</span>
        </div>

        <div className="todo-header-actions">
          {todoView === "list" ? (
            <button
              type="button"
              className="todo-new-btn"
              onClick={openNewTodoView}
              title="Ny task"
            >
              <Icon name="plus" size={13} />
            </button>
          ) : (
            <button
              type="button"
              className="todo-back-btn"
              onClick={() => setTodoView("list")}
            >
              {text.back}
            </button>
          )}

          <button
            type="button"
            className="todo-close-btn"
            onClick={() => setShowTodoPanel(false)}
            title="Close todo"
          >
            <Icon name="close" size={13} />
          </button>
        </div>
      </div>

      {todoView === "new" ? (
        <form
        className="todo-form"
        onSubmit={(event) => {
          event.preventDefault();
          handleAddTodoTask();
        }}
      >
        {todoDraft.sourceTicket && (
          <span className="todo-source-badge">Fra ticket</span>
        )}

          <input
            type="text"
            value={todoDraft.title}
            onChange={(event) =>
              setTodoDraft((prev) => ({ ...prev, title: event.target.value }))
          }
            placeholder="Task title"
          />

          <textarea
            value={todoDraft.notes}
            onChange={(event) =>
              setTodoDraft((prev) => ({ ...prev, notes: event.target.value }))
            }
            placeholder="Notater"
            rows={3}
          />

          <div className="todo-form-row">
          <select
            value={todoDraft.priority}
            onChange={(event) =>
              setTodoDraft((prev) => ({ ...prev, priority: event.target.value }))
            }
            aria-label="Prioritet"
          >
            <option value="low">Lav</option>
            <option value="normal">Normal</option>
            <option value="high">Høy</option>
          </select>

          <input
            type="datetime-local"
            value={todoDraft.reminder}
            onChange={(event) =>
              setTodoDraft((prev) => ({ ...prev, reminder: event.target.value }))
            }
            aria-label="Påminnelse"
          />
        </div>

        <div className="todo-form-actions">
          <button
            type="button"
            className="todo-cancel-btn"
            onClick={() => setTodoView("list")}
          >
            Avbryt
          </button>

          <button type="submit" className="todo-add-btn">
            <Icon name="plus" size={12} />
            <span>Legg til task</span>
          </button>
        </div>
      </form>
      ) : (

      <>
        <div className="todo-filter-tabs" role="group" aria-label="Task filter">
          {[
            ["all", text.all],
            ["today", text.today],
            ["overdue", text.overdue],
            ["none", text.noReminder],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={todoFilter === value ? "active" : ""}
              onClick={() => setTodoFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="todo-list">
          {visibleTodoTasks.length === 0 ? (
            <div className="todo-empty-state">
              <p>Ingen tasks enda</p>
              <button type="button" onClick={openNewTodoView}>
                <Icon name="plus" size={12} />
                <span>Ny task</span>
              </button>
            </div>
          ) : (
            visibleTodoTasks.map((task) => {
              const timerEntry = getTodoTimerEntry(task.id);
              const isTaskTimerRunning = timerEntry?.id === activeEntryId;
              const reminderStatus = getTodoReminderDayStatus(task);

              return (
              <div key={task.id} className={`todo-item ${timerEntry ? "timed" : ""}`}>
              <button
                type="button"
                className="todo-check-btn"
                onClick={() => toggleTodoTask(task.id)}
                title="Marker ferdig"
              >
              </button>

              <div className="todo-item-main">
                <strong>{task.title}</strong>
                <div className="todo-item-meta">
                  {task.sourceTicket && <span className="todo-chip source">Fra ticket</span>}
                  <span className={`todo-chip priority ${task.priority}`}>{task.priority}</span>
                  <span className={`todo-chip reminder ${reminderStatus}`}>
                    {reminderStatus === "none"
                      ? text.noReminder
                      : reminderStatus === "overdue"
                        ? text.overdue
                      : reminderStatus === "today"
                          ? `${text.today} ${formatReminderTime(task.reminder)}`
                          : task.reminder.replace("T", " ")}
                  </span>
                  {timerEntry && <span className="todo-chip timed">{formatTime(timerEntry.seconds)}</span>}
                </div>
                {task.notes && <p className="todo-item-notes">{task.notes}</p>}
              </div>

              <button
                type="button"
                className={`todo-timer-btn ${isTaskTimerRunning ? "running" : ""}`}
                onClick={() => handleStartTodoTimer(task)}
                title={isTaskTimerRunning ? "Pause task timer" : "Start task timer"}
              >
                <Icon name={isTaskTimerRunning ? "pause" : "play"} size={11} />
                <span>{isTaskTimerRunning ? "Pause" : timerEntry ? "Resume" : "Start"}</span>
              </button>

              <button
                type="button"
                className="todo-delete-btn"
                onClick={() => deleteTodoTask(task.id)}
                title="Slett task"
              >
                <Icon name="trash" size={12} />
              </button>
            </div>
              );
            })
        )}
        </div>
      </>
      )}
    </section>
  );

  const manualSection = (
    <section className={isMiniMode ? "mini-manual-section" : "section manual-entry-top"}>
      <div className="modal-header">
        <div>
          <h2>{manualEntryType === "task" ? "Manual Task" : "Manual Entry"}</h2>
          {!isMiniMode && (
            <p>
              {manualEntryType === "task"
                ? "Log time for a task manually"
                : "Log time for a ticket manually"}
            </p>
          )}
        </div>
        <button
          type="button"
          className="modal-close"
          onClick={() => setShowManualModal(false)}
        >
          ×
        </button>
      </div>

      <form
        className={isMiniMode ? "manual-entry-form manual-entry-form-mini" : "manual-entry-form"}
        onSubmit={(e) => {
          e.preventDefault();
          handleSaveManualEntry();
        }}
      >
        <div className="modal-body">
          <div className="manual-type-toggle" role="group" aria-label="Manual entry type">
            <button
              type="button"
              className={manualEntryType === "ticket" ? "active" : ""}
              onClick={() => setManualEntryType("ticket")}
            >
              Ticket
            </button>
            <button
              type="button"
              className={manualEntryType === "task" ? "active" : ""}
              onClick={() => setManualEntryType("task")}
            >
              Task
            </button>
          </div>

          {isMiniMode ? (
            <>
              <div className="mini-manual-ticket-row">
                <input
                  id="mini-manual-ticket"
                  ref={manualTicketRef}
                  type="text"
                  value={manualTicket}
                  onChange={(e) => handleManualTicketChange(e.target.value)}
                  onKeyDown={handleManualTicketKeyDown}
                  onFocus={() => setManualFocused("ticket")}
                  onBlur={() => {
                    setManualFocused(null);
                    setManualHighlightedTicketIndex(-1);
                  }}
                  className={manualFocused === "ticket" ? "focused" : ""}
                  placeholder={manualEntryType === "task" ? "Task" : "Ticket"}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls="manual-ticket-suggestions"
                  aria-expanded={manualFocused === "ticket" && manualTicketSuggestions.length > 0}
                  aria-activedescendant={
                    manualHighlightedTicketIndex >= 0 && manualTicketSuggestions[manualHighlightedTicketIndex]
                      ? `manual-ticket-suggestion-${manualTicketSuggestions[manualHighlightedTicketIndex].id}`
                      : undefined
                  }
                />

                <input
                  type="text"
                  inputMode="numeric"
                  value={manualHours}
                  onChange={(e) => {
                    const value = onlyDigits(e.target.value);
                    setManualHours(value);

                    if (value.length >= 2) {
                      document.getElementById("mini-minutes-input")?.focus();
                    }
                  }}
                  onFocus={() => setManualFocused("hours")}
                  onBlur={() => setManualFocused(null)}
                  className={manualFocused === "hours" ? "focused" : ""}
                  placeholder="H"
                />

                <span className="manual-duration-separator">:</span>

                <input
                  id="mini-minutes-input"
                  type="text"
                  inputMode="numeric"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(onlyDigits(e.target.value))}
                  onFocus={() => setManualFocused("minutes")}
                  onBlur={() => setManualFocused(null)}
                  className={manualFocused === "minutes" ? "focused" : ""}
                  placeholder="M"
                />
              </div>

              {manualFocused === "ticket" && manualTicketSuggestionList}

              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                onFocus={() => setManualFocused("date")}
                onBlur={() => setManualFocused(null)}
                className={`mini-manual-date ${manualFocused === "date" ? "focused" : ""}`}
              />
            </>
          ) : (
            <>
              <label className="manual-field-label" htmlFor="manual-ticket">
                {manualEntryType === "task" ? "Task" : "Ticket"}
              </label>
              <input
                id="manual-ticket"
                ref={manualTicketRef}
                type="text"
                value={manualTicket}
                onChange={(e) => handleManualTicketChange(e.target.value)}
                onKeyDown={handleManualTicketKeyDown}
                onFocus={() => setManualFocused("ticket")}
                onBlur={() => {
                  setManualFocused(null);
                  setManualHighlightedTicketIndex(-1);
                }}
                className={manualFocused === "ticket" ? "focused" : ""}
                placeholder={manualEntryType === "task" ? "e.g. Write meeting notes" : "e.g. PROJ-1234"}
                role="combobox"
                aria-autocomplete="list"
                aria-controls="manual-ticket-suggestions"
                aria-expanded={manualFocused === "ticket" && manualTicketSuggestions.length > 0}
                aria-activedescendant={
                  manualHighlightedTicketIndex >= 0 && manualTicketSuggestions[manualHighlightedTicketIndex]
                    ? `manual-ticket-suggestion-${manualTicketSuggestions[manualHighlightedTicketIndex].id}`
                    : undefined
                }
              />
              {manualFocused === "ticket" && manualTicketSuggestionList}

              <label className="manual-field-label">Date &amp; Duration</label>
              <div className="manual-row">
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  onFocus={() => setManualFocused("date")}
                  onBlur={() => setManualFocused(null)}
                  className={manualFocused === "date" ? "focused" : ""}
                />

                <div className="manual-duration-field">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={manualHours}
                    onChange={(e) => {
                      const value = onlyDigits(e.target.value);
                      setManualHours(value);

                      if (value.length >= 2) {
                        document.getElementById("minutes-input")?.focus();
                      }
                    }}
                    onFocus={() => setManualFocused("hours")}
                    onBlur={() => setManualFocused(null)}
                    className={manualFocused === "hours" ? "focused" : ""}
                    placeholder="0"
                  />
                  <span>HRS</span>
                </div>

                <span className="manual-duration-separator">:</span>

                <div className="manual-duration-field">
                  <input
                    id="minutes-input"
                    type="text"
                    inputMode="numeric"
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(onlyDigits(e.target.value))}
                    onFocus={() => setManualFocused("minutes")}
                    onBlur={() => setManualFocused(null)}
                    className={manualFocused === "minutes" ? "focused" : ""}
                    placeholder="0"
                  />
                  <span>MIN</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="manual-entry-cancel"
            onClick={() => setShowManualModal(false)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="manual-entry-save"
            disabled={!canSaveManual}
          >
            <Icon name="check" size={isMiniMode ? 12 : 13} color={canSaveManual ? "#fff" : "#446"} />
            Save Entry
          </button>
        </div>
      </form>
    </section>
  );

  const editEntrySection = editingEntryId && (
    <section className="section manual-entry-top edit-entry-panel">
      <div className="modal-header">
        <div>
          <h2>Edit Entry</h2>
          <p>Update ticket, date, and logged time</p>
        </div>
        <button
          type="button"
          className="modal-close"
          onClick={closeEditEntry}
        >
          <Icon name="close" size={13} />
        </button>
      </div>

      <form
        className="manual-entry-form"
        onSubmit={(event) => {
          event.preventDefault();
          handleSaveEditedEntry();
        }}
      >
        <div className="modal-body">
          <label className="manual-field">
            <span className="manual-field-label">Ticket</span>
            <input
              type="text"
              value={editTicket}
              onChange={(event) => setEditTicket(event.target.value)}
              onFocus={() => setEditFocused("ticket")}
              onBlur={() => setEditFocused(null)}
              className={editFocused === "ticket" ? "focused" : ""}
              placeholder="Ticket"
            />
          </label>

          <label className="manual-field">
            <span className="manual-field-label">Date and duration</span>
            <div className="manual-row">
              <input
                type="date"
                value={editDate}
                onChange={(event) => setEditDate(event.target.value)}
                onFocus={() => setEditFocused("date")}
                onBlur={() => setEditFocused(null)}
                className={editFocused === "date" ? "focused" : ""}
              />

              <div className="manual-duration-field">
                <input
                  type="text"
                  inputMode="numeric"
                  value={editHours}
                  onChange={(event) => setEditHours(onlyDigits(event.target.value, 3))}
                  onFocus={() => setEditFocused("hours")}
                  onBlur={() => setEditFocused(null)}
                  className={editFocused === "hours" ? "focused" : ""}
                  placeholder="0"
                />
                <span>HRS</span>
              </div>

              <span className="manual-duration-separator">:</span>

              <div className="manual-duration-field">
                <input
                  type="text"
                  inputMode="numeric"
                  value={editMinutes}
                  onChange={(event) => setEditMinutes(onlyDigits(event.target.value))}
                  onFocus={() => setEditFocused("minutes")}
                  onBlur={() => setEditFocused(null)}
                  className={editFocused === "minutes" ? "focused" : ""}
                  placeholder="0"
                />
                <span>MIN</span>
              </div>
            </div>
          </label>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="manual-entry-cancel"
            onClick={closeEditEntry}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="manual-entry-save"
            disabled={!canSaveEdit}
          >
            <Icon name="check" size={13} color={canSaveEdit ? "#fff" : "#446"} />
            Save Changes
          </button>
        </div>
      </form>
    </section>
  );

  const handoverEntry = entries.find((entry) => entry.id === handoverEntryId) || null;
  const handoverWorkItems = getHandoverListItems(handoverWorkCompleted);
  const handoverNextItems = getHandoverListItems(handoverNextSteps);

  const handoverSection = handoverEntry && (
    <section className="section manual-entry-top handover-panel">
      {!handoverEditMode ? (
        <div className="handover-note-card">
          <div className="handover-note-header">
            <div className="handover-note-title">
              <span className="handover-note-icon">
                <Icon name="todo" size={14} />
              </span>
              <div>
                <strong>{text.handover}</strong>
                <span>{handoverEntry.ticketName}</span>
              </div>
            </div>
            <button
              type="button"
              className="handover-note-close"
              onClick={closeHandoverEntry}
              title="Close"
            >
              v
            </button>
          </div>

          <div className="handover-note-list">
            {handoverStatus.trim() && (
              <div className="handover-note-row status">
                <span className="handover-note-marker" />
                <span>{handoverStatus.trim()}</span>
              </div>
            )}

            {handoverWorkItems.map((item, index) => (
              <div key={`work-${index}`} className="handover-note-row work">
                <span className="handover-note-marker">::</span>
                <span>{item}</span>
              </div>
            ))}

            {handoverNextItems.map((item, index) => (
              <div key={`next-${index}`} className="handover-note-row next">
                <span className="handover-note-marker">-&gt;</span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="handover-note-actions">
            <button
              type="button"
              onClick={handleCopyHandover}
              title={text.copyHandover}
            >
              <Icon name="export" size={13} />
            </button>
            <button
              type="button"
              onClick={() => setHandoverEditMode(true)}
              title="Edit"
            >
              <Icon name="edit" size={13} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="modal-header handover-edit-header">
            <div>
              <h2>{text.handover}</h2>
              <p>{handoverEntry.ticketName}</p>
            </div>
            <button
              type="button"
              className="modal-close"
              onClick={() => setHandoverEditMode(false)}
            >
              <Icon name="close" size={13} />
            </button>
          </div>

          <div className="handover-form">
            <label className="manual-field">
              <span className="manual-field-label">Status</span>
              <input
                type="text"
                value={handoverStatus}
                onChange={(event) => updateHandoverField("handoverStatus", event.target.value)}
                placeholder="Waiting for customer response"
              />
            </label>

            <label className="manual-field">
              <span className="manual-field-label">Work completed</span>
              <textarea
                value={handoverWorkCompleted}
                onChange={(event) => updateHandoverField("handoverWorkCompleted", event.target.value)}
                placeholder={"Investigated logs\nTested workaround"}
                rows={3}
              />
            </label>

            <label className="manual-field">
              <span className="manual-field-label">Next steps</span>
              <textarea
                value={handoverNextSteps}
                onChange={(event) => updateHandoverField("handoverNextSteps", event.target.value)}
                placeholder="Customer verification pending"
                rows={2}
              />
            </label>

            <div className="modal-actions handover-actions">
              <button
                type="button"
                className="manual-entry-save"
                onClick={handleCopyHandover}
              >
                <Icon name="export" size={13} color="#fff" />
                {text.copyHandover}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );

  const notificationCenter = (
    <div className="notification-center-wrapper">
      <button
        type="button"
        className={`notification-bell-btn ${showNotificationCenter ? "active" : ""} ${unreadErrorCount ? "has-errors" : ""}`}
        onClick={() => setShowNotificationCenter((prev) => !prev)}
        title={text.notifications}
        aria-label={text.notifications}
        aria-expanded={showNotificationCenter}
      >
        <Icon name="bell" size={15} />
        {notificationBadgeCount > 0 && (
          <span className="notification-badge">{notificationBadgeCount > 99 ? "99+" : notificationBadgeCount}</span>
        )}
      </button>

      {showNotificationCenter && (
        <div className="notification-panel" role="dialog" aria-label={text.notifications}>
          <div className="notification-panel-header">
            <div>
              <strong>{text.notifications}</strong>
              <span>{unreadNotificationCount ? `${unreadNotificationCount} ${text.unread}` : text.allRead}</span>
            </div>
            <div className="notification-panel-actions">
              <button type="button" onClick={markAllNotificationsRead} disabled={!unreadNotificationCount}>
                {text.markAllRead}
              </button>
              <button type="button" onClick={clearNotifications} disabled={!notifications.length}>
                {text.clearAll}
              </button>
            </div>
          </div>

          {recentNotifications.length ? (
            <ul className="notification-list">
              {recentNotifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`notification-item ${notification.type} ${notification.read ? "read" : "unread"}`}
                >
                  <button type="button" onClick={() => markNotificationRead(notification.id)}>
                    <span className="notification-type-dot" aria-hidden="true" />
                    <span className="notification-copy">
                      <span className="notification-title-row">
                        <strong>{notification.title}</strong>
                        <small>{formatNotificationTimestamp(notification.timestamp)}</small>
                      </span>
                      <span className="notification-message">{notification.message}</span>
                      <span className="notification-source">{notification.source}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="notification-empty">{text.noNotifications}</p>
          )}
        </div>
      )}
    </div>
  );

  if (isMiniMode) {
    return (
      <>
        <WindowTitleBar />
        <div className="mini-shell">
          <div className="header mini-header" style={{ position: 'relative' }}>
            <div className="mini-progress-group">
              <div className="mini-progress-track">
                <div
                  className="mini-progress-fill"
                  style={{ width: `${remainingPercent}%` }}
                />
              </div>
              <span className="mini-progress-text">
                {Math.floor(remainingPercent)}%
              </span>
            </div>

            <div className="header-actions">
              <PillMenu
                onManual={() => openManual(selectedTicket || "")}
                onMiniMode={() => setIsMiniMode(false)}
                onExport={openExportView}
                onImportTickets={openImportGuide}
                onClearLogs={handleClearLoggedTickets}
                onTrash={handleClearAll}
                onResetCountdown={handleResetCountdown}
                onMissingTime={openMissingTimeView}
                onReports={openReportsView}
                onSettings={openSettingsView}
                onReminderInbox={openReminderInbox}
                onEndDay={openEndDayView}
                reminderBadge={dueReminderCount}
                language={appLanguage}
                size="normal"
              />
            </div>
          </div>
          {storageWarning}
          {todoReminder}
          <div className={`mini-container ${showManualModal ? "mini-container-manual" : ""}`}>
            {!showManualModal && (
              <>
                <div className={`mini-timer-card ${miniIsRunning ? "active" : ""}`}>
                  <div className={`mini-ticket-name ${miniIsRunning ? "active" : ""}`}>
                    {miniIsRunning ? activeEntry?.ticketName || "Logging..." : "No active ticket"}
                  </div>

                  <div className={`mini-timer ${miniIsRunning ? "active" : ""}`}>
                    {activeEntry ? formatTime(activeEntry.seconds) : "00:00:00"}
                  </div>

                  <div className="mini-countdown">
                    <span className="mini-countdown-label">remaining</span>
                    <span className={`mini-countdown-timer ${remainingPercent < 20 ? "low" : ""}`}>
                      {formatTime(countdownSeconds)}
                    </span>
                  </div>
                </div>

                <div className="mini-ticket-combobox">
                  <div className="mini-start-row">
                    <input
                      ref={miniTicketRef}
                      type="text"
                      value={miniTicket}
                      onChange={(e) => handleMiniTicketChange(e.target.value)}
                      onKeyDown={handleMiniTicketKeyDown}
                      onFocus={() => setIsMiniTicketFocused(true)}
                      onBlur={() => {
                        setIsMiniTicketFocused(false);
                        setMiniHighlightedTicketIndex(-1);
                      }}
                      placeholder="New ticket..."
                      className="mini-ticket-input"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-controls="mini-ticket-suggestions"
                      aria-expanded={isMiniTicketFocused && miniTicketSuggestions.length > 0}
                      aria-activedescendant={
                        miniHighlightedTicketIndex >= 0 && miniTicketSuggestions[miniHighlightedTicketIndex]
                          ? `mini-ticket-suggestion-${miniTicketSuggestions[miniHighlightedTicketIndex].id}`
                          : undefined
                      }
                    />

                    <button
                      type="button"
                      className={`mini-primary-start ${miniIsRunning ? "running" : miniHasTicket ? "ready" : ""}`}
                      onClick={handleToggleMiniTimer}
                      disabled={!miniIsRunning && !miniHasTicket}
                    >
                      <Icon name={miniIsRunning ? "pause" : "play"} size={12} />
                      <span>{miniIsRunning ? "Stop" : "Start"}</span>
                    </button>
                  </div>
                  {miniTicketSuggestionList}
                </div>

                <div className="mini-actions">
                  <button
                    type="button"
                    className={`mini-action-btn mini-action-pause ${miniIsRunning ? "running" : ""}`}
                    onClick={handlePauseCurrent}
                    disabled={!miniIsRunning}
                  >
                    <span className="btn-shortcut-key">P</span>
                    <Icon name="pause" size={11} />
                    <span>Pause</span>
                  </button>

                  <button
                    type="button"
                    className="mini-action-btn mini-action-finish"
                    onClick={() => activeEntryId != null && handleFinish(activeEntryId)}
                    disabled={!miniIsRunning}
                  >
                    <span className="btn-shortcut-key">D</span>
                    <Icon name="finish" size={11} />
                    <span>Finish</span>
                  </button>
                </div>
              </>
            )}

            {showManualModal && manualSection}

          </div>
          {message && (
            <p className={`message-toast mini ${messageTone}`}>
              <span>{message}</span>
              {lastMergeUndo && message === "Tickets merged" && (
                <button type="button" onClick={undoLastMerge}>Angre</button>
              )}
            </p>
          )}
          {importGuide}
          {shortcutPanel}
        </div>
      </>
    );
  }


  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <WindowTitleBar />
      <div className="container">
        <div className="header app-header">
          <div className="header-actions">
            <PillMenu
              onManual={() => openManual(selectedTicket || "")}
              onMiniMode={() => setIsMiniMode(true)}
              onExport={openExportView}
              onImportTickets={openImportGuide}
              onClearLogs={handleClearLoggedTickets}
              onTrash={handleClearAll}
              onResetCountdown={handleResetCountdown}
              onMissingTime={openMissingTimeView}
              onReports={openReportsView}
              onSettings={openSettingsView}
              onReminderInbox={openReminderInbox}
              onEndDay={openEndDayView}
              reminderBadge={dueReminderCount}
              language={appLanguage}
              size="normal"
            />
            <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.12)', margin: '0 2px' }} />
            {notificationCenter}
            <button
              type="button"
              className={`favorite-top-btn ${selectedFavoriteTicket?.favorite ? "active" : ""}`}
              onClick={handleAddFavoriteFromInput}
              title={selectedFavoriteTicket?.favorite ? "Remove from favorites" : "Add current ticket to favorites"}
            >
              <Icon name={selectedFavoriteTicket?.favorite ? "star" : "starOutline"} size={15} />
            </button>
          </div>
        </div>

        {storageWarning}
        {todoReminder}
        {importGuide}

        {todoContextMenu && (
          <div
            className="ticket-context-menu"
            style={{
              left: Math.min(todoContextMenu.x, window.innerWidth - 210),
              top: Math.min(todoContextMenu.y, window.innerHeight - 150),
            }}
            onClick={(event) => event.stopPropagation()}
          >
            {mergeSourceEntry && canMergeEntryPair(mergeSourceEntry, todoContextMenu.entry) && (
              <button
                type="button"
                className="merge"
                onClick={() => mergeEntryInto(todoContextMenu.entry)}
              >
                <Icon name="merge" size={13} />
                <span>Merge inn her</span>
              </button>
            )}

            {mergeSourceEntry && (
              <button type="button" onClick={cancelMergeEntry}>
                <Icon name="close" size={13} />
                <span>Avbryt merge</span>
              </button>
            )}

            <button type="button" onClick={() => openEditEntry(todoContextMenu.entry)}>
              <Icon name="edit" size={13} />
              <span>Edit entry</span>
            </button>

            <button
              type="button"
              onClick={() => {
                openHandoverEntry(todoContextMenu.entry);
                setTodoContextMenu(null);
              }}
            >
              <Icon name="todo" size={13} />
              <span>{text.handover}</span>
            </button>

            <button type="button" onClick={() => openTodoFromTicket(todoContextMenu.entry)}>
              <Icon name="todo" size={13} />
              <span>Legg til som task</span>
            </button>

            {!mergeSourceEntry && (
              <button type="button" onClick={() => startMergeEntry(todoContextMenu.entry)}>
                <Icon name="merge" size={13} />
                <span>Velg for merge</span>
              </button>
            )}

            {todoContextMenu.entry.status !== "done" && (
              <button
                type="button"
                onClick={() => {
                  handleFinish(todoContextMenu.entry.id);
                  setTodoContextMenu(null);
                }}
              >
                <Icon name="finish" size={13} />
                <span>Merk ferdig</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                handleExportCSV();
                setTodoContextMenu(null);
              }}
            >
              <Icon name="export" size={13} />
              <span>Eksporter</span>
            </button>

            <button
              type="button"
              className="danger"
              onClick={() => {
                handleDeleteEntry(todoContextMenu.entry.id);
                setTodoContextMenu(null);
              }}
            >
              <Icon name="trash" size={13} />
              <span>Slett</span>
            </button>
          </div>
        )}

        <div className="content-scroll">
          {message && (
            <p className={`message-toast ${messageTone}`}>
              <span>{message}</span>
              {lastMergeUndo && message === "Tickets merged" && (
                <button type="button" onClick={undoLastMerge}>Angre</button>
              )}
            </p>
          )}
          {showReminderInbox ? (
            reminderInboxView
          ) : showEndDayView ? (
            endDayView
          ) : showExportView ? (
            exportView
          ) : showTrashView ? (
            trashView
          ) : showMissingTimeView ? (
            missingTimeView
          ) : showReportsView ? (
            <ReportsView
              entries={activeEntries}
              nowTick={nowTick}
              dailyTargetSeconds={dailyTargetSeconds}
              onClose={() => setShowReportsView(false)}
              onAddManualTime={() => openManual("", "ticket")}
            />
          ) : showSettingsView ? (
            <SettingsView
              dailyTargetSeconds={dailyTargetSeconds}
              trashRetentionDays={trashRetentionDays}
              themePreset={themePreset}
              themeAccentColor={themeAccentColor}
              appLanguage={appLanguage}
              accentColors={ACCENT_COLORS}
              jiraStatus={jiraStatus}
              jiraFeedback={jiraFeedback}
              jiraFeedbackTone={jiraFeedbackTone}
              tempoStatus={tempoStatus}
              tempoFeedback={tempoFeedback}
              tempoSyncResults={tempoSyncResults}
              jiraProjects={jiraProjects}
              selectedJiraProjectKeys={selectedJiraProjectKeys}
              jiraTicketQuery={jiraTicketQuery}
              isJiraFetchingTickets={isJiraFetchingTickets}
              isJiraBusy={isJiraBusy}
              isTempoBusy={isTempoBusy}
              pendingJiraSyncCount={pendingJiraWorklogEntries.length}
              pendingTempoSyncCount={pendingTempoWorklogEntries.length}
              onClose={() => setShowSettingsView(false)}
              onSave={handleSaveSettings}
              onSaveJiraCredentials={handleSaveJiraCredentials}
              onTestJiraConnection={handleTestJiraConnection}
              onClearJiraCredentials={handleClearJiraCredentials}
              onSyncJiraWorklogs={handleSyncJiraWorklogs}
              onSaveTempoCredentials={handleSaveTempoCredentials}
              onTestTempoConnection={handleTestTempoConnection}
              onClearTempoCredentials={handleClearTempoCredentials}
              onSyncTempoWorklogs={handleSyncTempoWorklogs}
              onLoadJiraProjects={handleLoadJiraProjects}
              onToggleJiraProject={handleToggleJiraProject}
              onChangeJiraTicketQuery={setJiraTicketQuery}
              onFetchJiraTickets={handleFetchJiraTickets}
              onOpenBugReport={handleOpenBugReport}
            />
          ) : (
            <div className="home-view">
          {mergeSourceEntry && (
            <div className="merge-banner">
              <div>
                <span>Merge selected</span>
                <strong>{mergeSourceEntry.ticketName}</strong>
              </div>
              <button type="button" onClick={cancelMergeEntry}>Cancel</button>
            </div>
          )}

          {showTodoPanel && todoPanel}

          {editEntrySection}

          {handoverSection}

          {showManualModal && manualSection}

          {!showManualModal && !editingEntryId && !handoverEntryId && (
            <>
              <section className="section remaining-card">
                <div className="remaining-copy">
                  <div className="countdown-label">{text.remainingToday}</div>
                  <div className={`countdown-timer ${countdownPulse ? "pulse" : ""}`}>
                    {formatTime(countdownSeconds)}
                  </div>
                </div>

                <div
                  className="remaining-ring"
                  style={{ "--remaining-percent": `${remainingPercent}%` }}
                  aria-label={`${Math.floor(remainingPercent)}% remaining`}
                >
                  <span>{Math.floor(remainingPercent)}%</span>
                </div>

                <div className="top-sync-summary">
                  <span className="sync-icon">
                    <Icon name="cloudUpload" size={16} />
                  </span>
                  <div className="sync-copy">
                    <strong>{text.jiraSync}</strong>
                    <span>
                      {pendingJiraWorklogEntries.length > 0
                        ? `${pendingJiraWorklogEntries.length} ${text.pending}`
                        : text.synced}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="sync-action"
                    onClick={handleSyncJiraWorklogs}
                    disabled={!canSyncJiraFromHome}
                  >
                    <Icon name="resetTimer" size={12} />
                    <span>{text.sync}</span>
                  </button>
                </div>
              </section>

              <section className={`section active-ticket-card ${activeEntry ? "running" : ""}`}>
                <div className="active-ticket-header">
                  <span className="active-ticket-kicker">{text.activeTicket}</span>
                  <button
                    type="button"
                    className="active-ticket-edit"
                    onClick={() => mainSearchRef.current?.focus()}
                    title={text.switchTicket}
                  >
                    <Icon name="edit" size={12} />
                  </button>
                </div>

                <div className="active-ticket-body">
                  <div className="active-ticket-main">
                    <strong>{activeEntry?.ticketName || text.noActiveTicket}</strong>
                    <span>{activeEntry ? activeTicketStatusText : text.startOrSelect}</span>
                  </div>

                  {activeEntry && (
                    <div className="active-ticket-time">
                      {formatTime(activeEntry.seconds)}
                    </div>
                  )}
                </div>

                {activeEntry && (
                  <div className="active-ticket-actions">
                    <button type="button" onClick={handlePauseCurrent}>
                      <Icon name="pause" size={12} />
                      <span>Pause</span>
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => activeEntryId != null && handleFinish(activeEntryId)}
                    >
                      <Icon name="square" size={12} />
                      <span>{text.done}</span>
                    </button>
                  </div>
                )}
              </section>

              {longRunningEntry && (
                <section className="section timer-correction-card">
                  <div>
                    <span>{text.longTimer}</span>
                    <strong>{longRunningEntry.ticketName}</strong>
                    <p>{formatTimeShort(longRunningEntry.seconds)} {text.loggedWord}. {text.isThisRight}</p>
                  </div>

                  <div className="timer-correction-actions">
                    <button type="button" onClick={() => setDismissedLongTimerId(longRunningEntry.id)}>
                      {text.looksRight}
                    </button>
                    <button type="button" onClick={() => openEditEntry(longRunningEntry)}>
                      {text.adjust}
                    </button>
                    <button type="button" className="danger" onClick={handlePauseCurrent}>
                      Pause
                    </button>
                  </div>
                </section>
              )}

              <section className="section ticket-controls">
                <div className="search-row search-row-with-icon">
                  <span className="search-icon">
                    <Icon name="search" size={13} />
                  </span>
                  <input
                    ref={mainSearchRef}
                    type="text"
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => setIsSearchOpen(Boolean(search.trim()))}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={text.ticketSearchPlaceholder}
                    aria-activedescendant={
                      highlightedTicketIndex >= 0 && visibleSearchTickets[highlightedTicketIndex]
                        ? `ticket-search-${visibleSearchTickets[highlightedTicketIndex].id}`
                        : undefined
                    }
                    aria-controls="ticket-search-results"
                    aria-expanded={visibleSearchTickets.length > 0}
                    role="combobox"
                  />
                  <span className="search-shortcut">/</span>
                </div>

                {visibleSearchTickets.length > 0 && (
                  <ul className="search-results" id="ticket-search-results" role="listbox">
                    {visibleSearchTickets.map((ticket, index) => (
                      <li
                        key={ticket.id}
                        id={`ticket-search-${ticket.id}`}
                        className={`search-item ${highlightedTicketIndex === index ? "highlighted" : ""}`}
                        role="option"
                        aria-selected={highlightedTicketIndex === index}
                      >
                        <button type="button" onClick={() => handleSelectTicket(ticket)}>
                          {ticket.id} - {ticket.title}
                        </button>

                        <button
                          type="button"
                          className={`fav-btn ${ticket.favorite ? "active" : ""}`}
                          onClick={() => toggleFavorite(ticket.id)}
                          title={ticket.favorite ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Icon name={ticket.favorite ? "star" : "starOutline"} size={13} />
                          <span>{ticket.favorite ? "Saved" : "Pin"}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="work-controls-stack">
                  <div className="work-controls-card">
                    <span className="work-controls-label">Work</span>
                    <div className="work-actions">
                      <div className="work-action-block primary">
                        <Btn
                          icon="play"
                          label="Start Ticket"
                          shortcut="S"
                          color="green"
                          onClick={handleStartNewTicket}
                        />
                      </div>

                      <div className="work-action-block">
                        <Btn
                          icon="plus"
                          label="Add Time"
                          shortcut="M"
                          color="dark"
                          onClick={() => openManual(selectedTicket || "")}
                        />
                      </div>
                    </div>
                  </div>

                  {activeTodoCount > 0 && (
                    <div className="work-controls-card tasks-control-card compact">
                      <button
                        type="button"
                        className={`tasks-compact-indicator ${showTodoPanel ? "active" : ""}`}
                        onClick={toggleTodoPanel}
                      >
                        <span className="tasks-card-icon">
                          <Icon name="todo" size={13} />
                          {dueReminderCount > 0 && <span className="tasks-card-badge">{dueReminderCount}</span>}
                        </span>
                        <strong>Tasks ({activeTodoCount})</strong>
                        <span className="tasks-card-action">
                          {showTodoPanel ? text.hide : text.open}
                        </span>
                      </button>
                    </div>
                  )}

                </div>
              </section>
            </>
          )}

          {SHOW_COUNTDOWN_SECTION && !showManualModal && (
            <section className="section">
              <div className="countdown-label">{text.remainingToday}</div>
              <div className={`countdown-timer ${countdownPulse ? "pulse" : ""}`}>
                {formatTime(countdownSeconds)}
              </div>

              <div className="search-row search-row-with-icon">
                <span className="search-icon">
                  <Icon name="search" size={13} />
                </span>
                  <input
                    ref={mainSearchRef}
                    type="text"
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => setIsSearchOpen(Boolean(search.trim()))}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Type or search ticket"
                    aria-controls="ticket-search-results"
                    aria-expanded={visibleSearchTickets.length > 0}
                    role="combobox"
                  />
                </div>

              {visibleSearchTickets.length > 0 && (
                <ul className="search-results" id="ticket-search-results" role="listbox">
                  {visibleSearchTickets.map((ticket, index) => (
                    <li
                      key={ticket.id}
                      className={`search-item ${highlightedTicketIndex === index ? "highlighted" : ""}`}
                      role="option"
                      aria-selected={highlightedTicketIndex === index}
                    >
                      <button type="button" onClick={() => handleSelectTicket(ticket)}>
                        {ticket.id} - {ticket.title}
                      </button>

                      <button
                        type="button"
                        className={`fav-btn ${ticket.favorite ? "active" : ""}`}
                        onClick={() => toggleFavorite(ticket.id)}
                        title={ticket.favorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Icon name={ticket.favorite ? "star" : "starOutline"} size={13} />
                        <span>{ticket.favorite ? "Saved" : "Pin"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="main-actions">
                <Btn
                  icon="play"
                  label="New Ticket"
                  shortcut="S"
                  color="green"
                  onClick={handleStartNewTicket}
                />

                <Btn
                  icon="pause"
                  label="Pause"
                  shortcut="P"
                  color="blue"
                  onClick={handlePauseCurrent}
                />

                <Btn
                  icon="square"
                  label="Done"
                  shortcut="D"
                  color="dark"
                  onClick={() => activeEntryId != null && handleFinish(activeEntryId)}
                  disabled={activeEntryId == null}
                  style={{ gridColumn: "1 / -1", width: "100%" }}
                />
              </div>

              <div className="section-divider" />

              <div className="timer">
                {activeEntry ? formatTime(activeEntry.seconds) : "00:00:00"}
              </div>

            </section>
          )}

          <section className="section logged-section">
            <div className="logged-header">
              <h2>{text.recentActivity}</h2>
              <div className="logged-header-actions">
                <span>{text.today} {formatTimeShort(todayLoggedSeconds)}</span>
                <button type="button" onClick={openEndDayView}>
                  {text.viewAll}
                </button>
              </div>
            </div>

            <div className="entry-list logged-list">
              {activeEntries.length === 0 && (
                <p className="logged-empty">{text.noTimeLoggedYet}</p>
              )}

              {Object.entries(groupedLoggedEntries).map(([date, dayEntries]) => {
                const dayTotal = dayEntries.reduce(
                  (sum, entry) => sum + applyElapsedTime(entry, nowTick).seconds,
                  0
                );
                const displayDate = formatDateShort(date);

                return (
                  <div
                    key={date}
                    className="entry-group"
                  >
                    <div className="entry-group-header">
                      <div className="entry-group-summary">
                        <span className="entry-group-date">{displayDate}</span>
                        <span className="entry-group-total-inline">Total {formatTimeShort(dayTotal)}</span>
                      </div>
                      <button
                        type="button"
                        className="entry-group-delete"
                        onClick={() => handleDeleteDayEntries(date)}
                        title={text.deleteDay}
                        aria-label={`${text.deleteDay}: ${displayDate}`}
                      >
                        <Trash2 size={12} strokeWidth={2} />
                      </button>
                    </div>

                    <ul className="entry-list">
                      {dayEntries.map((entry) => (
                        <li
                          key={entry.id}
                          className={[
                            "entry-item",
                            entry.status,
                            mergeSourceEntryId === entry.id ? "merge-selected" : "",
                            mergeSourceEntry && canMergeEntryPair(mergeSourceEntry, entry) ? "merge-target" : "",
                            mergingEntries?.sourceId === entry.id ? "merge-removing" : "",
                            mergingEntries?.targetId === entry.id ? "merge-receiving" : "",
                            mergedEntryId === entry.id ? "merge-complete" : "",
                            deletingEntryId === entry.id ? "entry-deleting" : "",
                          ].filter(Boolean).join(" ")}
                          onContextMenu={(event) => openEntryContextMenu(event, entry)}
                          onClick={(event) => {
                            if (event.target.closest("button")) return;
                            if (mergeSourceEntry && canMergeEntryPair(mergeSourceEntry, entry)) {
                              mergeEntryInto(entry);
                            }
                          }}
                        >
                          <div className="entry-main">
                            <div className="entry-row">
                              <div className="entry-title-wrap">
                                {entry.source === "todo" && (
                                  <span
                                    className={`entry-source-icon task ${getTodoEntryNotes(entry) ? "has-notes" : ""}`}
                                    title={getTodoEntryNotes(entry) || "To-do task"}
                                  >
                                    <Icon name="todo" size={12} />
                                  </span>
                                )}
                                <strong>{entry.ticketName}</strong>
                              </div>

                              <div className="entry-side">
                                <span className="entry-time">{formatTimeShort(entry.seconds)}</span>

                                <div className="entry-actions">
                                  <button
                                    type="button"
                                    className="entry-action-btn"
                                    onClick={() => openEditEntry(entry)}
                                    title="Edit"
                                  >
                                    <FilePenLine size={13} strokeWidth={2} />
                                  </button>

                                  <button
                                    type="button"
                                    className={`entry-action-btn handover ${hasHandoverNotes(entry) ? "has-notes" : ""}`}
                                    onClick={() => openHandoverEntry(entry)}
                                    title={text.handover}
                                  >
                                    <ClipboardCheck size={13} strokeWidth={2} />
                                  </button>

                                  {pendingJiraWorklogEntryById.has(entry.id) && (
                                    <button
                                      type="button"
                                      className="entry-action-btn jira-sync"
                                      onClick={() => handleSyncJiraWorklogs([pendingJiraWorklogEntryById.get(entry.id)])}
                                      disabled={!hasSavedJiraCredentials || isJiraBusy}
                                      title={text.syncTicket}
                                    >
                                      <Icon name="cloudUpload" size={13} />
                                    </button>
                                  )}

                                  {entry.status !== "done" && entry.id !== activeEntryId && (
                                    <button
                                      type="button"
                                      className="entry-action-btn"
                                      onClick={() => handleResume(entry.id)}
                                      title="Resume"
                                    >
                                      <Icon name="check" size={13} />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    className="entry-action-btn delete"
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    title="Delete"
                                  >
                                    <Trash2 size={13} strokeWidth={2} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="entry-meta">
                              <span className={`entry-status ${entry.status}`}>
                                {entry.status === 'running' ? 'aktiv' : entry.status === 'paused' ? 'paused' : 'Done'}
                              </span>
                              <span className="entry-meta-separator">-</span>
                              <span className="entry-date">{formatDateShort(entry.createdAt)}</span>
                              {entry.jiraWorklogId && (
                                <>
                                  <span className="entry-meta-separator">-</span>
                                  <span className="entry-jira-sync">Jira synced</span>
                                </>
                              )}
                              {entry.tempoWorklogId && (
                                <>
                                  <span className="entry-meta-separator">-</span>
                                  <span className="entry-jira-sync">Tempo synced</span>
                                </>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>

                  </div>
                );
              })}
            </div>
          </section>
            </div>
          )}
        </div>
        {shortcutPanel}
      </div>
    </div>
  );
}

export default Logger;
