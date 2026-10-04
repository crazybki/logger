import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LoggingProgress } from "./LoggingProgress";
import { DEFAULT_WORK_SCHEDULE } from "../utils/loggingProgress";

function render(remote, hour = 13) {
  return renderToStaticMarkup(<LoggingProgress now={new Date(2026, 9, 5, hour).getTime()} schedule={DEFAULT_WORK_SCHEDULE} remote={{ refresh() {}, ...remote }} appLanguage="en" />);
}

it("does not label an unknown total as behind or zero", () => {
  const markup = render({ snapshot: null, loading: true });
  expect(markup).toContain("Awaiting sync");
  expect(markup).toContain("Refreshing");
  expect(markup).not.toContain("Behind");
});

it("keeps and labels a stale total and renders the difference", () => {
  const markup = render({ snapshot: { seconds: 240 * 60, source: "Jira", fetchedAt: Date.now() }, error: "Offline" });
  expect(markup).toContain("Behind");
  expect(markup).toContain("30m");
  expect(markup).toContain("value may be stale");
  expect(markup).toContain("Last sync");
});

it("caps the bar but preserves percentages above 100", () => {
  const markup = render({ snapshot: { seconds: 300 * 60, source: "Tempo", fetchedAt: Date.now() } });
  expect(markup).toContain('value="100"');
  expect(markup).toContain("111% of expected time");
  expect(markup).toContain("Ahead");
});

it("shows an explicit zero-expectation message", () => {
  const markup = render({ snapshot: { seconds: 0, source: "Jira", fetchedAt: Date.now() } }, 7);
  expect(markup).toContain("No time expected yet");
  expect(markup).not.toMatch(/NaN|Infinity/);
});
