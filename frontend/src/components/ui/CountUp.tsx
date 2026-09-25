import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

interface CountUpProps {
  value: number;
  /** Seconds. */
  duration?: number;
}

function formatter(value: number) {
  const decimals = Number.isInteger(value) ? 0 : 2;
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** A figure that counts up to its value, so the eye lands on the number that matters. */
export function CountUp({ value, duration = 0.9 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const format = formatter(value);

    if (reduceMotion) {
      node.textContent = format.format(value);
      return;
    }

    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        node.textContent = format.format(latest);
      },
    });
    return () => controls.stop();
  }, [value, duration, reduceMotion]);

  // The final value is the server-rendered/first-paint fallback; the effect animates it from 0.
  return <span ref={ref}>{formatter(value).format(value)}</span>;
}
