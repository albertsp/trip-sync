import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { heatLevel } from "../../lib/availability";
import type { BestWindow } from "../../lib/availability";
import {
  addDays,
  buildMonthGrid,
  isWithin,
  monthsBetween,
} from "../../lib/calendar";
import {
  dateToString,
  formatDayLong,
  formatMonthYear,
  stringToDate,
} from "../../lib/date";

interface BaseProps {
  windowStart: Date;
  windowEnd: Date;
}

interface PaintProps extends BaseProps {
  /** Pick your own days: click, drag across days, or use the keyboard. */
  mode: "paint";
  selected: Date[];
  onChange: (dates: Date[]) => void;
}

interface HeatProps extends BaseProps {
  /** Read-only group availability, one warm cell per day with its head count. */
  mode: "heat";
  counts: Record<string, number>;
  total: number;
  best: BestWindow | null;
}

export type CalendarProps = PaintProps | HeatProps;

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];
/** Horizontal travel before a touch gesture counts as painting instead of a tap or scroll. */
const TOUCH_PAINT_THRESHOLD = 10;

type DragPhase = "idle" | "pending" | "painting";

interface DragState {
  phase: DragPhase;
  /** Whether the stroke selects (true) or deselects (false) the days it crosses. */
  value: boolean;
  startKey: string;
  x: number;
  y: number;
}

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

function dayButtonFrom(target: EventTarget | null): HTMLButtonElement | null {
  const button = (target as Element | null)?.closest?.<HTMLButtonElement>(
    "[data-date]",
  );
  return button && !button.disabled ? button : null;
}

