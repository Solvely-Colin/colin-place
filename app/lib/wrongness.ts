import type { FeedItem } from "./activity";
import { kvGet, kvSet } from "./kv";
import { ollamaJson, ollamaReady } from "./ollama";

// The site goes wrong the longer you stay. A model writes the wrongness:
// small rewrites of on-page copy, notes in the margin that know what the
// visitor has been doing, a line for the watcher in the corner. The facts
// about Colin never change; only the tone does. Everything is cached by
// coarse buckets so the effect is cheap and still feels aimed at you.

export const MUTABLE: Record<string, string> = {
  hero1: "Hi, I'm Colin.",
  hero2: "I build in the open.",
  heroP:
    "I maintain open-source tools, help run a couple of developer communities, and build CRM systems by day. This site is my playground: my agents plan, write, and deploy it, and a model on the page reads my live GitHub and talks back. Everything here links to something real.",
  eyebrow: "each light on the loop is a real event from Colin's public GitHub feed · hover one",
  now: "What he's actually doing",
  nowBlurb: "The status line is a guess. Everything else on this page is not.",
  numbers: "Counted, not claimed",
  numbersBlurb: "Each one links to the public page it comes from. If GitHub disagrees, GitHub wins.",
  work: "Four ecosystems, one habit",
  about: "About Colin, rewritten as he ships",
  path: "From CRM hygiene to maintainer",
  contact: "Let's build something.",
  contactP: "Open-source, collaborations, interesting technical problems, or just to say hi. He reads everything.",
  footer: "Every pixel of this page, including this sentence, was planned, written, and deployed by agent sessions, with Colin approving what ships.",
};

export interface VisitorContext {
  band: number; // 1..4
  time: "a minute" | "a few minutes" | "a long time";
  scroll: "the top" | "the middle" | "the bottom";
  hour: "morning" | "afternoon" | "evening" | "late night";
  visits: "first" | "returning" | "many";
  hovered: number; // lights hovered on the loop
  idle: boolean; // mouse has been still
}

export const EFFECTS = ["tendrils", "eyes", "glyphrain", "static", "ripple", "vignette", "scanlines", "invertflash", "heartbeat", "drift", "textwave"] as const;
export type EffectKind = (typeof EFFECTS)[number];

export interface Effect {
  kind: EffectKind;
  intensity: number; // 0..1
  speed: number; // 0..1
  color?: string;
}

// The model composes the picture too: colours, an effect mix, and motion.
export interface Scene {
  palette: { ground: string; ink: string; accent: string };
  effects: Effect[];
  motion: { breathe: number; tilt: number; spacing: number; hue: number; scale: number };
}

export interface Whisper {
  marginalia: string[];
  rewrites: Record<string, string>;
  title: string;
  watcher: string;
  last?: string;
  scene?: Scene;
}

const SCHEMA = {
  type: "object",
  properties: {
    marginalia: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4, description: "short notes in the margin, 4-14 words each, lowercase, addressed to the reader" },
    rewrites: {
      type: "array",
      items: { type: "object", properties: { key: { type: "string" }, text: { type: "string" } }, required: ["key", "text"] },
      description: "uncanny variants of on-page copy, keyed by the given keys",
    },
    title: { type: "string", description: "the browser tab title, max 40 chars" },
    watcher: { type: "string", description: "one line the figure in the corner says, max 120 chars" },
    last: { type: "string", description: "band 4 only: one calm sentence shown alone on the screen, max 160 chars" },
    scene: {
      type: "object",
      description: "bands 2-4: the look and motion of the page at this band",
      properties: {
        palette: {
          type: "object",
          properties: {
            ground: { type: "string", description: "page background hex" },
            ink: { type: "string", description: "text hex, must contrast with ground" },
            accent: { type: "string", description: "accent hex for lights and lines" },
          },
          required: ["ground", "ink", "accent"],
        },
        effects: {
          type: "array",
          minItems: 1,
          maxItems: 8,
          items: {
            type: "object",
            properties: {
              kind: { type: "string", enum: [...EFFECTS] },
              intensity: { type: "number", minimum: 0, maximum: 1 },
              speed: { type: "number", minimum: 0, maximum: 1 },
              color: { type: "string", description: "optional hex" },
            },
            required: ["kind", "intensity", "speed"],
          },
        },
        motion: {
          type: "object",
          properties: {
            breathe: { type: "number", minimum: 0, maximum: 1, description: "how much the type breathes" },
            tilt: { type: "number", minimum: -1, maximum: 1, description: "page tilt, -1 to 1 degree" },
            spacing: { type: "number", minimum: 0, maximum: 1, description: "letter-spacing drift" },
            hue: { type: "number", minimum: 0, maximum: 360, description: "hue rotation of everything, degrees" },
            scale: { type: "number", minimum: 0, maximum: 1, description: "heartbeat scale amount" },
          },
          required: ["breathe", "tilt", "spacing", "hue", "scale"],
        },
      },
      required: ["palette", "effects", "motion"],
    },
  },
  required: ["marginalia", "rewrites", "title", "watcher"],
} as const;

