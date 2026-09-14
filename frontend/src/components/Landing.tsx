import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  API_BASE_URL,
  APP_BASE_URL,
  getCookie,
  initializeCsrf,
} from "../lib/api";
import { AuthModal } from "./AuthModal";
import { CopyLinkField } from "./CopyLinkField";
import type { AuthUser, CreateTripForm, RequestStatus, Trip } from "../types";

function validate(form: CreateTripForm): string | null {
  if (!form.title.trim()) return "Ponle un título al viaje";
  if (!form.windowStart || !form.windowEnd)
    return "Indica el rango de fechas posibles";
  if (form.windowEnd < form.windowStart)
    return "La fecha de fin debe ser posterior a la de inicio";
  return null;
}

const HERO_POINTS = [
  "Cada persona marca sus días libres y su presupuesto",
  "Un mapa de calor te muestra las fechas que más encajan",
  "Comparte un enlace, sin cuentas ni instalaciones para tus amigos",
];

export function Landing() {
  const [form, setForm] = useState<CreateTripForm>({
    title: "",
    windowStart: "",
    windowEnd: "",
  });

  const [status, setStatus] = useState<RequestStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);

  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    async function initializePage() {
      try {
        await initializeCsrf();
      } catch (error) {
        console.error("Could not initialize CSRF: ", error);
      }

      fetch(`${API_BASE_URL}/api/me`, { credentials: "include" })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: AuthUser | null) => setUser(data))
        .catch(() => setUser(null));
    }

    initializePage();
  }, []);

  function openAuth() {
    setAuthOpen(true);
  }

  function handleGateKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openAuth();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setStatus("loading");

    try {
      const csrfToken = getCookie("XSRF-TOKEN");
      const response = await fetch(`${API_BASE_URL}/trips`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error(`Server Error: ${response.status}`);
      }

      const data: Trip = await response.json();
      setTrip(data);
      setStatus("success");
    } catch (err) {
      setStatus("idle");
      console.error("Error submitting form: ", err);
      setError("No se ha podido crear el viaje, inténtalo de nuevo");
    }
  }

  return (
    <div className="landing">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">TS</span>
          TripSync
        </div>
        <div className="header-actions">
          {user ? (
            <span className="user-greeting">Hola, {user.name}</span>
          ) : (
            <button type="button" className="btn-solid-sm" onClick={openAuth}>
              Entrar
            </button>
          )}
        </div>
      </header>

      <main className="hero">
        <div className="hero-copy">
          <span className="panel-eyebrow">
            Planificación de viajes en grupo
          </span>
          <h1 className="hero-title">
            Encuentra las fechas en las que todos podéis viajar
          </h1>
          <p className="hero-lede">
            TripSync compara la disponibilidad y el presupuesto de todo el grupo
            para que decidir el viaje deje de ser un caos de mensajes.
          </p>
          <ul className="hero-points">
            {HERO_POINTS.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <span className="panel-eyebrow">Nuevo viaje</span>

          {(status === "idle" || status === "loading") && (
            <>
              <h2 className="panel-title">Planea tu próxima escapada</h2>
              <p className="panel-subtitle">
                Define un título y el rango de fechas posibles para que tus
                amigos indiquen su disponibilidad.
              </p>

              {!user && (
                <span className="gate-badge">
                  🔒 Inicia sesión para crear el viaje
                </span>
              )}

              {(() => {
                const tripForm = (
                  <form onSubmit={handleSubmit} noValidate inert={!user}>
                    {error && <p role="alert">{error}</p>}

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
                );

                if (user) return tripForm;

                return (
                  <div
                    className="form-gate"
                    role="button"
                    tabIndex={0}
                    aria-haspopup="dialog"
                    aria-label="Inicia sesión con Google para crear el viaje"
                    onClick={openAuth}
                    onKeyDown={handleGateKeyDown}
                  >
                    {tripForm}
                  </div>
                );
              })()}
            </>
          )}

          {status === "success" && trip && (
            <>
              <h2 className="panel-title">¡Viaje creado!</h2>
              <p className="panel-subtitle">
                Comparte este enlace con tus amigos para que se unan.
              </p>

              <CopyLinkField
                id="share-link"
                label="Enlace de invitación"
                value={`${APP_BASE_URL}/trips/${trip.id}`}
              />

              <Link to={`/trips/${trip.id}`} className="btn-primary">
                Ir al viaje
              </Link>
            </>
          )}
        </div>
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
