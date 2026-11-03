export function filterWords(value) {
  return String(value ?? "").normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
}

function aliases(word) {
  return word === "support" || word === "supp" ? ["support", "supp"] : [word];
}

export function matchesProjectFilter(ticket, filters = {}) {
  const key = String(ticket.id ?? "").toUpperCase().replace(/-\d+$/, "");
  const words = filterWords(filters?.[key]);
  const titleWords = new Set(filterWords(ticket.title));
  return words.every(word => aliases(word).some(alias => titleWords.has(alias)));
}

export function projectFilterJql(filters = {}) {
  return Object.entries(filters || {})
    .filter(([key, value]) => /^[A-Z][A-Z0-9_]*$/.test(key) && typeof value === "string" && filterWords(value).length)
    .map(([key, value]) => {
      const terms = filterWords(value).map(word => `(${aliases(word).map(alias => `summary ~ "${alias}"`).join(" OR ")})`);
      return `(project != ${key} OR (${terms.join(" AND ")}))`;
    }).join(" AND ");
}
