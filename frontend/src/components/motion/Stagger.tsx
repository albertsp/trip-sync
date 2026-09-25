import { m } from "motion/react";
import type { Variants } from "motion/react";
import type { ReactNode } from "react";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT_EXPO },
  },
};

interface StaggerProps {
  children: ReactNode;
  className?: string;
}

/** Children wrapped in <StaggerItem> rise into place one after another. */
export function Stagger({ children, className }: StaggerProps) {
  return (
    <m.div
      className={className}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {children}
    </m.div>
  );
}

export function StaggerItem({ children, className }: StaggerProps) {
  return (
    <m.div className={className} variants={item}>
      {children}
    </m.div>
  );
}
