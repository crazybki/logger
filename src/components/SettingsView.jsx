import { useEffect, useState } from "react";
import { Icon } from "./Icons";
import { DEFAULT_DAILY_TARGET_SECONDS, formatTimeShort } from "../utils/reporting";
import { THEME_PRESETS } from "../utils/themes";

function secondsToParts(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  return {
    hours: String(Math.floor(safeSeconds / 3600)),
    minutes: String(Math.floor((safeSeconds % 3600) / 60)),
  };
}

export function SettingsView({
  dailyTargetSeconds,
  trashRetentionDays,
  themePreset,
  themeAccentColor,
  appLanguage = "no",
  accentColors,
  onClose,
  onSave,
}) {
  const text = appLanguage === "en"
    ? {
        settings: "Settings",
        close: "Close settings",
        language: "Language",
        languageHelp: "Switch core app labels between Norwegian and English.",
        norwegian: "Norwegian",
        english: "English",
        dailyTarget: "Daily target",
        dailyHelp: "Used by countdown, missing time, and reports.",
        hours: "Hours",
        minutes: "Minutes",
        nextTarget: "Next target",
        reset: "Reset",
        trashRetention: "Trash retention",
        trashHelp: "Deleted entries and tasks are permanently removed after this many days.",
        days: "Days",
        theme: "Theme",
        themeHelp: "Changes colors across all views and scrollbars.",
        accentColor: "Accent color",
        default: "Default",
        cancel: "Cancel",
        save: "Save settings",
      }
    : {
        settings: "Innstillinger",
        close: "Lukk innstillinger",
        language: "Språk",
        languageHelp: "Bytt kjernespråket i appen mellom norsk og engelsk.",
        norwegian: "Norsk",
        english: "Engelsk",
        dailyTarget: "Dagsmål",
        dailyHelp: "Brukes av nedtelling, manglende tid og rapporter.",
        hours: "Timer",
        minutes: "Minutter",
        nextTarget: "Neste mål",
        reset: "Nullstill",
        trashRetention: "Papirkurv",
        trashHelp: "Slettede entries og tasks fjernes permanent etter dette antallet dager.",
        days: "Dager",
        theme: "Tema",
        themeHelp: "Endrer farger på tvers av views og scrollbars.",
        accentColor: "Aksentfarge",
        default: "Standard",
        cancel: "Avbryt",
        save: "Lagre innstillinger",
      };
  const initialTarget = secondsToParts(dailyTargetSeconds);
  const [targetHours, setTargetHours] = useState(initialTarget.hours);
  const [targetMinutes, setTargetMinutes] = useState(initialTarget.minutes);
  const [retentionDays, setRetentionDays] = useState(String(trashRetentionDays));
  const [selectedThemePreset, setSelectedThemePreset] = useState(themePreset || "default");
  const [selectedAccentColor, setSelectedAccentColor] = useState(themeAccentColor || "");
  const [selectedLanguage, setSelectedLanguage] = useState(appLanguage || "no");

  useEffect(() => {
    const nextTarget = secondsToParts(dailyTargetSeconds);
    setTargetHours(nextTarget.hours);
    setTargetMinutes(nextTarget.minutes);
    setRetentionDays(String(trashRetentionDays));
    setSelectedThemePreset(themePreset || "default");
    setSelectedAccentColor(themeAccentColor || "");
    setSelectedLanguage(appLanguage || "no");
  }, [appLanguage, dailyTargetSeconds, themeAccentColor, themePreset, trashRetentionDays]);

  const nextDailyTargetSeconds =
    (Number(targetHours) || 0) * 3600 + (Number(targetMinutes) || 0) * 60;
  const canSave = nextDailyTargetSeconds > 0 && Number(retentionDays) > 0;

  function handleSave(event) {
    event.preventDefault();
    if (!canSave) return;

    onSave({
      dailyTargetSeconds: nextDailyTargetSeconds,
      trashRetentionDays: Math.max(1, Math.floor(Number(retentionDays))),
      themePreset: selectedThemePreset,
      themeAccentColor: selectedAccentColor,
      appLanguage: selectedLanguage,
    });
  }

  function handleResetTarget() {
    const parts = secondsToParts(DEFAULT_DAILY_TARGET_SECONDS);
    setTargetHours(parts.hours);
    setTargetMinutes(parts.minutes);
  }

  return (
    <section className="settings-view">
      <div className="settings-header">
        <div className="settings-title">
          <Icon name="settings" size={14} />
          <h2>{text.settings}</h2>
        </div>

        <button
          type="button"
          className="todo-close-btn"
          onClick={onClose}
          title={text.close}
        >
          <Icon name="close" size={13} />
        </button>
      </div>

      <form className="settings-form" onSubmit={handleSave}>
        <div className="settings-card">
          <div className="settings-card-copy">
            <strong>{text.language}</strong>
            <span>{text.languageHelp}</span>
          </div>

          <div className="settings-language-toggle" role="group" aria-label={text.language}>
            <button
              type="button"
              className={selectedLanguage === "no" ? "active" : ""}
              onClick={() => setSelectedLanguage("no")}
            >
              {text.norwegian}
            </button>
            <button
              type="button"
              className={selectedLanguage === "en" ? "active" : ""}
              onClick={() => setSelectedLanguage("en")}
            >
              {text.english}
            </button>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-copy">
            <strong>{text.dailyTarget}</strong>
            <span>{text.dailyHelp}</span>
          </div>

          <div className="settings-time-grid">
            <label>
              <span>{text.hours}</span>
              <input
                type="number"
                min="0"
                max="24"
                value={targetHours}
                onChange={(event) => setTargetHours(event.target.value)}
              />
            </label>

            <label>
              <span>{text.minutes}</span>
              <input
                type="number"
                min="0"
                max="59"
                value={targetMinutes}
                onChange={(event) => setTargetMinutes(event.target.value)}
              />
            </label>
          </div>

          <div className="settings-card-footer">
            <span>{text.nextTarget}: {formatTimeShort(nextDailyTargetSeconds)}</span>
            <button type="button" onClick={handleResetTarget}>{text.reset}</button>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-copy">
            <strong>{text.trashRetention}</strong>
            <span>{text.trashHelp}</span>
          </div>

          <label className="settings-single-input">
            <span>{text.days}</span>
            <input
              type="number"
              min="1"
              max="90"
              value={retentionDays}
              onChange={(event) => setRetentionDays(event.target.value)}
            />
          </label>
        </div>

        <div className="settings-card">
          <div className="settings-card-copy">
            <strong>{text.theme}</strong>
            <span>{text.themeHelp}</span>
          </div>

          <div className="theme-preset-grid">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={selectedThemePreset === preset.id ? "active" : ""}
                onClick={() => {
                  setSelectedThemePreset(preset.id);
                  setSelectedAccentColor("");
                }}
              >
                <span
                  className="theme-preset-swatch"
                  style={{
                    "--preset-bg": preset.colors.bg,
                    "--preset-panel": preset.colors.panel,
                    "--preset-accent": preset.colors.accent,
                  }}
                />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>

          <div className="settings-card-copy compact">
            <strong>{text.accentColor}</strong>
          </div>

          <div className="theme-accent-grid">
            {(accentColors || []).map((color) => (
              <button
                key={color}
                type="button"
                className={selectedAccentColor.toLowerCase() === color.toLowerCase() ? "active" : ""}
                onClick={() => setSelectedAccentColor(color)}
                title={color}
                aria-label={`Use ${color} accent`}
                style={{ "--accent-option": color }}
              />
            ))}

            <button
              type="button"
              className={!selectedAccentColor ? "theme-accent-default active" : "theme-accent-default"}
              onClick={() => setSelectedAccentColor("")}
            >
              {text.default}
            </button>
          </div>
        </div>

        <div className="settings-actions">
          <button type="button" className="settings-cancel" onClick={onClose}>
            {text.cancel}
          </button>
          <button type="submit" className="settings-save" disabled={!canSave}>
            <Icon name="check" size={13} color={canSave ? "#fff" : "#446"} />
            {text.save}
          </button>
        </div>
      </form>
    </section>
  );
}
