"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { FeedItem } from "../../lib/activity";
import { lemniscate, lemniscateTangent, lemniscatePath, TAU } from "../../lib/loop";
import { TimeAgo } from "./TimeAgo";

// Each ambient particle is a mote of light riding the ∞. Each *event*
// particle is a real GitHub event from Colin's public feed — bigger,
// brighter, and hoverable. The loop is the "Feeling Loopy" hat, drawn in
// his own commits.

type RGB = [number, number, number];

const KIND_RGB: Record<string, RGB> = {
  push: [43, 69, 255],
  merge: [176, 54, 154],
  pr: [14, 159, 110],
  review: [201, 138, 0],
  issue: [217, 45, 32],
  create: [14, 124, 134],
  release: [16, 16, 16],
  site: [107, 76, 255],
};

const AMBIENT_RGB: RGB[] = [
  [16, 16, 16],
  [43, 69, 255],
  [107, 107, 102],
  [16, 16, 16],
];

const KIND_LABEL: Record<string, string> = {
  push: "Push",
  merge: "Merged",
  pr: "Pull request",
  review: "Review",
  issue: "Issue",
  create: "New repo",
  release: "Release",
  site: "Site drop",
};

interface Particle {
  t: number;
  speed: number;
  off: number;
  wob: number;
  phase: number;
  size: number;
  rgb: RGB;
  alpha: number;
  dx: number;
  dy: number;
  x: number;
  y: number;
  event?: FeedItem;
}

