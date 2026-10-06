export function isJiraWorklogPending(entry) {
  return !entry.jiraWorklogId ||
    (entry.jiraSyncedSeconds != null && Math.round(Number(entry.seconds)) !== Number(entry.jiraSyncedSeconds));
}

// Older saved entries have an ID but no synced duration. Capture their original
// duration before the first local change, rather than treating it as new time.
export function withJiraSyncBaseline(entry) {
  return entry.jiraWorklogId
    ? { ...entry, jiraSyncedSeconds: entry.jiraSyncedSeconds ?? Math.round(Number(entry.seconds)) }
    : entry;
}

export function canExtendJiraWorklog(entry) {
  return Boolean(entry?.jiraWorklogId && !entry.tempoWorklogId && !entry.deletedAt &&
    entry.status === "done" && entry.source !== "todo" && !entry.todoTaskId);
}
