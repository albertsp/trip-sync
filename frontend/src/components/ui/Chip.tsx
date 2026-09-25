import type { ReactNode } from "react";

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 text-sm font-semibold text-ink-2 before:size-2 before:rounded-full before:bg-sun">
      {children}
    </span>
  );
}
