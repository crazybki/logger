import { describe, expect, it, vi } from "vitest";
import remote from "../../electron/loggingProgress.js";

const jira = { jiraBaseUrl: "https://jira.example", jiraMode: "cloud", authHeader: "test" };
const dateKey = "2026-10-05";
const log = (id, seconds, author = "me", day = 5) => ({ id, timeSpentSeconds: seconds, author: { accountId: author }, started: new Date(2026, 9, day, 10).toISOString() });

describe("authoritative worklog aggregation", () => {
  it("paginates Jira issues and worklogs, filters user/local date, deduplicates", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({ accountId: "me" })
      .mockResolvedValueOnce({ issues: [{ id: "1" }], nextPageToken: "next" })
      .mockResolvedValueOnce({ total: 4, worklogs: [log("a", 3600), log("b", 600, "other")] })
      .mockResolvedValueOnce({ total: 4, worklogs: [log("c", 900, "me", 4), log("d", 1800)] })
      .mockResolvedValueOnce({ issues: [{ id: "2" }], isLast: true })
      .mockResolvedValueOnce({ total: 2, worklogs: [log("a", 3600), log("e", 600)] });
    expect(await remote.fetchLoggedToday({ jira, dateKey, request })).toMatchObject({ seconds: 6000, dateKey, source: "Jira" });
    expect(request.mock.calls[3][0]).toContain("startAt=2");
    expect(request.mock.calls[4][2].nextPageToken).toBe("next");
  });
  it("supports Server identity and search pagination", async () => {
    const request = vi.fn().mockResolvedValueOnce({ name: "me" })
      .mockResolvedValueOnce({ total: 1, issues: [{ id: "1" }] })
      .mockResolvedValueOnce({ total: 1, worklogs: [{ ...log("a", 60), author: { name: "me" } }] });
    expect(await remote.fetchLoggedToday({ jira: { ...jira, jiraMode: "server" }, dateKey, request })).toMatchObject({ seconds: 60 });
    expect(request.mock.calls[1][0]).toBe("https://jira.example/rest/api/2/search");
  });
  it("uses Tempo only, preserves date-only values, paginates", async () => {
    const tempoLog = (id, day = dateKey, author = "me") => ({ tempoWorklogId: id, startDate: day, timeSpentSeconds: 300, author: { accountId: author } });
    const request = vi.fn().mockResolvedValueOnce({ accountId: "me" })
      .mockResolvedValueOnce({ results: [tempoLog(1), tempoLog(2, "2026-10-04"), tempoLog(3, dateKey, "other")], metadata: { next: "next" } })
      .mockResolvedValueOnce({ results: [tempoLog(1), tempoLog(4)], metadata: {} });
    expect(await remote.fetchLoggedToday({ jira, dateKey, tempo: { tempoApiBaseUrl: "https://tempo.example", authHeader: "test" }, request })).toMatchObject({ seconds: 600, source: "Tempo" });
    expect(request.mock.calls[2][0]).toContain("offset=3");
  });
  it("rejects failures and incomplete results rather than reporting a partial total", async () => {
    const request = vi.fn().mockResolvedValueOnce({ accountId: "me" })
      .mockResolvedValueOnce({ issues: [{ id: "1" }] })
      .mockResolvedValueOnce({ total: 1, worklogs: [] });
    await expect(remote.fetchLoggedToday({ jira, dateKey, request })).rejects.toThrow("Incomplete");
    await expect(remote.fetchLoggedToday({ jira, dateKey, request: () => Promise.reject(new Error("Offline")) })).rejects.toThrow("Offline");
  });
});
