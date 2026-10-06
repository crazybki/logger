function normalizeReleaseNotes(value) {
  const text = Array.isArray(value)
    ? value.map(item => typeof item === "string" ? item : `${item?.version || ""}\n${item?.note || ""}`).join("\n\n")
    : typeof value === "string" ? value : "";
  return text
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(?:p|div|li|h[1-6])>|<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .trim().slice(0, 12000);
}

module.exports = { normalizeReleaseNotes };
