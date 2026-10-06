import { describe, expect, it } from "vitest";
import type { JoinTripForm } from "../types";
import {
  parseDuration,
  toggleInterest,
  validateDuration,
  validateJoin,
} from "./forms";

const valid: JoinTripForm = {
  name: "Ana",
  budgetAmount: "300",
  budgetCurrency: "EUR",
  destinationType: "BEACH",
  originCity: "Madrid",
  interests: [],
  notes: "",
};

describe("validateJoin", () => {
  it("accepts a complete form", () => {
    expect(validateJoin(valid, 2)).toBeNull();
  });
  it("requires the name", () => {
    expect(validateJoin({ ...valid, name: "  " }, 2)).toBe("Indica tu nombre");
  });
  it("requires the destination type", () => {
    expect(validateJoin({ ...valid, destinationType: "" }, 2)).toBe(
      "Elige el tipo de destino",
    );
  });
  it("requires the origin city (trimmed)", () => {
    expect(validateJoin({ ...valid, originCity: "   " }, 2)).toBe(
      "Indica tu ciudad de origen",
    );
  });
  it("requires a positive budget", () => {
    expect(validateJoin({ ...valid, budgetAmount: "0" }, 2)).toBe(
      "Indica un presupuesto válido",
    );
  });
  it("requires at least one date", () => {
    expect(validateJoin(valid, 0)).toBe(
      "Debes seleccionar al menos un día disponible",
    );
  });
});

describe("validateDuration / parseDuration", () => {
  it("treats empty as optional", () => {
    expect(validateDuration("")).toBeNull();
    expect(parseDuration("")).toBeNull();
  });
  it("accepts the 1..30 range", () => {
    expect(validateDuration("1")).toBeNull();
    expect(validateDuration("30")).toBeNull();
    expect(parseDuration("4")).toBe(4);
  });
  it("rejects out-of-range and non-integer values", () => {
    const msg = "La duración debe estar entre 1 y 30 días";
    expect(validateDuration("0")).toBe(msg);
    expect(validateDuration("31")).toBe(msg);
    expect(validateDuration("2.5")).toBe(msg);
    expect(validateDuration("abc")).toBe(msg);
  });
});

describe("toggleInterest", () => {
  it("adds and removes", () => {
    const a = toggleInterest([], "CULTURE");
    expect(a).toEqual(["CULTURE"]);
    expect(toggleInterest(a, "CULTURE")).toEqual([]);
  });
});
