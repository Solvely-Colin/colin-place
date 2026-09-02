"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

interface CountUpProps {
  to: number;
  suffix?: string;
  className?: string;
  duration?: number;
  mutKey?: string;
}

// Counts from 0 to `to` the first time it scrolls into view.
export function CountUp({ to, suffix = "", className, duration = 1.8, mutKey }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? to : 0);

  useEffect(() => {
    if (!inView || reduced) return;
    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, to, duration, reduced]);

  return (
    <span ref={ref} className={className} data-mut={mutKey}>
      {value}
      {suffix}
    </span>
  );
}
