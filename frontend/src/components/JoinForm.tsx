import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import { useParams } from "react-router-dom";
import "react-day-picker/dist/style.css";
import { API_BASE_URL } from "../lib/api";
import { dateToString, stringToDate } from "../lib/date";

type TripCurrency = "EUR" | "USD";

interface JoinTripForm {
  name: string;
  budgetAmount: string;
  budgetCurrency: TripCurrency;
}

interface ParticipantResponse {
  id: string;
  name: string;
  budgetAmount: number;
  budgetCurrency: string;
  editToken: string;
}

interface TripWindow {
  title: string;
  windowStart: Date;
  windowEnd: Date;
}

export function JoinForm() {
  const { id: tripId } = useParams<{ id: string }>();

  const [join, setJoin] = useState<JoinTripForm>({
    name: "",
    budgetAmount: "",
    budgetCurrency: "EUR",
  });

  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [participant, setParticipant] = useState<ParticipantResponse | null>(
    null,
  );

  const [error, setError] = useState<string | null>(null);

  const [trip, setTrip] = useState<TripWindow | null>(null);
  const [tripStatus, setTripStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchTrip() {
      setTripStatus("loading");

      try {
        const response = await fetch(`${API_BASE_URL}/trips/${tripId}`);

        if (!response.ok) {
          throw new Error(`Server Error: ${response.status}`);
        }

        const data: { title: string; windowStart: string; windowEnd: string } =
          await response.json();

        if (cancelled) return;

        setTrip({
          title: data.title,
          windowStart: stringToDate(data.windowStart),
          windowEnd: stringToDate(data.windowEnd),
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
    if (availableDates.length === 0) {
      setError("Debes seleccionar un rango de fechas para continuar");
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

      const data: ParticipantResponse = await response.json();
      setParticipant(data);
      localStorage.setItem(`tripsync:editToken:${tripId}`, data.editToken);
      setStatus("success");
    } catch (err) {
      setStatus("idle");
      console.error("Error: ", err);
      setError("No se ha podido unir al viaje, inténtalo de nuevo");
    }
  }

  return (
    <div className="page">
      <div className="ticket">
        <span className="ticket-eyebrow">TripSync · Unirse al viaje</span>

        {tripStatus === "loading" && <p>Cargando viaje...</p>}
        {tripStatus === "error" && (
          <p role="alert">No se ha podido cargar el viaje</p>
        )}

        {tripStatus === "ready" &&
          trip &&
          (status === "idle" || status === "loading") && (
            <>
              <h1 className="ticket-title">¿Cuándo te viene bien?</h1>
              <p className="ticket-subtitle">
                Te han invitado a <strong>{trip.title}</strong>. Marca los días
                en los que estás disponible e indica tu presupuesto.
              </p>

              <form onSubmit={handleSubmit}>
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
                  <div className="calendar-frame">
                    <DayPicker
                      required={true}
                      mode="multiple"
                      selected={availableDates}
                      onSelect={setAvailableDates}
                      defaultMonth={trip.windowStart}
                      startMonth={trip.windowStart}
                      endMonth={trip.windowEnd}
                      disabled={{
                        before: trip.windowStart,
                        after: trip.windowEnd,
                      }}
                    />
                  </div>
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

                <button type="submit" disabled={status === "loading"}>
                  Unirse al viaje
                </button>
              </form>
            </>
          )}

        {status === "success" && (
          <>
            <h1 className="ticket-title">¡Estás dentro!</h1>
            <p className="ticket-subtitle">
              Bienvenido {participant?.name}, te has unido al viaje.
            </p>
          </>
        )}

        <div className="ticket-divider" />
        <div className="ticket-footer">
          <span>TRIPSYNC · PLANEAD JUNTOS</span>
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
