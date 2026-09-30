import { describe, expect, it } from "vitest";
import type { TripProposalItem } from "../types";
import mock from "../mocks/proposals.json";
import {
  formatCost,
  formatDateRange,
  formatVotes,
  leadingProposals,
  overBudgetLabel,
} from "./proposalFormat";

const plain = (value: string) => value.replace(/\s/g, " ");

describe("formatCost", () => {
  it("formats whole euros", () => {
    expect(plain(formatCost(185, "EUR"))).toBe("185 €");
    expect(plain(formatCost(185.6, "EUR"))).toBe("186 €");
  });

  it("formats dollars", () => {
    expect(formatCost(300, "USD")).toMatch(/300/);
    expect(formatCost(300, "USD")).toMatch(/\$/);
  });
});

describe("formatDateRange", () => {
  it("collapses the month within a month", () => {
    expect(formatDateRange("2026-10-02", "2026-10-05")).toBe("2–5 oct");
  });

  it("repeats the month across months", () => {
    expect(formatDateRange("2026-09-30", "2026-10-02")).toMatch(/^30 sept? – 2 oct$/);
  });

  it("handles a single day", () => {
    expect(formatDateRange("2026-10-02", "2026-10-02")).toBe("2 oct");
  });
});

describe("labels", () => {
  it("pluralises votes and over-budget people", () => {
    expect(formatVotes(1)).toBe("1 voto");
    expect(formatVotes(0)).toBe("0 votos");
    expect(overBudgetLabel(1)).toBe("A 1 persona le supera el presupuesto");
    expect(overBudgetLabel(2)).toBe("A 2 personas les supera el presupuesto");
  });
});

describe("leadingProposals", () => {
  const proposals = mock.proposals as TripProposalItem[];

  it("returns the single leader", () => {
    expect(leadingProposals(proposals).map((p) => p.angle)).toEqual(["CONSENSUS"]);
  });

  it("returns every tied leader", () => {
    const tied = proposals.map((p, i) => ({ ...p, votes: i < 2 ? 2 : 0 }));
    expect(leadingProposals(tied)).toHaveLength(2);
  });

  it("returns none when nobody voted", () => {
    expect(leadingProposals(proposals.map((p) => ({ ...p, votes: 0 })))).toEqual([]);
  });
});
