import { describe, expect, it } from "vitest";
import { calculateExpectedMinutes, calculateLoggingDifference, calculateProgress, DEFAULT_WORK_SCHEDULE, isValidWorkSchedule } from "./loggingProgress";
import { getDateKeyFromDate } from "./reporting";

describe("expected logging using local wall time", () => {
  it.each([
    [7, 59, 0], [8, 0, 0], [9, 0, 60], [11, 29, 209], [11, 30, 210],
    [11, 45, 210], [12, 0, 210], [13, 0, 270], [16, 0, 450], [23, 59, 450],
  ])("at %i:%i expects %i minutes", (hour, minute, expected) => {
    expect(calculateExpectedMinutes(new Date(2026, 9, 5, hour, minute))).toBe(expected);
  });
  it("respects non-working days and custom weekdays", () => {
    const sunday = new Date(2026, 9, 4, 13);
    expect(calculateExpectedMinutes(sunday)).toBe(0);
    expect(calculateExpectedMinutes(sunday, { ...DEFAULT_WORK_SCHEDULE, weekdays: [0] })).toBe(270);
    expect(calculateExpectedMinutes(sunday, { ...DEFAULT_WORK_SCHEDULE, weekdays: [] })).toBe(0);
  });
  it("resets date and expected time across midnight", () => {
    const before = new Date(2026, 9, 5, 23, 59), after = new Date(2026, 9, 6, 0, 0);
    expect(getDateKeyFromDate(before)).toBe("2026-10-05");
    expect(getDateKeyFromDate(after)).toBe("2026-10-06");
    expect(calculateExpectedMinutes(before)).toBe(450);
    expect(calculateExpectedMinutes(after)).toBe(0);
  });
  it("supports no break and rejects invalid schedules", () => {
    expect(calculateExpectedMinutes(new Date(2026, 9, 5, 16), { ...DEFAULT_WORK_SCHEDULE, breakMinutes: 0 })).toBe(480);
    for (const change of [{ end: "07:00" }, { breakMinutes: -1 }, { breakMinutes: 400 }, { start: "25:00" }, { weekdays: [8] }]) {
      expect(isValidWorkSchedule({ ...DEFAULT_WORK_SCHEDULE, ...change })).toBe(false);
    }
  });
});

describe("logging comparison", () => {
  it("shows behind and ahead", () => {
    expect(calculateLoggingDifference(165, 193)).toEqual({ difference: -28, status: "behind" });
    expect(calculateLoggingDifference(210, 193)).toEqual({ difference: 17, status: "ahead" });
  });
  it.each([-5, -2, 0, 2, 5])("uses inclusive tolerance for %i minutes", delta => {
    expect(calculateLoggingDifference(100 + delta, 100).status).toBe("onTrack");
  });
  it("rounds percentages, permits over 100 and handles zero", () => {
    expect(calculateProgress(165, 193)).toBe(85);
    expect(calculateProgress(105, 100)).toBe(105);
    expect(calculateProgress(0, 0)).toBe(0);
    expect(calculateProgress(60, 0)).toBe(0);
  });
});
