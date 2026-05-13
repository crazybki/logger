import { useEffect, useState } from "react";
import { Icon } from "./Icons";
import { DEFAULT_DAILY_TARGET_SECONDS, formatTimeShort } from "../utils/reporting";

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
  onClose,
  onSave,
}) {
  const initialTarget = secondsToParts(dailyTargetSeconds);
  const [targetHours, setTargetHours] = useState(initialTarget.hours);
  const [targetMinutes, setTargetMinutes] = useState(initialTarget.minutes);
  const [retentionDays, setRetentionDays] = useState(String(trashRetentionDays));

  useEffect(() => {
    const nextTarget = secondsToParts(dailyTargetSeconds);
    setTargetHours(nextTarget.hours);
    setTargetMinutes(nextTarget.minutes);
    setRetentionDays(String(trashRetentionDays));
  }, [dailyTargetSeconds, trashRetentionDays]);

  const nextDailyTargetSeconds =
    (Number(targetHours) || 0) * 3600 + (Number(targetMinutes) || 0) * 60;
  const canSave = nextDailyTargetSeconds > 0 && Number(retentionDays) > 0;

  function handleSave(event) {
    event.preventDefault();
    if (!canSave) return;

    onSave({
      dailyTargetSeconds: nextDailyTargetSeconds,
      trashRetentionDays: Math.max(1, Math.floor(Number(retentionDays))),
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
          <h2>Settings</h2>
        </div>

        <button
          type="button"
          className="todo-close-btn"
          onClick={onClose}
          title="Close settings"
        >
          <Icon name="close" size={13} />
        </button>
      </div>

      <form className="settings-form" onSubmit={handleSave}>
        <div className="settings-card">
          <div className="settings-card-copy">
            <strong>Daily target</strong>
            <span>Used by countdown, missing time, and reports.</span>
          </div>

          <div className="settings-time-grid">
            <label>
              <span>Hours</span>
              <input
                type="number"
                min="0"
                max="24"
                value={targetHours}
                onChange={(event) => setTargetHours(event.target.value)}
              />
            </label>

            <label>
              <span>Minutes</span>
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
            <span>Next target: {formatTimeShort(nextDailyTargetSeconds)}</span>
            <button type="button" onClick={handleResetTarget}>Reset</button>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-copy">
            <strong>Trash retention</strong>
            <span>Deleted entries and tasks are permanently removed after this many days.</span>
          </div>

          <label className="settings-single-input">
            <span>Days</span>
            <input
              type="number"
              min="1"
              max="90"
              value={retentionDays}
              onChange={(event) => setRetentionDays(event.target.value)}
            />
          </label>
        </div>

        <div className="settings-actions">
          <button type="button" className="settings-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="settings-save" disabled={!canSave}>
            <Icon name="check" size={13} color={canSave ? "#fff" : "#446"} />
            Save settings
          </button>
        </div>
      </form>
    </section>
  );
}
