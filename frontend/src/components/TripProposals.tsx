import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL, csrfHeaders, readEditToken } from "../lib/api";
import { leadingProposals } from "../lib/proposalFormat";
import {
  parseRetryAfter,
  proposalErrorMessage,
  type ProposalAction,
} from "../lib/proposalErrors";
import { useCurrentUser } from "../lib/useCurrentUser";
import type { ProposalsResponse } from "../types";
import { ProposalCard } from "./ProposalCard";
import { TripChecklist } from "./TripChecklist";
import { TripItinerary } from "./TripItinerary";
import { Button } from "./ui/Button";

type LoadStatus = "idle" | "loading" | "success" | "error";
type Busy = "generate" | "close" | "plan" | "vote" | null;

interface TripProposalsProps {
  tripId: string;
  creatorId: string | null;
}

/** Moves the participant's vote to `proposalId`, keeping the counts consistent. */
function withVote(data: ProposalsResponse, proposalId: string): ProposalsResponse {
  return {
    ...data,
    myVoteProposalId: proposalId,
    proposals: data.proposals.map((proposal) => {
      if (proposal.id === proposalId) return { ...proposal, votes: proposal.votes + 1 };
      if (proposal.id === data.myVoteProposalId)
        return { ...proposal, votes: Math.max(0, proposal.votes - 1) };
      return proposal;
    }),
  };
}

