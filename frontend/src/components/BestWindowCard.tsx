import type { BestWindow } from "../lib/availability";
import { formatDateRange } from "../lib/date";

interface BestWindowCardProps {
  best: BestWindow | null;
  totalParticipants: number;
}

/** The answer to "when do we go?": the run of days that fits the most people. */
export function BestWindowCard({
  best,
  totalParticipants,
}: BestWindowCardProps) {
  const share = best && totalParticipants ? best.count / totalParticipants : 0;

  return (
    <section
      aria-labelledby="best-window-title"
      className="relative mb-8 overflow-hidden rounded-3xl bg-panel p-6 text-on-panel after:absolute after:-top-14 after:-right-14 after:size-40 after:rounded-full after:bg-sun after:content-['']"
    >
      <span className="mono-label relative z-10 opacity-70">Mejor ventana</span>

      {best ? (
        <>
          <h2
            id="best-window-title"
            className="font-display-tight relative z-10 mt-2 mb-1.5 text-4xl sm:text-5xl"
          >
            {formatDateRange(best.start, best.end)}
          </h2>
          <p className="relative z-10 text-[.95rem] opacity-85">
            {best.count} de {totalParticipants}{" "}
            {best.count === 1 ? "puede" : "pueden"} ·{" "}
            {best.days === 1 ? "1 día" : `${best.days} días seguidos`}
          </p>
          <div
            className="relative z-10 mt-4 h-2.5 overflow-hidden rounded-full bg-on-panel/20"
            role="presentation"
          >
            <div
              className="h-full origin-left animate-[grow_0.9s_var(--ease-out-expo)_both] rounded-full bg-sun"
              style={{ width: `${share * 100}%` }}
            />
          </div>
        </>
      ) : (
        <>
          <h2
            id="best-window-title"
            className="font-display-tight relative z-10 mt-2 mb-1.5 text-3xl"
          >
            Aún no hay días en común
          </h2>
          <p className="relative z-10 text-[.95rem] opacity-85">
            Cuando alguien marque sus días, aquí aparecerá la mejor fecha.
          </p>
        </>
      )}
    </section>
  );
}
