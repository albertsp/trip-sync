import type { ProposalDetail } from "../types";

interface TripItineraryProps {
  destination: string;
  detail: ProposalDetail;
}

const PARTS = [
  ["morning", "Mañana"],
  ["afternoon", "Tarde"],
  ["evening", "Noche"],
] as const;

/** Day-by-day plan of the winning trip, followed by practical tips. */
export function TripItinerary({ destination, detail }: TripItineraryProps) {
  return (
    <section aria-labelledby="itinerary-title" className="flex flex-col gap-4">
      <div>
        <span className="field-label-text">Itinerario</span>
        <h3 id="itinerary-title" className="mt-1 mb-0 text-[1.35rem] font-extrabold text-ink">
          {destination}, día a día
        </h3>
      </div>

      <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 p-0">
        {detail.days.map((day) => (
          <li
            key={day.day}
            aria-label={`Día ${day.day}`}
            className="flex flex-col gap-2.5 rounded-[20px] border border-line bg-card p-5"
          >
            <span className="font-mono text-[.78rem] font-bold text-ink-3">Día {day.day}</span>
            {PARTS.map(([key, label]) => (
              <p key={key} className="m-0 text-[.92rem] leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">{label}: </strong>
                {day[key]}
              </p>
            ))}
          </li>
        ))}
      </ol>

      {detail.tips.length > 0 && (
        <div className="rounded-[16px] border border-dashed border-line px-5 py-4">
          <span className="field-label-text">Consejos</span>
          <ul className="mt-2 mb-0 flex list-disc flex-col gap-1 pl-5 text-[.92rem] text-ink-2">
            {detail.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
