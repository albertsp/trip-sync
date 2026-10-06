import type { TripProposalItem } from "../types";
import {
  ANGLE_LABEL,
  formatCost,
  formatDateRange,
  formatVotes,
  overBudgetLabel,
} from "../lib/proposalFormat";
import { Button } from "./ui/Button";

const COST_LINES = [
  ["transport", "Transporte"],
  ["lodging", "Alojamiento"],
  ["food", "Comida"],
  ["activities", "Actividades"],
] as const;

interface ProposalCardProps {
  proposal: TripProposalItem;
  /** The participant's current vote is this proposal. */
  voted: boolean;
  /** Highlighted as the winner once the vote is closed. */
  winner: boolean;
  /** Show the vote button (participant with token, vote still open). */
  canVote: boolean;
  voteDisabled: boolean;
  onVote: (proposalId: string) => void;
}

export function ProposalCard({
  proposal,
  voted,
  winner,
  canVote,
  voteDisabled,
  onVote,
}: ProposalCardProps) {
  const { currency } = proposal;
  const highlighted = winner || voted;

  return (
    <article
      aria-label={proposal.destination}
      data-winner={winner || undefined}
      className={[
        "flex flex-col gap-3.5 rounded-[20px] border bg-card p-5",
        highlighted
          ? "border-sun shadow-[0_0_0_2px_var(--sun)]"
          : "border-line",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="field-label-text">
          {ANGLE_LABEL[proposal.angle]} · {proposal.country}
        </span>
        <span className="shrink-0 rounded-full bg-sun px-2.5 py-1 font-mono text-[.72rem] font-bold text-[var(--sun-ink)]">
          Encaje {proposal.fitScore} %
        </span>
      </div>

      <div>
        <h3 className="m-0 text-[1.35rem] leading-tight font-extrabold text-ink">
          {proposal.destination}
        </h3>
        <p className="mt-1 mb-0 font-mono text-[.78rem] text-ink-3">
          {formatDateRange(proposal.bestDates.start, proposal.bestDates.end)} ·{" "}
          {proposal.days.length} días
        </p>
      </div>

      {winner && (
        <span className="w-fit rounded-full border border-sun px-2.5 py-0.5 text-[.78rem] font-bold text-ink">
          Ganadora
        </span>
      )}

      <p className="m-0 text-[.95rem] leading-relaxed text-ink-2">
        {proposal.whyFits}
      </p>
      <p className="m-0 text-[.88rem] leading-relaxed text-ink-3">
        <strong className="font-semibold text-ink-2">A cambio: </strong>
        {proposal.tradeoffs}
      </p>

      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[.88rem] text-ink-2">
        {proposal.days.map((day) => (
          <li key={day}>{day}</li>
        ))}
      </ul>

      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-dashed border-line pt-3 text-[.85rem]">
        {COST_LINES.map(([key, label]) => (
          <div key={key} className="flex justify-between gap-2">
            <dt className="text-ink-3">{label}</dt>
            <dd className="m-0 font-mono text-ink-2">
              {formatCost(proposal.costBreakdown[key], currency)}
            </dd>
          </div>
        ))}
      </dl>

      <p className="m-0 text-[1.15rem] font-extrabold text-ink">
        ≈ {formatCost(proposal.estimatedCostPerPerson, currency)}/persona
      </p>

      {proposal.overBudgetCount > 0 && (
        <p className="m-0 text-[.85rem] font-semibold text-danger">
          {overBudgetLabel(proposal.overBudgetCount)}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        <span
          className="font-mono text-[.8rem] text-ink-2"
          data-testid="votes"
        >
          {formatVotes(proposal.votes)}
        </span>
        {canVote && (
          <Button
            size="sm"
            variant={voted ? "ghost" : "primary"}
            disabled={voteDisabled}
            aria-pressed={voted}
            onClick={() => {
              if (!voted) onVote(proposal.id);
            }}
          >
            {voted ? "Tu voto ✓" : "Votar"}
          </Button>
        )}
      </div>
    </article>
  );
}
