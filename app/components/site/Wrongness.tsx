"use client";

import { useEffect, useRef, useState } from "react";

// The site goes wrong the longer you stay. Sanity starts at 100 and falls;
// each band it crosses asks the model for that band's wrongness and applies
// it: rewrites of on-page copy, notes in the margin, a line for the watcher,
// the tab title. CSS handles the palette and the tilt via html[data-band].
// The abyss canvas draws tendrils and eyes at the deep end. At zero, the
// page speaks once and offers the door.

declare global {
  interface Window {
    __wrongness?: { sanity: number; band: number; hovers: number };
  }
}

interface Effect {
  kind: string;
  intensity: number;
  speed: number;
  color?: string;
}
interface Scene {
  palette: { ground: string; ink: string; accent: string };
  effects: Effect[];
  motion: { breathe: number; tilt: number; spacing: number; hue: number; scale: number };
}
interface WhisperPayload {
  whisper: { marginalia: string[]; rewrites: Record<string, string>; title: string; watcher: string; last?: string; scene?: Scene };
  source: string;
}

function hexRgb(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

interface Note {
  id: number;
  text: string;
  top: number;
  side: "left" | "right";
}

const GLYPHS = "ʼ'’ghlnfhtagwyrqxʻ·";
const OFF_KEY = "wrongness:off";
const VISITS_KEY = "wrongness:visits";
const DOORS_KEY = "wrongness:doors";

function bandOf(sanity: number): number {
  if (sanity > 80) return 0;
  if (sanity > 60) return 1;
  if (sanity > 40) return 2;
  if (sanity > 20) return 3;
  return 4;
}

function scramble(el: HTMLElement, target: string, duration = 900): Promise<void> {
  return new Promise((resolve) => {
    el.classList.add("mutating");
    const start = performance.now();
    const frame = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const cut = Math.floor(p * target.length);
      let out = "";
      for (let i = 0; i < target.length; i += 1) {
        const ch = target[i];
        out += i < cut || ch === " " ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(frame);
      else {
        el.textContent = target;
        el.classList.remove("mutating");
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });
}

export function Wrongness({ ready }: { ready: boolean }) {
  const [band, setBand] = useState(0);
  const [sanity, setSanity] = useState(100);
  const [notes, setNotes] = useState<Note[]>([]);
  const [watcher, setWatcher] = useState<string | null>(null);
  const [watcherShown, setWatcherShown] = useState(false);
  const [final, setFinal] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [hold, setHold] = useState(0);
  const [facing, setFacing] = useState<1 | -1>(1);
  const [off, setOff] = useState(false);
  const [explain, setExplain] = useState(false);
  const abyssRef = useRef<HTMLCanvasElement>(null);
  const holdTimer = useRef<number | null>(null);

  const engine = useRef({
    sanity: 100,
    band: 0,
    originals: new Map<string, string>(),
    applied: new Map<string, string>(),
    whispers: new Map<number, WhisperPayload["whisper"]>(),
    fetching: new Set<number>(),
    noteQueue: [] as string[],
    noteId: 0,
    maxScroll: 0,
    milestones: new Set<number>(),
    hovers: 0,
    lastMove: 0,
    started: 0,
    visits: 1,
    doorsClosed: 0,
    stopped: false,
    lastNoteAt: 0,
    lastGlitchAt: 0,
    scene: null as Scene | null,
  });

  // ---------------------------------------------------------------- reset
  const restore = () => {
    const e = engine.current;
    for (const [key, text] of e.originals) {
      document.querySelectorAll<HTMLElement>(`[data-mut="${key}"]`).forEach((el) => (el.textContent = text));
    }
    document.querySelectorAll<HTMLElement>("[data-section-index]").forEach((el) => (el.textContent = el.dataset.sectionIndex ?? ""));
    document.title = "Colin Johnson — builds in the open";
    e.applied.clear();
    e.sanity = 100;
    e.band = 0;
    e.noteQueue = [];
    e.milestones.clear();
    e.maxScroll = 0;
    e.started = performance.now();
    document.documentElement.dataset.band = "0";
    e.scene = null;
    const root = document.documentElement;
    for (const v of Array.from(root.style)) if (v.startsWith("--color-") || v.startsWith("--wr-")) root.style.removeProperty(v);
    setBand(0);
    setSanity(100);
    setNotes([]);
    setWatcher(null);
    setWatcherShown(false);
    setFinal(null);
    setTyped("");
    setHold(0);
  };

  // ---------------------------------------------------------------- engine
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isOff = reduced;
    try {
      isOff = isOff || localStorage.getItem(OFF_KEY) === "1";
    } catch {
      // ignore
    }
    if (isOff) {
      queueMicrotask(() => setOff(true));
      return;
    }
    const e = engine.current;
    e.lastMove = performance.now();
    e.started = performance.now();
    document.querySelectorAll<HTMLElement>("[data-mut]").forEach((el) => {
      const key = el.dataset.mut;
      if (key && !e.originals.has(key)) e.originals.set(key, (el.textContent ?? "").replace(/\s+/g, " ").trim());
    });
    try {
      e.visits = Number(localStorage.getItem(VISITS_KEY) ?? "0") + 1;
      localStorage.setItem(VISITS_KEY, String(e.visits));
      e.doorsClosed = Number(localStorage.getItem(DOORS_KEY) ?? "0");
    } catch {
      // ignore
    }
    const q = new URLSearchParams(window.location.search).get("sanity");
    if (q !== null && !Number.isNaN(Number(q))) e.sanity = Math.max(0, Math.min(100, Number(q)));
    window.__wrongness = { sanity: e.sanity, band: 0, hovers: 0 };
    document.documentElement.dataset.band = "0";

    const onMove = (ev: PointerEvent) => {
      e.lastMove = performance.now();
      setFacing(ev.clientX < window.innerWidth - 120 ? 1 : -1);
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      e.maxScroll = Math.max(e.maxScroll, pct);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    const context = (b: number) => {
      const secs = (performance.now() - e.started) / 1000;
      const h = new Date().getHours();
      return {
        band: b,
        time: secs < 60 ? "a minute" : secs < 240 ? "a few minutes" : "a long time",
        scroll: e.maxScroll < 33 ? "the top" : e.maxScroll < 66 ? "the middle" : "the bottom",
        hour: h >= 5 && h < 12 ? "morning" : h < 17 ? "afternoon" : h < 22 ? "evening" : "late night",
        visits: e.visits <= 1 ? "first" : e.visits <= 3 ? "returning" : "many",
        hovered: e.hovers,
        idle: performance.now() - e.lastMove > 15000,
      };
    };

    const applyScene = (scene: Scene | undefined, b: number) => {
      const root = document.documentElement;
      e.scene = scene ?? null;
      const vars = ["--color-ground", "--color-ground-2", "--color-ground-3", "--color-ink", "--color-ink-dim", "--color-ink-mute", "--color-line", "--color-line-strong", "--color-loop", "--color-loop-soft"];
      if (!scene || b < 3) {
        for (const v of vars) root.style.removeProperty(v);
        return;
      }
      // The model's palette, expanded into the site's tokens.
      const mixHex = (a: string, c: string, t: number) => {
        const pa = Number.parseInt(a.slice(1), 16);
        const pc = Number.parseInt(c.slice(1), 16);
        const ch = (sh: number) => Math.round(((pa >> sh) & 255) + (((pc >> sh) & 255) - ((pa >> sh) & 255)) * t);
        return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
      };
      const { ground, ink, accent } = scene.palette;
      root.style.setProperty("--color-ground", ground);
      root.style.setProperty("--color-ground-2", mixHex(ground, ink, 0.05));
      root.style.setProperty("--color-ground-3", mixHex(ground, ink, 0.1));
      root.style.setProperty("--color-ink", ink);
      root.style.setProperty("--color-ink-dim", mixHex(ink, ground, 0.25));
      root.style.setProperty("--color-ink-mute", mixHex(ink, ground, 0.5));
      root.style.setProperty("--color-line", mixHex(ground, ink, 0.14));
      root.style.setProperty("--color-line-strong", mixHex(ground, ink, 0.3));
      root.style.setProperty("--color-loop", accent);
      root.style.setProperty("--color-loop-soft", accent);
    };

    const apply = async (w: WhisperPayload["whisper"], b: number) => {
      if (e.stopped || e.band !== b) return;
      applyScene(w.scene, b);
      document.title = w.title;
      setWatcher(w.watcher);
      setWatcherShown(true);
      e.noteQueue.push(...w.marginalia);
      const keys = Object.keys(w.rewrites);
      for (const key of keys) {
        if (e.stopped || e.band !== b) return;
        const text = w.rewrites[key];
        if (e.applied.get(key) === text) continue;
        const els = document.querySelectorAll<HTMLElement>(`[data-mut="${key}"]`);
        await Promise.all(Array.from(els).map((el) => scramble(el, text)));
        e.applied.set(key, text);
        await new Promise((r) => setTimeout(r, 900 + Math.random() * 1400));
      }
      if (b >= 3) {
        document.querySelectorAll<HTMLElement>("[data-section-index]").forEach((el, i) => {
          el.textContent = b === 4 ? "00" : i % 2 === 0 ? "04" : el.dataset.sectionIndex ?? "";
        });
      }
      if (b === 4 && w.last) e.whispers.set(4, w);
    };

    const fetchBand = async (b: number) => {
      if (e.whispers.has(b)) {
        void apply(e.whispers.get(b)!, b);
        return;
      }
      if (e.fetching.has(b)) return;
      e.fetching.add(b);
      try {
        const res = await fetch("/api/whisper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(context(b)) });
        if (!res.ok) return;
        const data = (await res.json()) as WhisperPayload;
        e.whispers.set(b, data.whisper);
        void apply(data.whisper, b);
      } catch {
        // The page stays as it is.
      } finally {
        e.fetching.delete(b);
      }
    };

    const tick = window.setInterval(() => {
      if (e.stopped) return;
      const now = performance.now();
      const h = new Date().getHours();
      const night = h >= 22 || h < 5;
      let decay = 0.3;
      if (night) decay *= 1.4;
      if (e.visits > 1) decay *= 1.15;
      if (now - e.lastMove > 15000) decay *= 2;
      if (e.doorsClosed > 0) decay *= 0.6;
      const hovers = window.__wrongness?.hovers ?? 0;
      if (hovers > e.hovers) {
        decay += (hovers - e.hovers) * 1.5;
        e.hovers = hovers;
      }
      for (const m of [25, 50, 75, 99]) {
        if (e.maxScroll >= m && !e.milestones.has(m)) {
          e.milestones.add(m);
          decay += m === 99 ? 5 : 3;
        }
      }
      e.sanity = Math.max(0, e.sanity - decay);
      const b = bandOf(e.sanity);
      window.__wrongness = { sanity: e.sanity, band: b, hovers: e.hovers };
      setSanity(e.sanity);
      const readout = document.getElementById("sanity-readout");
      if (readout) {
        readout.textContent = "sanity " + Math.round(e.sanity);
        readout.classList.toggle("hidden", b === 0);
      }
      if (b !== e.band) {
        e.band = b;
        document.documentElement.dataset.band = String(b);
        setBand(b);
        if (b >= 1) void fetchBand(b);
      }
      // Marginalia cadence.
      const gap = b >= 4 ? 7000 : b === 3 ? 11000 : 16000;
      if (b >= 1 && e.noteQueue.length > 0 && now - e.lastNoteAt > gap) {
        e.lastNoteAt = now;
        const text = e.noteQueue.shift()!;
        if (b >= 2) e.noteQueue.push(text);
        const id = (e.noteId += 1);
        const note: Note = { id, text, top: 18 + Math.random() * 60, side: id % 2 === 0 ? "left" : "right" };
        setNotes((n) => [...n.slice(-2), note]);
        window.setTimeout(() => setNotes((n) => n.filter((x) => x.id !== id)), b >= 3 ? 12000 : 9000);
      }
      // Glitches at the deep end.
      if (b >= 3 && now - e.lastGlitchAt > (b === 4 ? 2500 : 5000)) {
        e.lastGlitchAt = now;
        const keys = Array.from(e.applied.keys());
        const key = keys[Math.floor(Math.random() * keys.length)];
        if (key) {
          const target = e.applied.get(key)!;
          document.querySelectorAll<HTMLElement>(`[data-mut="${key}"]`).forEach((el) => void scramble(el, target, 500));
        }
      }
      if (e.sanity <= 0 && !e.stopped) {
        e.stopped = true;
        const w = e.whispers.get(4);
        setFinal(w?.last ?? "you stayed long enough for the page to learn the shape of you. close the door, and it forgets. it always forgets.");
      }
    }, 1000);

    return () => {
      window.clearInterval(tick);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Type the last line out.
  useEffect(() => {
    if (!final) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(final.slice(0, i));
      if (i >= final.length) window.clearInterval(id);
    }, 45);
    return () => window.clearInterval(id);
  }, [final]);

  // Hide the watcher's bubble after a while at shallow bands.
  useEffect(() => {
    if (!watcherShown || band >= 3) return;
    const t = setTimeout(() => setWatcherShown(false), 9000);
    return () => clearTimeout(t);
  }, [watcherShown, band, watcher]);

  // ---------------------------------------------------------------- abyss
  useEffect(() => {
    const canvas = abyssRef.current;
    if (!canvas || off) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let w = 0;
    let h = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    const tendrils = Array.from({ length: 11 }, (_, i) => ({
      edge: i % 4,
      pos: (i * 0.37) % 1,
      phase: i * 1.7,
      speed: 0.4 + (i % 3) * 0.2,
      curl: 0.6 + ((i * 7) % 5) * 0.2,
    }));
    const eyes = Array.from({ length: 5 }, (_, i) => ({ x: 0.12 + ((i * 0.23) % 0.8), y: 0.15 + ((i * 0.31) % 0.7), phase: i * 2.3, size: 26 + (i % 3) * 14 }));
    const glyphs = Array.from({ length: 90 }, (_, i) => ({ x: (i * 0.618) % 1, y: (i * 0.377) % 1, v: 0.3 + ((i * 7) % 5) * 0.15, ch: "ʼʻ'ghlnfhtagwyrqx·"[i % 17] }));
    let lastFlash = 0;
    const frame = (now: number) => {
      const t = now / 1000;
      const s = window.__wrongness?.sanity ?? 100;
      const b = window.__wrongness?.band ?? 0;
      const scene = engine.current.scene;
      const root = document.documentElement;
      // Depth within the current band and overall: effects grow as sanity falls.
      const deep = Math.max(0, Math.min(1, (60 - s) / 60)); // 0 at 60, 1 at 0
      ctx.clearRect(0, 0, w, h);
      if (final) {
        ctx.fillStyle = "rgba(5,16,12,1)";
        ctx.fillRect(0, 0, w, h);
        drawEyes(ctx, eyes, t, w, h, 1, "#52ff9a");
        drawTendrils(ctx, tendrils, t, w, h, 1, "82,255,154");
        raf = requestAnimationFrame(frame);
        return;
      }
      if (b < 2 || !scene) {
        root.style.setProperty("--wr-dx", "0px");
        root.style.setProperty("--wr-dy", "0px");
        root.style.setProperty("--wr-scale", "1");
        root.style.setProperty("--wr-rot", "0deg");
        root.style.setProperty("--wr-hue", "0deg");
        root.style.setProperty("--wr-spacing", "0em");
        root.style.setProperty("--wr-invert", "0");
        raf = requestAnimationFrame(frame);
        return;
      }
      const m = scene.motion;
      const bandGain = b === 2 ? 0.35 : b === 3 ? 0.7 : 1;
      const accentRgb = hexRgb(scene.palette.accent);
      let dx = 0;
      let dy = 0;
      let scale = 1;
      let invert = 0;
      let spacing = m.spacing * 0.06 * bandGain;
      for (const fx of scene.effects) {
        const k = fx.intensity * bandGain * (0.4 + 0.6 * deep);
        const sp = 0.3 + fx.speed * 1.7;
        const rgb = fx.color ? hexRgb(fx.color) : accentRgb;
        switch (fx.kind) {
          case "tendrils":
            drawTendrils(ctx, tendrils, t * sp, w, h, k, rgb);
            break;
          case "eyes":
            if (b >= 3) drawEyes(ctx, eyes, t * sp, w, h, k, fx.color ?? scene.palette.accent);
            break;
          case "glyphrain": {
            ctx.font = `${14 + k * 10}px monospace`;
            ctx.fillStyle = `rgba(${rgb},${0.25 + k * 0.5})`;
            for (const g of glyphs) {
              const y = ((g.y + t * 0.05 * sp * g.v) % 1) * h;
              ctx.fillText(g.ch, g.x * w, y);
            }
            break;
          }
          case "static": {
            const n = Math.floor(30 + k * 220);
            for (let i = 0; i < n; i += 1) {
              const x = Math.random() * w;
              const y = Math.random() * h;
              ctx.fillStyle = Math.random() > 0.5 ? `rgba(${rgb},${k * 0.5})` : `rgba(0,0,0,${k * 0.5})`;
              ctx.fillRect(x, y, 2 + Math.random() * 40 * k, 1 + Math.random() * 3);
            }
            break;
          }
          case "ripple": {
            for (let i = 0; i < 5; i += 1) {
              const r = ((t * sp * 0.25 + i / 5) % 1) * Math.max(w, h) * 0.8;
              ctx.strokeStyle = `rgba(${rgb},${(1 - r / (Math.max(w, h) * 0.8)) * k * 0.6})`;
              ctx.lineWidth = 1.5 + k * 3;
              ctx.beginPath();
              ctx.ellipse(w / 2, h / 2, r, r * 0.6, 0, 0, Math.PI * 2);
              ctx.stroke();
            }
            break;
          }
          case "vignette": {
            const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * (0.45 - k * 0.25), w / 2, h / 2, Math.max(w, h) * 0.75);
            g.addColorStop(0, "rgba(0,0,0,0)");
            g.addColorStop(1, `rgba(${hexRgb(scene.palette.ground)},${Math.min(1, k * 1.2)})`);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            break;
          }
          case "scanlines": {
            ctx.fillStyle = `rgba(0,0,0,${0.08 + k * 0.25})`;
            const off = (t * sp * 40) % 4;
            for (let y = off; y < h; y += 4) ctx.fillRect(0, y, w, 1);
            break;
          }
          case "invertflash":
            if (t - lastFlash > 6 / sp && Math.random() < 0.02 * k) lastFlash = t;
            if (t - lastFlash < 0.12) invert = Math.min(1, k * 1.5);
            break;
          case "heartbeat": {
            const beat = Math.pow(Math.max(0, Math.sin(t * (1.2 + fx.speed * 1.5))), 8);
            scale += beat * 0.035 * k * (0.5 + m.scale);
            break;
          }
          case "drift":
            dx += Math.sin(t * 0.2 * sp) * 18 * k;
            dy += Math.cos(t * 0.13 * sp) * 12 * k;
            break;
          case "textwave":
            spacing += Math.sin(t * sp) * 0.03 * k;
            break;
        }
      }
      scale += Math.sin(t * 0.5) * 0.004 * m.breathe * bandGain;
      root.style.setProperty("--wr-dx", dx.toFixed(1) + "px");
      root.style.setProperty("--wr-dy", dy.toFixed(1) + "px");
      root.style.setProperty("--wr-scale", scale.toFixed(4));
      root.style.setProperty("--wr-rot", (m.tilt * bandGain * (0.6 + 0.4 * Math.sin(t * 0.3))).toFixed(3) + "deg");
      root.style.setProperty("--wr-hue", (m.hue * bandGain * (b >= 3 ? 1 : 0.2)).toFixed(1) + "deg");
      root.style.setProperty("--wr-spacing", Math.max(-0.02, spacing).toFixed(4) + "em");
      root.style.setProperty("--wr-invert", invert.toFixed(2));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [off, final]);


  // ---------------------------------------------------------------- door
  const startHold = () => {
    if (holdTimer.current) return;
    const t0 = performance.now();
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / 1800);
      setHold(p);
      if (p >= 1) {
        holdTimer.current = null;
        try {
          localStorage.setItem(DOORS_KEY, String(engine.current.doorsClosed + 1));
        } catch {
          // ignore
        }
        engine.current.doorsClosed += 1;
        engine.current.stopped = false;
        restore();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      holdTimer.current = requestAnimationFrame(step);
    };
    holdTimer.current = requestAnimationFrame(step);
  };
  const endHold = () => {
    if (holdTimer.current) cancelAnimationFrame(holdTimer.current);
    holdTimer.current = null;
    setHold(0);
  };

  if (off) return null;

  return (
    <>
      <canvas ref={abyssRef} className="fixed inset-0 z-[150] pointer-events-none" aria-hidden />

      {/* Marginalia */}
      {notes.map((n) => (
        <div
          key={n.id}
          className={`fixed z-[160] pointer-events-none font-mono text-[11px] leading-relaxed max-w-[220px] px-2.5 py-1.5 rounded-md border border-line bg-ground-2/90 ${
            n.side === "left" ? "left-4 lg:left-6" : "right-4 lg:right-6 text-right"
          } ${band >= 4 ? "text-loop" : "text-ink-dim"} note-in`}
          style={{ top: `${n.top}vh` }}
        >
          {n.text}
        </div>
      ))}

      {/* The watcher */}
      <div className="fixed z-[170] bottom-4 right-4 sm:bottom-6 sm:right-6 pointer-events-none">
        {watcher && watcherShown && (
          <div className={`absolute bottom-full right-0 mb-2 w-64 text-left rounded-lg rounded-br-md px-3.5 py-2.5 text-[13px] leading-relaxed border ${band >= 4 ? "bg-ground-2 border-loop text-loop" : "bg-ground-2 border-line text-ink"}`}>
            {watcher}
          </div>
        )}
        <img
          src="/clippy.png"
          alt=""
          className="watcher w-16 sm:w-20 h-auto select-none transition-transform duration-700"
          style={{ transform: `scaleX(${band >= 2 ? facing : 1})`, filter: band >= 3 ? undefined : "drop-shadow(0 10px 18px rgba(16,16,16,0.25))" }}
          draggable={false}
        />
      </div>

      {/* Off switch, once things have started */}
      {band >= 2 && !final && (
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(OFF_KEY, "1");
            } catch {
              // ignore
            }
            restore();
            setOff(true);
          }}
          className="fixed z-[170] bottom-4 left-4 sm:bottom-6 sm:left-6 font-mono text-[10px] text-ink-mute hover:text-ink underline underline-offset-2"
        >
          the site feels fine
        </button>
      )}

      {/* Sanity zero */}
      {final && (
        <div className="fixed inset-0 z-[400] flex flex-col items-center justify-center px-6 text-center" style={{ background: "rgba(5,16,12,0.92)" }}>
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase mb-6" style={{ color: "#4f8268" }}>
            sanity 0
          </p>
          <p className="max-w-[40ch] text-[clamp(1.2rem,2.6vw,1.9rem)] leading-snug font-medium tracking-tight" style={{ color: "#bfe3d0" }}>
            {typed}
            <span className="inline-block w-2 h-5 ml-1 align-middle animate-pulse" style={{ background: "#52ff9a" }} />
          </p>
          <button
            type="button"
            onPointerDown={startHold}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onPointerCancel={endHold}
            className="relative mt-12 h-12 px-6 rounded-md border font-medium text-sm overflow-hidden select-none"
            style={{ borderColor: "#1f5a44", color: "#bfe3d0" }}
          >
            <span className="absolute inset-y-0 left-0" style={{ width: `${hold * 100}%`, background: "#52ff9a", opacity: 0.25 }} />
            <span className="relative">hold to close the door</span>
          </button>
          <button type="button" onClick={() => setExplain((v) => !v)} className="mt-6 font-mono text-[11px] underline underline-offset-2" style={{ color: "#4f8268" }}>
            what is this?
          </button>
          {explain && (
            <p className="mt-3 max-w-[48ch] font-mono text-[11px] leading-relaxed" style={{ color: "#7fb79b" }}>
              This site goes wrong the longer you stay. A model writes the wrongness from what you do here: how long, where on the page, the hour, whether you came back. Nothing it says about Colin is false; only the tone is. Closing the door puts everything back. &ldquo;The site feels fine,&rdquo; bottom-left, turns it off for good.
            </p>
          )}
        </div>
      )}
      <style>{`.note-in{animation:note-in 1.2s cubic-bezier(0.16,1,0.3,1) both}@keyframes note-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
    </>
  );
}

function drawTendrils(ctx: CanvasRenderingContext2D, tendrils: { edge: number; pos: number; phase: number; speed: number; curl: number }[], t: number, w: number, h: number, k: number, rgb: string) {
  for (const td of tendrils) {
    let x0 = 0;
    let y0 = 0;
    let dx = 0;
    let dy = 0;
    if (td.edge === 0) {
      x0 = td.pos * w;
      y0 = -10;
      dy = 1;
    } else if (td.edge === 1) {
      x0 = w + 10;
      y0 = td.pos * h;
      dx = -1;
    } else if (td.edge === 2) {
      x0 = td.pos * w;
      y0 = h + 10;
      dy = -1;
    } else {
      x0 = -10;
      y0 = td.pos * h;
      dx = 1;
    }
    const len = Math.min(w, h) * (0.12 + 0.55 * k);
    const segs = 14;
    let px = x0;
    let py = y0;
    let ang = Math.atan2(dy, dx);
    for (let i = 0; i < segs; i += 1) {
      const p = i / segs;
      const sway = Math.sin(t * td.speed + td.phase + p * 4) * 0.35 * td.curl * (0.3 + p);
      ang += sway * 0.25;
      const nx = px + Math.cos(ang) * (len / segs);
      const ny = py + Math.sin(ang) * (len / segs);
      ctx.strokeStyle = `rgba(${rgb},${(1 - p) * 0.55 * k})`;
      ctx.lineWidth = (1 - p) * 9 * (0.4 + k) + 0.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      px = nx;
      py = ny;
    }
  }
}

function drawEyes(ctx: CanvasRenderingContext2D, eyes: { x: number; y: number; phase: number; size: number }[], t: number, w: number, h: number, k: number, iris: string) {
  for (const e of eyes) {
    const open = Math.max(0, Math.min(1, (Math.sin(t * 0.35 + e.phase) + 0.6) * 1.3));
    if (open <= 0.02) continue;
    const cx = e.x * w;
    const cy = e.y * h;
    const rx = e.size;
    const ry = e.size * 0.55 * open;
    ctx.fillStyle = `rgba(5,16,12,${0.9 * k})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx + 6, ry + 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(191,227,208,${0.85 * k})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(${hexRgb(iris)},${0.95 * k})`;
    ctx.beginPath();
    ctx.arc(cx + Math.sin(t * 0.7 + e.phase) * rx * 0.3, cy, Math.min(ry, rx * 0.42), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(5,16,12,${k})`;
    ctx.beginPath();
    ctx.ellipse(cx + Math.sin(t * 0.7 + e.phase) * rx * 0.3, cy, rx * 0.1, Math.min(ry, rx * 0.36), 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
