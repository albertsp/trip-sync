import { dateToString } from "./date";

/** First day of the month containing `date`. */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Every month (as its 1st day) touched by the window, inclusive. */
export function monthsBetween(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  const cursor = startOfMonth(start);
  const last = startOfMonth(end);
  while (cursor <= last) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

/**
 * Cells of one month laid out Monday-first: `null` pads the leading and
 * trailing days so the result is always whole weeks.
 */
export function buildMonthGrid(month: Date): (Date | null)[] {
  const year = month.getFullYear();
  const index = month.getMonth();
  const daysInMonth = new Date(year, index + 1, 0).getDate();
  const leading = (new Date(year, index, 1).getDay() + 6) % 7;

  const cells: (Date | null)[] = Array(leading).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, index, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

/** Every day from start to end, inclusive. */
export function eachDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}

export function isWithin(date: Date, start: Date, end: Date): boolean {
  const key = dateToString(date);
  return key >= dateToString(start) && key <= dateToString(end);
}