interface Hover {
  item: FeedItem;
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function LoopField({ events }: { events: FeedItem[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const hoverRef = useRef<Hover | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = { x: -9999, y: -9999, active: false };
    let w = 0;
    let h = 0;
    let a = 0;
    let cx = 0;
    let cy = 0;
    let spread = 0;
    let path: Path2D | null = null;
    let particles: Particle[] = [];
    let raf = 0;
    let running = true;
    let visible = true;
    let last = performance.now();
    let time = 0;

    function build() {
      const mobile = w < 640;
      const ambientCount = mobile ? 150 : 420;
      const next: Particle[] = [];
      for (let i = 0; i < ambientCount; i += 1) {
        next.push({
          t: Math.random() * TAU,
          speed: rand(0.0018, 0.0046),
          off: rand(-1, 1),
          wob: rand(0.6, 1.8),
          phase: Math.random() * TAU,
          size: rand(0.5, 1.9),
          rgb: AMBIENT_RGB[Math.floor(Math.random() * AMBIENT_RGB.length)],
          alpha: rand(0.18, 0.6),
          dx: 0,
          dy: 0,
          x: 0,
          y: 0,
        });
      }
      const evs = events.slice(0, mobile ? 14 : 28);
      evs.forEach((event, i) => {
        next.push({
          t: (i / evs.length) * TAU + rand(-0.05, 0.05),
          speed: rand(0.0009, 0.0016),
          off: rand(-0.7, 0.7),
          wob: rand(0.4, 0.9),
          phase: Math.random() * TAU,
          size: 3.2,
          rgb: KIND_RGB[event.kind] ?? [43, 69, 255],
          alpha: 1,
          dx: 0,
          dy: 0,
          x: 0,
          y: 0,
          event,
        });
      });
      particles = next;
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Half-width of the ∞. Height is ~0.35a, so it can be wider than tall.
      const mobile = w < 640;
      a = Math.min(w * (mobile ? 0.56 : 0.47), h * 1.15);
      cx = w / 2;
      cy = h * (mobile ? 0.3 : 0.42);
      spread = a * 0.07;
      path = new Path2D(lemniscatePath(a, cx, cy, 260));
      ctx!.clearRect(0, 0, w, h);
      build();
      if (reduced) drawStatic();
    }

    function place(p: Particle) {
      const base = lemniscate(p.t, a);
      const tan = lemniscateTangent(p.t, a);
      const nx = -tan.y;
      const ny = tan.x;
      const wob = Math.sin(time * p.wob + p.phase) * 0.3;
      const o = (p.off + wob) * spread;
      p.x = cx + base.x + nx * o + p.dx;
      p.y = cy + base.y + ny * o + p.dy;
    }

    function dot(p: Particle, boost = 1) {
      const [r, g, b] = p.rgb;
      if (p.event) {
        // Halo
        ctx!.fillStyle = `rgba(${r},${g},${b},${0.14 * boost})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size * 3.4, 0, TAU);
        ctx!.fill();
      }
      ctx!.fillStyle = `rgba(${r},${g},${b},${p.alpha * boost})`;
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, p.size, 0, TAU);
      ctx!.fill();
    }

    function drawPath() {
      if (!path) return;
      ctx!.strokeStyle = "rgba(43,69,255,0.14)";
      ctx!.lineWidth = 1;
      ctx!.stroke(path);
    }

    function drawStatic() {
      ctx!.globalCompositeOperation = "source-over";
      ctx!.clearRect(0, 0, w, h);
      drawPath();
      ctx!.globalCompositeOperation = "source-over";
      for (const p of particles) {
        place(p);
        dot(p);
      }
    }

    function frame(now: number) {
      if (!running) return;
      if (!visible || document.hidden) {
        last = now;
        raf = requestAnimationFrame(frame);
        return;
      }
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;
      time += dt * 0.016;

      // Fade the previous frame: trails without an opaque canvas.
      ctx!.globalCompositeOperation = "destination-out";
      ctx!.fillStyle = "rgba(0,0,0,0.2)";
      ctx!.fillRect(0, 0, w, h);

      ctx!.globalCompositeOperation = "source-over";
      drawPath();

      const R = 120;
      const decay = Math.pow(0.9, dt);
      let nearest: Particle | null = null;
      let nearestD = 38 * 38;
      const current = hoverRef.current;
      let currentP: Particle | null = null;

      for (const p of particles) {
        p.t += p.speed * dt;
        if (p.t > TAU) p.t -= TAU;
        if (mouse.active) {
          const ddx = p.x - mouse.x;
          const ddy = p.y - mouse.y;
          const d2 = ddx * ddx + ddy * ddy;
          if (d2 < R * R && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = (1 - d / R) * 2.6 * dt;
            p.dx += (ddx / d) * f;
            p.dy += (ddy / d) * f;
          }
        }
        p.dx *= decay;
        p.dy *= decay;
        place(p);

        if (p.event) {
          if (current && p.event.id === current.item.id) currentP = p;
          const ddx = p.x - mouse.x;
          const ddy = p.y - mouse.y;
          const d2 = ddx * ddx + ddy * ddy;
          if (d2 < nearestD) {
            nearestD = d2;
            nearest = p;
          }
        }
      }

      // Hysteresis so the tooltip does not flicker at the edge.
      let hovered: Particle | null = nearest;
      if (!hovered && currentP) {
        const ddx = currentP.x - mouse.x;
        const ddy = currentP.y - mouse.y;
        if (ddx * ddx + ddy * ddy < 90 * 90) hovered = currentP;
      }

      for (const p of particles) {
        const isHover = hovered === p;
        dot(p, isHover ? 1.6 : 1);
        if (isHover) {
          const [r, g, b] = p.rgb;
          ctx!.strokeStyle = `rgba(${r},${g},${b},0.9)`;
          ctx!.lineWidth = 1.2;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size * 3.2, 0, TAU);
          ctx!.stroke();
        }
      }

      const nextId = hovered?.event?.id ?? null;
      if (nextId !== (hoverRef.current?.item.id ?? null)) {
        hoverRef.current = hovered?.event ? { item: hovered.event } : null;
        setHover(hoverRef.current);
      }
      if (hovered && tipRef.current) {
        const flip = hovered.x > w - 260;
        tipRef.current.style.transform = `translate(${Math.round(hovered.x + (flip ? -18 : 18))}px, ${Math.round(hovered.y)}px) translate(${flip ? "-100%" : "0"}, -50%)`;
      }

      raf = requestAnimationFrame(frame);
    }

    const onMove = (e: PointerEvent) => {
      const rect = canvas!.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = mouse.y >= 0 && mouse.y <= h && mouse.x >= 0 && mouse.x <= w;
    };
    const onLeave = () => {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerleave", onLeave);

    resize();
    if (!reduced) raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [events]);

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="w-full h-full block" aria-hidden />
      <div
        ref={tipRef}
        className={`absolute left-0 top-0 z-20 transition-opacity duration-200 ${
          hover ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ willChange: "transform" }}
      >
        {hover && (
          <a
            href={hover.item.url ?? "https://github.com/Solvely-Colin"}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto flex items-start gap-2 max-w-[240px] rounded-md border border-line bg-ground-2 px-3 py-2 shadow-[0_8px_24px_-12px_rgba(16,16,16,0.25)]"
          >
            <span
              className="mt-1.5 w-2 h-2 rounded-full shrink-0"
              style={{
                background: `rgb(${(KIND_RGB[hover.item.kind] ?? [43, 69, 255]).join(",")})`,
              }}
            />
            <span className="min-w-0">
              <span className="eyebrow block !text-[10px]">
                {KIND_LABEL[hover.item.kind] ?? "Event"} · <TimeAgo iso={hover.item.at} />
              </span>
              <span className="block text-[13px] leading-snug text-ink mt-0.5 line-clamp-2">
                {hover.item.text}
              </span>
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-ink-mute mt-0.5" />
          </a>
        )}
      </div>
    </div>
  );
}
