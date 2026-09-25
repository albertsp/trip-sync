import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API_BASE_URL, APP_BASE_URL } from "../lib/api";
import { bestWindow, spanOfCounts } from "../lib/availability";
import { stringToDate } from "../lib/date";
import { BestWindowCard } from "./BestWindowCard";
import { Calendar } from "./calendar/Calendar";
import { CopyLinkField } from "./CopyLinkField";
import { ShellHeader } from "./ShellHeader";
import type {
  RequestStatus,
  SummaryResponse,
  Trip,
  TripWindow,
} from "../types";

/** The trip only refines the view (title and window), so a failure here isn't fatal. */
async function fetchTripWindow(tripId: string): Promise<TripWindow | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/trips/${tripId}`);
    if (!response.ok) return null;
    const data: Trip = await response.json();
    return {
      title: data.title,
      windowStart: stringToDate(data.windowStart),
      windowEnd: stringToDate(data.windowEnd),
      status: data.status,
    };
  } catch {
    return null;
  }
}

export function SummaryTrip() {
  const { id: tripId } = useParams<{ id: string }>();

  const [status, setStatus] = useState<RequestStatus>("idle");
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [trip, setTrip] = useState<TripWindow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSummary() {
      setStatus("loading");
      setError(null);

      try {
        const [response, tripWindow] = await Promise.all([
          fetch(`${API_BASE_URL}/trips/${tripId}/summary`),
          fetchTripWindow(tripId ?? ""),
        ]);

        if (!response.ok) {
          throw new Error(`Server Error: ${response.status}`);
        }

        const data: SummaryResponse = await response.json();

        if (cancelled) return;

        setSummary(data);
        setTrip(tripWindow);
        setStatus("success");
      } catch (err) {
        if (cancelled) return;
        setStatus("idle");
        console.error("Error: ", err);
        setError("No se ha podido cargar el resumen del viaje");
      }
    }

    fetchSummary();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const range = useMemo(() => {
    if (!summary) return null;
    return trip
      ? { start: trip.windowStart, end: trip.windowEnd }
      : spanOfCounts(summary.availabilityByDate);
  }, [summary, trip]);

  const best = useMemo(
    () =>
      summary && range
        ? bestWindow(summary.availabilityByDate, range.start, range.end)
        : null,
    [summary, range],
  );

  return (
    <div className="app-shell">
      <ShellHeader />
      <div className="panel panel--wide">
        <span className="panel-eyebrow">Resumen</span>

        {error && (
          <>
            <p role="alert">{error}</p>
            <Link to="/" className="panel-link">
              ← Crear un nuevo viaje
            </Link>
          </>
        )}
        {status === "loading" && (
          <p className="panel-loading">Cargando resumen...</p>
        )}

        {status === "success" && summary && range && (
          <>
            <h1 className="panel-title">Disponibilidad del grupo</h1>
            <p className="panel-subtitle">
              Así de bien encajan las fechas de todo el mundo
              {trip && (
                <>
                  {" "}
                  en <strong>{trip.title}</strong>
                </>
              )}
              . Cuanto más cálido, más gente puede.
            </p>

            <BestWindowCard
              best={best}
              totalParticipants={summary.totalParticipants}
            />

            <div className="field">
              <span className="field-label-text">Mapa de disponibilidad</span>
              <div className="calendar-card">
                <Calendar
                  mode="heat"
                  windowStart={range.start}
                  windowEnd={range.end}
                  counts={summary.availabilityByDate}
                  total={summary.totalParticipants}
                  best={best}
                />
              </div>
              <div className="heat-scale">
                <div className="heat-scale-bar">
                  <span className="heat-scale-seg heat-0" />
                  <span className="heat-scale-seg heat-1" />
                  <span className="heat-scale-seg heat-2" />
                  <span className="heat-scale-seg heat-3" />
                  <span className="heat-scale-seg heat-4" />
                </div>
                <div className="heat-scale-labels">
                  <span>Nadie disponible</span>
                  <span>Todo el grupo disponible</span>
                </div>
              </div>
            </div>

            <div className="stat">
              <span className="field-label-text">Presupuesto sugerido</span>
              {summary.budget === null ? (
                <p className="stat-value stat-empty">
                  Todavía no hay participantes en el viaje, ¡sé el primero en
                  unirte!
                </p>
              ) : (
                <p className="stat-value">{summary.budget}</p>
              )}
            </div>

            <hr className="panel-divider" />

            <CopyLinkField
              id="share-link"
              label="Invitar a más gente"
              value={`${APP_BASE_URL}/trips/${tripId}`}
            />
          </>
        )}

        <hr className="panel-divider" />
        <div className="meta-row">
          <span>Total</span>
          <strong>
            {summary ? `${summary.totalParticipants} participantes` : "—"}
          </strong>
        </div>
      </div>
    </div>
  );
}
