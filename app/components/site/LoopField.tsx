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
  fall: number; // 0 riding the loop; >0 crumbling: seconds fallen
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
          fall: 0,
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
          fall: 0,
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

    let dread = 0; // 0 sane .. 1 gone
    function place(p: Particle) {
      const base = lemniscate(p.t, a);
      const tan = lemniscateTangent(p.t, a);
      const nx = -tan.y;
      const ny = tan.x;
      const wob = Math.sin(time * p.wob + p.phase) * 0.3;
      const o = (p.off + wob) * spread * (1 + dread * dread * 9);
      // Past the middle of the fall, the loop stands up: a second lemniscate
      // turned on its side, and particles drift between the two.
      const blend = Math.max(0, Math.min(1, (dread - 0.45) / 0.4)) * (0.35 + 0.65 * ((p.phase / TAU) % 1));
      let bx = base.x * (1 - blend) + -base.y * 2.6 * blend;
      let by = base.y * (1 - blend) + base.x * 0.55 * blend;
      // R'lyeh: past band 3 the loop stops closing. One arc is displaced,
      // so the figure never meets itself.
      if (dread > 0.55) {
        const gap = ((p.t + time * 0.2) % TAU) / TAU;
        if (gap > 0.62 && gap < 0.8) {
          const k = (dread - 0.55) * 2.2;
          bx += 60 * k;
          by -= 40 * k;
        }
      }
      p.x = cx + bx + nx * o + p.dx;
      p.y = cy + by + ny * o + p.dy;
      // The Colour: lights crumble to grey dust and fall.
      if (p.fall > 0) {
        p.y += p.fall * p.fall * 30;
        p.x += Math.sin(p.fall * 6 + p.phase) * 4;
      }
    }

    function dot(p: Particle, boost = 1) {
      let [r, g, b] = p.rgb;
      if (p.fall > 0) {
        // Grey and brittle.
        const k = Math.min(1, p.fall * 1.4);
        r = Math.round(r + (120 - r) * k);
        g = Math.round(g + (120 - g) * k);
        b = Math.round(b + (116 - b) * k);
        boost *= 1 - p.fall / 1.6;
      }
      if (dread > 0.5) {
        const k = (dread - 0.5) * 2;
        r = Math.round(r + (82 - r) * k);
        g = Math.round(g + (255 - g) * k);
        b = Math.round(b + (154 - b) * k);
      }
      if (p.event && dread > 0.7) boost *= 0.55 + 0.45 * Math.sin(time * 40);
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
      const g = Math.max(0, (dread - 0.5) * 2);
      ctx!.strokeStyle = `rgba(${Math.round(43 + (82 - 43) * g)},${Math.round(69 + (255 - 69) * g)},${Math.round(255 + (154 - 255) * g)},${0.14 + dread * 0.2})`;
      ctx!.lineWidth = 1 + dread * 1.5;
      ctx!.stroke(path);
      if (dread > 0.45) {
        // The standing loop, an eye.
        ctx!.save();
        ctx!.translate(cx, cy);
        ctx!.rotate(Math.PI / 2);
        ctx!.scale(0.55, 2.6);
        ctx!.translate(-cx, -cy);
        ctx!.strokeStyle = `rgba(82,255,154,${(dread - 0.45) * 0.5})`;
        ctx!.lineWidth = 1;
        ctx!.stroke(path);
        ctx!.restore();
      }
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
      dread = 1 - Math.max(0, Math.min(100, window.__wrongness?.sanity ?? 100)) / 100;

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

      const crumble = Math.max(0, (dread - 0.32) * 1.5);
      for (const p of particles) {
        p.t += p.speed * dt;
        if (p.t > TAU) p.t -= TAU;
        if (crumble > 0 && p.fall === 0 && Math.random() < 0.004 * crumble * dt) p.fall = 0.01;
        if (p.fall > 0) {
          p.fall += dt * 0.016;
          if (p.fall > 1.6) p.fall = 0;
        }
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

      const lights: { x: number; y: number }[] = [];
      const rectTop = canvas!.getBoundingClientRect().top;
      for (const p of particles) {
        const isHover = hovered === p;
        if (p.event && p.fall === 0) lights.push({ x: p.x, y: p.y + rectTop });
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

      if (window.__wrongness) window.__wrongness.lights = lights;
      const nextId = hovered?.event?.id ?? null;
      if (nextId !== (hoverRef.current?.item.id ?? null)) {
        if (nextId && window.__wrongness) window.__wrongness.hovers += 1;
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