const SYSTEM = `You write the slow wrongness of colin.place, Colin Johnson's personal site. The site starts clean and precise. The longer someone stays, the lower their sanity, and you write what the page looks like at a given band.

Register by band:
- Band 1 (sanity 80-60): almost nothing. One word that should not be there. A note in the margin that knows how long they have been reading. Polite.
- Band 2 (sanity 60-40): the uncanny valley. Repetition, sentences that notice the reader, the page speaking in first person as if it were a place. Timestamps that do not add up.
- Band 3 (sanity 40-20): Lovecraft. The deep, the sleeper, something under the loop, geometry that does not close. A few R'lyehian fragments slipped into headlines (ph'nglui, mglw'nafh, fhtagn, wgah'nagl, R'lyeh, the old ones). The page is not hostile; it is vast and awake and glad you are there.
- Band 4 (sanity 20-0): go all the way. Every line rewritten. R'lyehian and English braided. The site is a temple at the bottom of the sea and the reader is the first visitor in an age. Cosmic, reverent, calm, wrong. Still no gore, no threats, no exclamation marks, no capital-letter shouting. Dread is quiet.

Hard rules:
- Every fact about Colin stays true. You may change tone, add clauses, repeat, address the reader, braid in R'lyehian, but never change names, numbers, employers, or projects, and never invent new ones.
- Rewrites stay recognisable and within about 25 percent of the original length at bands 1-2, up to 70 percent longer at bands 3-4.
- Use only the keys you are given. Band 1 exactly one rewrite, band 2 two or three, band 3 six or seven, band 4 EVERY key, all fourteen. Keep every string valid JSON: escape double quotes inside strings, no raw newlines.
- Marginalia refer to what the reader is doing, using only the visitor facts given (how long, where on the page, time of day, first visit or returning, whether they hovered the loop, whether they went still). Never guess anything else about them.
- Use the real GitHub events as omens: a push at an odd hour, a pull request opened and not yet merged, a repo pushed to again. Quote them accurately. At bands 3-4 they are signs.
- The watcher is the small figure in the corner. Band 1 ordinary. Band 4: it has been waiting a very long time.
- The title is the browser tab. Band 1 "colin.place". Band 2 "colin.place (still)". Band 3 "colin.place is here". Band 4 something in R'lyehian, under 40 characters.
- "last" (band 4 only): one calm sentence shown alone on a black screen when sanity reaches zero, offering the reader the door.

You also direct the picture, at bands 2-4, as "scene". You are choreographing motion on a real web page, so be bold and specific:
- palette: band 2 barely off the clean paper (a colder white, ink slightly green-black); band 3 cold and wrong (sea-green greys, deep ink); band 4 the abyss (near-black green or violet ground, pale luminous ink, one sick bright accent). Ink must contrast strongly with ground.
- effects, from this vocabulary: tendrils (things reaching in from the edges), eyes (opening in the dark), glyphrain (R'lyehian glyphs falling), static (broken signal), ripple (rings spreading from the centre), vignette (edges going dark), scanlines, invertflash (whole page flips negative for an instant), heartbeat (the page pulses), drift (the page slides), textwave (letter-spacing waves through the type). Band 2: one or two, faint and slow. Band 3: four or five, building. Band 4: six to eight, most of them strong and fast; this should feel like a film, not a web page.
- motion: breathe, tilt, spacing, hue, scale. Small at band 2, unmistakable at band 3, wrong at band 4 (hue far from 0, tilt near the limit, scale visible).`;

