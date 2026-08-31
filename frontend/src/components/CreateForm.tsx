import { useState } from "react";

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
      const response = await fetch("http://localhost:8080/trips", {
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
    <>
      {(status === "idle" || status === "loading") && (
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
          />

          <input
            type="date"
            name="windowStart"
            value={form.windowStart}
            onChange={handleChange}
          />

          <input
            type="date"
            name="windowEnd"
            value={form.windowEnd}
            onChange={handleChange}
          />

          <button type="submit">Create Trip</button>
        </form>
      )}

      {status === "success" && (
        <div>
          <p>Share your link:</p>
          <p>{"http://localhost:5173/trips/" + trip?.id}</p>
        </div>
      )}
    </>
  );
}