export function TripProposals({ tripId, creatorId }: TripProposalsProps) {
  const { user, loading: userLoading } = useCurrentUser();
  const editToken = readEditToken(tripId);
  const isCreator = !userLoading && !!user && !!creatorId && user.id === creatorId;

  const [status, setStatus] = useState<LoadStatus>("idle");
  const [data, setData] = useState<ProposalsResponse | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tieChoice, setTieChoice] = useState("");

  const load = useCallback(
    async (silent: boolean) => {
      if (!silent) setStatus("loading");
      try {
        const response = await fetch(`${API_BASE_URL}/trips/${tripId}/proposals`, {
          headers: editToken ? { "X-Edit-Token": editToken } : {},
        });
        if (!response.ok) throw new Error(`Server Error: ${response.status}`);
        setData(await response.json());
        setStatus("success");
      } catch (err) {
        console.error("Error loading proposals: ", err);
        if (!silent) setStatus("error");
      }
    },
    [tripId, editToken],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  /** Runs a mutation, turning HTTP failures into the section-10.5 copy. Returns the response on success. */
  async function send(
    action: ProposalAction,
    path: string,
    init: RequestInit,
  ): Promise<Response | null> {
    setActionError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/trips/${tripId}/${path}`, init);
      if (!response.ok) {
        setActionError(
          proposalErrorMessage(
            response.status,
            action,
            parseRetryAfter(response.headers.get("Retry-After")),
          ),
        );
        return null;
      }
      return response;
    } catch (err) {
      console.error(`Error (${action}): `, err);
      setActionError("No se ha podido conectar con el servidor");
      return null;
    }
  }

  async function creatorPost(
    action: Exclude<Busy, "vote" | null>,
    path: string,
    body?: unknown,
  ): Promise<Response | null> {
    setBusy(action);
    const headers: Record<string, string> = await csrfHeaders();
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const response = await send(
      action === "close" ? "confirm" : action,
      path,
      {
        method: "POST",
        credentials: "include",
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      },
    );
    setBusy(null);
    return response;
  }

  async function handleGenerate() {
    const response = await creatorPost("generate", "proposals");
    if (!response) return;
    setData(await response.json());
    setTieChoice("");
  }

  async function handleClose() {
    const response = await creatorPost(
      "close",
      "confirm",
      needsTieChoice ? { proposalId: tieChoice } : undefined,
    );
    if (response) setData(await response.json());
  }

  async function handlePlan() {
    const response = await creatorPost("plan", "plan");
    if (response) setData(await response.json());
  }

  async function handleVote(proposalId: string) {
    if (!editToken || !data) return;
    const previous = data;
    setBusy("vote");
    setData(withVote(data, proposalId));
    const response = await send("vote", "votes", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Edit-Token": editToken },
      body: JSON.stringify({ proposalId }),
    });
    setBusy(null);
    if (response) await load(true);
    else setData(previous);
  }

  const proposals = useMemo(() => data?.proposals ?? [], [data]);
  const leaders = useMemo(() => leadingProposals(proposals), [proposals]);
  const tripStatus = data?.status;
  const isVoting = tripStatus === "VOTING";
  const isClosed = tripStatus === "CONFIRMED" || tripStatus === "PLANNING";
  const winner = proposals.find((proposal) => proposal.winner) ?? null;
  const winnerId = isClosed ? (winner?.id ?? null) : null;
  const needsTieChoice = isVoting && proposals.length > 0 && leaders.length !== 1;
  const tieOptions = leaders.length > 1 ? leaders : proposals;
  const hasProposals = proposals.length > 0;
  const generating = busy === "generate";
  const planning = busy === "plan";

  return (
    <section aria-labelledby="proposals-title" className="flex flex-col gap-4">
      <div>
        <span className="field-label-text">Propuestas de viaje</span>
        <h2 id="proposals-title" className="mt-1 mb-0 text-[1.6rem] font-extrabold text-ink">
          ¿A dónde vamos?
        </h2>
      </div>

      {status === "loading" && (
        <p className="panel-loading">Cargando propuestas...</p>
      )}
      {status === "error" && (
        <p role="alert">
          No se han podido cargar las propuestas{" "}
          <button
            type="button"
            className="cursor-pointer font-semibold text-ink underline"
            onClick={() => load(false)}
          >
            Reintentar
          </button>
        </p>
      )}

      {status === "success" && !hasProposals && (
        <p className="m-0 text-ink-2">
          {isCreator
            ? "Cuando haya suficientes participantes con preferencias, genera tres propuestas para que el grupo vote."
            : "Aún no hay propuestas. El creador del viaje las generará cuando el grupo esté listo."}
        </p>
      )}

      {status === "success" && hasProposals && (
        <>
          {isVoting && !editToken && (
            <p className="m-0 rounded-[14px] border border-line bg-screen px-4 py-3 text-[.92rem] text-ink-2">
              Puedes ver cómo va la votación, pero para votar tienes que{" "}
              <Link to={`/trips/${tripId}`} className="panel-link">
                unirte al viaje
              </Link>
              .
            </p>
          )}
          {isClosed && (
            <p className="m-0 text-[.92rem] text-ink-2">
              {tripStatus === "PLANNING"
                ? "El viaje se está montando."
                : "La votación está cerrada."}
            </p>
          )}

          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
            {proposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                voted={data?.myVoteProposalId === proposal.id}
                winner={proposal.id === winnerId}
                canVote={isVoting && !!editToken}
                voteDisabled={busy !== null}
                onVote={handleVote}
              />
            ))}
          </div>
        </>
      )}

      {generating && (
        <p role="status" className="m-0 flex items-center gap-2.5 text-ink-2">
          <span
            aria-hidden="true"
            className="size-4 rounded-full border-2 border-line border-t-sun motion-safe:animate-spin"
          />
          IA analizando fechas, presupuesto e intereses…
        </p>
      )}
      {planning && (
        <p role="status" className="m-0 flex items-center gap-2.5 text-ink-2">
          <span
            aria-hidden="true"
            className="size-4 rounded-full border-2 border-line border-t-sun motion-safe:animate-spin"
          />
          IA montando el itinerario y la lista de tareas…
        </p>
      )}

      {actionError && <p role="alert">{actionError}</p>}

      {isCreator && status === "success" && (
        <div className="flex flex-wrap items-end gap-3">
          {(tripStatus === "OPEN" || isVoting) && (
            <Button size="sm" disabled={busy !== null} onClick={handleGenerate}>
              {hasProposals ? "Regenerar" : "Generar viajes"}
            </Button>
          )}

          {isVoting && hasProposals && (
            <>
              {needsTieChoice && (
                <div className="field !mb-0">
                  <label htmlFor="tie-choice">
                    {leaders.length > 1 ? "Empate: elige la ganadora" : "Nadie ha votado: elige la ganadora"}
                  </label>
                  <select
                    id="tie-choice"
                    value={tieChoice}
                    onChange={(e) => setTieChoice(e.target.value)}
                  >
                    <option value="">Elige un destino</option>
                    {tieOptions.map((proposal) => (
                      <option key={proposal.id} value={proposal.id}>
                        {proposal.destination}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={busy !== null || (needsTieChoice && !tieChoice)}
                onClick={handleClose}
              >
                Cerrar votación
              </Button>
            </>
          )}

          {tripStatus === "CONFIRMED" && (
            <Button size="sm" disabled={busy !== null} onClick={handlePlan}>
              Montar viaje
            </Button>
          )}
          {tripStatus === "PLANNING" && (
            <Button size="sm" variant="ghost" disabled={busy !== null} onClick={handlePlan}>
              Regenerar plan
            </Button>
          )}
        </div>
      )}

      {status === "success" && winner?.detail && (
        <TripItinerary destination={winner.destination} detail={winner.detail} />
      )}
      {status === "success" && tripStatus === "PLANNING" && <TripChecklist tripId={tripId} />}

      {status === "success" && hasProposals && (
        <small className="text-ink-3">Estimaciones orientativas generadas por IA</small>
      )}
    </section>
  );
}