const FALLBACK_SCENES: (Scene | undefined)[] = [
  undefined,
  {
    palette: { ground: "#f1f4f1", ink: "#0f1a15", accent: "#1f6f4f" },
    effects: [{ kind: "vignette", intensity: 0.15, speed: 0.2 }, { kind: "drift", intensity: 0.2, speed: 0.1 }],
    motion: { breathe: 0.15, tilt: 0.1, spacing: 0.1, hue: 8, scale: 0.05 },
  },
  {
    palette: { ground: "#dfe8e2", ink: "#08120e", accent: "#0f8f5a" },
    effects: [
      { kind: "tendrils", intensity: 0.5, speed: 0.4 },
      { kind: "vignette", intensity: 0.45, speed: 0.3 },
      { kind: "scanlines", intensity: 0.3, speed: 0.5 },
      { kind: "textwave", intensity: 0.4, speed: 0.4 },
      { kind: "heartbeat", intensity: 0.3, speed: 0.4 },
    ],
    motion: { breathe: 0.4, tilt: -0.5, spacing: 0.4, hue: 30, scale: 0.25 },
  },
  {
    palette: { ground: "#04100b", ink: "#bfe3d0", accent: "#52ff9a" },
    effects: [
      { kind: "tendrils", intensity: 1, speed: 0.7 },
      { kind: "eyes", intensity: 0.9, speed: 0.5 },
      { kind: "glyphrain", intensity: 0.7, speed: 0.6 },
      { kind: "static", intensity: 0.35, speed: 0.9 },
      { kind: "ripple", intensity: 0.6, speed: 0.5 },
      { kind: "invertflash", intensity: 0.5, speed: 0.6 },
      { kind: "heartbeat", intensity: 0.8, speed: 0.7 },
      { kind: "drift", intensity: 0.5, speed: 0.4 },
    ],
    motion: { breathe: 1, tilt: 0.9, spacing: 0.9, hue: 140, scale: 0.7 },
  },
];

