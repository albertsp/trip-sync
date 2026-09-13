import { useEffect, useId, useRef, useState } from "react";

type AuthMode = "login" | "signup";

interface AuthModalProps {
  open: boolean;
  initialMode: AuthMode;
  onClose: () => void;
}

export function AuthModal({ open, initialMode, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ✕
        </button>

        <div className="modal-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={`modal-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => setMode("login")}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={`modal-tab ${mode === "signup" ? "active" : ""}`}
            onClick={() => setMode("signup")}
          >
            Crear cuenta
          </button>
        </div>

        <h2 id={titleId} className="modal-title">
          {mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta"}
        </h2>
        <p className="modal-lede">
          {mode === "login"
            ? "Inicia sesión para crear y gestionar tus viajes."
            : "Regístrate para empezar a organizar viajes con tu grupo."}
        </p>

        <form onSubmit={(e) => e.preventDefault()} noValidate>
          {mode === "signup" && (
            <div className="field">
              <label htmlFor="auth-name">Nombre</label>
              <input
                id="auth-name"
                type="text"
                name="name"
                placeholder="Ana García"
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="auth-email">Correo electrónico</label>
            <input
              id="auth-email"
              type="email"
              name="email"
              placeholder="ana@ejemplo.com"
            />
          </div>

          <div className="field">
            <label htmlFor="auth-password">Contraseña</label>
            <input
              id="auth-password"
              type="password"
              name="password"
              placeholder="••••••••"
            />
          </div>

          <button type="submit">
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        </form>

        <p className="modal-footnote">
          Muy pronto podrás crear una cuenta real — por ahora esto es solo una
          vista previa.
        </p>
      </div>
    </div>
  );
}
