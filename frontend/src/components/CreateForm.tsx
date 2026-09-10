import { useState } from "react";
import { API_BASE_URL, APP_BASE_URL } from "../lib/api";

interface CreateTripForm {
  title: string;
  windowStart: string;
  windowEnd: string;
}

interface Trip {
  id: string;
  title: string;
  windowStart: string;
  windowEnd: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
}

export function CreateForm() {
  const [form, setForm] = useState<CreateTripForm>({
    title: "",
    windowStart: "",
    windowEnd: "",
  });

  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const [trip, setTrip] = useState<Trip | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");

    try {
      const response = await fetch(`${API_BASE_URL}/trips`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error(`Server Error: ${response.status}`);
      }

      const data = await response.json();
      setTrip(data);
      setStatus("success");
    } catch (error) {
      setStatus("idle");
      console.error("Error submitting form: ", error);
    }
  }
  return (
    <div className="page">
      <div className="ticket">
        <span className="ticket-eyebrow">TripSync · Nuevo viaje</span>

        {(status === "idle" || status === "loading") && (
          <>
            <h1 className="ticket-title">Planea tu próxima escapada</h1>
            <p className="ticket-subtitle">
              Define un título y el rango de fechas posibles para que tus
              amigos indiquen su disponibilidad.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="title">Título del viaje</label>
                <input
                  id="title"
                  type="text"
                  name="title"
                  placeholder="Escapada de otoño"
                  value={form.title}
                  onChange={handleChange}
                />
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="windowStart">Desde</label>
                  <input
                    id="windowStart"
                    type="date"
                    name="windowStart"
                    value={form.windowStart}
                    onChange={handleChange}
                  />
                </div>

                <div className="field">
                  <label htmlFor="windowEnd">Hasta</label>
                  <input
                    id="windowEnd"
                    type="date"
                    name="windowEnd"
                    value={form.windowEnd}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <button type="submit" disabled={status === "loading"}>
                Crear viaje
              </button>
            </form>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="ticket-title">¡Viaje emitido!</h1>
            <p className="ticket-subtitle">
              Comparte este enlace con tus amigos para que se unan.
            </p>
            <div className="field">
              <label htmlFor="share-link">Enlace de invitación</label>
              <input
                id="share-link"
                type="text"
                readOnly
                value={`${APP_BASE_URL}/trips/${trip?.id}`}
                onFocus={(e) => e.target.select()}
              />
            </div>
          </>
        )}

        <div className="ticket-divider" />
        <div className="ticket-footer">
          <span>TRIPSYNC · PLANEAD JUNTOS</span>
          <strong>{trip ? trip.id.slice(0, 8).toUpperCase() : "SIN EMITIR"}</strong>
        </div>
      </div>
    </div>
  );
}
