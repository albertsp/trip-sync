export function dateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function stringToDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

/** "jueves, 1 de octubre de 2026": the accessible name of a calendar day. */
export function formatDayLong(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** "Octubre 2026" */
export function formatMonthYear(date: Date): string {
  const month = new Intl.DateTimeFormat("es-ES", { month: "long" }).format(
    date,
  );
  return `${capitalize(month)} ${date.getFullYear()}`;
}

/** { weekday: "Sáb", day: 17, month: "oct" } */
function shortParts(date: Date) {
  const weekday = new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
  }).format(date);
  const month = new Intl.DateTimeFormat("es-ES", { month: "short" }).format(
    date,
  );
  return {
    weekday: capitalize(weekday.replace(".", "")),
    day: date.getDate(),
    month: month.replace(".", ""),
  };
}

/** "Sáb 17 – Dom 18 oct" (the month is repeated only when the range crosses one). */
export function formatDateRange(start: Date, end: Date): string {
  const from = shortParts(start);
  const to = shortParts(end);

  if (start.getTime() === end.getTime()) {
    return `${from.weekday} ${from.day} ${from.month}`;
  }

  const sameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();
  const fromLabel = `${from.weekday} ${from.day}${sameMonth ? "" : ` ${from.month}`}`;
  return `${fromLabel} – ${to.weekday} ${to.day} ${to.month}`;
}
