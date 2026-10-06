import type { TripTask } from "../types";

export type TaskAction = "load" | "add" | "toggle" | "claim";

export const MAX_TASK_LENGTH = 120;

/** "2 de 5 hechas", or a hint while the list is still empty. */
export function taskProgressLabel(tasks: TripTask[]): string {
  if (tasks.length === 0) return "Aún no hay tareas";
  const done = tasks.filter((task) => task.done).length;
  return `${done} de ${tasks.length} ${tasks.length === 1 ? "hecha" : "hechas"}`;
}

/** Trimmed title, or an error message when it cannot be sent. */
export function validateTaskTitle(raw: string): { title: string; error: null } | { title: null; error: string } {
  const title = raw.trim().replace(/\s+/g, " ");
  if (title.length === 0) return { title: null, error: "Escribe la tarea" };
  if (title.length > MAX_TASK_LENGTH) {
    return { title: null, error: `La tarea no puede superar los ${MAX_TASK_LENGTH} caracteres` };
  }
  return { title, error: null };
}

/** User-facing copy for a failed checklist request. Pure, no I/O. */
export function taskErrorMessage(status: number, action: TaskAction): string {
  switch (status) {
    case 400:
      return `Escribe una tarea de hasta ${MAX_TASK_LENGTH} caracteres`;
    case 401:
      return "No te reconocemos como participante de este viaje";
    case 403:
      return "Solo quien reclamó la tarea puede soltarla";
    case 404:
      return "Esa tarea ya no existe";
    case 409:
      if (action === "claim") return "Esta tarea ya la ha reclamado otra persona";
      if (action === "add") return "La lista ya tiene demasiadas tareas";
      return "La lista de tareas se abre cuando se monta el viaje";
    default:
      return "Algo ha salido mal, inténtalo de nuevo";
  }
}
