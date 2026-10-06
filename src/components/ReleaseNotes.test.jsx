import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReleaseNotes } from "./ReleaseNotes";
import { UpdateStatus } from "./UpdateStatus";
import notesModule from "../../electron/releaseNotes.js";

it("normalizes string and multi-version updater release notes", () => {
  expect(notesModule.normalizeReleaseNotes("<p>New search</p><p>Better sync &amp; updates</p>")).toBe("New search\nBetter sync & updates");
  expect(notesModule.normalizeReleaseNotes([{ version: "0.1.9", note: "Search improvements" }, { version: "0.1.8", note: "Banner fix" }])).toContain("0.1.9\nSearch improvements\n\n0.1.8\nBanner fix");
  expect(notesModule.normalizeReleaseNotes(null)).toBe("");
  expect(notesModule.normalizeReleaseNotes("x".repeat(13000))).toHaveLength(12000);
});

it("renders notes as escaped text in an expandable section", () => {
  const markup = renderToStaticMarkup(<ReleaseNotes notes={'New feature\n<img src=x onerror="alert(1)">'} />);
  expect(markup).toContain("<details");
  expect(markup).toContain("What&#x27;s new");
  expect(markup).not.toContain("<img");
  expect(markup).toContain("&lt;img");
  expect(renderToStaticMarkup(<ReleaseNotes notes="" />)).toBe("");
});

it("exposes available release notes beside the update action", () => {
  const markup = renderToStaticMarkup(<UpdateStatus state={{ status: "update-downloaded", update: { version: "0.1.9", releaseNotes: "Improved Jira syncing" } }} />);
  expect(markup).toContain("Improved Jira syncing");
  expect(markup).toContain("Update &amp; Restart");
});
