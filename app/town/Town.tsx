"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Hammer, X } from "lucide-react";
import type { Building } from "../lib/town/types";
import { toGrid, toScreen, rgba } from "./engine/iso";
import { LOT, LOTS, blockedAt, layout, lotCentre, lotOrigin, nextEmptyLot, type Placed } from "./engine/world";
import {
  dayCurve,
  drawAvatar,
  drawBuilding,
  drawConstruction,
  drawEmptyLot,
  drawGround,
  drawLights,
  drawSky,
  drawStars,
  drawTarget,
  drawTree,
  heightOf,
  type Scene,
} from "./engine/draw";

const MINE_KEY = "town:mine";
const TZ = "America/Indiana/Indianapolis";
const WALK_SPEED = 3.2; // tiles per second

interface TownProps {
  seeds: Building[];
  approved: Building[];
  storeConfigured: boolean;
  modelName: string;
  modelReady: boolean;
}

interface Toast {
  text: string;
  kind: "info" | "warn";
}

// The visitor's own buildings live in localStorage, read through an external
// store so the server render (no buildings) and the client agree.
const MINE_EVENT = "town:mine";

function readMineRaw(): string {
  try {
    return localStorage.getItem(MINE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function parseMine(raw: string): Building[] {
  try {
    const arr = JSON.parse(raw) as Building[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function subscribeMine(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(MINE_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(MINE_EVENT, cb);
  };
}

function saveMine(list: Building[]) {
  try {
    localStorage.setItem(MINE_KEY, JSON.stringify(list.slice(-40)));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(MINE_EVENT));
}

function indianaHour(): number {
  // ?hour=22 previews the town at another time of day.
  try {
    const q = new URLSearchParams(window.location.search).get("hour");
    if (q !== null && q !== "" && !Number.isNaN(Number(q))) return ((Number(q) % 24) + 24) % 24;
  } catch {
    // ignore
  }
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 12) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h + m / 60;
}

export function Town({ seeds, approved, storeConfigured, modelName, modelReady }: TownProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mineRaw = useSyncExternalStore(subscribeMine, readMineRaw, () => "[]");
  const mine = useMemo(() => parseMine(mineRaw), [mineRaw]);
  const [inside, setInside] = useState<Placed | null>(null);
  const [near, setNear] = useState<Placed | null>(null);
  const [hovered, setHovered] = useState<Placed | null>(null);
  const [building, setBuilding] = useState<{ lot: number } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [description, setDescription] = useState("");
  const [help, setHelp] = useState(true);

  const placed = useMemo(() => layout([seeds, approved, mine]), [seeds, approved, mine]);

  // Mutable simulation state lives in refs; React only sees the parts the UI needs.
  const sim = useRef({
    x: 0,
    y: 0,
    facing: 1,
    target: null as { x: number; y: number; enter?: Placed } | null,
    keys: new Set<string>(),
    cam: { x: 0, y: 0 },
    zoom: 1,
    mouse: { x: 0, y: 0, inside: false },
    placed: [] as Placed[],
    hoveredId: null as string | null,
    nearId: null as string | null,
    riseAt: new Map<string, number>(),
    construction: null as { lot: number; started: number } | null,
    insideOpen: false,
  });

  useEffect(() => {
    sim.current.placed = placed;
  }, [placed]);
  useEffect(() => {
    sim.current.insideOpen = inside !== null;
  }, [inside]);
  useEffect(() => {
    sim.current.construction = building ? { lot: building.lot, started: performance.now() } : null;
  }, [building]);

  // Start the visitor on the road in front of the centre lot.
  useEffect(() => {
    const o = lotOrigin(LOTS[0]);
    sim.current.x = o.tx + LOT / 2;
    sim.current.y = o.ty + LOT + 0.8;
    const c = toScreen(sim.current.x, sim.current.y);
    sim.current.cam = { x: c.x, y: c.y };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(t);
  }, [toast]);

  // ------------------------------------------------------------ main loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const st = sim.current;
    const css = getComputedStyle(document.documentElement);
    const fonts = {
      display: css.getPropertyValue("--font-display").trim() || "sans-serif",
      mono: css.getPropertyValue("--font-mono").trim() || "monospace",
    };
    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let last = performance.now();
    const t0 = performance.now();
    let hour = indianaHour();
    let hourTick = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      st.zoom = w < 640 ? 0.85 : w < 1100 ? 1 : 1.15;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const worldToScreen = (p: { x: number; y: number }) => ({
      x: (p.x - st.cam.x) * st.zoom + w / 2,
      y: (p.y - st.cam.y) * st.zoom + h * 0.55,
    });
    const screenToWorld = (sx: number, sy: number) => ({
      x: (sx - w / 2) / st.zoom + st.cam.x,
      y: (sy - h * 0.55) / st.zoom + st.cam.y,
    });

    const buildingAtScreen = (sx: number, sy: number): Placed | null => {
      // Hit-test the drawn box: check top face and both visible faces.
      const wp = screenToWorld(sx, sy);
      let best: Placed | null = null;
      for (const p of st.placed) {
        const H = heightOf(p.building);
        const g = toGrid(wp.x, wp.y);
        const gTop = toGrid(wp.x, wp.y + H);
        const inFoot = (q: { x: number; y: number }) => q.x >= p.bx && q.x <= p.bx + p.w && q.y >= p.by && q.y <= p.by + p.d;
        if (inFoot(g) || inFoot(gTop)) best = p;
        else {
          // Faces: any point whose ground projection lands on the footprint after
          // shifting up by 0..H.
          for (let k = 0.25; k < 1; k += 0.25) {
            if (inFoot(toGrid(wp.x, wp.y + H * k))) {
              best = p;
              break;
            }
          }
        }
      }
      return best;
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - t0) / 1000;
      hourTick += dt;
      if (hourTick > 30) {
        hour = indianaHour();
        hourTick = 0;
      }
      const night = 1 - dayCurve(hour);

      // --- movement
      let vx = 0;
      let vy = 0;
      if (!st.insideOpen) {
        const k = st.keys;
        // Screen-relative: up = -x -y (north on screen), right = +x -y.
        if (k.has("ArrowUp") || k.has("KeyW")) {
          vx -= 1;
          vy -= 1;
        }
        if (k.has("ArrowDown") || k.has("KeyS")) {
          vx += 1;
          vy += 1;
        }
        if (k.has("ArrowRight") || k.has("KeyD")) {
          vx += 1;
          vy -= 1;
        }
        if (k.has("ArrowLeft") || k.has("KeyA")) {
          vx -= 1;
          vy += 1;
        }
      }
      let moving = false;
      if (vx !== 0 || vy !== 0) {
        st.target = null;
        const len = Math.hypot(vx, vy);
        vx /= len;
        vy /= len;
      } else if (st.target) {
        const dx = st.target.x - st.x;
        const dy = st.target.y - st.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.08) {
          const enter = st.target.enter;
          st.target = null;
          if (enter) setInside(enter);
        } else {
          vx = dx / dist;
          vy = dy / dist;
        }
      }
      if (vx !== 0 || vy !== 0) {
        moving = true;
        const step = WALK_SPEED * dt;
        const nx = st.x + vx * step;
        const ny = st.y + vy * step;
        if (!blockedAt(nx, ny, st.placed)) {
          st.x = nx;
          st.y = ny;
        } else if (!blockedAt(nx, st.y, st.placed)) {
          st.x = nx;
        } else if (!blockedAt(st.x, ny, st.placed)) {
          st.y = ny;
        } else {
          st.target = null;
        }
        const sx = vx - vy;
        if (Math.abs(sx) > 0.01) st.facing = sx > 0 ? 1 : -1;
      }
      const limit = (4 + 0.5) * (LOT + 1);
      st.x = Math.max(-limit, Math.min(limit + LOT, st.x));
      st.y = Math.max(-limit, Math.min(limit + LOT, st.y));

      // --- camera
      const avatarS = toScreen(st.x, st.y);
      st.cam.x += (avatarS.x - st.cam.x) * Math.min(1, dt * 4);
      st.cam.y += (avatarS.y - 40 - st.cam.y) * Math.min(1, dt * 4);

      // --- proximity
      let nearest: Placed | null = null;
      let nd = 1.25;
      for (const p of st.placed) {
        const d = Math.hypot(p.door.x - st.x, p.door.y - st.y);
        if (d < nd) {
          nd = d;
          nearest = p;
        }
      }
      const nearId = nearest?.building.id ?? null;
      if (nearId !== st.nearId) {
        st.nearId = nearId;
        setNear(nearest);
      }

      // --- hover
      const hov = st.mouse.inside ? buildingAtScreen(st.mouse.x, st.mouse.y) : null;
      const hovId = hov?.building.id ?? null;
      if (hovId !== st.hoveredId) {
        st.hoveredId = hovId;
        setHovered(hov);
        canvas.style.cursor = hov ? "pointer" : "crosshair";
      }

      // --- draw
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawSky(ctx, w, h, hour);
      drawStars(ctx, w, h, night, t);

      ctx.save();
      ctx.translate(w / 2, h * 0.55);
      ctx.scale(st.zoom, st.zoom);
      ctx.translate(-st.cam.x, -st.cam.y);
      const scene: Scene = { ctx, t, night, fonts };

      // Visible tile range from the screen corners.
      const corners = [screenToWorld(0, 0), screenToWorld(w, 0), screenToWorld(0, h), screenToWorld(w, h)].map((c) => toGrid(c.x, c.y));
      const minX = Math.floor(Math.min(...corners.map((c) => c.x))) - 2;
      const maxX = Math.ceil(Math.max(...corners.map((c) => c.x))) + 2;
      const minY = Math.floor(Math.min(...corners.map((c) => c.y))) - 2;
      const maxY = Math.ceil(Math.max(...corners.map((c) => c.y))) + 6;
      const bound = 4 * (LOT + 1) + LOT + 2;
      drawGround(scene, Math.max(minX, -bound), Math.min(maxX, bound), Math.max(minY, -bound), Math.min(maxY, bound));

      const used = new Set(st.placed.map((p) => p.lotIndex));
      const nextLot = nextEmptyLot(st.placed);
      // Depth-sorted drawables.
      type D = { depth: number; draw: () => void; light?: () => void };
      const items: D[] = [];
      for (let i = 0; i < LOTS.length; i += 1) {
        if (used.has(i)) continue;
        const o = lotOrigin(LOTS[i]);
        if (o.tx > maxX || o.tx + LOT < minX || o.ty > maxY || o.ty + LOT < minY) continue;
        const isConstruction = st.construction?.lot === i;
        items.push({ depth: o.tx + o.ty - 0.5, draw: () => (isConstruction ? undefined : drawEmptyLot(scene, i, i === nextLot && !st.construction)) });
        if (isConstruction) {
          const started = st.construction!.started;
          items.push({ depth: o.tx + o.ty + LOT, draw: () => drawConstruction(scene, i, (now - started) / 4000) });
        } else {
          const n = 1 + Math.floor((i * 7919) % 3);
          for (let k = 0; k < n; k += 1) {
            const tx = o.tx + 0.6 + ((i * 31 + k * 17) % 100) / 100 * (LOT - 1.2);
            const ty = o.ty + 0.6 + ((i * 53 + k * 29) % 100) / 100 * (LOT - 1.2);
            items.push({ depth: tx + ty, draw: () => drawTree(scene, tx, ty, i * 10 + k) });
          }
        }
      }
      for (const p of st.placed) {
        if (p.bx > maxX || p.bx + p.w < minX || p.by > maxY || p.by + p.d < minY) continue;
        const riseStart = st.riseAt.get(p.building.id);
        const rise = riseStart === undefined ? 1 : Math.min(1, (now - riseStart) / 900);
        const eased = 1 - Math.pow(1 - rise, 3);
        items.push({
          depth: p.bx + p.w + p.by + p.d,
          draw: () => drawBuilding(scene, p, { hover: p.building.id === st.hoveredId, rise: eased }),
          light: () => drawLights(scene, p),
        });
        // A yard tree at the front-left corner if there is room.
        const o = lotOrigin(LOTS[p.lotIndex]);
        const tx = o.tx + 0.5;
        const ty = o.ty + LOT - 0.5;
        if (!blockedAt(tx, ty, [p], 0.4)) items.push({ depth: tx + ty, draw: () => drawTree(scene, tx, ty, p.lotIndex * 3 + 99) });
      }
      if (st.target) {
        const tg = st.target;
        items.push({ depth: tg.x + tg.y - 0.01, draw: () => drawTarget(scene, tg.x, tg.y) });
      }
      items.push({ depth: st.x + st.y, draw: () => drawAvatar(scene, st.x, st.y, moving, st.facing) });
      items.sort((a, b) => a.depth - b.depth);
      for (const it of items) it.draw();

      // Night tint, then lights.
      if (night > 0.02) {
        ctx.restore();
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = rgba("#2a2f5e", night * 0.55);
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = "source-over";
        ctx.restore();
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.translate(w / 2, h * 0.55);
        ctx.scale(st.zoom, st.zoom);
        ctx.translate(-st.cam.x, -st.cam.y);
        for (const it of items) it.light?.();
      }
      ctx.restore();

      // Hover label in screen space.
      if (hov) {
        const c = worldToScreen(toScreen(hov.bx + hov.w / 2, hov.by + hov.d / 2));
        const yTop = c.y - heightOf(hov.building) * st.zoom - 26;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.font = `600 12px ${fonts.display}`;
        ctx.textAlign = "center";
        const label = hov.building.name;
        const tw = ctx.measureText(label).width + 16;
        ctx.fillStyle = "#101010";
        ctx.beginPath();
        ctx.roundRect(c.x - tw / 2, yTop - 12, tw, 20, 4);
        ctx.fill();
        ctx.fillStyle = "#f6f6f3";
        ctx.fillText(label, c.x, yTop + 2);
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement === inputRef.current) return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
        st.keys.add(e.code);
        e.preventDefault();
        setHelp(false);
      }
      if (e.code === "Enter" && st.nearId && !st.insideOpen) {
        const p = st.placed.find((q) => q.building.id === st.nearId);
        if (p) setInside(p);
      }
      if (e.code === "Escape") setInside(null);
      if (e.code === "Slash" || (e.key === "/" && !e.metaKey)) {
        inputRef.current?.focus();
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => st.keys.delete(e.code);
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      st.mouse = { x: e.clientX - r.left, y: e.clientY - r.top, inside: true };
    };
    const onLeave = () => {
      st.mouse.inside = false;
    };
    const onClick = (e: PointerEvent) => {
      if (st.insideOpen) return;
      const r = canvas.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      const hit = buildingAtScreen(sx, sy);
      setHelp(false);
      if (hit) {
        st.target = { x: hit.door.x, y: hit.door.y, enter: hit };
        return;
      }
      const wp = screenToWorld(sx, sy);
      const g = toGrid(wp.x, wp.y);
      if (!blockedAt(g.x, g.y, st.placed)) st.target = { x: g.x, y: g.y };
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerup", onClick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerup", onClick);
    };
  }, []);

  // --------------------------------------------------------------- build
  const build = useCallback(
    async (text: string) => {
      const desc = text.trim();
      if (desc.length < 3 || building) return;
      const st = sim.current;
      const lot = nextEmptyLot(st.placed);
      if (lot < 0) {
        setToast({ text: "The town is out of lots. Colin needs to zone a new ring.", kind: "warn" });
        return;
      }
      setBuilding({ lot });
      setInside(null);
      setHelp(false);
      // Walk toward the lot while the architect works.
      const c = lotCentre(lot);
      st.target = { x: c.x, y: c.y + LOT / 2 + 1 };
      try {
        const res = await fetch("/api/town/build", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: desc }),
        });
        const data = (await res.json()) as { building?: Building; stored?: boolean; ms?: number; error?: string };
        if (!res.ok || !data.building) {
          setToast({ text: data.error ?? "The architect walked off the job. Try again.", kind: "warn" });
          setBuilding(null);
          return;
        }
        const b = { ...data.building, lot };
        st.riseAt.set(b.id, performance.now());
        saveMine([...parseMine(readMineRaw()).filter((m) => m.id !== b.id), b]);
        setDescription("");
        setBuilding(null);
        const secs = ((data.ms ?? 0) / 1000).toFixed(1);
        if (b.source === "model") {
          setToast({
            text: `Built by ${b.model ?? modelName} in ${secs}s.` + (data.stored ? " Saved for Colin to approve; until then it lives in your browser." : " It lives in your browser."),
            kind: "info",
          });
        } else {
          setToast({ text: "Laid out from a blueprint: the town has no model key yet, so the architect drew what it could from your words.", kind: "warn" });
        }
        // Walk in once it has risen.
        setTimeout(() => {
          const p = sim.current.placed.find((q) => q.building.id === b.id);
          if (p) sim.current.target = { x: p.door.x, y: p.door.y, enter: p };
        }, 600);
      } catch {
        setToast({ text: "Lost the architect mid-sentence. Try again.", kind: "warn" });
        setBuilding(null);
      }
    },
    [building, modelName]
  );

  const count = placed.length;
  const inner = inside?.building;

  return (
    <div className="relative w-full h-[100svh] overflow-hidden bg-[#0b0d10] select-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block touch-none" />

      {/* HUD: top-left */}
      <div className="absolute top-4 left-4 sm:top-5 sm:left-6 flex flex-col gap-1 rounded-lg border border-line bg-ground-2/95 px-4 py-3 pointer-events-none">
        <Link href="/" className="pointer-events-auto inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-mute hover:text-ink transition">
          <ArrowLeft className="w-3 h-3" /> colin.place
        </Link>
        <h1 className="font-medium tracking-tight text-xl text-ink leading-none">The Town</h1>
        <p className="font-mono text-[11px] text-ink-mute">
          {count} buildings · {LOTS.length - count} empty lots · {modelReady ? `architect: ${modelName}` : "architect: blueprint mode"}
        </p>
      </div>

      {/* HUD: hint */}
      <AnimatePresence>
        {help && !inside && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute top-24 right-4 sm:top-5 sm:right-6 max-w-[260px] rounded-lg border border-line bg-ground-2/95 px-3.5 py-3 font-mono text-[11px] leading-relaxed text-ink-mute pointer-events-none"
          >
            <span className="text-ink">Walk</span> with arrows or WASD, or click where to go. <span className="text-ink">Click a building</span> to walk in.{" "}
            <span className="text-ink">Type</span> below to build one.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Near-door prompt */}
      <AnimatePresence>
        {near && !inside && !building && (
          <motion.button
            key={near.building.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={() => setInside(near)}
            className="absolute left-1/2 -translate-x-1/2 bottom-28 sm:bottom-32 flex items-center gap-2 h-10 px-4 rounded-md bg-ink text-ground text-sm font-medium"
          >
            Enter {near.building.name}
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-ground/20">↵</kbd>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Hover chip for the hovered building's tagline */}
      {hovered && !inside && (
        <div className="absolute bottom-24 left-4 sm:left-6 rounded-md border border-line bg-ground-2/95 px-3 py-1.5 font-mono text-[11px] text-ink-mute pointer-events-none">
          {hovered.building.tagline}
          {hovered.building.source !== "colin" && (
            <span className="text-ink-mute"> · built by a visitor{hovered.building.status === "pending" ? ", awaiting Colin" : ""}</span>
          )}
        </div>
      )}

      {/* Build bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          build(description);
        }}
        className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-[min(720px,calc(100%-2rem))]"
      >
        <div className="flex items-center gap-2 rounded-lg border border-line bg-ground-2 p-1.5 shadow-[0_24px_60px_-24px_rgba(16,16,16,0.35)]">
          <span className="hidden sm:inline eyebrow pl-3">build</span>
          <input
            ref={inputRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={280}
            disabled={!!building}
            placeholder={building ? "the architect is drawing…" : "describe a building: a library where the books argue back"}
            className="flex-1 min-w-0 bg-transparent px-2 py-2.5 text-[15px] text-ink placeholder:text-ink-mute focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!!building || description.trim().length < 3}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-ink text-ground text-sm font-medium hover:bg-ink-dim disabled:opacity-40 transition"
          >
            <Hammer className="w-4 h-4" />
            <span className="hidden sm:inline">Build it</span>
          </button>
        </div>
        <p className="mt-2 text-center font-mono text-[10px] text-ink-mute">
          press / to type · {storeConfigured ? "visitor builds wait for Colin's approval" : "visitor builds live in your browser"}
        </p>
      </form>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`absolute bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 max-w-[520px] w-[calc(100%-2rem)] rounded-lg border bg-ground-2 px-4 py-3 text-[13px] leading-relaxed text-ink ${
              toast.kind === "warn" ? "border-butter" : "border-mint"
            }`}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interior */}
      <AnimatePresence>
        {inside && inner && (
          <motion.aside
            key={inner.id}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="absolute inset-y-0 right-0 w-full sm:w-[480px] bg-ground-2 border-l border-line overflow-y-auto"
          >
            <div className="sticky top-0 flex items-center gap-3 px-5 py-4 bg-ground-2 border-b border-line">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: inner.palette.accent }} />
              <span className="font-mono text-[11px] text-ink-mute">
                {inner.source === "colin" ? "one of Colin's" : inner.source === "model" ? `built by a visitor · ${inner.model ?? "model"}` : "blueprint"}
              </span>
              <button onClick={() => setInside(null)} className="ml-auto p-1.5 rounded-lg hover:bg-ink/10 text-ink-dim" aria-label="Leave">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-6 sm:px-7 sm:py-8">
              <p className="eyebrow mb-3">{inner.kind} · {inner.floors} {inner.floors === 1 ? "floor" : "floors"}</p>
              <h2 className="display text-3xl sm:text-4xl text-ink">{inner.name}</h2>
              <p className="text-lg text-ink-mute mt-2">{inner.tagline}</p>

              <p className="font-medium text-lg text-ink mt-8 leading-snug tracking-tight">{inner.interior.headline}</p>
              <div className="mt-4 space-y-4 text-ink-dim leading-relaxed">
                {inner.interior.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              {inner.interior.rooms.length > 0 && (
                <div className="mt-8">
                  <p className="eyebrow mb-3">Rooms</p>
                  <ul className="divide-y divide-line border-y border-line">
                    {inner.interior.rooms.map((r) => (
                      <li key={r.name} className="py-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-3">
                        <span className="text-ink font-medium text-sm">{r.name}</span>
                        <span className="text-ink-dim text-sm">{r.note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-8 p-4 rounded-lg border border-line bg-ground">
                <p className="eyebrow !text-loop mb-2">This place asks you</p>
                <p className="font-medium text-xl text-ink leading-snug tracking-tight">{inner.interior.question}</p>
              </div>

              {inner.links && inner.links.length > 0 && (
                <div className="mt-6 grid gap-2">
                  {inner.links.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3.5 rounded-md border border-line hover:border-line-strong text-sm text-ink transition"
                    >
                      {l.label} <ArrowUpRight className="w-4 h-4 text-ink-mute" />
                    </a>
                  ))}
                </div>
              )}

              <p className="mt-8 font-mono text-[11px] text-ink-mute leading-relaxed">
                Made from: &ldquo;{inner.description}&rdquo;
                {inner.status === "pending" && " · awaiting Colin's approval before the whole town sees it"}
              </p>

              <button
                onClick={() => {
                  setInside(null);
                  setTimeout(() => inputRef.current?.focus(), 350);
                }}
                className="mt-6 inline-flex items-center gap-2 h-10 px-4 rounded-md bg-ink text-ground text-sm font-medium hover:bg-ink-dim transition"
              >
                <Hammer className="w-4 h-4" /> Build next door
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
