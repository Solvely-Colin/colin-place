"use client";

import Link from "next/link";
import { motion, useScroll, useSpring } from "framer-motion";
import { lemniscatePath } from "../../lib/loop";
import { LocalClock } from "./LocalClock";

const LOGO_PATH = lemniscatePath(11, 12, 12, 120);

const LINKS = [
  { href: "#work", label: "Work" },
  { href: "#about", label: "About" },
  { href: "#path", label: "Path" },
  { href: "#contact", label: "Contact" },
];

export function Nav() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });

  return (
    <header className="fixed top-0 inset-x-0 z-[100]">
      <motion.div
        className="absolute top-0 left-0 h-px w-full origin-left bg-loop"
        style={{ scaleX: progress }}
        aria-hidden
      />
      <div className="bg-ground/85 backdrop-blur border-b border-line"><div className="mx-auto max-w-[1400px] px-5 sm:px-8 h-14 flex items-center gap-6">
        <Link href="/" className="group flex items-center gap-2.5 text-ink font-semibold tracking-tight">
          <svg viewBox="0 0 24 24" className="w-6 h-6 overflow-visible" aria-hidden>
            <path
              d={LOGO_PATH}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              className="nav-loop text-loop transition-transform duration-700 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-180 origin-center"
            />
          </svg>
          <span className="font-medium tracking-tight">colin.place</span>
        </Link>

        <LocalClock className="hidden md:inline text-[12px] font-mono text-ink-mute" />

        <nav className="ml-auto flex items-center gap-1 sm:gap-2">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="hidden sm:inline-block px-3 py-1.5 text-[14px] text-ink-mute hover:text-ink transition"
            >
              {l.label}
            </a>
          ))}
          <span id="sanity-readout" className="ml-2 font-mono text-[11px] text-ink-mute tabular-nums hidden" aria-live="off" />
        </nav>
      </div></div>
    </header>
  );
}
