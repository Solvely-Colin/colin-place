// A building is a JSON spec: the model writes it, the engine draws it.
// Nothing here is an image; every visual comes from these fields.

export const KINDS = [
  "tower",
  "house",
  "workshop",
  "booth",
  "lab",
  "dome",
  "greenhouse",
  "observatory",
  "library",
  "arcade",
] as const;
export type Kind = (typeof KINDS)[number];

export const ROOFS = ["flat", "gable", "dome", "sawtooth", "spire"] as const;
export type Roof = (typeof ROOFS)[number];

export const FEATURES = [
  "antenna",
  "chimney",
  "awning",
  "neon",
  "balcony",
  "garden",
  "flag",
  "windmill",
  "satellite",
  "banner",
] as const;
export type Feature = (typeof FEATURES)[number];

export interface Palette {
  wall: string;
  roof: string;
  accent: string;
}

export interface Interior {
  headline: string;
  body: string[];
  rooms: { name: string; note: string }[];
  question: string;
}

// The walkable inside. Objects are the things you walk up to; the keeper is
// whoever runs the place.
export const OBJECT_KINDS = [
  "desk",
  "bookshelf",
  "lamp",
  "plant",
  "machine",
  "sign",
  "telescope",
  "counter",
  "crate",
  "terminal",
  "chair",
  "rug",
  "fountain",
  "bed",
  "easel",
  "cauldron",
  "piano",
  "aquarium",
  "vending",
  "globe",
] as const;
export type ObjectKind = (typeof OBJECT_KINDS)[number];

export interface RoomObject {
  kind: ObjectKind;
  x: number;
  y: number;
  label: string;
  note: string;
}

export interface Keeper {
  name: string;
  greeting: string;
}

export interface Layout {
  w: number;
  d: number;
  floor: string;
  wall: string;
  keeper: Keeper;
  objects: RoomObject[];
}

export interface BuildingSpec {
  name: string;
  tagline: string;
  kind: Kind;
  floors: number;
  footprint: { w: number; d: number };
  palette: Palette;
  roof: Roof;
  sign: string;
  features: Feature[];
  interior: Interior;
  layout?: Layout;
}

export type BuildingSource = "colin" | "model" | "blueprint";
export type BuildingStatus = "approved" | "pending";

