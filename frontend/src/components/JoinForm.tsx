import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import { dateToString, stringToDate } from "../lib/date";
import { ShellHeader } from "./ShellHeader";
import { Calendar } from "./calendar/Calendar";
import { Button } from "./ui/Button";
import type {
  JoinTripForm,
  Participant,
  RequestStatus,
  Trip,
  TripFetchStatus,
  TripWindow,
} from "../types";

function validate(join: JoinTripForm, availableDates: Date[]): string | null {
  if (!join.name.trim()) return "Indica tu nombre";
  const amount = parseFloat(join.budgetAmount);
  if (!join.budgetAmount || Number.isNaN(amount) || amount <= 0)
    return "Indica un presupuesto válido";
  if (availableDates.length === 0)
    return "Debes seleccionar al menos un día disponible";
  return null;
}

export function JoinForm() {
  const { id: tripId } = useParams<{ id: string }>();

  const [join, setJoin] = useState<JoinTripForm>({
    name: "",
    budgetAmount: "",
    budgetCurrency: "EUR",
  });

  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [participant, setParticipant] = useState<Participant | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [trip, setTrip] = useState<TripWindow | null>(null);
  const [tripStatus, setTripStatus] = useState<TripFetchStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    async function fetchTrip() {
      setTripStatus("loading");

      try {
        const response = await fetch(`${API_BASE_URL}/trips/${tripId}`);

        if (!response.ok) {
          throw new Error(`Server Error: ${response.status}`);
        }

        const data: Trip = await response.json();

        if (cancelled) return;

        setTrip({
          title: data.title,
          windowStart: stringToDate(data.windowStart),
          windowEnd: stringToDate(data.windowEnd),
          status: data.status,
        });
        setTripStatus("ready");
      } catch (err) {
        if (cancelled) return;
        console.error("Error: ", err);
        setTripStatus("error");
      }
    }

    fetchTrip();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    setJoin({ ...join, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationError = validate(join, availableDates);
    if (validationError) {
      setError(validationError);
      return;
    }

    setStatus("loading");
    setError(null);
    const dates = availableDates.map(dateToString);
    const payload = {
      name: join.name,
      budgetAmount: parseFloat(join.budgetAmount),
      budgetCurrency: join.budgetCurrency,
      availableDates: dates,
    };

    try {
      const response = await fetch(
        `${API_BASE_URL}/trips/${tripId}/participants`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(`Server Error: ${response.status}`);
      }

      const data: Participant = await response.json();
      setParticipant(data);
      localStorage.setItem(`tripsync:editToken:${tripId}`, data.editToken);
      setStatus("success");
    } catch (err) {
      setStatus("idle");
      console.error("Error: ", err);
      setError("No se ha podido unir al viaje, inténtalo de nuevo");
    }
  }

  const isClosed = tripStatus === "ready" && trip?.status === "CLOSED";

  return (
    <div className="app-shell">
      <ShellHeader />
      <div className="panel">
        <span className="panel-eyebrow">Unirse al viaje</span>

        {tripStatus === "loading" && (
          <p className="panel-loading">Cargando viaje...</p>
        )}
        {tripStatus === "error" && (
          <>
            <p role="alert">No se ha podido cargar el viaje</p>
            <Link to="/" className="panel-link">
              ← Crear un nuevo viaje
            </Link>
          </>
        )}

        {isClosed && (
          <>
            <h1 className="panel-title">Este viaje ya está cerrado</h1>
            <p className="panel-subtitle">
              Ya no se admiten nuevas disponibilidades para{" "}
              <strong>{trip?.title}</strong>.
            </p>
            <Link to={`/trips/${tripId}/summary`} className="panel-link">
              Ver disponibilidad del grupo →
            </Link>
          </>
        )}

        {tripStatus === "ready" &&
          trip &&
          !isClosed &&
          (status === "idle" || status === "loading") && (
            <>
              <h1 className="panel-title">¿Cuándo te viene bien?</h1>
              <p className="panel-subtitle">
                Te han invitado a <strong>{trip.title}</strong>. Marca los días
                en los que estás disponible e indica tu presupuesto.
              </p>

              <form onSubmit={handleSubmit} noValidate>
                {error && <p role="alert">{error}</p>}

                <div className="field">
                  <label htmlFor="name">Tu nombre</label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    placeholder="Ana García"
                    value={join.name}
                    onChange={handleChange}
                  />
                </div>

                <div className="field">
                  <span className="field-label-text">Fechas disponibles</span>
                  <div className="calendar-card">
                    <Calendar
                      mode="paint"
                      windowStart={trip.windowStart}
                      windowEnd={trip.windowEnd}
                      selected={availableDates}
                      onChange={setAvailableDates}
                    />
                  </div>
                  <div className="cal-foot">
                    <span className="cal-counter" aria-live="polite">
                      <strong>{availableDates.length}</strong>{" "}
                      {availableDates.length === 1
                        ? "día marcado"
                        : "días marcados"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={availableDates.length === 0}
                      onClick={() => setAvailableDates([])}
                    >
                      Borrar selección
                    </Button>
                  </div>
                  <p className="field-hint">
                    Haz clic o arrastra sobre varios días para marcarlos.
                  </p>
                </div>

                <div className="field-row">
                  <div className="field">
                    <label htmlFor="budgetAmount">Presupuesto</label>
                    <input
                      id="budgetAmount"
                      type="number"
                      name="budgetAmount"
                      placeholder="300"
                      value={join.budgetAmount}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="budgetCurrency">Divisa</label>
                    <select
                      id="budgetCurrency"
                      name="budgetCurrency"
                      value={join.budgetCurrency}
                      onChange={handleChange}
                    >
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <Button
                  type="submit"
                  block
                  arrow
                  className="mt-2"
                  disabled={status === "loading"}
                >
                  Unirse al viaje
                </Button>
              </form>
            </>
          )}

        {status === "success" && (
          <>
            <h1 className="panel-title">¡Estás dentro!</h1>
            <p className="panel-subtitle">
              Bienvenido {participant?.name}, te has unido al viaje.
            </p>
            <Link to={`/trips/${tripId}/summary`} className="panel-link">
              Ver disponibilidad del grupo →
            </Link>
          </>
        )}

        <hr className="panel-divider" />
        <div className="meta-row">
          <span>Participante</span>
          <strong>
            {participant
              ? participant.id.slice(0, 8).toUpperCase()
              : "PENDIENTE"}
          </strong>
        </div>
      </div>
    </div>
  );
}
