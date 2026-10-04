import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { EventEmitter } from "node:events";
import scheduleModule from "../../electron/updateSchedule.js";

afterEach(() => vi.useRealTimers());

describe("daily update schedule", () => {
  it("checks once at startup, daily thereafter, and cleans up", () => {
    vi.useFakeTimers();
    const check = vi.fn();
    const schedule = scheduleModule.createUpdateSchedule(check);
    schedule.start(); schedule.start();
    expect(check).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(scheduleModule.DAY_MS - 1);
    expect(check).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(check).toHaveBeenCalledTimes(2);
    schedule.stop();
    vi.advanceTimersByTime(scheduleModule.DAY_MS);
    expect(check).toHaveBeenCalledTimes(2);
  });
  it("accounts for manual checks and checks overdue updates after sleep", () => {
    vi.useFakeTimers();
    const check = vi.fn();
    const schedule = scheduleModule.createUpdateSchedule(check);
    schedule.start();
    vi.advanceTimersByTime(12 * 3600000);
    schedule.markChecked();
    vi.advanceTimersByTime(12 * 3600000);
    expect(check).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + scheduleModule.DAY_MS);
    schedule.checkIfDue(); schedule.checkIfDue();
    expect(check).toHaveBeenCalledTimes(2);
    schedule.stop();
  });
});

// Exercise the existing main-process handlers without launching Electron or contacting a feed.
function setup(packaged = true) {
  const source = readFileSync(new URL("../../electron/main.js", import.meta.url), "utf8");
  const autoUpdater = new EventEmitter();
  autoUpdater.checkForUpdates = vi.fn().mockResolvedValue(null);
  const send = vi.fn();
  const context = {
    autoUpdater, app: { isPackaged: packaged },
    mainWindow: { isDestroyed: () => false, webContents: { send } },
    updateState: { status: "idle" }, updateCheckPromise: null, isUpdateDownloaded: false,
    hasStartedUpdateCheck: false, lastUpdateErrorMessage: "", MAX_NOTIFICATION_LENGTH: 500,
    truncateText: value => String(value || ""), updateSchedule: { markChecked: vi.fn(), start: vi.fn() },
  };
  const handlers = runInNewContext(`${source.slice(source.indexOf("function sanitizeUpdateInfo"), source.indexOf("function createTray"))}\n({ registerAutoUpdaterEvents, checkForUpdates, state: () => updateState })`, context);
  handlers.registerAutoUpdaterEvents();
  return { ...handlers, autoUpdater, send };
}

describe("existing updater event and check flow", () => {
  it("publishes states, progress and version without triggering an install", () => {
    const h = setup();
    h.autoUpdater.emit("checking-for-update");
    expect(h.state().status).toBe("checking");
    h.autoUpdater.emit("update-not-available", { version: "1" });
    expect(h.state().status).toBe("up-to-date");
    h.autoUpdater.emit("update-available", { version: "2" });
    h.autoUpdater.emit("download-progress", { percent: 45 });
    expect(h.state()).toMatchObject({ status: "downloading", update: { version: "2" }, progress: { percent: 45 } });
    h.autoUpdater.emit("update-downloaded", { version: "2" });
    expect(h.state()).toMatchObject({ status: "update-downloaded", update: { version: "2" } });
  });
  it("coalesces concurrent checks and does not check while downloading or ready", async () => {
    const h = setup();
    await Promise.all([h.checkForUpdates(), h.checkForUpdates()]);
    expect(h.autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
    h.autoUpdater.emit("update-available", { version: "2" });
    await h.checkForUpdates();
    h.autoUpdater.emit("update-downloaded", { version: "2" });
    await h.checkForUpdates();
    expect(h.autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
    expect(h.autoUpdater.listenerCount("update-downloaded")).toBe(1);
  });
  it("reports check and background download failures", async () => {
    const h = setup();
    h.autoUpdater.checkForUpdates.mockRejectedValueOnce(new Error("Offline"));
    expect(await h.checkForUpdates()).toMatchObject({ ok: false, error: "Offline" });
    h.autoUpdater.checkForUpdates.mockResolvedValueOnce({ updateInfo: { version: "2" }, downloadPromise: Promise.reject(new Error("Download failed")) });
    await h.checkForUpdates();
    expect(h.state()).toMatchObject({ status: "error", error: "Download failed" });
  });
  it("does not contact the update server in development", async () => {
    const h = setup(false);
    expect(await h.checkForUpdates()).toMatchObject({ skipped: true });
    expect(h.autoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });
});