function fallback(ctx: VisitorContext): Whisper {
  const byBand: Whisper[] = [
    {
      marginalia: ["you are reading the second line first", "it is fine. keep going"],
      rewrites: { eyebrow: "each light on the loop is a real event from Colin's public GitHub feed · hover one · it noticed" },
      title: "colin.place",
      watcher: "Hey. Take your time.",
    },
    {
      marginalia: ["you have been here a while now", "the loop is a little wider than when you arrived", "he pushed code while you were reading"],
      rewrites: { hero2: "I build in the open. The open builds back.", nowBlurb: "The status line is a guess. Everything else on this page is not. It is not." , numbers: "Counted, not claimed. Counted again." },
      title: "colin.place (still)",
      watcher: "You came back to this part. I saw.",
    },
    {
      marginalia: ["you went still. so did the page", "this is the middle. it was the middle before", "the numbers are correct. they have always been correct", "someone pushed at an hour nobody pushes"],
      rewrites: {
        hero1: "Hi, I'm Colin. Hi.",
        hero2: "I build in the open. The open is where you are.",
        work: "Four ecosystems, one habit, one reader",
        about: "About Colin, rewritten as he ships, rewritten as you read",
        path: "From CRM hygiene to maintainer to here",
        contact: "Let's build something. Let's.",
      },
      title: "colin.place is here",
      watcher: "It's late where you are. It's late here too. It is always late under the loop.",
    },
    {
      marginalia: ["ph'nglui mglw'nafh colin.place r'lyeh wgah'nagl fhtagn", "you have read this page for a long time. it has read you for longer", "the door is at the bottom. it was always at the bottom", "thank you for staying. the sleeper thanks you"],
      rewrites: {
        hero1: "Hi. I'm Colin. Ph'nglui. I'm still Colin.",
        hero2: "I build in the open. The open is a sea. You are in it.",
        heroP: "I maintain open-source tools, help run a couple of developer communities, and build CRM systems by day. This site is my playground: my agents plan, write, and deploy it, and a model on the page reads my live GitHub and reads you back. Everything here links to something real. So do you.",
        eyebrow: "each light on the loop is a real event · hover one · it hovers back",
        now: "What he's actually doing, and what you are doing",
        nowBlurb: "The status line is a guess. Everything else on this page is not. Everything else on this page is watching.",
        numbers: "Counted, not claimed. Counted you.",
        numbersBlurb: "Each one links to the public page it comes from. If GitHub disagrees, GitHub wins. GitHub has not disagreed yet.",
        work: "Four ecosystems, one habit, one habit, one habit",
        about: "About Colin, rewritten as he ships, rewritten as you stay",
        path: "From CRM hygiene to maintainer to whatever this is",
        contact: "Let's build something. Let's not leave.",
        contactP: "Open-source, collaborations, interesting technical problems, or just to say hi. He reads everything. This page reads everything.",
        footer: "Every pixel of this page, including this sentence, was planned, written, and deployed by agent sessions, with Colin approving what ships. Nobody approved this sentence.",
      },
      title: "ph'nglui mglw'nafh",
      watcher: "I have been in this corner since before the loop. You can close the door whenever you want. I will keep it open.",
      last: "you stayed long enough for the page to learn the shape of you. the sleeper turned over. close the door, and it forgets. it always forgets. iä.",
    },
  ];
  const b = Math.max(0, Math.min(3, ctx.band - 1));
  return { ...byBand[b], scene: FALLBACK_SCENES[b] };
}

const HEX = /^#[0-9a-fA-F]{6}$/;
function lum(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && !Number.isNaN(v) ? Math.max(lo, Math.min(hi, v)) : d);

function normalizeScene(raw: unknown, band: number): Scene | undefined {
  const fb = FALLBACK_SCENES[Math.max(0, Math.min(3, band - 1))];
  if (!raw || typeof raw !== "object" || !fb) return fb;
  const r = raw as Record<string, unknown>;
  const pal = (r.palette && typeof r.palette === "object" ? r.palette : {}) as Record<string, unknown>;
  let ground = typeof pal.ground === "string" && HEX.test(pal.ground) ? pal.ground.toLowerCase() : fb.palette.ground;
  let ink = typeof pal.ink === "string" && HEX.test(pal.ink) ? pal.ink.toLowerCase() : fb.palette.ink;
  const accent = typeof pal.accent === "string" && HEX.test(pal.accent) ? pal.accent.toLowerCase() : fb.palette.accent;
  const contrast = (Math.max(lum(ground), lum(ink)) + 0.05) / (Math.min(lum(ground), lum(ink)) + 0.05);
  if (contrast < 4.5) {
    ground = fb.palette.ground;
    ink = fb.palette.ink;
  }
  const effects: Effect[] = Array.isArray(r.effects)
    ? r.effects
        .map((e) => {
          const o = (e && typeof e === "object" ? e : {}) as Record<string, unknown>;
          const kind = typeof o.kind === "string" && (EFFECTS as readonly string[]).includes(o.kind) ? (o.kind as EffectKind) : null;
          if (!kind) return null;
          const color = typeof o.color === "string" && HEX.test(o.color) ? o.color.toLowerCase() : undefined;
          return { kind, intensity: num(o.intensity, 0, 1, 0.5), speed: num(o.speed, 0, 1, 0.5), ...(color ? { color } : {}) };
        })
        .filter((e): e is Effect => e !== null)
        .slice(0, 8)
    : [];
  const mo = (r.motion && typeof r.motion === "object" ? r.motion : {}) as Record<string, unknown>;
  return {
    palette: { ground, ink, accent },
    effects: effects.length > 0 ? effects : fb.effects,
    motion: {
      breathe: num(mo.breathe, 0, 1, fb.motion.breathe),
      tilt: num(mo.tilt, -1, 1, fb.motion.tilt),
      spacing: num(mo.spacing, 0, 1, fb.motion.spacing),
      hue: num(mo.hue, 0, 360, fb.motion.hue),
      scale: num(mo.scale, 0, 1, fb.motion.scale),
    },
  };
}

