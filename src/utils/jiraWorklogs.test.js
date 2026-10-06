import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { canExtendJiraWorklog, isJiraWorklogPending, withJiraSyncBaseline } from "./jiraWorklogs";
import { getDateKey } from "./reporting";
import remote from "../../electron/updateJiraWorklog.js";

const synced = { id: 1, ticketName: "AC-1 - Support Live", jiraWorklogId: "123", seconds: 900, status: "done", dateKey: "2026-10-07" };

describe("synced worklog duration tracking", () => {
  it("tracks old entries and repeated edits against the last synced duration", () => {
    expect(isJiraWorklogPending(synced)).toBe(false);
    const edited = { ...withJiraSyncBaseline(synced), seconds: 1800 };
    expect(edited.jiraWorklogId).toBe("123");
    expect(edited.jiraSyncedSeconds).toBe(900);
    expect(isJiraWorklogPending(edited)).toBe(true);
    expect(withJiraSyncBaseline(edited).jiraSyncedSeconds).toBe(900);
    expect(isJiraWorklogPending({ ...edited, jiraSyncedSeconds: 1800 })).toBe(false);
    expect(isJiraWorklogPending({ ...edited, seconds: 900 })).toBe(false);
    expect(isJiraWorklogPending({ ...edited, seconds: 600 })).toBe(true);
  });
  it("excludes Tempo, deleted, active and task entries from extension", () => {
    expect(canExtendJiraWorklog(synced)).toBe(true);
    for (const change of [{ tempoWorklogId: "2" }, { deletedAt: "date" }, { status: "running" }, { source: "todo" }, { todoTaskId: 1 }]) {
      expect(canExtendJiraWorklog({ ...synced, ...change })).toBe(false);
    }
  });
});

function mergers() {
  const source = readFileSync(new URL("../main logger/Logger.jsx", import.meta.url), "utf8");
  return runInNewContext(`${source.slice(source.indexOf("  function getTicketMergeIdentity"), source.indexOf("  const activeEntries"))}\n({ addOrMergeCompletedTicketEntry, mergeCompletedTicketEntry })`, {
    getDateKey, canExtendJiraWorklog, withJiraSyncBaseline, jiraSyncInFlightRef: { current: new Set() },
    getJiraIssueKeyFromTicketName: name => name.split(" - ")[0],
  });
}

describe("adding more time to the same ticket", () => {
  const additional = { id: 2, ticketName: synced.ticketName, seconds: 900, status: "done", dateKey: synced.dateKey };
  it("adds manual time to the existing synced entry", () => {
    const result = mergers().addOrMergeCompletedTicketEntry([synced], additional);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 1, seconds: 1800, jiraWorklogId: "123", jiraSyncedSeconds: 900 });
  });
  it("combines a newly finished timer with the existing worklog", () => {
    const result = mergers().mergeCompletedTicketEntry([additional, synced], 2);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ seconds: 1800, jiraWorklogId: "123", jiraSyncedSeconds: 900 });
  });
  it("does not combine different tickets or dates", () => {
    for (const change of [{ dateKey: "2026-10-08" }, { ticketName: "AC-2 - Support Live" }]) {
      expect(mergers().addOrMergeCompletedTicketEntry([synced], { ...additional, ...change })).toHaveLength(2);
    }
  });
  it("prefers the synced target over an unsynced duplicate", () => {
    const result = mergers().addOrMergeCompletedTicketEntry([{ ...additional, id: 3 }, synced], additional);
    expect(result.find(entry => entry.id === 1).seconds).toBe(1800);
  });
});

describe("Jira worklog update requests", () => {
  const url = "https://jira.example/rest/api/3/issue/AC-1/worklog/123";
  const entry = { timeSpentSeconds: 1800, jiraSyncedSeconds: 900 };
  const response = (seconds = 900) => ({ ok: true, json: async () => ({ id: "123", timeSpentSeconds: seconds }) });
  it("updates the existing ID to the total duration with PUT, never POST", async () => {
    const request = vi.fn().mockResolvedValueOnce(response()).mockResolvedValueOnce(response(1800));
    await remote.updateJiraWorklog({ url, entry, authHeader: "test", request });
    expect(request.mock.calls[1][0]).toBe(`${url}?adjustEstimate=leave`);
    expect(request.mock.calls[1][1].method).toBe("PUT");
    expect(JSON.parse(request.mock.calls[1][1].body)).toEqual({ timeSpentSeconds: 1800 });
  });
  it("retries an already applied update without adding time again", async () => {
    const request = vi.fn().mockResolvedValue(response(1800));
    const result = await remote.updateJiraWorklog({ url, entry, request });
    expect((await result.json()).timeSpentSeconds).toBe(1800);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it.each([403, 404, 503])("does not create a replacement on HTTP %i", async status => {
    const request = vi.fn().mockResolvedValue({ ok: false, status });
    expect(await remote.updateJiraWorklog({ url, entry, request })).toMatchObject({ ok: false, status });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("rejects a conflicting external duration change", async () => {
    const request = vi.fn().mockResolvedValue(response(1200));
    await expect(remote.updateJiraWorklog({ url, entry, request })).rejects.toThrow("changed in Jira");
    expect(request).toHaveBeenCalledTimes(1);
  });
});
