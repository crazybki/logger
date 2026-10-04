// Read-only worklog aggregation. Connection details and error handling come from main.js.
async function fetchLoggedToday({ jira, tempo, dateKey, request }) {
  const api = `${jira.jiraBaseUrl}/rest/api/${jira.jiraMode === "server" ? "2" : "3"}`;
  const user = await request(`${api}/myself`, jira.authHeader);
  let seconds = 0;
  const seen = new Set();
  if (tempo) {
    if (!user.accountId) throw new Error("Tempo requires a Jira Cloud account.");
    let offset = 0;
    while (true) {
      const page = await request(`${tempo.tempoApiBaseUrl}/worklogs/user/${encodeURIComponent(user.accountId)}?from=${dateKey}&to=${dateKey}&limit=1000&offset=${offset}`, tempo.authHeader);
      if (!Array.isArray(page.results)) throw new Error("Invalid Tempo worklog response");
      for (const log of page.results) {
        if (log.startDate === dateKey && log.author?.accountId === user.accountId && !seen.has(log.tempoWorklogId)) {
          seen.add(log.tempoWorklogId);
          seconds += Math.max(0, Number(log.timeSpentSeconds) || 0);
        }
      }
      if (!page.metadata?.next) break;
      if (!page.results.length) throw new Error("Incomplete Tempo worklog response");
      offset += page.results.length;
    }
  } else {
    const identity = user.accountId || user.key || user.name;
    if (!identity) throw new Error("Could not identify the current Jira user");
    // Widen the search for differences between the Jira profile and PC timezones.
    const day = new Date(`${dateKey}T12:00:00`);
    const date = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const previous = new Date(day); previous.setDate(day.getDate() - 1);
    const next = new Date(day); next.setDate(day.getDate() + 1);
    let startAt = 0, nextPageToken;
    for (;;) {
      const cloud = jira.jiraMode !== "server";
      const page = await request(`${api}/search${cloud ? "/jql" : ""}`, jira.authHeader, {
        jql: `worklogAuthor = currentUser() AND worklogDate >= "${date(previous)}" AND worklogDate <= "${date(next)}"`,
        fields: ["summary"], maxResults: 100,
        ...(cloud ? (nextPageToken ? { nextPageToken } : {}) : { startAt }),
      });
      if (!Array.isArray(page.issues)) throw new Error("Invalid Jira issue response");
      if (!cloud && !Number.isFinite(page.total)) throw new Error("Invalid Jira issue count");
      for (const issue of page.issues) {
        let offset = 0;
        while (true) {
          const logs = await request(`${api}/issue/${encodeURIComponent(issue.id)}/worklog?startAt=${offset}&maxResults=100`, jira.authHeader);
          if (!Array.isArray(logs.worklogs) || !Number.isFinite(logs.total)) throw new Error("Invalid Jira worklog response");
          for (const log of logs.worklogs) {
            const author = log.author?.accountId || log.author?.key || log.author?.name;
            if (author === identity && date(new Date(log.started)) === dateKey && !seen.has(log.id)) {
              seen.add(log.id);
              seconds += Math.max(0, Number(log.timeSpentSeconds) || 0);
            }
          }
          offset += logs.worklogs.length;
          if (offset >= logs.total) break;
          if (!logs.worklogs.length) throw new Error("Incomplete Jira worklog response");
        }
      }
      startAt += page.issues.length;
      if (page.nextPageToken && page.nextPageToken === nextPageToken) throw new Error("Repeated Jira search page");
      nextPageToken = page.nextPageToken;
      if (cloud ? !nextPageToken : startAt >= page.total) break;
      if (!page.issues.length) throw new Error("Incomplete Jira issue response");
    }
  }
  return { dateKey, seconds, source: tempo ? "Tempo" : "Jira", fetchedAt: Date.now() };
}

module.exports = { fetchLoggedToday };
