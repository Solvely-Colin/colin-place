"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, BookOpen, DoorOpen, Hammer, X } from "lucide-react";
import type { Building, Layout, RoomObject } from "../lib/town/types";
import { SEED_KEEPERS } from "../lib/town/seed";
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
import { COLIN_LOOK, WALL_H, drawBubble, drawChip, drawFigure, drawObject, drawRoomShell, keeperLook, layoutFor, roomBlocked, roomDoor, type Look } from "./engine/room";

const MINE_KEY = "town:mine";
const MINE_EVENT = "town:mine";
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

interface RoomSim {
  placed: Placed;
  layout: Layout;
  look: Look;
  keeper: { x: number; y: number; tx: number; ty: number; wait: number; facing: number; said: number; bubble: string | null; bubbleUntil: number };
}

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
  const [room, setRoom] = useState<Placed | null>(null);
  const [guide, setGuide] = useState(false);
  const [near, setNear] = useState<Placed | null>(null);
  const [nearObj, setNearObj] = useState<RoomObject | null>(null);
  const [hovered, setHovered] = useState<Placed | null>(null);
  const [building, setBuilding] = useState<{ lot: number } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [description, setDescription] = useState("");
  const [help, setHelp] = useState(true);
  const [fade, setFade] = useState(false);

  const placed = useMemo(() => layout([seeds, approved, mine]), [seeds, approved, mine]);

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
    nearObjKey: null as string | null,
    riseAt: new Map<string, number>(),
    construction: null as { lot: number; started: number } | null,
    guideOpen: false,
    room: null as RoomSim | null,
    // Where to stand in the town after leaving a room.
    townPos: { x: 0, y: 0 },
    busy: false,
  });

  useEffect(() => {
    sim.current.placed = placed;
  }, [placed]);
  useEffect(() => {
    sim.current.guideOpen = guide;
  }, [guide]);
  useEffect(() => {
    sim.current.construction = building ? { lot: building.lot, started: performance.now() } : null;
  }, [building]);

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

  // ----------------------------------------------------- enter and leave
  const enterRoom = useCallback((p: Placed) => {
    const st = sim.current;
    if (st.busy || st.room) return;
    st.busy = true;
    setFade(true);
    setTimeout(() => {
      const lay = layoutFor(p.building, SEED_KEEPERS[p.building.slug]);
      const door = roomDoor(lay);
      st.townPos = { x: p.door.x, y: p.door.y };
      st.room = {
        placed: p,
        layout: lay,
        look:
          p.building.slug === "the-loop" || p.building.slug === "clippy-colin"
            ? { ...COLIN_LOOK, shirt: p.building.palette.accent }
            : keeperLook(p.building.id + p.building.name, p.building.palette.accent),
        keeper: { x: 1.5, y: lay.d / 2 + 0.5, tx: 1.5, ty: lay.d / 2 + 0.5, wait: 1, facing: 1, said: 0, bubble: null, bubbleUntil: 0 },
      };
      // Find a free spot for the keeper.
      for (let i = 0; i < 30; i += 1) {
        const kx = 0.5 + Math.floor(Math.random() * lay.w);
        const ky = 0.5 + Math.floor(Math.random() * (lay.d - 1));
        if (!roomBlocked(kx, ky, lay)) {
          st.room.keeper.x = kx;
          st.room.keeper.y = ky;
          st.room.keeper.tx = kx;
          st.room.keeper.ty = ky;
          break;
        }
      }
      // The keeper comes over to say hello.
      const greetX = Math.max(0.5, Math.min(lay.w - 0.5, door.x - 1.5));
      const greetY = Math.max(0.5, lay.d - 1.6);
      if (!roomBlocked(greetX, greetY, lay)) {
        st.room.keeper.tx = greetX;
        st.room.keeper.ty = greetY;
        st.room.keeper.wait = 6;
      }
      st.x = door.x;
      st.y = lay.d - 0.7;
      st.facing = -1;
      st.target = null;
      st.nearId = null;
      setNear(null);
      setRoom(p);
      setHelp(false);
      setFade(false);
      st.busy = false;
    }, 320);
  }, []);

  const exitRoom = useCallback(() => {
    const st = sim.current;
    if (st.busy || !st.room) return;
    st.busy = true;
    setFade(true);
    setGuide(false);
    setTimeout(() => {
      st.room = null;
      st.x = st.townPos.x;
      st.y = st.townPos.y + 0.6;
      st.target = null;
      st.nearObjKey = null;
      setNearObj(null);
      setRoom(null);
      setFade(false);
      st.busy = false;
    }, 320);
  }, []);

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
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const worldToScreen = (p: { x: number; y: number }) => ({ x: (p.x - st.cam.x) * st.zoom + w / 2, y: (p.y - st.cam.y) * st.zoom + h * 0.55 });
    const screenToWorld = (sx: number, sy: number) => ({ x: (sx - w / 2) / st.zoom + st.cam.x, y: (sy - h * 0.55) / st.zoom + st.cam.y });

    const buildingAtScreen = (sx: number, sy: number): Placed | null => {
      const wp = screenToWorld(sx, sy);
      let best: Placed | null = null;
      for (const p of st.placed) {
        const H = heightOf(p.building);
        const inFoot = (q: { x: number; y: number }) => q.x >= p.bx && q.x <= p.bx + p.w && q.y >= p.by && q.y <= p.by + p.d;
        for (let k = 0; k <= 1; k += 0.25) {
          if (inFoot(toGrid(wp.x, wp.y + H * k))) {
            best = p;
            break;
          }
        }
      }
      return best;
    };

    const readKeys = (): { vx: number; vy: number } => {
      let vx = 0;
      let vy = 0;
      if (st.guideOpen) return { vx, vy };
      const k = st.keys;
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
      return { vx, vy };
    };

    // Shared movement: keys beat click targets; sliding along obstacles.
    const move = (dt: number, blocked: (x: number, y: number) => boolean): boolean => {
      let { vx, vy } = readKeys();
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
          if (enter) enterRoom(enter);
          return false;
        }
        vx = dx / dist;
        vy = dy / dist;
      }
      if (vx === 0 && vy === 0) return false;
      const step = WALK_SPEED * dt;
      const nx = st.x + vx * step;
      const ny = st.y + vy * step;
      if (!blocked(nx, ny)) {
        st.x = nx;
        st.y = ny;
      } else if (!blocked(nx, st.y)) st.x = nx;
      else if (!blocked(st.x, ny)) st.y = ny;
      else st.target = null;
      const sx = vx - vy;
      if (Math.abs(sx) > 0.01) st.facing = sx > 0 ? 1 : -1;
      return true;
    };

    // ------------------------------------------------------------ room
    const roomFrame = (now: number, dt: number, t: number, night: number) => {
      const rm = st.room!;
      const lay = rm.layout;
      const moving = move(dt, (x, y) => roomBlocked(x, y, lay));
      if (st.y > lay.d + 0.45) {
        exitRoom();
        return;
      }
      // Camera: fit the whole room.
      const roomW = (lay.w + lay.d) * 32;
      const roomH = (lay.w + lay.d) * 16 + WALL_H + 40;
      st.zoom = Math.max(0.8, Math.min(2.1, Math.min((w - 40) / roomW, (h - 220) / roomH)));
      const centre = toScreen(lay.w / 2, lay.d / 2);
      st.cam = { x: centre.x, y: centre.y - WALL_H * 0.25 };

      // Keeper wanders, stops to talk when you're close.
      const kp = rm.keeper;
      const dToVisitor = Math.hypot(kp.x - st.x, kp.y - st.y);
      if (dToVisitor < 2.1) {
        kp.tx = kp.x;
        kp.ty = kp.y;
        kp.facing = st.x - st.y > kp.x - kp.y ? 1 : -1;
        if (kp.bubbleUntil < now) {
          kp.bubble = kp.said % 2 === 0 ? lay.keeper.greeting : rm.placed.building.interior.question;
          kp.said += 1;
          kp.bubbleUntil = now + 7000;
        }
      } else {
        kp.wait -= dt;
        if (kp.wait <= 0) {
          for (let i = 0; i < 12; i += 1) {
            const kx = 0.5 + Math.floor(Math.random() * lay.w);
            const ky = 0.5 + Math.floor(Math.random() * (lay.d - 1));
            if (!roomBlocked(kx, ky, lay)) {
              kp.tx = kx;
              kp.ty = ky;
              break;
            }
          }
          kp.wait = 2.5 + Math.random() * 4;
        }
        if (kp.bubbleUntil < now - 2000) kp.bubble = null;
      }
      const kdx = kp.tx - kp.x;
      const kdy = kp.ty - kp.y;
      const kd = Math.hypot(kdx, kdy);
      let keeperMoving = false;
      if (kd > 0.05 && dToVisitor >= 2.1) {
        const step = Math.min(kd, 1.1 * dt);
        const nx = kp.x + (kdx / kd) * step;
        const ny = kp.y + (kdy / kd) * step;
        if (!roomBlocked(nx, ny, lay) && Math.hypot(nx - st.x, ny - st.y) > 0.6) {
          kp.x = nx;
          kp.y = ny;
          keeperMoving = true;
          const sx = kdx - kdy;
          if (Math.abs(sx) > 0.01) kp.facing = sx > 0 ? 1 : -1;
        } else {
          kp.tx = kp.x;
          kp.ty = kp.y;
        }
      }

      // Nearest object
      let best: RoomObject | null = null;
      let bd = 1.2;
      for (const o of lay.objects) {
        const d = Math.hypot(o.x + 0.5 - st.x, o.y + 0.5 - st.y);
        if (d < bd) {
          bd = d;
          best = o;
        }
      }
      const key = best ? best.x + "," + best.y : null;
      if (key !== st.nearObjKey) {
        st.nearObjKey = key;
        setNearObj(best);
      }

      // Draw
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = mix2("#dcdad3", "#141420", night);
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h * 0.55);
      ctx.scale(st.zoom, st.zoom);
      ctx.translate(-st.cam.x, -st.cam.y);
      const scene: Scene = { ctx, t, night, fonts };
      drawRoomShell(scene, lay);
      type D = { depth: number; draw: () => void };
      const items: D[] = [];
      for (const o of lay.objects) {
        const isNear = best === o;
        items.push({ depth: o.x + o.y + (o.kind === "rug" ? -0.9 : 1), draw: () => drawObject(scene, o, rm.placed.building.palette.accent, isNear) });
      }
      if (st.target) {
        const tg = st.target;
        items.push({ depth: tg.x + tg.y - 0.01, draw: () => drawTarget(scene, tg.x, tg.y) });
      }
      items.push({ depth: st.x + st.y, draw: () => drawFigure(scene, st.x, st.y, moving, st.facing, COLIN_LOOK) });
      items.push({ depth: kp.x + kp.y, draw: () => drawFigure(scene, kp.x, kp.y, keeperMoving, kp.facing, rm.look) });
      items.sort((a, b) => a.depth - b.depth);
      for (const it of items) it.draw();
      // Keeper name tag and bubble
      if (!(kp.bubble && kp.bubbleUntil > now - 2000)) drawChip(scene, kp.x, kp.y, lay.keeper.name, -54);
      else drawBubble(scene, kp.x, kp.y, kp.bubble);
      // Exit hint at the door
      const door = roomDoor(lay);
      drawChip(scene, door.x, lay.d + 0.15, "↓ out", 14);
      ctx.restore();
    };

    // ------------------------------------------------------------ town
    const townFrame = (now: number, dt: number, t: number, night: number) => {
      st.zoom = w < 640 ? 0.85 : w < 1100 ? 1 : 1.15;
      const moving = move(dt, (x, y) => blockedAt(x, y, st.placed) !== null);
      const limit = (4 + 0.5) * (LOT + 1);
      st.x = Math.max(-limit, Math.min(limit + LOT, st.x));
      st.y = Math.max(-limit, Math.min(limit + LOT, st.y));

      const avatarS = toScreen(st.x, st.y);
      st.cam.x += (avatarS.x - st.cam.x) * Math.min(1, dt * 4);
      st.cam.y += (avatarS.y - 40 - st.cam.y) * Math.min(1, dt * 4);

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
      const hov = st.mouse.inside ? buildingAtScreen(st.mouse.x, st.mouse.y) : null;
      const hovId = hov?.building.id ?? null;
      if (hovId !== st.hoveredId) {
        st.hoveredId = hovId;
        setHovered(hov);
        canvas.style.cursor = hov ? "pointer" : "crosshair";
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawSky(ctx, w, h, hour);
      drawStars(ctx, w, h, night, t);
      ctx.save();
      ctx.translate(w / 2, h * 0.55);
      ctx.scale(st.zoom, st.zoom);
      ctx.translate(-st.cam.x, -st.cam.y);
      const scene: Scene = { ctx, t, night, fonts };
      const corners = [screenToWorld(0, 0), screenToWorld(w, 0), screenToWorld(0, h), screenToWorld(w, h)].map((c) => toGrid(c.x, c.y));
      const minX = Math.floor(Math.min(...corners.map((c) => c.x))) - 2;
      const maxX = Math.ceil(Math.max(...corners.map((c) => c.x))) + 2;
      const minY = Math.floor(Math.min(...corners.map((c) => c.y))) - 2;
      const maxY = Math.ceil(Math.max(...corners.map((c) => c.y))) + 6;
      const bound = 4 * (LOT + 1) + LOT + 2;
      drawGround(scene, Math.max(minX, -bound), Math.min(maxX, bound), Math.max(minY, -bound), Math.min(maxY, bound));

      const used = new Set(st.placed.map((p) => p.lotIndex));
      const nextLot = nextEmptyLot(st.placed);
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
            const tx = o.tx + 0.6 + (((i * 31 + k * 17) % 100) / 100) * (LOT - 1.2);
            const ty = o.ty + 0.6 + (((i * 53 + k * 29) % 100) / 100) * (LOT - 1.2);
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
      if (st.room) roomFrame(now, dt, t, night);
      else townFrame(now, dt, t, night);
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
      if (e.code === "Enter" && !st.room && st.nearId && !st.guideOpen) {
        const p = st.placed.find((q) => q.building.id === st.nearId);
        if (p) enterRoom(p);
      }
      if (e.code === "Escape") {
        if (st.guideOpen) setGuide(false);
        else if (st.room) exitRoom();
      }
      if (e.key === "/" && !e.metaKey) {
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
      if (st.guideOpen) return;
      const r = canvas.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      setHelp(false);
      if (st.room) {
        const lay = st.room.layout;
        const wp = screenToWorld(sx, sy);
        const g = toGrid(wp.x, wp.y);
        // Clicking an object walks to its front.
        for (const o of lay.objects) {
          if (g.x >= o.x && g.x < o.x + 1 && g.y >= o.y - 1.2 && g.y < o.y + 1) {
            st.target = { x: o.x + 0.5, y: Math.min(lay.d + 0.3, o.y + 1.3) };
            return;
          }
        }
        if (!roomBlocked(g.x, g.y, lay)) st.target = { x: g.x, y: g.y };
        else if (g.y > lay.d) st.target = { x: roomDoor(lay).x, y: lay.d + 0.6 };
        return;
      }
      const hit = buildingAtScreen(sx, sy);
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
  }, [enterRoom, exitRoom]);

  // --------------------------------------------------------------- build
  const build = useCallback(
    async (text: string) => {
      const desc = text.trim();
      if (desc.length < 3 || building) return;
      const st = sim.current;
      if (st.room) exitRoom();
      const lot = nextEmptyLot(st.placed);
      if (lot < 0) {
        setToast({ text: "The town is out of lots. Colin needs to zone a new ring.", kind: "warn" });
        return;
      }
      setBuilding({ lot });
      setGuide(false);
      setHelp(false);
      const c = lotCentre(lot);
      setTimeout(() => {
        sim.current.target = { x: c.x, y: c.y + LOT / 2 + 1 };
      }, 400);
      try {
        const res = await fetch("/api/town/build", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: desc }),
        });
        const data = (await res.json()) as { building?: Building; stored?: boolean; ms?: number; error?: string; reason?: string };
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
            text: `Built by ${b.model ?? modelName} in ${secs}s. Walking you in.` + (data.stored ? " Saved for Colin to approve." : ""),
            kind: "info",
          });
        } else {
          setToast({ text: "Laid out from a blueprint: the architect could not be reached, so the shape came from your words alone.", kind: "warn" });
        }
        setTimeout(() => {
          const p = sim.current.placed.find((q) => q.building.id === b.id);
          if (p) sim.current.target = { x: p.door.x, y: p.door.y, enter: p };
        }, 700);
      } catch {
        setToast({ text: "Lost the architect mid-sentence. Try again.", kind: "warn" });
        setBuilding(null);
      }
    },
    [building, modelName, exitRoom]
  );

  const count = placed.length;
  const inner = room?.building;
  const roomLayout = room ? layoutFor(room.building, SEED_KEEPERS[room.building.slug]) : null;

  return (
    <div className="relative w-full h-[100svh] overflow-hidden bg-[#0b0d10] select-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block touch-none" />

      {/* Fade between outside and inside */}
      <div className={`absolute inset-0 bg-[#101010] pointer-events-none transition-opacity duration-300 ${fade ? "opacity-100" : "opacity-0"}`} />

      {/* HUD: top-left */}
      <div className={`absolute top-4 left-4 sm:top-5 sm:left-6 flex flex-col gap-1 rounded-lg border border-line bg-ground-2/95 px-4 py-3 pointer-events-none ${room ? "max-w-[calc(100%-14rem)] sm:max-w-[calc(100%-20rem)]" : "max-w-[calc(100%-2rem)]"}`}>
        {room && inner ? (
          <>
            <button onClick={exitRoom} className="pointer-events-auto inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-mute hover:text-ink transition text-left">
              <ArrowLeft className="w-3 h-3" /> back to the town
            </button>
            <h1 className="font-medium tracking-tight text-xl text-ink leading-none">{inner.name}</h1>
            <p className="font-mono text-[11px] text-ink-mute">
              {inner.tagline} · kept by {roomLayout?.keeper.name}
            </p>
          </>
        ) : (
          <>
            <Link href="/" className="pointer-events-auto inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-mute hover:text-ink transition">
              <ArrowLeft className="w-3 h-3" /> colin.place
            </Link>
            <h1 className="font-medium tracking-tight text-xl text-ink leading-none">The Town</h1>
            <p className="font-mono text-[11px] text-ink-mute">
              {count} buildings · {LOTS.length - count} empty lots · {modelReady ? `architect: ${modelName}` : "architect: blueprint mode"}
            </p>
          </>
        )}
      </div>

      {/* Room actions */}
      {room && inner && (
        <div className="absolute top-4 right-4 sm:top-5 sm:right-6 flex gap-2">
          <button
            onClick={() => setGuide(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-line bg-ground-2/95 text-[13px] font-medium text-ink hover:border-line-strong transition"
          >
            <BookOpen className="w-3.5 h-3.5" /> Guidebook
          </button>
          <button
            onClick={exitRoom}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-ink text-ground text-[13px] font-medium hover:bg-ink-dim transition"
          >
            <DoorOpen className="w-3.5 h-3.5" /> Leave
          </button>
        </div>
      )}

      {/* Hint */}
      <AnimatePresence>
        {help && !room && (
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

      {/* Near-door prompt (town) */}
      <AnimatePresence>
        {near && !room && !building && (
          <motion.button
            key={near.building.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={() => enterRoom(near)}
            className="absolute left-1/2 -translate-x-1/2 bottom-28 sm:bottom-32 flex items-center gap-2 h-10 px-4 rounded-md bg-ink text-ground text-sm font-medium"
          >
            Enter {near.building.name}
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-ground/20">↵</kbd>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Object caption (room) */}
      <AnimatePresence>
        {room && nearObj && (
          <motion.div
            key={nearObj.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-28 sm:bottom-32 w-[min(560px,calc(100%-2rem))] rounded-lg border border-line bg-ground-2/95 px-4 py-3"
          >
            <p className="eyebrow">{nearObj.label}</p>
            <p className="text-[14px] text-ink mt-1 leading-relaxed">{nearObj.note}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover chip (town) */}
      {hovered && !room && (
        <div className="absolute bottom-24 left-4 sm:left-6 rounded-md border border-line bg-ground-2/95 px-3 py-1.5 font-mono text-[11px] text-ink-mute pointer-events-none">
          {hovered.building.tagline}
          {hovered.building.source !== "colin" && <span className="text-ink-mute"> · built by a visitor{hovered.building.status === "pending" ? ", awaiting Colin" : ""}</span>}
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
            placeholder={building ? "the architect is drawing…" : room ? "describe a building next door" : "describe a building: a library where the books argue back"}
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
          {room ? "walk up to things · walk out the front door to leave" : `press / to type · ${storeConfigured ? "visitor builds wait for Colin's approval" : "visitor builds live in your browser"}`}
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

      {/* Guidebook */}
      <AnimatePresence>
        {guide && inner && (
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
              <button onClick={() => setGuide(false)} className="ml-auto p-1.5 rounded-lg hover:bg-ink/10 text-ink-dim" aria-label="Close guidebook">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-6 sm:px-7 sm:py-8">
              <p className="eyebrow mb-3">
                {inner.kind} · {inner.floors} {inner.floors === 1 ? "floor" : "floors"}
              </p>
              <h2 className="display text-3xl sm:text-4xl text-ink">{inner.name}</h2>
              <p className="text-lg text-ink-mute mt-2">{inner.tagline}</p>
              <p className="font-medium text-lg text-ink mt-8 leading-snug tracking-tight">{inner.interior.headline}</p>
              <div className="mt-4 space-y-4 text-ink-dim leading-relaxed">
                {inner.interior.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <div className="mt-8 p-4 rounded-lg border border-line bg-ground">
                <p className="eyebrow !text-loop mb-2">This place asks you</p>
                <p className="font-medium text-xl text-ink leading-snug tracking-tight">{inner.interior.question}</p>
              </div>
              {inner.links && inner.links.length > 0 && (
                <div className="mt-6 grid gap-2">
                  {inner.links.map((l) => (
                    <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3.5 rounded-md border border-line hover:border-line-strong text-sm text-ink transition">
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
                  setGuide(false);
                  exitRoom();
                  setTimeout(() => inputRef.current?.focus(), 450);
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

function mix2(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const l = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${l(r1, r2)},${l(g1, g2)},${l(b1, b2)})`;
}
