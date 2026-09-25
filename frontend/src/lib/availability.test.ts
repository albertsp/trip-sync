import { describe, expect, it } from "vitest";
import { bestWindow, heatLevel, spanOfCounts } from "./availability";
import { buildMonthGrid, monthsBetween } from "./calendar";
import { dateToString, formatDateRange } from "./date";

const d = (day: number) => new Date(2026, 9, day); // October 2026

describe("heatLevel", () => {
  it("maps the availability ratio to five levels", () => {
    expect(heatLevel(0, 8)).toBe(0);
    expect(heatLevel(2, 8)).toBe(1);
    expect(heatLevel(4, 8)).toBe(2);
    expect(heatLevel(6, 8)).toBe(3);
    expect(heatLevel(7, 8)).toBe(4);
  });

  it("is 0 when nobody has joined yet", () => {
    expect(heatLevel(0, 0)).toBe(0);
  });
});

describe("bestWindow", () => {
  it("prefers the run where the most people are free on every day", () => {
    const counts = {
      "2026-10-03": 3,
      "2026-10-04": 3,
      "2026-10-10": 5,
      "2026-10-11": 5,
      "2026-10-12": 2,
    };
    const result = bestWindow(counts, d(1), d(31));
    expect(dateToString(result!.start)).toBe("2026-10-10");
    expect(dateToString(result!.end)).toBe("2026-10-11");
    expect(result!.count).toBe(5);
  });

  it("uses the weakest day as the count of a run", () => {
    const counts = { "2026-10-16": 4, "2026-10-17": 6, "2026-10-18": 6 };
    const result = bestWindow(counts, d(1), d(31));
    expect(dateToString(result!.start)).toBe("2026-10-17");
    expect(result!.days).toBe(2);
    expect(result!.count).toBe(6);
  });

  it("breaks ties by taking the earliest run", () => {
    const counts = {
      "2026-10-10": 5,
      "2026-10-11": 5,
      "2026-10-17": 5,
      "2026-10-18": 5,
    };
    expect(dateToString(bestWindow(counts, d(1), d(31))!.start)).toBe(
      "2026-10-10",
    );
  });

  it("falls back to the best single day when no day has a neighbour", () => {
    const counts = { "2026-10-05": 2, "2026-10-20": 4 };
    const result = bestWindow(counts, d(1), d(31));
    expect(dateToString(result!.start)).toBe("2026-10-20");
    expect(result!.days).toBe(1);
  });

  it("ignores days outside the trip window", () => {
    const counts = { "2026-10-30": 9, "2026-10-31": 9, "2026-10-10": 1 };
    const result = bestWindow(counts, d(1), d(20));
    expect(dateToString(result!.start)).toBe("2026-10-10");
  });

  it("returns null when nobody is available", () => {
    expect(bestWindow({}, d(1), d(31))).toBeNull();
  });
});

describe("calendar helpers", () => {
  it("pads a month with Monday-first leading days and whole weeks", () => {
    const grid = buildMonthGrid(new Date(2026, 9, 1)); // Oct 1st is a Thursday
    expect(grid.slice(0, 3)).toEqual([null, null, null]);
    expect(grid[3]).toEqual(new Date(2026, 9, 1));
    expect(grid.length % 7).toBe(0);
    expect(grid.filter(Boolean)).toHaveLength(31);
  });

  it("lists every month a window touches", () => {
    const months = monthsBetween(new Date(2026, 9, 28), new Date(2027, 0, 3));
    expect(months.map((m) => `${m.getFullYear()}-${m.getMonth() + 1}`)).toEqual(
      ["2026-10", "2026-11", "2026-12", "2027-1"],
    );
  });

  it("spans the data when the trip is unknown", () => {
    const span = spanOfCounts({ "2026-10-05": 1, "2026-11-02": 2 });
    expect(dateToString(span.start)).toBe("2026-10-05");
    expect(dateToString(span.end)).toBe("2026-11-02");
  });
});

describe("formatDateRange", () => {
  it("names the month once when the range stays inside it", () => {
    expect(formatDateRange(d(17), d(18))).toBe("Sáb 17 – Dom 18 oct");
  });

  it("names both months when the range crosses one", () => {
    expect(formatDateRange(new Date(2026, 9, 31), new Date(2026, 10, 1))).toBe(
      "Sáb 31 oct – Dom 1 nov",
    );
  });

  it("collapses a single day", () => {
    expect(formatDateRange(d(17), d(17))).toBe("Sáb 17 oct");
  });
});
