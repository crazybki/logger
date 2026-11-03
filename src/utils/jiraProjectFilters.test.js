import { describe, expect, it } from "vitest";
import { matchesProjectFilter, projectFilterJql } from "../../electron/jiraProjectFilters.mjs";

describe("project title filters", () => {
  const filters = { NO: "Norge AS support live", SE: "Sverige test" };
  it.each(["Norge AS - support - live", "Norge as support live", "LIVE / NORGE AS / Supp", "Norge  AS: Support (Live)"])("matches title variant %s", title => {
    expect(matchesProjectFilter({ id: "NO-12", title }, filters)).toBe(true);
  });
  it.each(["Norge AS support", "Norge AS support lively", "Norge AS live", "Other AS support live"])("rejects missing or partial words in %s", title => {
    expect(matchesProjectFilter({ id: "NO-12", title }, filters)).toBe(false);
  });
  it("applies only the ticket's project filter and allows empty filters", () => {
    expect(matchesProjectFilter({ id: "SE-1", title: "Sverige test" }, filters)).toBe(true);
    expect(matchesProjectFilter({ id: "OTHER-1", title: "Anything" }, filters)).toBe(true);
    expect(matchesProjectFilter({ id: "NO-1", title: "Anything" }, { NO: " " })).toBe(true);
  });
  it("preserves Norwegian letters", () => {
    expect(matchesProjectFilter({ id: "NO-1", title: "Ørn Ås - LIVE" }, { NO: "ørn ås live" })).toBe(true);
    expect(matchesProjectFilter({ id: "NO-1", title: "rn s live" }, { NO: "ørn ås live" })).toBe(false);
  });
  it("scopes each JQL condition to its project and includes support aliases", () => {
    expect(projectFilterJql({ NO: "support-live", SE: "test", BAD: "" })).toBe('(project != NO OR ((summary ~ "support" OR summary ~ "supp") AND (summary ~ "live"))) AND (project != SE OR ((summary ~ "test")))');
    expect(projectFilterJql({ 'NO OR 1=1': "test" })).toBe("");
    expect(projectFilterJql({ NO: 'live" OR project = OTHER' })).not.toContain('live" OR');
  });
});
