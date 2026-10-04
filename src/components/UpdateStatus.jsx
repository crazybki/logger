export function UpdateStatus({ state, language = "en", onCheck, onInstall, settings = false }) {
  const en = language === "en";
  const status = state.status;
  const version = state.update?.version ? `v${state.update.version}` : "";
  const labels = en ? {
    idle: "Updates are checked automatically every day.", checking: "Checking for updates…",
    "update-available": `${version} Update available`, downloading: `Downloading update… ${state.progress ? `${Math.round(state.progress.percent)}%` : ""}`,
    "update-downloaded": `${version} Update ready`, "up-to-date": "You're up to date.", error: "Update failed",
  } : {
    idle: "Oppdateringer sjekkes automatisk hver dag.", checking: "Ser etter oppdateringer…",
    "update-available": `${version} Oppdatering tilgjengelig`, downloading: `Laster ned oppdatering… ${state.progress ? `${Math.round(state.progress.percent)}%` : ""}`,
    "update-downloaded": `${version} Oppdatering klar`, "up-to-date": "Du har nyeste versjon.", error: "Oppdatering feilet",
  };
  if (!settings && !["update-available", "downloading", "update-downloaded"].includes(status)) return null;
  const busy = ["checking", "update-available", "downloading"].includes(status);
  return <div className="update-status">
    <span role="status">{labels[status] || labels.idle}{state.error && `: ${state.error}`}{state.reason && ` ${state.reason}`}</span>
    {status === "update-downloaded"
      ? <button type="button" onClick={onInstall}>{en ? "Update & Restart" : "Oppdater og start på nytt"}</button>
      : settings && <button type="button" onClick={onCheck} disabled={busy}>{en ? "Check for updates" : "Se etter oppdateringer"}</button>}
  </div>;
}
