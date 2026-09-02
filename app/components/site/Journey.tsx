"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { JOURNEY } from "../../lib/profile";

// A spine that draws itself as you scroll past it, with the stops lighting
// up as the line reaches them.
export function Journey() {
  const ref = useRef<HTMLOListElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 80, damping: 22, mass: 0.4 });
  const scaleY = useTransform(smooth, [0, 1], [0, 1]);

  return (
    <ol ref={ref} className="relative">
      <div className="absolute left-[7px] sm:left-[calc(9rem+7px)] top-2 bottom-2 w-px bg-line" aria-hidden />
      <motion.div
        className="absolute left-[7px] sm:left-[calc(9rem+7px)] top-2 bottom-2 w-px bg-loop origin-top"
        style={{ scaleY: reduced ? 1 : scaleY }}
        aria-hidden
      />
      {JOURNEY.map((stop, i) => (
        <Stop key={stop.when + stop.title} stop={stop} last={i === JOURNEY.length - 1} index={i} />
      ))}
    </ol>
  );
}

function Stop({ stop, last, index }: { stop: (typeof JOURNEY)[number]; last: boolean; index: number }) {
  return (
    <motion.li
      className="relative grid sm:grid-cols-[9rem_1fr] gap-x-6 pl-8 sm:pl-0 pb-10"
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-15% 0px -15% 0px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <span
        className={`absolute left-0 sm:left-[9rem] top-1.5 w-[15px] h-[15px] rounded-full border-2 ${
          last ? "border-loop bg-loop shadow-[0_0_0_6px_rgba(43,69,255,0.15)]" : "border-line-strong bg-ground"
        }`}
        aria-hidden
      />
      <span className="font-mono text-[12px] text-ink-mute pt-1 sm:text-right sm:pr-8" data-mut={`path-${index}-when`}>{stop.when}</span>
      <div>
        <h3 className="font-medium text-xl text-ink leading-tight tracking-tight" data-mut={`path-${index}-title`}>{stop.title}</h3>
        <p className="text-[13px] font-mono text-loop mt-1" data-mut={`path-${index}-org`}>{stop.org}</p>
        <p className="text-ink-dim mt-2 max-w-md leading-relaxed" data-mut={`path-${index}-note`}>{stop.note}</p>
      </div>
    </motion.li>
  );
}
