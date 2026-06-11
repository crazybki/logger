import { describe, expect, it } from "vitest";
import {
  applyElapsedTime,
  formatMissingDelta,
  formatTime,
  formatTimeShort,
  getDateKey,
} from "./reporting";

describe("reporting utilities", () => {
  it("formats seconds as hh:mm:ss", () => {
    expect(formatTime(0)).toBe("00:00:00");
    expect(formatTime(3661)).toBe("01:01:01");
  });

  it("formats seconds as compact hours and minutes", () => {
    expect(formatTimeShort(3660)).toBe("1h 01m");
    expect(formatTimeShort(60)).toBe("0h 01m");
  });

  it("formats missing deltas with sign and padded minutes", () => {
    expect(formatMissingDelta(-5400)).toBe("-1:30");
    expect(formatMissingDelta(900)).toBe("0:15");
  });

  it("normalizes supported date inputs to date keys", () => {
    expect(getDateKey({ createdAt: "2026-6-3" })).toBe("2026-06-03");
    expect(getDateKey({ createdAt: "03.06.2026" })).toBe("2026-06-03");
  });

  it("prefers an explicit dateKey", () => {
    expect(getDateKey({ dateKey: "2026-06-11", createdAt: "03.06.2026" })).toBe("2026-06-11");
  });

  it("applies elapsed time to running entries", () => {
    const entry = {
      status: "running",
      seconds: 120,
      lastTickAt: 1_000,
    };

    expect(applyElapsedTime(entry, 4_500)).toEqual({
      status: "running",
      seconds: 123,
      lastTickAt: 4_500,
    });
  });
});
