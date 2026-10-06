export type ProposalAction = "load" | "generate" | "vote" | "confirm" | "plan";

const GENERIC = "Algo ha salido mal, inténtalo de nuevo";

/** User-facing copy for a failed proposals request (PLAN.md 10.5). Pure, no I/O. */
export function proposalErrorMessage(
  status: number,
  action: ProposalAction,
  retryAfterSeconds: number | null = null,
): string {
  switch (status) {
    case 401:
      return action === "vote"
        ? "No te reconocemos como participante de este viaje"
        : action === "plan"
          ? "Inicia sesión para montar el viaje"
          : "Inicia sesión para generar propuestas";
    case 403:
      return "Solo el creador del viaje puede hacerlo";
    case 409:
      if (action === "confirm") return "Hay un empate: elige tú la ganadora";
      if (action === "plan") return "Primero cierra la votación para elegir el viaje";
      return "La votación ya está cerrada";
    case 422:
      return "Faltan participantes con preferencias (mínimo 3)";
    case 429:
      if (retryAfterSeconds !== null && retryAfterSeconds > 0) return "Espera un minuto";
      return action === "plan"
        ? "Has alcanzado el límite de generaciones del plan de este viaje"
        : "Has alcanzado el límite de generaciones de este viaje";
    case 502:
      return action === "plan"
        ? "La IA no ha podido montar el viaje, prueba de nuevo"
        : "La IA no ha podido generar propuestas, prueba de nuevo";
    case 503:
      return "La generación con IA no está disponible ahora mismo";
    default:
      return GENERIC;
  }
}

/** Seconds from a Retry-After header (numeric form only), or null. */
export function parseRetryAfter(value: string | null): number | null {
  if (value === null) return null;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}
