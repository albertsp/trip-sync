import type { DestinationType, Interest, JoinTripForm } from "../types";

export const NOTES_MAX_LENGTH = 200;
export const DURATION_MIN_DAYS = 1;
export const DURATION_MAX_DAYS = 30;

export const DESTINATION_OPTIONS: { value: DestinationType; label: string }[] =
  [
    { value: "MOUNTAIN", label: "Montaña" },
    { value: "BEACH", label: "Playa" },
    { value: "CITY", label: "Ciudad" },
    { value: "ROADTRIP", label: "Circuito" },
    { value: "INDIFFERENT", label: "Indiferente" },
  ];

export const INTEREST_OPTIONS: { value: Interest; label: string }[] = [
  { value: "GASTRONOMY", label: "Gastronomía" },
  { value: "CULTURE", label: "Cultura" },
  { value: "NIGHTLIFE", label: "Vida nocturna" },
  { value: "SPORT", label: "Deporte" },
  { value: "NATURE", label: "Naturaleza" },
  { value: "RELAX", label: "Relax" },
];

/** Adds the value if missing, removes it if present (keeps insertion order). */
export function toggleInterest(
  current: Interest[],
  value: Interest,
): Interest[] {
  return current.includes(value)
    ? current.filter((i) => i !== value)
    : [...current, value];
}

/** Returns the first error message for the join form, or null when valid. */
export function validateJoin(
  join: JoinTripForm,
  availableDatesCount: number,
): string | null {
  if (!join.name.trim()) return "Indica tu nombre";
  if (!join.destinationType) return "Elige el tipo de destino";
  if (!join.originCity.trim()) return "Indica tu ciudad de origen";
  const amount = parseFloat(join.budgetAmount);
  if (!join.budgetAmount || Number.isNaN(amount) || amount <= 0)
    return "Indica un presupuesto válido";
  if (availableDatesCount === 0)
    return "Debes seleccionar al menos un día disponible";
  return null;
}

/** Empty string is valid (optional field); otherwise an integer in 1..30. */
export function validateDuration(raw: string): string | null {
  if (!raw.trim()) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < DURATION_MIN_DAYS || n > DURATION_MAX_DAYS)
    return "La duración debe estar entre 1 y 30 días";
  return null;
}

/** Empty string becomes null; otherwise the numeric value. Assumes validateDuration passed. */
export function parseDuration(raw: string): number | null {
  return raw.trim() ? Number(raw) : null;
}
