import { describe, expect, it } from "vitest";
import { getMatchingJiraTickets } from "./ticketSearch";

const tickets = [
  { id: "AC-1", title: "Acme onboarding" },
  { id: "AC-2", title: "Acme Support Test" },
  { id: "AC-3", title: "Acme - Support - Live" },
  { id: "AC-4", title: "Acme Support Live - follow-up" },
  { id: "OT-1", title: "Other Company Support Live" },
];

describe("Jira ticket search priority", () => {
  it("ranks both support/live formats first without dropping other results", () => {
    expect(getMatchingJiraTickets(tickets, "acme").map(ticket => ticket.id)).toEqual(["AC-3", "AC-4", "AC-1", "AC-2"]);
  });
  it.each(["Acme Support Live", "acme - support - live", "ACME SUPP LIVE"])("matches %s", query => {
    expect(getMatchingJiraTickets(tickets, query).map(ticket => ticket.id)).toEqual(["AC-3", "AC-4"]);
  });
  it("preserves exact ticket ID priority", () => {
    const results = getMatchingJiraTickets([...tickets, { id: "AC-9", title: "AC-1 Company Support Live" }], "AC-1");
    expect(results[0].id).toBe("AC-1");
  });
  it("requires whole support/live words in order", () => {
    const others = [
      { id: "AC-5", title: "Acme Support Lively" },
      { id: "AC-6", title: "Acme Live Support" },
    ];
    expect(getMatchingJiraTickets([...others, tickets[2]], "Acme")[0].id).toBe("AC-3");
  });
  it("keeps empty search order and does not mutate the input", () => {
    const original = [...tickets];
    expect(getMatchingJiraTickets(tickets, "")).toEqual(original);
    getMatchingJiraTickets(tickets, "Acme");
    expect(tickets).toEqual(original);
    expect(getMatchingJiraTickets(tickets, "no-match-xyz")).toEqual([]);
  });
});
