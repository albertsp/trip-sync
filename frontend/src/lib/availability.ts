import { addDays, eachDay } from "./calendar";
import { dateToString, stringToDate } from "./date";

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export function heatLevel(count: number, totalParticipants: number): HeatLevel {
  if (totalParticipants === 0) return 0;
  const ratio = count / totalParticipants;
  if (ratio === 0) return 0;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

export interface BestWindow {
  start: Date;
  end: Date;
  /** People available on every day of the window. */
  count: number;
  days: number;
}

const MAX_WINDOW_DAYS = 7;

function search(
  counts: Record<string, number>,
  days: Date[],
  minDays: number,
): BestWindow | null {
  let best: (BestWindow & { score: number }) | null = null;

  for (let from = 0; from < days.length; from++) {
    let count = Infinity;
    for (let to = from; to < days.length; to++) {
      const length = to - from + 1;
      if (length > MAX_WINDOW_DAYS) break;

      count = Math.min(count, counts[dateToString(days[to])] ?? 0);
      if (count === 0) break;

      // Shared availability dominates; a longer run breaks ties; the earliest wins the rest.
      const score = count * 100 + length;
      if (length >= minDays && (!best || score > best.score)) {
        best = { start: days[from], end: days[to], count, days: length, score };
      }
    }
  }

  if (!best) return null;
  const { start, end, count, days: length } = best;
  return { start, end, count, days: length };
}

/**
 * Best run of consecutive days (2 to 7) where the same people are free.
 * Falls back to the best single day when no multi-day run exists.
 */
export function bestWindow(
  counts: Record<string, number>,
  windowStart: Date,
  windowEnd: Date,
): BestWindow | null {
  const days = eachDay(windowStart, windowEnd);
  return search(counts, days, 2) ?? search(counts, days, 1);
}

/** Window to show when the trip itself couldn't be loaded: the span of the data. */
export function spanOfCounts(
  counts: Record<string, number>,
  fallback: Date = new Date(),
): { start: Date; end: Date } {
  const keys = Object.keys(counts).sort();
  if (keys.length === 0) return { start: fallback, end: addDays(fallback, 30) };
  return {
    start: stringToDate(keys[0]),
    end: stringToDate(keys[keys.length - 1]),
  };
}
