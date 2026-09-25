interface StampProps {
  /** Short code printed at the bottom, e.g. the participant id. */
  code: string;
}

/** "Estás dentro" rubber stamp: lands with a small bounce when someone joins a trip. */
export function Stamp({ code }: StampProps) {
  return (
    <div className="stamp" role="img" aria-label="Sello: estás dentro">
      <small>TripSync</small>
      <b>Estás</b>
      <b>dentro</b>
      <small>ID {code}</small>
    </div>
  );
}
