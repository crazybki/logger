import { calculateExpectedMinutes, calculateLoggingDifference, calculateProgress } from "../utils/loggingProgress";
import { formatTimeShort } from "../utils/reporting";

export function LoggingProgress({ now, schedule, remote, appLanguage }) {
  const en = appLanguage === "en";
  const expected = calculateExpectedMinutes(new Date(now), schedule);
  const actual = remote.snapshot ? remote.snapshot.seconds / 60 : null;
  const { difference, status } = calculateLoggingDifference(actual ?? 0, expected);
  const percent = calculateProgress(actual ?? 0, expected);
  const labels = en
    ? { behind: "Behind", onTrack: "On track", ahead: "Ahead" }
    : { behind: "Du ligger etter", onTrack: "I rute", ahead: "Du ligger foran" };
  const duration = value => value < 60 ? `${Math.round(value)}m` : formatTimeShort(Math.round(value) * 60);
  return (
    <section className="section logging-progress" aria-label={en ? "Logging progress" : "Loggefremdrift"}>
      <div className="logging-progress-values">
        <div><span>{en ? "Logged today" : "Logget i dag"}</span><strong>{actual === null ? "—" : duration(actual)}</strong></div>
        <div><span>{en ? "Expected" : "Forventet"}</span><strong>{duration(expected)}</strong></div>
        <div className={actual === null ? "" : `logging-status-${status}`}><span>{actual === null ? (en ? "Awaiting sync" : "Venter på synk") : labels[status]}</span><strong>{actual === null ? "—" : status === "onTrack" ? "✓" : duration(Math.abs(difference))}</strong></div>
      </div>
      <progress max="100" value={actual === null ? 0 : Math.min(100, percent)} aria-label={en ? "Logged versus expected time" : "Logget mot forventet tid"} />
      <div className="logging-progress-caption">{actual === null ? (en ? "Logged time unavailable" : "Logget tid utilgjengelig") : expected === 0 ? (en ? "No time expected yet" : "Ingen tid forventet ennå") : `${percent}% ${en ? "of expected time" : "av forventet tid"}`}</div>
      <div className="logging-progress-sync">
        <span title={remote.error || undefined}>
          {remote.loading ? (en ? "Refreshing…" : "Oppdaterer…") : remote.error ? (remote.snapshot ? (en ? "Refresh failed · value may be stale" : "Oppdatering feilet · kan være utdatert") : remote.error) : ""}
          {remote.snapshot && ` ${remote.snapshot.source} · ${en ? "Last sync" : "Sist synket"} ${new Date(remote.snapshot.fetchedAt).toLocaleTimeString(en ? "en-GB" : "nb-NO", { hour: "2-digit", minute: "2-digit" })}`}
        </span>
        <button type="button" onClick={remote.refresh} disabled={remote.loading}>{en ? "Refresh" : "Oppdater"}</button>
      </div>
    </section>
  );
}
