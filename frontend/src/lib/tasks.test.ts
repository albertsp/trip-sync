import { describe, expect, it } from "vitest";
import type { TripTask } from "../types";
import { MAX_TASK_LENGTH, taskErrorMessage, taskProgressLabel, validateTaskTitle } from "./tasks";

const task = (done: boolean): TripTask => ({
  id: String(Math.random()),
  title: "Reservar",
  assigneeId: null,
  assigneeName: null,
  done,
  mine: false,
});

describe("taskProgressLabel", () => {
  it("counts done tasks", () => {
    expect(taskProgressLabel([])).toBe("Aún no hay tareas");
    expect(taskProgressLabel([task(true)])).toBe("1 de 1 hecha");
    expect(taskProgressLabel([task(true), task(false), task(false)])).toBe("1 de 3 hechas");
  });
});

describe("validateTaskTitle", () => {
  it("trims and collapses whitespace", () => {
    expect(validateTaskTitle("  Comprar   pilas ")).toEqual({ title: "Comprar pilas", error: null });
  });

  it("rejects empty and overlong titles", () => {
    expect(validateTaskTitle("   ").error).toBe("Escribe la tarea");
    expect(validateTaskTitle("x".repeat(MAX_TASK_LENGTH + 1)).error).toMatch(/120/);
    expect(validateTaskTitle("x".repeat(MAX_TASK_LENGTH)).error).toBeNull();
  });
});

describe("taskErrorMessage", () => {
  it("explains a task that someone else already claimed", () => {
    expect(taskErrorMessage(409, "claim")).toBe("Esta tarea ya la ha reclamado otra persona");
    expect(taskErrorMessage(409, "toggle")).toMatch(/se abre/);
  });

  it("covers the other statuses and falls back", () => {
    expect(taskErrorMessage(401, "add")).toMatch(/participante/);
    expect(taskErrorMessage(403, "claim")).toMatch(/reclamó/);
    expect(taskErrorMessage(404, "toggle")).toMatch(/ya no existe/);
    expect(taskErrorMessage(500, "load")).toBe("Algo ha salido mal, inténtalo de nuevo");
  });
});