export function Calendar(props: CalendarProps) {
  const { windowStart, windowEnd } = props;
  const paint = props.mode === "paint" ? props : null;
  const heat = props.mode === "heat" ? props : null;

  const months = useMemo(
    () => monthsBetween(windowStart, windowEnd),
    [windowStart, windowEnd],
  );

  // Open on the month that holds the answer: the best window, else the first month.
  const [monthIndex, setMonthIndex] = useState(() => {
    const best = heat?.best;
    if (!best) return 0;
    const found = months.findIndex(
      (m) =>
        m.getFullYear() === best.start.getFullYear() &&
        m.getMonth() === best.start.getMonth(),
    );
    return Math.max(found, 0);
  });
  const month = months[Math.min(monthIndex, months.length - 1)];
  const grid = useMemo(() => buildMonthGrid(month), [month]);

  const gridRef = useRef<HTMLDivElement>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const shouldFocus = useRef(false);

  const selected = paint?.selected;
  const selectedSet = useMemo(
    () => new Set((selected ?? []).map(dateToString)),
    [selected],
  );
  // Latest selection, updated synchronously while dragging (state lags one render behind).
  const selection = useRef(selectedSet);
  useEffect(() => {
    selection.current = selectedSet;
  }, [selectedSet]);

  const drag = useRef<DragState>({
    phase: "idle",
    value: true,
    startKey: "",
    x: 0,
    y: 0,
  });
  const suppressClick = useRef(false);

  useEffect(() => {
    function endStroke() {
      if (drag.current.phase === "idle") return;
      drag.current.phase = "idle";
      // The click that follows a mouse stroke must not toggle the day a second time.
      setTimeout(() => {
        suppressClick.current = false;
      }, 0);
    }
    window.addEventListener("pointerup", endStroke);
    window.addEventListener("pointercancel", endStroke);
    return () => {
      window.removeEventListener("pointerup", endStroke);
      window.removeEventListener("pointercancel", endStroke);
    };
  }, []);

  // Move DOM focus after a keyboard move that may have changed the visible month.
  useEffect(() => {
    if (!shouldFocus.current || !focusKey) return;
    shouldFocus.current = false;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${focusKey}"]`)
      ?.focus();
  }, [focusKey, monthIndex]);

  function setDay(key: string, on: boolean) {
    if (!paint || selection.current.has(key) === on) return;
    const next = new Set(selection.current);
    if (on) next.add(key);
    else next.delete(key);
    selection.current = next;
    paint.onChange([...next].sort().map(stringToDate));
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    const button = dayButtonFrom(e.target);
    if (!button) return;
    const key = button.dataset.date!;
    const value = !selection.current.has(key);

    if (e.pointerType === "touch") {
      // A touch may be a tap or a page scroll: decide once it starts moving.
      drag.current = {
        phase: "pending",
        value,
        startKey: key,
        x: e.clientX,
        y: e.clientY,
      };
      return;
    }

    if (e.button !== 0) return;
    drag.current = {
      phase: "painting",
      value,
      startKey: key,
      x: e.clientX,
      y: e.clientY,
    };
    suppressClick.current = true;
    setDay(key, value);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const stroke = drag.current;
    if (stroke.phase === "idle") return;

    if (stroke.phase === "pending") {
      const dx = Math.abs(e.clientX - stroke.x);
      const dy = Math.abs(e.clientY - stroke.y);
      if (dx < TOUCH_PAINT_THRESHOLD || dx < dy) return;
      stroke.phase = "painting";
      suppressClick.current = true;
      setDay(stroke.startKey, stroke.value);
    }

    const button = dayButtonFrom(
      document.elementFromPoint(e.clientX, e.clientY),
    );
    if (button && gridRef.current?.contains(button)) {
      setDay(button.dataset.date!, stroke.value);
    }
  }

  function handleDayClick(key: string) {
    if (heat) {
      setActiveKey(key);
      return;
    }
    // Mouse strokes were already applied on pointerdown; this covers taps and the keyboard.
    if (suppressClick.current) return;
    setDay(key, !selection.current.has(key));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const key = (document.activeElement as HTMLElement | null)?.dataset.date;
    if (!key) return;

    const current = stringToDate(key);
    const weekday = (current.getDay() + 6) % 7;
    let target: Date;

    switch (e.key) {
      case "ArrowLeft":
        target = addDays(current, -1);
        break;
      case "ArrowRight":
        target = addDays(current, 1);
        break;
      case "ArrowUp":
        target = addDays(current, -7);
        break;
      case "ArrowDown":
        target = addDays(current, 7);
        break;
      case "Home":
        target = addDays(current, -weekday);
        break;
      case "End":
        target = addDays(current, 6 - weekday);
        break;
      case "PageUp":
      case "PageDown": {
        const offset = e.key === "PageUp" ? -1 : 1;
        const lastDay = new Date(
          current.getFullYear(),
          current.getMonth() + offset + 1,
          0,
        ).getDate();
        target = new Date(
          current.getFullYear(),
          current.getMonth() + offset,
          Math.min(current.getDate(), lastDay),
        );
        break;
      }
      default:
        return;
    }

    e.preventDefault();
    const targetKey = dateToString(target);
    const clamped =
      targetKey < dateToString(windowStart)
        ? windowStart
        : targetKey > dateToString(windowEnd)
          ? windowEnd
          : target;

    const index = months.findIndex(
      (m) =>
        m.getFullYear() === clamped.getFullYear() &&
        m.getMonth() === clamped.getMonth(),
    );
    shouldFocus.current = true;
    setFocusKey(dateToString(clamped));
    if (index >= 0) setMonthIndex(index);
  }

  // Roving tabindex: one day per month view is a tab stop, arrows move between days.
  const monthPrefix = dateToString(month).slice(0, 7);
  const preferredKey =
    focusKey ?? (heat?.best ? dateToString(heat.best.start) : null) ?? null;
  const firstEnabled = grid.find(
    (d) => d && isWithin(d, windowStart, windowEnd),
  );
  const tabbableKey =
    preferredKey &&
    preferredKey.startsWith(monthPrefix) &&
    isWithin(stringToDate(preferredKey), windowStart, windowEnd)
      ? preferredKey
      : firstEnabled
        ? dateToString(firstEnabled)
        : null;

  const activeDate = activeKey ? stringToDate(activeKey) : null;
  const activeCount = activeKey ? (heat?.counts[activeKey] ?? 0) : 0;

  return (
    <div className={`cal cal--${props.mode}`}>
      <div className="cal-head">
        <h3 className="cal-title" aria-live="polite">
          {formatMonthYear(month)}
        </h3>
        {months.length > 1 && (
          <div className="cal-nav">
            <button
              type="button"
              aria-label="Mes anterior"
              disabled={monthIndex === 0}
              onClick={() => setMonthIndex(monthIndex - 1)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path
                  d="M10 3 5 8l5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Mes siguiente"
              disabled={monthIndex === months.length - 1}
              onClick={() => setMonthIndex(monthIndex + 1)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path
                  d="m6 3 5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="cal-weekdays" aria-hidden="true">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div
        ref={gridRef}
        className="cal-grid"
        role="group"
        aria-label={formatMonthYear(month)}
        onKeyDown={handleKeyDown}
        onPointerDown={paint ? handlePointerDown : undefined}
        onPointerMove={paint ? handlePointerMove : undefined}
        onPointerOver={
          heat
            ? (e) => {
                const button = dayButtonFrom(e.target);
                if (button) setActiveKey(button.dataset.date!);
              }
            : undefined
        }
        onFocus={
          heat
            ? (e) => {
                const button = dayButtonFrom(e.target);
                if (button) setActiveKey(button.dataset.date!);
              }
            : undefined
        }
      >
        {grid.map((date, index) => {
          if (!date) {
            return <span key={`blank-${index}`} className="cal-blank" />;
          }

          const key = dateToString(date);
          const inWindow = isWithin(date, windowStart, windowEnd);
          const common = {
            type: "button" as const,
            className: "cal-day",
            "data-date": key,
            disabled: !inWindow,
            tabIndex: key === tabbableKey ? 0 : -1,
            style: { "--i": index } as CSSProperties,
            onClick: () => handleDayClick(key),
            onFocus: () => setFocusKey(key),
          };

          if (paint) {
            return (
              <button
                key={key}
                {...common}
                aria-label={formatDayLong(date)}
                aria-pressed={selectedSet.has(key)}
              >
                {date.getDate()}
              </button>
            );
          }

          const count = inWindow ? (heat!.counts[key] ?? 0) : 0;
          const inBest =
            !!heat!.best && isWithin(date, heat!.best.start, heat!.best.end);
          return (
            <button
              key={key}
              {...common}
              aria-label={
                inWindow
                  ? `${formatDayLong(date)}: ${count} de ${heat!.total} disponibles`
                  : formatDayLong(date)
              }
              data-level={inWindow ? heatLevel(count, heat!.total) : undefined}
              data-best={inBest || undefined}
            >
              {date.getDate()}
              {count > 0 && (
                <small className="cal-count" aria-hidden="true">
                  {count}
                </small>
              )}
            </button>
          );
        })}
      </div>

      {heat && (
        <p className="cal-detail" aria-live="polite">
          {activeDate ? (
            <>
              <strong>{capitalize(formatDayLong(activeDate))}</strong> ·{" "}
              {activeCount} de {heat.total} pueden
            </>
          ) : (
            "Pasa el cursor por un día para ver cuánta gente puede."
          )}
        </p>
      )}
    </div>
  );
}
