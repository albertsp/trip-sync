import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import { useParams } from "react-router-dom";
import "react-day-picker/dist/style.css";
import { API_BASE_URL } from "../lib/api";
import { stringToDate } from "../lib/date";
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

const HEAT_LEGEND: { level: HeatLevel; label: string }[] = [
  { level: "heat-0", label: "0%" },
  { level: "heat-1", label: "1-25%" },
  { level: "heat-2", label: "26-50%" },
  { level: "heat-3", label: "51-75%" },
  { level: "heat-4", label: "76-100%" },
];

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
      <div className="brand">
        <span className="brand-mark">TS</span>
        TripSync
      </div>
      <div className="panel">
        <span className="panel-eyebrow">Resumen</span>

        {error && <p role="alert">{error}</p>}
        {status === "loading" && <p>Cargando resumen...</p>}

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
              <div className="heat-legend">
                {HEAT_LEGEND.map(({ level, label }) => (
                  <span key={level} className="heat-legend-item">
                    <span className={`heat-legend-swatch ${level}`} />
                    {label}
                  </span>
                ))}
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
