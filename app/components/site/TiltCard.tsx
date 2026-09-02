"use client";

import { useRef, type ReactNode, type PointerEvent } from "react";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  href?: string;
  external?: boolean;
  max?: number;
}

// A card that leans toward the pointer and carries a spotlight. Pure CSS
// variables; no re-renders on move.
export function TiltCard({ children, className = "", href, external, max = 0 }: TiltCardProps) {
  const ref = useRef<HTMLElement | null>(null);

  function onMove(e: PointerEvent<HTMLElement>) {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
    el.style.setProperty("--my", (py * 100).toFixed(1) + "%");
    if (max > 0) {
      const rx = (0.5 - py) * max;
      const ry = (px - 0.5) * max;
      el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(0)`;
    }
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
  }

  const cls = "spot block rounded-lg border border-line bg-ground-2 " + className;

  if (href) {
    return (
      <a
        ref={(n) => {
          ref.current = n;
        }}
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={cls}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
      >
        {children}
      </a>
    );
  }
  return (
    <div
      ref={(n) => {
        ref.current = n;
      }}
      className={cls}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {children}
    </div>
  );
}
