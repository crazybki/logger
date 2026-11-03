import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { UI_TEXT } from "./uiText";

describe("UI translations", () => {
  it("provides a non-empty English translation for every Norwegian key", () => {
    expect(Object.keys(UI_TEXT.en).sort()).toEqual(Object.keys(UI_TEXT.no).sort());
    for (const value of Object.values(UI_TEXT.en)) {
      expect(typeof value).toBe("string");
      expect(value.trim()).not.toBe("");
    }
  });

  it("resolves every text key used by Logger in both languages", () => {
    const source = readFileSync(new URL("../main logger/Logger.jsx", import.meta.url), "utf8");
    const keys = [...source.matchAll(/\btext\.([a-zA-Z]\w*)/g)].map(match => match[1]);
    for (const key of keys) {
      expect(UI_TEXT.en, `English: ${key}`).toHaveProperty(key);
      expect(UI_TEXT.no, `Norwegian: ${key}`).toHaveProperty(key);
    }
  });

  it("translates task reminders, validation, import help and context menus", () => {
    expect(UI_TEXT.en.snoozeReminder).toBe("Snooze reminder");
    expect(UI_TEXT.en.enterTaskName).toBe("Enter a task name");
    expect(UI_TEXT.en.importFormats).toBe("CSV, TSV and TXT are supported");
    expect(UI_TEXT.en.cancelMerge).toBe("Cancel merge");
    expect(UI_TEXT.no.snoozeReminder).toBe("Utsett påminnelse");
  });
});
