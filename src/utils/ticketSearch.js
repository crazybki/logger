export function getMatchingJiraTickets(jiraTickets, queryValue) {
  const query = String(queryValue ?? "").trim().toLowerCase();
  if (!query) return jiraTickets;

  function getSearchParts(value) {
    return String(value ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  function searchPartMatches(queryPart, ticketParts) {
    const aliases = queryPart === "support"
      ? ["support", "supp"]
      : queryPart === "supp"
        ? ["supp", "support"]
        : [queryPart];

    return aliases.some((alias) =>
      ticketParts.some((part) => part.includes(alias) || alias.includes(part))
    );
  }

  function fuzzyMatches(combined) {
    const queryParts = getSearchParts(query);
    if (!queryParts.length) return false;

    const ticketParts = getSearchParts(combined);
    return queryParts.every((part) => searchPartMatches(part, ticketParts));
  }

  function scoreTicket(ticket) {
    const id = String(ticket.id ?? "").toLowerCase();
    const title = String(ticket.title ?? "").toLowerCase();
    const combined = `${id} ${title}`;

    if (id === query) return 0;
    if (id.startsWith(query)) return 1;
    // Prefer matching company support/live titles, after explicit ticket keys.
    const titleParts = getSearchParts(title);
    const isSupportLive = titleParts.some((part, index) =>
      index > 0 && (part === "support" || part === "supp") && titleParts[index + 1] === "live"
    );
    if (isSupportLive && (combined.includes(query) || fuzzyMatches(combined))) return 1.5;
    if (title.startsWith(query)) return 2;
    if (combined.includes(query)) return 3;
    if (fuzzyMatches(combined)) return 4;
    return 99;
  }

  return jiraTickets
    .map((ticket, index) => ({ ticket, index, score: scoreTicket(ticket) }))
    .filter((item) => item.score < 99)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((item) => item.ticket);
}

