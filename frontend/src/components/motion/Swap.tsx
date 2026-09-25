import { AnimatePresence, m } from "motion/react";
import type { ReactNode } from "react";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface SwapProps {
  /** Changing this key cross-fades to the new children. */
  stateKey: string;
  children: ReactNode;
}

/** Cross-fades between the states of a panel (form, success, ...) instead of cutting. */
export function Swap({ stateKey, children }: SwapProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={stateKey}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}
