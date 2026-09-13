import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import { Link, useParams } from "react-router-dom";
import "react-day-picker/dist/style.css";
import { API_BASE_URL, APP_BASE_URL } from "../lib/api";
import { stringToDate } from "../lib/date";
import { CopyLinkField } from "./CopyLinkField";
import type { RequestStatus, SummaryResponse } from "../types";

type HeatLevel = "heat-0" | "heat-1" | "heat-2" | "heat-3" | "heat-4";

function heatLevel(count: number, totalParticipants: number): HeatLevel {
  if (totalParticipants === 0) return "heat-0";
  const ratio = count / totalParticipants;
  if (ratio === 0) return "heat-0";
  if (ratio <= 0.25) return "heat-1";
  if (ratio <= 0.5) return "heat-2";
  if (ratio <= 0.75) return "heat-3";
  return "heat-4";
}

function firstAvailableDate(
  availabilityByDate: Record<string, number>,
): Date | undefined {
  const dates = Object.keys(availabilityByDate).sort();
  return dates.length > 0 ? stringToDate(dates[0]) : undefined;
}

function buildHeatModifiers(
  availabilityByDate: Record<string, number>,
  totalParticipants: number,
): Record<HeatLevel, Date[]> {
  const modifiers: Record<HeatLevel, Date[]> = {
    "heat-0": [],
    "heat-1": [],
    "heat-2": [],
    "heat-3": [],
    "heat-4": [],
  };

  for (const [dateStr, count] of Object.entries(availabilityByDate)) {
    const level = heatLevel(count, totalParticipants);
    modifiers[level].push(stringToDate(dateStr));
  }

  return modifiers;
}

export function SummaryTrip() {
  const { id: tripId } = useParams<{ id: string }>();

  const [status, setStatus] = useState<RequestStatus>("idle");
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSummary() {
      setStatus("loading");
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/trips/${tripId}/summary`,
        );

        if (!response.ok) {
          throw new Error(`Server Error: ${response.status}`);
        }

        const data: SummaryResponse = await response.json();

        if (cancelled) return;

        setSummary(data);
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

  return (
    <div className="app-shell">
      <Link to="/" className="brand">
        <span className="brand-mark">TS</span>
        TripSync
      </Link>
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

        {status === "success" && summary && (
          <>
            <h1 className="panel-title">Disponibilidad del grupo</h1>
            <p className="panel-subtitle">
              Así de bien encajan las fechas de todo el mundo. Cuanto más
              oscuro, más gente puede.
            </p>

            <div className="field">
              <span className="field-label-text">Mapa de disponibilidad</span>
              <div className="calendar-card">
                <DayPicker
                  disabled={() => true}
                  defaultMonth={firstAvailableDate(summary.availabilityByDate)}
                  modifiers={buildHeatModifiers(
                    summary.availabilityByDate,
                    summary.totalParticipants,
                  )}
                  modifiersClassNames={{
                    "heat-0": "heat-0",
                    "heat-1": "heat-1",
                    "heat-2": "heat-2",
                    "heat-3": "heat-3",
                    "heat-4": "heat-4",
                  }}
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
