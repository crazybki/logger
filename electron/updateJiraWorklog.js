async function updateJiraWorklog({ url, entry, authHeader, request = fetch }) {
  const headers = { Authorization: authHeader, Accept: "application/json", "Content-Type": "application/json" };
  const existing = await request(url, { headers, method: "GET" });
  // A missing/forbidden worklog must never silently become a new worklog.
  if (!existing.ok) return existing;
  const worklog = await existing.json();
  const remoteSeconds = Number(worklog.timeSpentSeconds);
  if (remoteSeconds === entry.timeSpentSeconds) {
    // Safe retry if a prior PUT succeeded but its response was lost.
    return { ok: true, json: async () => worklog };
  }
  if (!Number.isFinite(entry.jiraSyncedSeconds) || remoteSeconds !== entry.jiraSyncedSeconds) {
    throw new Error("This worklog's duration changed in Jira. Review it in Jira before syncing again.");
  }
  return request(`${url}?adjustEstimate=leave`, {
    method: "PUT", headers,
    body: JSON.stringify({ timeSpentSeconds: entry.timeSpentSeconds }),
  });
}

module.exports = { updateJiraWorklog };
