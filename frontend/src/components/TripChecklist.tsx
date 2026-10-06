import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL, readEditToken } from "../lib/api";
import {
  MAX_TASK_LENGTH,
  taskErrorMessage,
  taskProgressLabel,
  validateTaskTitle,
  type TaskAction,
} from "../lib/tasks";
import type { TripTask } from "../types";
import { Button } from "./ui/Button";

type LoadStatus = "loading" | "success" | "error";

interface TripChecklistProps {
  tripId: string;
}

/** Shared to-do list of the trip: anyone who joined can claim, tick and add tasks. */
export function TripChecklist({ tripId }: TripChecklistProps) {
  const editToken = readEditToken(tripId);

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [tasks, setTasks] = useState<TripTask[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const headers = useCallback(
    (json: boolean): Record<string, string> => {
      const result: Record<string, string> = {};
      if (editToken) result["X-Edit-Token"] = editToken;
      if (json) result["Content-Type"] = "application/json";
      return result;
    },
    [editToken],
  );

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/trips/${tripId}/tasks`, { headers: headers(false) });
      if (!response.ok) throw new Error(`Server Error: ${response.status}`);
      setTasks(await response.json());
      setStatus("success");
    } catch (err) {
      console.error("Error loading tasks: ", err);
      setStatus("error");
    }
  }, [tripId, headers]);

  useEffect(() => {
    load();
  }, [load]);

  /** Sends a change and returns the server's version of the task, or null after showing the error. */
  async function send(action: TaskAction, path: string, init: RequestInit): Promise<TripTask | null> {
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/trips/${tripId}/tasks${path}`, init);
      if (!response.ok) {
        setError(taskErrorMessage(response.status, action));
        return null;
      }
      return await response.json();
    } catch (err) {
      console.error(`Error (${action}): `, err);
      setError("No se ha podido conectar con el servidor");
      return null;
    }
  }

  async function update(task: TripTask, action: TaskAction, body: { done?: boolean; claimed?: boolean }) {
    setBusyId(task.id);
    // Ticking is optimistic: it is the most frequent action and rarely fails.
    if (body.done !== undefined) {
      setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, done: body.done as boolean } : item)));
    }
    const updated = await send(action, `/${task.id}`, {
      method: "PATCH",
      headers: headers(true),
      body: JSON.stringify(body),
    });
    setBusyId(null);
    if (updated) {
      setTasks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } else {
      // Someone else may have changed it meanwhile: show the real state.
      await load();
    }
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    const { title, error: invalid } = validateTaskTitle(draft);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusyId("new");
    const created = await send("add", "", {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify({ title }),
    });
    setBusyId(null);
    if (created) {
      setTasks((current) => [...current, created]);
      setDraft("");
    }
  }

  const canEdit = !!editToken;

  return (
    <section aria-labelledby="checklist-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <span className="field-label-text">Checklist</span>
          <h3 id="checklist-title" className="mt-1 mb-0 text-[1.35rem] font-extrabold text-ink">
            Qué hay que preparar
          </h3>
        </div>
        {status === "success" && (
          <span className="font-mono text-[.8rem] text-ink-2" data-testid="task-progress">
            {taskProgressLabel(tasks)}
          </span>
        )}
      </div>

      {status === "loading" && <p className="panel-loading">Cargando tareas...</p>}
      {status === "error" && (
        <p role="alert">
          No se han podido cargar las tareas{" "}
          <button type="button" className="cursor-pointer font-semibold text-ink underline" onClick={load}>
            Reintentar
          </button>
        </p>
      )}

      {status === "success" && (
        <>
          {!canEdit && (
            <p className="m-0 rounded-[14px] border border-line bg-screen px-4 py-3 text-[.92rem] text-ink-2">
              Para reclamar o marcar tareas tienes que{" "}
              <Link to={`/trips/${tripId}`} className="panel-link">
                unirte al viaje
              </Link>
              .
            </p>
          )}

          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {tasks.map((task) => (
              <li
                key={task.id}
                data-done={task.done || undefined}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-line bg-card px-4 py-3"
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={task.done}
                    disabled={!canEdit || busyId === task.id}
                    onChange={(e) => update(task, "toggle", { done: e.target.checked })}
                    className="size-5 shrink-0 accent-[var(--sun)]"
                  />
                  <span className={task.done ? "text-ink-3 line-through" : "text-ink"}>{task.title}</span>
                </label>

                {task.assigneeId === null ? (
                  canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === task.id}
                      onClick={() => update(task, "claim", { claimed: true })}
                    >
                      Reclamar
                    </Button>
                  )
                ) : task.mine ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === task.id}
                    onClick={() => update(task, "claim", { claimed: false })}
                  >
                    Tuya · Soltar
                  </Button>
                ) : (
                  <span className="font-mono text-[.8rem] text-ink-2">{task.assigneeName}</span>
                )}
              </li>
            ))}
          </ul>

          {canEdit && (
            <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
              <div className="field !mb-0 min-w-[220px] flex-1">
                <label htmlFor="new-task">Añadir una tarea</label>
                <input
                  id="new-task"
                  type="text"
                  value={draft}
                  maxLength={MAX_TASK_LENGTH}
                  placeholder="Comprar entradas"
                  onChange={(e) => setDraft(e.target.value)}
                />
              </div>
              <Button type="submit" size="sm" disabled={busyId === "new"}>
                Añadir
              </Button>
            </form>
          )}

          {error && <p role="alert">{error}</p>}
        </>
      )}
    </section>
  );
}
