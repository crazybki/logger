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
  it("allows favorite priority to be disabled without losing favorites", () => {
    const input = [...tickets, { id: "AC-9", title: "Acme follow-up", favorite: true }];
    expect(getMatchingJiraTickets(input, "acme", false).map(ticket => ticket.id))
      .toEqual(["AC-3", "AC-4", "AC-1", "AC-2", "AC-9"]);
    expect(getMatchingJiraTickets(input, "", false)).toEqual(input);
    expect(getMatchingJiraTickets(input, "acme", true)[0].id).toBe("AC-9");
  });
  it("puts matching favorites before other results, before limiting suggestions", () => {
    const favorite = { id: "AC-9", title: "Acme follow-up", favorite: true };
    const unrelatedFavorite = { id: "ZZ-9", title: "Unrelated", favorite: true };
    const results = getMatchingJiraTickets([...tickets, unrelatedFavorite, favorite], "acme");
    expect(results.map(ticket => ticket.id)).toEqual(["AC-9", "AC-3", "AC-4", "AC-1", "AC-2"]);
    expect(results.slice(0, 5)).toContain(favorite);
  });
  it("shows favorites first for an empty search without mutating stored tickets", () => {
    const favorite = { id: "ZZ-9", title: "Saved ticket", favorite: true };
    const input = [...tickets, favorite];
    expect(getMatchingJiraTickets(input, "  ")).toEqual([favorite, ...tickets]);
    expect(input).toEqual([...tickets, favorite]);
    expect(getMatchingJiraTickets([...tickets, { ...favorite, favorite: false }], "").map(ticket => ticket.id))
      .toEqual([...tickets.map(ticket => ticket.id), "ZZ-9"]);
  });
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
