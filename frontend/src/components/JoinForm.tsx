import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { useParams } from "react-router-dom";
import "react-day-picker/dist/style.css";

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
function dateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
        `http://localhost:8080/trips/${tripId}/participants`,
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
    <>
      {(status === "idle" || status === "loading") && (
        <form onSubmit={handleSubmit}>
          {error && <p role="alert">{error}</p>}
          <input
            type="text"
            name="name"
            value={join.name}
            onChange={handleChange}
          />
          <DayPicker
            required={true}
            mode="multiple"
            selected={availableDates}
            onSelect={setAvailableDates}
          />
          <input
            type="number"
            name="budgetAmount"
            value={join.budgetAmount}
            onChange={handleChange}
          />
          <select
            name="budgetCurrency"
            value={join.budgetCurrency}
            onChange={handleChange}
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>

          <button type="submit" disabled={status === "loading"}>
            Enviar
          </button>
        </form>
      )}
      {status === "success" && (
        <p>Bienvenido {participant?.name}, te has unido al viaje!</p>
      )}
    </>
  );
}
