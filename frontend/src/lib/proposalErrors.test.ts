import { describe, expect, it } from "vitest";
import { parseRetryAfter, proposalErrorMessage } from "./proposalErrors";

describe("proposalErrorMessage", () => {
  it("maps each documented status", () => {
    expect(proposalErrorMessage(401, "generate")).toBe("Inicia sesión para generar propuestas");
    expect(proposalErrorMessage(403, "generate")).toBe("Solo el creador del viaje puede hacerlo");
    expect(proposalErrorMessage(422, "generate")).toBe("Faltan participantes con preferencias (mínimo 3)");
    expect(proposalErrorMessage(502, "generate")).toBe("La IA no ha podido generar propuestas, prueba de nuevo");
    expect(proposalErrorMessage(503, "generate")).toBe("La generación con IA no está disponible ahora mismo");
  });

  it("distinguishes a closed vote from a tie on 409", () => {
    expect(proposalErrorMessage(409, "vote")).toBe("La votación ya está cerrada");
    expect(proposalErrorMessage(409, "generate")).toBe("La votación ya está cerrada");
    expect(proposalErrorMessage(409, "confirm")).toBe("Hay un empate: elige tú la ganadora");
  });

  it("distinguishes cooldown from the per-trip limit on 429", () => {
    expect(proposalErrorMessage(429, "generate", 30)).toBe("Espera un minuto");
    expect(proposalErrorMessage(429, "generate")).toBe(
      "Has alcanzado el límite de generaciones de este viaje",
    );
  });

  it("does not tell voters to sign in with Google", () => {
    expect(proposalErrorMessage(401, "vote")).not.toMatch(/generar/);
  });

  it("falls back to a generic message", () => {
    expect(proposalErrorMessage(500, "load")).toBe("Algo ha salido mal, inténtalo de nuevo");
  });
});

describe("parseRetryAfter", () => {
  it("parses seconds and rejects everything else", () => {
    expect(parseRetryAfter("42")).toBe(42);
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter("Wed, 21 Oct 2026 07:28:00 GMT")).toBeNull();
  });
});
