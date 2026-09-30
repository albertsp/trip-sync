import type { ProposalAngle, TripProposalItem } from "../types";
import { stringToDate } from "./date";

const MONTH_SHORT = new Intl.DateTimeFormat("es-ES", { month: "short" });

/** "185 €", "1.250 €" or "300 US$": whole units, since these are rough estimates. */
export function formatCost(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** "2–5 oct", or "30 sep – 2 oct" when the range crosses a month. Takes "yyyy-MM-dd". */
export function formatDateRange(start: string, end: string): string {
  const from = stringToDate(start);
  const to = stringToDate(end);
  const month = (date: Date) => MONTH_SHORT.format(date).replace(".", "");

  if (start === end) return `${to.getDate()} ${month(to)}`;

  const sameMonth =
    from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  return sameMonth
    ? `${from.getDate()}–${to.getDate()} ${month(to)}`
    : `${from.getDate()} ${month(from)} – ${to.getDate()} ${month(to)}`;
}

export function formatVotes(votes: number): string {
  return votes === 1 ? "1 voto" : `${votes} votos`;
}

export function overBudgetLabel(count: number): string {
  return count === 1
    ? "A 1 persona le supera el presupuesto"
    : `A ${count} personas les supera el presupuesto`;
}

export const ANGLE_LABEL: Record<ProposalAngle, string> = {
  CONSENSUS: "Consenso",
  BUDGET: "Económica",
  AMBITIOUS: "Ambiciosa",
};

/** Proposals sharing the highest vote count (empty when nobody has voted). */
export function leadingProposals(
  proposals: TripProposalItem[],
): TripProposalItem[] {
  const max = Math.max(0, ...proposals.map((proposal) => proposal.votes));
  return max === 0 ? [] : proposals.filter((proposal) => proposal.votes === max);
}
