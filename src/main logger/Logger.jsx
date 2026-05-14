import { useEffect, useMemo, useRef, useState } from "react";
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

function Logger() {
  const [search, setSearch] = useState("");
  const [selectedTicket, setSelectedTicket] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("default");
  const [showManualModal, setShowManualModal] = useState(false);
  const [showImportGuide, setShowImportGuide] = useState(false);
  const [isMiniMode, setIsMiniMode] = useState(false);
  const [showTrashView, setShowTrashView] = useState(false);
  const [showMissingTimeView, setShowMissingTimeView] = useState(false);
  const [showReportsView, setShowReportsView] = useState(false);
  const [showSettingsView, setShowSettingsView] = useState(false);
  const [missingTimeFilter, setMissingTimeFilter] = useState("missing");
  const [trashTab, setTrashTab] = useState("tickets");
  const [trashSearch, setTrashSearch] = useState("");
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
  const [miniTicket, setMiniTicket] = useState("");
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

  const manualTicketRef = useRef(null);
  const mainSearchRef = useRef(null);
  const miniTicketRef = useRef(null);
  const dailyTargetNotificationRef = useRef("");
  const taskNotificationRef = useRef("");

  const [jiraTickets, setJiraTickets] = useState(() => {
    try {
      const saved = localStorage.getItem("jiraTickets");
      return saved
        ? JSON.parse(saved)
        : [
          { id: "ABC-123", title: "Fix login bug", favorite: true },
          { id: "ABC-456", title: "Update dashboard", favorite: true },
          { id: "ABC-789", title: "Refactor timer logic", favorite: false },
          { id: "ABC-321", title: "Review customer issue", favorite: false },
          { id: "ABC-654", title: "Improve export flow", favorite: true },
        ];
    } catch {
      return [];
    }
  });

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

  function getTicketMergeKey(entry) {
    return `${getDateKey(entry)}::${String(entry.ticketName ?? "").trim().toLowerCase()}`;
  }

  function canMergeTicketEntry(entry) {
    return (
      entry &&
      !entry.deletedAt &&
      entry.status === "done" &&
      entry.source !== "todo" &&
      !entry.todoTaskId &&
      String(entry.ticketName ?? "").trim()
    );
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
          ? { ...entry, seconds: entry.seconds + completedEntry.seconds }
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
        ? { ...entry, seconds: entry.seconds + newEntry.seconds }
        : entry
    );
  }

  const activeEntries = useMemo(() => {
    return entries.filter((entry) => !entry.deletedAt);
  }, [entries]);

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

  const filteredTickets = useMemo(() => {
    return jiraTickets.filter((ticket) =>
      `${ticket.id} ${ticket.title}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, jiraTickets]);

  const favoriteTickets = useMemo(() => {
    return jiraTickets.filter((ticket) => ticket.favorite);
  }, [jiraTickets]);

  const activeEntry = useMemo(() => {
    return activeEntries.find((entry) => entry.id === activeEntryId) || null;
  }, [activeEntries, activeEntryId]);

  const activeTodoCount = useMemo(() => {
    return activeTodoTasks.filter((task) => !task.done).length;
  }, [activeTodoTasks]);

  const visibleTodoTasks = useMemo(() => {
    return activeTodoTasks.filter((task) => !task.done);
  }, [activeTodoTasks]);

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
        setMessage(`⚠ Local storage: ${remainingPercent.toFixed(1)}% remaining`);
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
      const tag = e.target.tagName;
      const isTyping =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        e.target.isContentEditable;

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

      if (!showManualModal && activeEntryId != null && (key === "d" || key === "f")) {
        e.preventDefault();
        handleFinish(activeEntryId);
        return;
      }

      if (isTyping) return;

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
        } else if (isMiniMode) {
          e.preventDefault();
          setIsMiniMode(false);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeEntryId, selectedTicket, showManualModal, isMiniMode, activeEntry, showShortcuts, miniTicket, lastMergeUndo]);

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
    setJiraTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === id
          ? { ...ticket, favorite: !ticket.favorite }
          : ticket
      )
    );
  }

  function handleAddFavoriteFromInput() {
    const value = search.trim();

    if (!value) {
      setMessage("Skriv inn en ticket først");
      return;
    }

    const existing = jiraTickets.find(
      (t) =>
        `${t.id} - ${t.title}`.toLowerCase() === value.toLowerCase() ||
        t.id.toLowerCase() === value.toLowerCase()
    );

    if (existing) {
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
    setMessage(`Selected ${ticket.id}`);
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

    setEntries((prev) => addOrMergeCompletedTicketEntry(prev, newEntry));
    setActiveEntryId(newEntry.id);
    setSelectedTicket(value);
    setSearch("");
    setMiniTicket("");
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

  function snoozeTodoReminder(minutes) {
    if (!activeReminderTask) return;

    const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();

    setTodoTasks((prev) =>
      prev.map((task) =>
        task.id === activeReminderTask.id
          ? { ...task, snoozedUntil, reminderDismissed: false }
          : task
      )
    );
    setShowTodoSnoozeMenu(false);
  }

  function snoozeTodoReminderUntilTomorrow() {
    if (!activeReminderTask) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    setTodoTasks((prev) =>
      prev.map((task) =>
        task.id === activeReminderTask.id
          ? { ...task, snoozedUntil: tomorrow.toISOString(), reminderDismissed: false }
          : task
      )
    );
    setShowTodoSnoozeMenu(false);
  }

  function dismissTodoReminder() {
    if (!activeReminderTask) return;

    setTodoTasks((prev) =>
      prev.map((task) =>
        task.id === activeReminderTask.id
          ? { ...task, reminderDismissed: true }
          : task
      )
    );
    setShowTodoSnoozeMenu(false);
  }

  function startTodoReminder() {
    if (!activeReminderTask) return;

    const existingEntry = getTodoTimerEntry(activeReminderTask.id);

    if (existingEntry?.id === activeEntryId) {
      setMessage("Task timer kjører allerede");
    } else {
      handleStartTodoTimer(activeReminderTask);
    }

    setTodoTasks((prev) =>
      prev.map((task) =>
        task.id === activeReminderTask.id
          ? { ...task, reminderDismissed: true }
          : task
      )
    );
    setShowTodoSnoozeMenu(false);
  }

  function completeTodoReminder() {
    if (!activeReminderTask) return;

    setTodoTasks((prev) =>
      prev.map((task) =>
        task.id === activeReminderTask.id
          ? { ...task, done: true, reminderDismissed: true }
          : task
      )
    );
    setShowTodoSnoozeMenu(false);
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
    setIsMiniMode(false);
    setShowManualModal(false);
    setShowTodoPanel(false);
  }

  function openReportsView() {
    setShowReportsView(true);
    setShowTrashView(false);
    setShowMissingTimeView(false);
    setShowSettingsView(false);
    setIsMiniMode(false);
    setShowManualModal(false);
    setShowTodoPanel(false);
  }

  function openSettingsView() {
    setShowSettingsView(true);
    setShowTrashView(false);
    setShowMissingTimeView(false);
    setShowReportsView(false);
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

  function openManual(prefill = "", entryType = "ticket") {
    setShowTrashView(false);
    setShowMissingTimeView(false);
    setShowReportsView(false);
    setShowSettingsView(false);
    setEditingEntryId(null);
    setManualTicket(prefill);
    setManualEntryType(entryType);
    setManualDate(getTodayDate());
    setManualHours("");
    setManualMinutes("");
    setManualFocused(null);
    setShowManualModal(true);
  }

  function openEditEntry(entry) {
    const syncedEntry = applyElapsedTime(entry, Date.now());
    const duration = secondsToDurationParts(syncedEntry.seconds);

    setShowTrashView(false);
    setShowMissingTimeView(false);
    setShowReportsView(false);
    setShowSettingsView(false);
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
    setShowSettingsView(false);
    setMessageTone("success");
    setMessage("Settings saved");
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
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== editingEntryId) {
          return entry.status === "running" && !entry.deletedAt
            ? applyElapsedTime(entry, timestamp)
            : entry;
        }

        const syncedEntry = applyElapsedTime(entry, timestamp);
        return {
          ...syncedEntry,
          ticketName: editTicket.trim(),
          seconds: totalSeconds,
          createdAt: editDate,
          dateKey: editDate,
          status: syncedEntry.status === "running" ? "paused" : syncedEntry.status,
          lastTickAt: undefined,
        };
      })
    );

    if (editingEntryId === activeEntryId) {
      setActiveEntryId(null);
    }

    closeEditEntry();
    setMessageTone("success");
    setMessage("Entry updated");
  }

  async function handleExportCSV() {
    if (!activeEntries.length) {
      setMessage("Ingen entries å eksportere");
      return;
    }

    try {
      const exportEntries = activeEntries.map((entry) => ({
        ...entry,
        formatted: formatTime(entry.seconds),
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
      setMessage("Import is not available");
      return;
    }

    const result = await window.loggerAPI.importTicketsFromFile();

    if (!result?.ok) {
      if (!result?.canceled) {
        setMessage("Could not import tickets");
      }
      return;
    }

    const importedTickets = Array.isArray(result.tickets) ? result.tickets : [];
    const importedEntries = Array.isArray(result.entries) ? result.entries : [];

    if (!importedTickets.length && !importedEntries.length) {
      setMessage("No tickets found");
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

    setMessageTone("success");
    setMessage(
      `Imported ${addedCount} tickets${updatedCount ? `, updated ${updatedCount}` : ""}${entryCount ? `, ${entryCount} entries` : ""}`
    );
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
    setShowManualModal(false);
  }

  const canSaveManual = Boolean(manualTicket.trim() && (manualHours || manualMinutes));
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
            <p>Excel, CSV og TXT støttes</p>
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
          <h2>{todoView === "new" ? "Ny task" : "To-do"}</h2>
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
              Tasks
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
                  {task.sourceTicket && <span>Fra ticket</span>}
                  <span>{task.priority}</span>
                  {task.reminder && <span>{task.reminder.replace("T", " ")}</span>}
                  {timerEntry && <span>{formatTime(timerEntry.seconds)}</span>}
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
                  onChange={(e) => setManualTicket(e.target.value)}
                  onFocus={() => setManualFocused("ticket")}
                  onBlur={() => setManualFocused(null)}
                  className={manualFocused === "ticket" ? "focused" : ""}
                  placeholder={manualEntryType === "task" ? "Task" : "Ticket"}
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
                onChange={(e) => setManualTicket(e.target.value)}
                onFocus={() => setManualFocused("ticket")}
                onBlur={() => setManualFocused(null)}
                className={manualFocused === "ticket" ? "focused" : ""}
                placeholder={manualEntryType === "task" ? "e.g. Write meeting notes" : "e.g. PROJ-1234"}
              />

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
                onExport={handleExportCSV}
                onImportTickets={openImportGuide}
                onClearLogs={handleClearLoggedTickets}
                onTrash={handleClearAll}
                onResetCountdown={handleResetCountdown}
                onMissingTime={openMissingTimeView}
                onReports={openReportsView}
                onSettings={openSettingsView}
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

                <div className="mini-start-row">
                  <input
                    ref={miniTicketRef}
                    type="text"
                    value={miniTicket}
                    onChange={(e) => setMiniTicket(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleStartMiniTicket();
                      }
                    }}
                    placeholder="New ticket..."
                    className="mini-ticket-input"
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
              onExport={handleExportCSV}
              onImportTickets={openImportGuide}
              onClearLogs={handleClearLoggedTickets}
              onTrash={handleClearAll}
              onResetCountdown={handleResetCountdown}
              onMissingTime={openMissingTimeView}
              onReports={openReportsView}
              onSettings={openSettingsView}
              size="normal"
            />
            <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.12)', margin: '0 2px' }} />
            <button
              type="button"
              className="favorite-top-btn"
              onClick={handleAddFavoriteFromInput}
              title="Add current ticket to favorites"
            >
              <Icon name="star" size={15} />
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

        <div className="favorites-row">
          {favoriteTickets.map((ticket) => (
            <div key={ticket.id} className="favorite-chip">
              <button
                type="button"
                className="favorite-chip-btn"
                onClick={() => handleSelectTicket(ticket)}
              >
                {ticket.id}
              </button>

              <button
                type="button"
                className="favorite-chip-star"
                onClick={() => toggleFavorite(ticket.id)}
                title="Remove favorite"
              >
                <Icon name="star" size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="content-scroll">
          {message && (
            <p className={`message-toast ${messageTone}`}>
              <span>{message}</span>
              {lastMergeUndo && message === "Tickets merged" && (
                <button type="button" onClick={undoLastMerge}>Angre</button>
              )}
            </p>
          )}
          {showTrashView ? (
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
              accentColors={ACCENT_COLORS}
              onClose={() => setShowSettingsView(false)}
              onSave={handleSaveSettings}
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

          {showManualModal && manualSection}

          {!showManualModal && !editingEntryId && (
            <>
              <section className="section remaining-card">
                <div className="remaining-copy">
                  <div className="countdown-label">Remaining today</div>
                  <div className={`countdown-timer ${countdownPulse ? "pulse" : ""}`}>
                    {formatTime(countdownSeconds)}
                  </div>
                  <div className="countdown-subtext">
                    of {formatTime(dailyTargetSeconds)}
                  </div>
                </div>

                <div
                  className="remaining-ring"
                  style={{ "--remaining-percent": `${remainingPercent}%` }}
                  aria-label={`${Math.floor(remainingPercent)}% remaining`}
                >
                  <span>{Math.floor(remainingPercent)}%</span>
                </div>
              </section>

              <section className={`section active-ticket-card ${activeEntry ? "running" : ""}`}>
                <div className="active-ticket-header">
                  <span className="active-ticket-kicker">Active ticket</span>
                  <button
                    type="button"
                    className="active-ticket-edit"
                    onClick={() => mainSearchRef.current?.focus()}
                    title="Switch ticket"
                  >
                    <Icon name="edit" size={12} />
                  </button>
                </div>

                <div className="active-ticket-body">
                  <div className="active-ticket-main">
                    <strong>{activeEntry?.ticketName || "No active ticket"}</strong>
                    <span>{activeEntry ? "Running since last start" : "Start or select a ticket below"}</span>
                  </div>

                  <div className="active-ticket-time">
                    {activeEntry ? formatTime(activeEntry.seconds) : "00:00:00"}
                  </div>
                </div>

                <div className="active-ticket-actions">
                  <button type="button" onClick={() => mainSearchRef.current?.focus()}>
                    <Icon name="switch" size={12} />
                    <span>Switch</span>
                  </button>
                  <button type="button" onClick={handlePauseCurrent} disabled={!activeEntry}>
                    <Icon name="pause" size={12} />
                    <span>Pause</span>
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => activeEntryId != null && handleFinish(activeEntryId)}
                    disabled={!activeEntry}
                  >
                    <Icon name="square" size={12} />
                    <span>Stop</span>
                  </button>
                </div>
              </section>

              <section className="section ticket-controls">
                <div className="search-row search-row-with-icon">
                  <span className="search-icon">
                    <Icon name="search" size={13} />
                  </span>
                  <input
                    ref={mainSearchRef}
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setSelectedTicket(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleStartNewTicket();
                      }
                    }}
                    placeholder="Type or search ticket"
                  />
                </div>

                {search && (
                  <ul className="search-results">
                    {filteredTickets.slice(0, 5).map((ticket) => (
                      <li key={ticket.id} className="search-item">
                        <button type="button" onClick={() => handleSelectTicket(ticket)}>
                          {ticket.id} - {ticket.title}
                        </button>

                        <button
                          type="button"
                          className="fav-btn"
                          onClick={() => toggleFavorite(ticket.id)}
                        >
                          <Icon name={ticket.favorite ? "star" : "starOutline"} size={13} />
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
                    icon="plus"
                    label="Add Manual Time"
                    shortcut="M"
                    color="blue"
                    onClick={() => openManual(selectedTicket || "")}
                  />
                </div>
              </section>

              <button
                type="button"
                className={`tasks-card ${showTodoPanel ? "active" : ""}`}
                onClick={toggleTodoPanel}
              >
                <span className="tasks-card-icon">
                  <Icon name="todo" size={14} />
                </span>
                <span className="tasks-card-copy">
                  <strong>Tasks</strong>
                  <span>
                    {activeTodoCount > 0
                      ? `${activeTodoCount} active${activeReminderTask ? ` - next ${formatReminderTime(activeReminderTask.reminder)}` : ""}`
                      : "No active tasks"}
                  </span>
                </span>
                <span className="tasks-card-action">
                  {showTodoPanel ? "Hide" : "Open"}
                </span>
              </button>
            </>
          )}

          {false && !showManualModal && (
            <section className="section">
              <div className="countdown-label">Remaining today</div>
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
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedTicket(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleStartNewTicket();
                    }
                  }}
                  placeholder="Type or search ticket"
                />
              </div>

              {search && (
                <ul className="search-results">
                  {filteredTickets.slice(0, 5).map((ticket) => (
                    <li key={ticket.id} className="search-item">
                      <button type="button" onClick={() => handleSelectTicket(ticket)}>
                        {ticket.id} - {ticket.title}
                      </button>

                      <button
                        type="button"
                        className="fav-btn"
                        onClick={() => toggleFavorite(ticket.id)}
                      >
                        <Icon name={ticket.favorite ? "star" : "starOutline"} size={13} />
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
              <h2>Logged time</h2>
              <span>
                Today {formatTimeShort(todayLoggedSeconds)}
              </span>
            </div>

            <div className="entry-list logged-list">
              {activeEntries.length === 0 && (
                <p className="logged-empty">No time logged yet</p>
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
                      <span>{displayDate}</span>
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
                                <span className="entry-dot" />
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
                                    <Icon name="edit" size={13} />
                                  </button>

                                  <button
                                    type="button"
                                    className="entry-action-btn todo"
                                    onClick={() => openTodoFromTicket(entry)}
                                    title="Legg til som task"
                                  >
                                    <Icon name="todo" size={13} />
                                  </button>

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
                                    <Icon name="trash" size={13} />
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
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <div className="entry-group-total">
                      <span>Total logget</span>
                      <strong>{formatTimeShort(dayTotal)}</strong>
                    </div>
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