export interface Building extends BuildingSpec {
  id: string;
  slug: string;
  description: string; // what was typed to make it
  source: BuildingSource;
  status: BuildingStatus;
  model?: string;
  createdAt: string;
  /** Lot index in the town's spiral. Assigned by the client for visitor builds. */
  lot?: number;
  links?: { label: string; href: string }[];
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const CONTROL = /[\x00-\x1f\x7f]/g;

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === "number" ? Math.round(n) : Number.parseInt(String(n), 10);
  if (Number.isNaN(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}

function text(v: unknown, max: number, fallback = ""): string {
  if (typeof v !== "string") return fallback;
  const cleaned = v.replace(CONTROL, " ").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, max) || fallback;
}

function oneOf<T extends string>(v: unknown, list: readonly T[], fallback: T): T {
  return typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : fallback;
}

function hex(v: unknown, fallback: string): string {
  return typeof v === "string" && HEX.test(v) ? v.toLowerCase() : fallback;
}

// Coerces anything model-shaped into a valid spec. Never throws: a bad
// field falls back, so a half-broken generation still becomes a building.
export function normalizeSpec(raw: unknown, description: string): BuildingSpec {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const fp = (r.footprint && typeof r.footprint === "object" ? r.footprint : {}) as Record<string, unknown>;
  const pal = (r.palette && typeof r.palette === "object" ? r.palette : {}) as Record<string, unknown>;
  const inter = (r.interior && typeof r.interior === "object" ? r.interior : {}) as Record<string, unknown>;

  const features = Array.isArray(r.features)
    ? (r.features.filter((f) => (FEATURES as readonly string[]).includes(String(f))) as Feature[]).slice(0, 3)
    : [];

  const body = Array.isArray(inter.body)
    ? inter.body.map((p) => text(p, 600)).filter(Boolean).slice(0, 4)
    : [];
  const rooms = Array.isArray(inter.rooms)
    ? inter.rooms
        .map((room) => {
          const rm = (room && typeof room === "object" ? room : {}) as Record<string, unknown>;
          return { name: text(rm.name, 40), note: text(rm.note, 160) };
        })
        .filter((room) => room.name)
        .slice(0, 4)
    : [];

  const name = text(r.name, 28, "Untitled place");
  const layout = normalizeLayout(r.layout);
  return {
    ...(layout ? { layout } : {}),
    name,
    tagline: text(r.tagline, 70, description.slice(0, 70)),
    kind: oneOf(r.kind, KINDS, "workshop"),
    floors: clampInt(r.floors, 1, 8, 2),
    footprint: { w: clampInt(fp.w, 1, 3, 2), d: clampInt(fp.d, 1, 3, 2) },
    palette: {
      wall: hex(pal.wall, "#e8dcc4"),
      roof: hex(pal.roof, "#8a4b2a"),
      accent: hex(pal.accent, "#ff8c42"),
    },
    roof: oneOf(r.roof, ROOFS, "flat"),
    sign: text(r.sign, 18, name.slice(0, 18)),
    features,
    interior: {
      headline: text(inter.headline, 90, name),
      body: body.length > 0 ? body : ["Nobody has written the guidebook for this place yet."],
      rooms,
      question: text(inter.question, 160, "What would you build next door?"),
    },
  };
}

export function normalizeLayout(raw: unknown): Layout | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const w = clampInt(r.w, 5, 9, 7);
  const d = clampInt(r.d, 5, 9, 7);
  const kp = (r.keeper && typeof r.keeper === "object" ? r.keeper : {}) as Record<string, unknown>;
  const objects: RoomObject[] = [];
  const taken = new Set<string>();
  if (Array.isArray(r.objects)) {
    for (const o of r.objects) {
      const ob = (o && typeof o === "object" ? o : {}) as Record<string, unknown>;
      const kind = oneOf(ob.kind, OBJECT_KINDS, "crate");
      let x = clampInt(ob.x, 0, w - 1, 1);
      let y = clampInt(ob.y, 0, d - 1, 1);
      // Keep the entrance lane (front centre) clear.
      const doorX = Math.floor(w / 2);
      if (y === d - 1 && Math.abs(x - doorX) <= 1) y = d - 2;
      let tries = 0;
      while (taken.has(x + "," + y) && tries < 20) {
        x = (x + 1) % w;
        if (x === 0) y = Math.max(0, (y + 1) % (d - 1));
        tries += 1;
      }
      taken.add(x + "," + y);
      const label = text(ob.label, 32);
      if (!label) continue;
      objects.push({ kind, x, y, label, note: text(ob.note, 200, "Nothing written here yet.") });
      if (objects.length >= 7) break;
    }
  }
  if (objects.length < 2) return null;
  return {
    w,
    d,
    floor: hex(r.floor, "#d9cdb5"),
    wall: hex(r.wall, "#efe6d3"),
    keeper: { name: text(kp.name, 24, "The keeper"), greeting: text(kp.greeting, 160, "Welcome in. Have a look around.") },
    objects,
  };
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// JSON schema handed to the model as Ollama's `format`. Mirrors BuildingSpec.
export const BUILDING_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "Name of the building, 2-4 words, max 28 chars" },
    tagline: { type: "string", description: "One line under the name, max 70 chars" },
    kind: { type: "string", enum: [...KINDS] },
    floors: { type: "integer", minimum: 1, maximum: 8 },
    footprint: {
      type: "object",
      properties: { w: { type: "integer", minimum: 1, maximum: 3 }, d: { type: "integer", minimum: 1, maximum: 3 } },
      required: ["w", "d"],
    },
    palette: {
      type: "object",
      properties: {
        wall: { type: "string", description: "hex like #d9c7a3" },
        roof: { type: "string", description: "hex" },
        accent: { type: "string", description: "hex, used for signs and lights" },
      },
      required: ["wall", "roof", "accent"],
    },
    roof: { type: "string", enum: [...ROOFS] },
    sign: { type: "string", description: "Text on the sign over the door, max 18 chars" },
    features: { type: "array", items: { type: "string", enum: [...FEATURES] }, maxItems: 3 },
    layout: {
      type: "object",
      description: "The walkable inside of the building, as a small isometric room.",
      properties: {
        w: { type: "integer", minimum: 5, maximum: 9, description: "room width in tiles" },
        d: { type: "integer", minimum: 5, maximum: 9, description: "room depth in tiles; the entrance is at the front centre" },
        floor: { type: "string", description: "hex colour of the floor" },
        wall: { type: "string", description: "hex colour of the walls" },
        keeper: {
          type: "object",
          properties: {
            name: { type: "string", description: "who runs the place, max 24 chars, e.g. 'The Lamp Keeper'" },
            greeting: { type: "string", description: "one spoken line when a visitor walks up, max 160 chars, in character" },
          },
          required: ["name", "greeting"],
        },
        objects: {
          type: "array",
          minItems: 4,
          maxItems: 7,
          items: {
            type: "object",
            properties: {
              kind: { type: "string", enum: [...OBJECT_KINDS] },
              x: { type: "integer", minimum: 0, maximum: 8 },
              y: { type: "integer", minimum: 0, maximum: 8 },
              label: { type: "string", description: "what this thing is, max 32 chars" },
              note: { type: "string", description: "what the visitor reads when they walk up to it, max 200 chars, playful and specific" },
            },
            required: ["kind", "x", "y", "label", "note"],
          },
        },
      },
      required: ["w", "d", "floor", "wall", "keeper", "objects"],
    },
    interior: {
      type: "object",
      properties: {
        headline: { type: "string", description: "What you see when you walk in, max 90 chars" },
        body: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          maxItems: 3,
          description: "2-3 short paragraphs, 40-70 words each, concrete and playful",
        },
        rooms: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" }, note: { type: "string" } },
            required: ["name", "note"],
          },
          minItems: 2,
          maxItems: 4,
        },
        question: { type: "string", description: "One question this place asks the visitor" },
      },
      required: ["headline", "body", "rooms", "question"],
    },
  },
  required: ["name", "tagline", "kind", "floors", "footprint", "palette", "roof", "sign", "features", "layout", "interior"],
} as const;
