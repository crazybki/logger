export function ReleaseNotes({ notes, language = "en", onRead }) {
  if (!notes) return null;
  return <details className="release-notes" onToggle={event => { if (event.currentTarget.open) onRead?.(); }}>
    <summary>{language === "en" ? "What's new" : "Hva er nytt"}</summary>
    <div>{notes}</div>
  </details>;
}
