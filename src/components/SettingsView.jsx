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
  jiraStatus = {},
  jiraFeedback = "",
  jiraProjects = [],
  selectedJiraProjectKeys = [],
  jiraTicketQuery = "",
  isJiraFetchingTickets = false,
  isJiraBusy = false,
  pendingJiraSyncCount = 0,
  onClose,
  onSave,
  onSaveJiraCredentials,
  onTestJiraConnection,
  onClearJiraCredentials,
  onSyncJiraWorklogs,
  onLoadJiraProjects,
  onToggleJiraProject,
  onChangeJiraTicketQuery,
  onFetchJiraTickets,
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
        jira: "Jira",
        jiraHelp: "Store credentials securely and sync completed time entries as Jira worklogs.",
        jiraBaseUrl: "Base URL",
        jiraEmail: "Email",
        jiraApiToken: "API token",
        jiraTokenSaved: "API token saved",
        jiraTokenMissing: "No API token saved",
        saveJira: "Save Jira",
        testJira: "Test connection",
        clearJira: "Clear",
        syncJira: "Sync worklogs",
        pendingSync: "Pending",
        jiraStepsTitle: "How to sync",
        jiraSteps:
          "Save your Jira URL, email, and API token. Test the connection, then sync completed ticket entries. Entries already synced are skipped.",
        jiraReadyToTest: "You can test after the Jira details are filled in. Unsaved changes are saved before testing.",
        jiraSaveFirst: "Fill in Jira URL, email, and API token before testing.",
        jiraTickets: "Jira tickets",
        jiraTicketsHelp: "Choose projects and fetch issues into the local ticket search.",
        loadProjects: "Load projects",
        fetchTickets: "Fetch tickets",
        ticketFilter: "Ticket filter",
        ticketFilterPlaceholder: "Summary contains...",
        ticketFilterHelp: "Leave empty to fetch all recent tickets from the selected projects.",
        noProjectsLoaded: "No Jira projects loaded yet.",
        selectedProjects: "Selected projects",
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
        jira: "Jira",
        jiraHelp: "Lagre innlogging sikkert og synk ferdige time entries som Jira worklogs.",
        jiraBaseUrl: "Base URL",
        jiraEmail: "E-post",
        jiraApiToken: "API token",
        jiraTokenSaved: "API token lagret",
        jiraTokenMissing: "Ingen API token lagret",
        saveJira: "Lagre Jira",
        testJira: "Test tilkobling",
        clearJira: "Slett",
        syncJira: "Synk worklogs",
        pendingSync: "Venter",
        jiraStepsTitle: "Slik synker du",
        jiraSteps:
          "Lagre Jira URL, e-post og API token. Test tilkoblingen, og synk deretter ferdige ticket entries. Entries som allerede er synket hoppes over.",
        jiraReadyToTest: "Du kan teste når Jira-feltene er fylt ut. Ulagrede endringer lagres før testen.",
        jiraSaveFirst: "Fyll inn Jira URL, e-post og API token før du tester.",
        jiraTickets: "Jira tickets",
        jiraTicketsHelp: "Velg prosjekter og hent saker inn i lokalt ticketsøk.",
        loadProjects: "Hent prosjekter",
        fetchTickets: "Hent tickets",
        ticketFilter: "Ticket-filter",
        ticketFilterPlaceholder: "Summary inneholder...",
        ticketFilterHelp: "La stå tomt for å hente alle nyeste tickets fra valgte prosjekter.",
        noProjectsLoaded: "Ingen Jira-prosjekter hentet ennå.",
        selectedProjects: "Valgte prosjekter",
      };
  const initialTarget = secondsToParts(dailyTargetSeconds);
  const [targetHours, setTargetHours] = useState(initialTarget.hours);
  const [targetMinutes, setTargetMinutes] = useState(initialTarget.minutes);
  const [retentionDays, setRetentionDays] = useState(String(trashRetentionDays));
  const [selectedThemePreset, setSelectedThemePreset] = useState(themePreset || "default");
  const [selectedAccentColor, setSelectedAccentColor] = useState(themeAccentColor || "");
  const [selectedLanguage, setSelectedLanguage] = useState(appLanguage || "no");
  const [jiraBaseUrl, setJiraBaseUrl] = useState(jiraStatus.jiraBaseUrl || "");
  const [jiraEmail, setJiraEmail] = useState(jiraStatus.jiraEmail || "");
  const [jiraApiToken, setJiraApiToken] = useState("");

  useEffect(() => {
    const nextTarget = secondsToParts(dailyTargetSeconds);
    setTargetHours(nextTarget.hours);
    setTargetMinutes(nextTarget.minutes);
    setRetentionDays(String(trashRetentionDays));
    setSelectedThemePreset(themePreset || "default");
    setSelectedAccentColor(themeAccentColor || "");
    setSelectedLanguage(appLanguage || "no");
  }, [appLanguage, dailyTargetSeconds, themeAccentColor, themePreset, trashRetentionDays]);

  useEffect(() => {
    setJiraBaseUrl(jiraStatus.jiraBaseUrl || "");
    setJiraEmail(jiraStatus.jiraEmail || "");
    setJiraApiToken("");
  }, [jiraStatus.jiraBaseUrl, jiraStatus.jiraEmail, jiraStatus.hasJiraApiToken]);

  const nextDailyTargetSeconds =
    (Number(targetHours) || 0) * 3600 + (Number(targetMinutes) || 0) * 60;
  const canSave = nextDailyTargetSeconds > 0 && Number(retentionDays) > 0;
  const canSaveJira =
    Boolean(jiraBaseUrl.trim() && jiraEmail.trim()) &&
    (Boolean(jiraApiToken.trim()) || Boolean(jiraStatus.hasJiraApiToken));
  const hasSavedJiraCredentials =
    Boolean(jiraStatus.jiraBaseUrl && jiraStatus.jiraEmail && jiraStatus.hasJiraApiToken);
  const hasUnsavedJiraChanges =
    jiraBaseUrl.trim() !== (jiraStatus.jiraBaseUrl || "") ||
    jiraEmail.trim() !== (jiraStatus.jiraEmail || "") ||
    Boolean(jiraApiToken.trim());
  const canTestJira = hasSavedJiraCredentials || canSaveJira;
  const canSyncJira = hasSavedJiraCredentials && !hasUnsavedJiraChanges && pendingJiraSyncCount > 0;
  const canUseJiraTicketTools = hasSavedJiraCredentials && !hasUnsavedJiraChanges;
  const selectedProjectCount = selectedJiraProjectKeys.length;

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

  function getJiraCredentialPayload() {
    const credentials = {
      jiraBaseUrl: jiraBaseUrl.trim(),
      jiraEmail: jiraEmail.trim(),
    };

    if (jiraApiToken.trim()) {
      credentials.jiraApiToken = jiraApiToken.trim();
    }

    return credentials;
  }

  async function handleSaveJira() {
    if (!canSaveJira || !onSaveJiraCredentials) return;

    const saved = await onSaveJiraCredentials(getJiraCredentialPayload());
    if (saved) setJiraApiToken("");
  }

  async function handleTestJira() {
    if (!canTestJira || !onTestJiraConnection) return;

    if (hasUnsavedJiraChanges) {
      if (!canSaveJira || !onSaveJiraCredentials) return;

      const saved = await onSaveJiraCredentials(getJiraCredentialPayload());
      if (!saved) return;
      setJiraApiToken("");
    }

    onTestJiraConnection();
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

        <div className="settings-card jira-settings-card">
          <div className="settings-card-copy">
            <strong>{text.jira}</strong>
            <span>{text.jiraHelp}</span>
          </div>

          <div className="jira-settings-grid">
            <label className="settings-single-input">
              <span>{text.jiraBaseUrl}</span>
              <input
                type="url"
                placeholder="https://company.atlassian.net"
                value={jiraBaseUrl}
                onChange={(event) => setJiraBaseUrl(event.target.value)}
                autoComplete="off"
              />
            </label>

            <label className="settings-single-input">
              <span>{text.jiraEmail}</span>
              <input
                type="email"
                value={jiraEmail}
                onChange={(event) => setJiraEmail(event.target.value)}
                autoComplete="username"
              />
            </label>

            <label className="settings-single-input">
              <span>{text.jiraApiToken}</span>
              <input
                type="password"
                value={jiraApiToken}
                onChange={(event) => setJiraApiToken(event.target.value)}
                autoComplete="new-password"
                placeholder={jiraStatus.hasJiraApiToken ? text.jiraTokenSaved : ""}
              />
            </label>
          </div>

          <div className="jira-status-row">
            <span className={jiraStatus.hasJiraApiToken ? "jira-token-status saved" : "jira-token-status"}>
              {jiraStatus.hasJiraApiToken ? text.jiraTokenSaved : text.jiraTokenMissing}
            </span>
            <span>{text.pendingSync}: {pendingJiraSyncCount}</span>
          </div>

          <div className="jira-help-box">
            <strong>{text.jiraStepsTitle}</strong>
            <span>{text.jiraSteps}</span>
            <span>{canTestJira ? text.jiraReadyToTest : text.jiraSaveFirst}</span>
          </div>

          {jiraFeedback && (
            <div className="jira-feedback" role="status">
              {jiraFeedback}
            </div>
          )}

          <div className="jira-actions">
            <button type="button" onClick={handleSaveJira} disabled={!canSaveJira || isJiraBusy}>
              {text.saveJira}
            </button>
            <button type="button" onClick={handleTestJira} disabled={!canTestJira || isJiraBusy}>
              {text.testJira}
            </button>
            <button type="button" onClick={onSyncJiraWorklogs} disabled={!canSyncJira || isJiraBusy}>
              {text.syncJira}
            </button>
            <button type="button" className="danger" onClick={onClearJiraCredentials} disabled={isJiraBusy}>
              {text.clearJira}
            </button>
          </div>

          <div className="jira-ticket-tools">
            <div className="settings-card-copy compact">
              <strong>{text.jiraTickets}</strong>
              <span>{text.jiraTicketsHelp}</span>
            </div>

            <div className="jira-project-toolbar">
              <button
                type="button"
                onClick={onLoadJiraProjects}
                disabled={!canUseJiraTicketTools || isJiraBusy || isJiraFetchingTickets}
              >
                {text.loadProjects}
              </button>
              <span>{text.selectedProjects}: {selectedProjectCount}</span>
            </div>

            <div className="jira-project-list">
              {jiraProjects.length ? (
                jiraProjects.map((project) => {
                  const selected = selectedJiraProjectKeys.includes(project.key);

                  return (
                    <label key={project.key} className={selected ? "selected" : ""}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onToggleJiraProject?.(project.key)}
                        disabled={!canUseJiraTicketTools || isJiraBusy || isJiraFetchingTickets}
                      />
                      <span>
                        <strong>{project.key}</strong>
                        {project.name && <small>{project.name}</small>}
                      </span>
                    </label>
                  );
                })
              ) : (
                <p>{text.noProjectsLoaded}</p>
              )}
            </div>

            <label className="settings-single-input">
              <span>{text.ticketFilter}</span>
              <input
                type="text"
                value={jiraTicketQuery}
                onChange={(event) => onChangeJiraTicketQuery?.(event.target.value)}
                placeholder={text.ticketFilterPlaceholder}
                disabled={!canUseJiraTicketTools || isJiraBusy || isJiraFetchingTickets}
              />
            </label>
            <span className="jira-filter-help">{text.ticketFilterHelp}</span>

            <button
              type="button"
              className="jira-fetch-tickets"
              onClick={onFetchJiraTickets}
              disabled={!canUseJiraTicketTools || isJiraBusy || isJiraFetchingTickets}
            >
              {isJiraFetchingTickets ? `${text.fetchTickets}...` : text.fetchTickets}
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
