import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { UpdateStatus } from "./UpdateStatus";

it("keeps idle status out of the main window and offers a settings check", () => {
  expect(renderToStaticMarkup(<UpdateStatus state={{ status: "idle" }} />)).toBe("");
  expect(renderToStaticMarkup(<UpdateStatus settings state={{ status: "idle" }} />)).toContain("Check for updates");
});
it("only offers restart when the download is ready", () => {
  expect(renderToStaticMarkup(<UpdateStatus state={{ status: "downloading", progress: { percent: 42 } }} />)).toContain("42%");
  const ready = renderToStaticMarkup(<UpdateStatus state={{ status: "update-downloaded", update: { version: "0.2.0" } }} />);
  expect(ready).toContain("v0.2.0");
  expect(ready).toContain("Update &amp; Restart");
});
