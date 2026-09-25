import { useEffect, useId, useRef } from "react";
import { API_BASE_URL } from "../lib/api";
import { ButtonLink } from "./ui/Button";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

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

        <h2 id={titleId} className="modal-title">
          Bienvenido a TripSync
        </h2>
        <p className="modal-lede">
          Inicia sesión con Google para crear y gestionar tus viajes.
        </p>

        <ButtonLink
          block
          arrow
          href={`${API_BASE_URL}/oauth2/authorization/google`}
        >
          Continuar con Google
        </ButtonLink>
      </div>
    </div>
  );
}