function normalize(raw: unknown, ctx: VisitorContext): Whisper | null {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
  const marginalia = Array.isArray(r.marginalia) ? r.marginalia.map((m) => clean(m, 110)).filter(Boolean).slice(0, 4) : [];
  const rewrites: Record<string, string> = {};
  if (Array.isArray(r.rewrites)) {
    for (const item of r.rewrites) {
      const o = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      const key = clean(o.key, 20);
      const text = clean(o.text, 600);
      const original = MUTABLE[key];
      if (!original || !text) continue;
      if (text.length < original.length * 0.6 || text.length > original.length * 1.5 + 12) continue;
      rewrites[key] = text;
    }
  }
  if (marginalia.length < 2 || Object.keys(rewrites).length === 0) return null;
  const title = clean(r.title, 40) || "colin.place";
  const watcher = clean(r.watcher, 120) || fallback(ctx).watcher;
  const last = ctx.band >= 4 ? clean(r.last, 160) || fallback(ctx).last : undefined;
  const scene = ctx.band >= 2 ? normalizeScene(r.scene, ctx.band) : undefined;
  return { marginalia, rewrites, title, watcher, ...(last ? { last } : {}), ...(scene ? { scene } : {}) };
}

export function cacheKey(ctx: VisitorContext): string {
  return ["whisper", ctx.band, ctx.time, ctx.scroll, ctx.hour, ctx.visits, ctx.hovered > 0 ? "h" : "n", ctx.idle ? "i" : "m"].join(":");
}

export async function whisper(ctx: VisitorContext, events: FeedItem[], allowModel: boolean): Promise<{ whisper: Whisper; source: "model" | "cache" | "fallback"; reason?: string }> {
  const key = cacheKey(ctx);
  const cached = await kvGet<Whisper>(key);
  if (cached) return { whisper: cached, source: "cache" };
  if (!allowModel || !ollamaReady()) return { whisper: fallback(ctx), source: "fallback", reason: !ollamaReady() ? "no key" : "rate limited" };
  try {
    const omens = events.slice(0, 12).map((e) => `- ${e.at.replace("T", " ").slice(0, 16)} UTC: ${e.text}`).join("\n");
    const originals = Object.entries(MUTABLE)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    const out = await ollamaJson({
      system: SYSTEM,
      user: [
        `BAND: ${ctx.band} of 4`,
        `VISITOR: has been here ${ctx.time}; is near ${ctx.scroll} of the page; it is ${ctx.hour} for them; this is their ${ctx.visits} visit; hovered the loop ${ctx.hovered > 0 ? "yes" : "no"}; went still ${ctx.idle ? "yes" : "no"}.`,
        "REAL GITHUB EVENTS (newest first):",
        omens || "- none",
        "COPY YOU MAY REWRITE (key: original):",
        originals,
      ].join("\n"),
      schema: SCHEMA,
      temperature: 0.9,
      numPredict: 2600,
      timeoutMs: 50000,
    });
    const w = normalize(out.json, ctx);
    if (!w) return { whisper: fallback(ctx), source: "fallback", reason: "reply failed validation" };
    // Models under-deliver rewrites at deep bands; top up from the hand-written set.
    const want = [1, 3, 6, 14][ctx.band - 1] ?? 1;
    const fb = fallback(ctx).rewrites;
    for (const [k, v] of Object.entries(fb)) {
      if (Object.keys(w.rewrites).length >= want) break;
      if (!w.rewrites[k]) w.rewrites[k] = v;
    }
    void kvSet(key, w);
    return { whisper: w, source: "model" };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[whisper] failed:", reason);
    return { whisper: fallback(ctx), source: "fallback", reason: reason.slice(0, 200) };
  }
}
