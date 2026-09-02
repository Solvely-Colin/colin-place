import type { Building, Layout, ObjectKind, RoomObject } from "../../lib/town/types";
import { TILE_H, TILE_W, mix, noise, rgba, shade, toScreen, type Vec } from "./iso";
import type { Scene } from "./draw";

// The inside of a building: a small isometric room with walls, objects to
// walk up to, and a keeper. Everything is drawn from the layout spec.

export const WALL_H = 96;

// ------------------------------------------------------------ auto layout

const KIND_BY_WORD: [RegExp, ObjectKind][] = [
  [/book|library|read|archive|shelf|log/i, "bookshelf"],
  [/desk|review|write|spec|interview|chair/i, "desk"],
  [/lamp|light|beacon|lens|lighthouse/i, "lamp"],
  [/plant|garden|green|grow/i, "plant"],
  [/machine|engine|build|crane|fleet|automation/i, "machine"],
  [/sign|board|wall|stamp/i, "sign"],
  [/telescope|watch|observ|sky|star/i, "telescope"],
  [/counter|shop|bar|desk|front/i, "counter"],
  [/crate|box|drawer|archive|storage/i, "crate"],
  [/terminal|mcp|code|cli|console|clock|printer/i, "terminal"],
  [/fountain|water|pool/i, "fountain"],
  [/bed|sleep|night/i, "bed"],
  [/easel|paint|draw|art|mirror/i, "easel"],
  [/cauldron|brew|potion|kitchen|oven/i, "cauldron"],
  [/piano|music|song/i, "piano"],
  [/fish|aquarium|tank|window/i, "aquarium"],
  [/vending|snack|coffee/i, "vending"],
  [/globe|map|world|platform/i, "globe"],
];

const DECOR_BY_KIND: Record<string, [ObjectKind, string, string][]> = {
  observatory: [["telescope", "The big lens", "Pointed at whatever shipped most recently."], ["globe", "A globe", "Every push on it is a little light. Spin it."], ["lamp", "Reading lamp", "For the changelog. It is long."]],
  library: [["bookshelf", "The stacks", "Every argument ever had in here, shelved by how loud it got."], ["lamp", "Green lamp", "Lit when the debate is in session."], ["chair", "The dissenting chair", "Someone always sits here."]],
  booth: [["counter", "The counter", "Ring the bell. Then answer three questions."], ["chair", "The chair", "It adapts. Slightly unnerving."], ["plant", "A plant", "It has also been interviewed."]],
  lab: [["machine", "The rig", "Runs the same test forty times and keeps every screenshot."], ["terminal", "MCP console", "browser_navigate, browser_snapshot, browser_click, browser_type."], ["crate", "Evidence crates", "Tarballs. Replayable ones."]],
  tower: [["vending", "Vending machine", "Dispenses release notes. Sometimes a snack."], ["plant", "Lobby plant", "Survived seven renovations."], ["terminal", "Elevator panel", "Every floor is a platform. Mind the gap."]],
  house: [["bed", "A small bed", "The mascot naps between questions."], ["plant", "Window plant", "Faces the wire. Perks up on merges."], ["lamp", "Bedside lamp", "Still on. Someone is reading commits."]],
  workshop: [["machine", "The machine", "Six jobs on the schedule. Zero writes without a human."], ["crate", "Parts crate", "Findings, sorted by severity."], ["terminal", "The board", "What is blocked, and on whom."]],
  dome: [["fountain", "A fountain", "It loops. Obviously."], ["plant", "Ferns", "Doing great under the dome."], ["piano", "A piano", "Plays one note per merge."]],
  greenhouse: [["plant", "Tomatoes", "Grown from a description."], ["plant", "Seedlings", "New ideas. Water daily."], ["fountain", "Watering station", "Automatic. Like everything else here."]],
  arcade: [["vending", "Hat machine", "Insert a good idea. Receive a cap."], ["piano", "The jukebox", "Only knows one loop."], ["easel", "The mirror", "Everyone looks a little loopy in it."]],
};

const DEFAULT_KINDS: ObjectKind[] = ["desk", "bookshelf", "lamp", "plant", "terminal", "crate", "sign"];

function kindFor(name: string, note: string, i: number): ObjectKind {
  const hay = name + " " + note;
  for (const [re, kind] of KIND_BY_WORD) if (re.test(hay)) return kind;
  return DEFAULT_KINDS[i % DEFAULT_KINDS.length];
}

/** A layout for buildings that were made before layouts existed. */
export function autoLayout(b: Building, keeper?: { name: string; greeting: string }): Layout {
  const w = 5 + Math.min(3, Math.max(0, b.footprint.w + Math.floor(b.floors / 3)));
  const d = 5 + Math.min(3, Math.max(0, b.footprint.d + Math.floor(b.floors / 4)));
  const rooms = b.interior.rooms.length > 0 ? b.interior.rooms : [{ name: "The foyer", note: b.interior.headline }];
  const spots: [number, number][] = [
    [1, 1],
    [w - 2, 1],
    [1, d - 2],
    [w - 2, d - 3],
    [Math.floor(w / 2), 1],
    [Math.floor(w / 2) + 1, Math.floor(d / 2)],
    [1, Math.floor(d / 2)],
  ];
  const objects: RoomObject[] = rooms.slice(0, 6).map((room, i) => ({
    kind: kindFor(room.name, room.note, i),
    x: spots[i % spots.length][0],
    y: spots[i % spots.length][1],
    label: room.name.slice(0, 32),
    note: room.note.slice(0, 200),
  }));
  const decor = DECOR_BY_KIND[b.kind] ?? DECOR_BY_KIND.workshop;
  let di = 0;
  for (const spot of spots) {
    if (objects.length >= 6) break;
    if (objects.some((o) => o.x === spot[0] && o.y === spot[1])) continue;
    const [kind, label, note] = decor[di % decor.length];
    di += 1;
    objects.push({ kind, x: spot[0], y: spot[1], label, note });
  }
  objects.push({ kind: "rug", x: Math.floor(w / 2), y: Math.floor(d / 2) + 1, label: "A rug", note: "Someone chose this rug on purpose." });
  return {
    w,
    d,
    floor: mixHex(b.palette.wall, "#8a7a62", 0.35),
    wall: mixHex(b.palette.wall, "#ffffff", 0.35),
    keeper: keeper ?? { name: "The keeper", greeting: b.interior.headline },
    objects,
  };
}

function mixHex(a: string, b: string, t: number): string {
  const m = mix(a, b, t).match(/(\d+)/g)!.map(Number);
  return "#" + m.map((v) => v.toString(16).padStart(2, "0")).join("");
}

export function layoutFor(b: Building, keeper?: { name: string; greeting: string }): Layout {
  return b.layout ?? autoLayout(b, keeper);
}

export function roomBlocked(x: number, y: number, layout: Layout): boolean {
  if (x < 0.25 || y < 0.25 || x > layout.w - 0.25 || y > layout.d + 0.9) return true;
  for (const o of layout.objects) {
    if (o.kind === "rug") continue;
    if (x > o.x + 0.1 && x < o.x + 0.9 && y > o.y + 0.1 && y < o.y + 0.9) return true;
  }
  return false;
}

export function roomDoor(layout: Layout): Vec {
  return { x: Math.floor(layout.w / 2) + 0.5, y: layout.d + 0.4 };
}

// --------------------------------------------------------------- drawing

function poly(ctx: CanvasRenderingContext2D, pts: Vec[]) {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}
const up = (p: Vec, h: number): Vec => ({ x: p.x, y: p.y - h });
const lerp = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** An isometric box at tile (x,y) with tile-unit width/depth and pixel height. */
export function isoBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, d: number, h: number, color: string, lift = 0) {
  const A = up(toScreen(x, y), lift);
  const B = up(toScreen(x + w, y), lift);
  const C = up(toScreen(x + w, y + d), lift);
  const D = up(toScreen(x, y + d), lift);
  poly(ctx, [D, C, up(C, h), up(D, h)]);
  ctx.fillStyle = shade(color, -0.12);
  ctx.fill();
  poly(ctx, [C, B, up(B, h), up(C, h)]);
  ctx.fillStyle = shade(color, -0.32);
  ctx.fill();
  poly(ctx, [up(A, h), up(B, h), up(C, h), up(D, h)]);
  ctx.fillStyle = shade(color, 0.05);
  ctx.fill();
  ctx.strokeStyle = rgba("#000000", 0.22);
  ctx.lineWidth = 1;
  poly(ctx, [up(A, h), up(B, h), up(C, h), up(D, h)]);
  ctx.stroke();
}

function shadow(ctx: CanvasRenderingContext2D, c: Vec, rx: number, ry: number) {
  ctx.fillStyle = rgba("#000000", 0.18);
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawRoomShell(s: Scene, layout: Layout) {
  const { ctx, night } = s;
  const { w, d } = layout;
  // Floor
  for (let y = 0; y < d; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const c = toScreen(x + 0.5, y + 0.5);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - TILE_H / 2);
      ctx.lineTo(c.x + TILE_W / 2, c.y);
      ctx.lineTo(c.x, c.y + TILE_H / 2);
      ctx.lineTo(c.x - TILE_W / 2, c.y);
      ctx.closePath();
      ctx.fillStyle = mix((x + y) % 2 === 0 ? layout.floor : shadeHex(layout.floor, -0.06), "#1a1a24", night * 0.35);
      ctx.fill();
      ctx.strokeStyle = rgba("#000000", 0.08);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  // Doormat at the entrance
  const door = roomDoor(layout);
  const dm = toScreen(door.x, layout.d - 0.5);
  ctx.fillStyle = rgba("#7a3b2e", 0.75);
  poly(ctx, [
    { x: dm.x, y: dm.y - TILE_H * 0.3 },
    { x: dm.x + TILE_W * 0.3, y: dm.y },
    { x: dm.x, y: dm.y + TILE_H * 0.3 },
    { x: dm.x - TILE_W * 0.3, y: dm.y },
  ]);
  ctx.fill();

  // Walls: along x=0 (left) and y=0 (right, back)
  const wallL = mix(layout.wall, "#1a1a24", 0.05 + night * 0.4);
  const wallR = mix(layout.wall, "#1a1a24", 0.2 + night * 0.4);
  const O = toScreen(0, 0);
  const L = toScreen(0, d);
  const R = toScreen(w, 0);
  poly(ctx, [O, L, up(L, WALL_H), up(O, WALL_H)]);
  ctx.fillStyle = wallL;
  ctx.fill();
  poly(ctx, [O, R, up(R, WALL_H), up(O, WALL_H)]);
  ctx.fillStyle = wallR;
  ctx.fill();
  // Baseboards
  ctx.strokeStyle = rgba("#000000", 0.35);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(L.x, L.y);
  ctx.lineTo(O.x, O.y);
  ctx.lineTo(R.x, R.y);
  ctx.stroke();
  // Windows: the light outside follows the time of day.
  const glass = mix("#bfe3ff", "#0d1230", night);
  const winL = Math.max(1, Math.floor(d / 3));
  for (let i = 0; i < winL; i += 1) {
    const t0 = (i + 0.55) / winL - 0.12;
    const t1 = t0 + 0.24;
    const a = lerp(O, L, Math.max(0.05, t0));
    const b = lerp(O, L, Math.min(0.95, t1));
    poly(ctx, [up(a, 38), up(b, 38), up(b, 74), up(a, 74)]);
    ctx.fillStyle = glass;
    ctx.fill();
    ctx.strokeStyle = shade(layout.wall, -0.4);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  const winR = Math.max(1, Math.floor(w / 3));
  for (let i = 0; i < winR; i += 1) {
    const t0 = (i + 0.55) / winR - 0.12;
    const t1 = t0 + 0.24;
    const a = lerp(O, R, Math.max(0.05, t0));
    const b = lerp(O, R, Math.min(0.95, t1));
    poly(ctx, [up(a, 38), up(b, 38), up(b, 74), up(a, 74)]);
    ctx.fillStyle = glass;
    ctx.fill();
    ctx.strokeStyle = shade(layout.wall, -0.4);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function shadeHex(hex: string, amt: number): string {
  return mixHex(hex, amt < 0 ? "#000000" : "#ffffff", Math.abs(amt));
}

// ------------------------------------------------------------- objects

export function drawObject(s: Scene, o: RoomObject, accent: string, near: boolean) {
  const { ctx, t, night } = s;
  const c = toScreen(o.x + 0.5, o.y + 0.5);
  const wood = "#8b5a3c";
  const dark = "#2c2a2e";
  const metal = "#9aa3ad";
  if (o.kind !== "rug") shadow(ctx, { x: c.x, y: c.y + 2 }, 20, 9);
  switch (o.kind) {
    case "desk": {
      isoBox(ctx, o.x + 0.1, o.y + 0.2, 0.8, 0.6, 16, wood);
      isoBox(ctx, o.x + 0.55, o.y + 0.3, 0.3, 0.05, 14, dark, 16);
      const m = toScreen(o.x + 0.7, o.y + 0.32);
      ctx.fillStyle = mix(accent, "#ffffff", 0.3);
      ctx.fillRect(m.x - 7, m.y - 30 - 8 * Math.abs(Math.sin(t * 0.6)) * 0, 12, 8);
      break;
    }
    case "bookshelf": {
      isoBox(ctx, o.x + 0.15, o.y + 0.1, 0.7, 0.35, 52, wood);
      const a = toScreen(o.x + 0.15, o.y + 0.45);
      const b = toScreen(o.x + 0.85, o.y + 0.45);
      for (let shelf = 0; shelf < 3; shelf += 1) {
        const lift = 8 + shelf * 15;
        for (let k = 0; k < 6; k += 1) {
          const p0 = lerp(a, b, k / 6 + 0.02);
          const p1 = lerp(a, b, (k + 1) / 6 - 0.02);
          const hue = ["#c0392b", "#2980b9", "#27ae60", "#f39c12", accent, "#8e44ad"][(k + shelf) % 6];
          poly(ctx, [up(p0, lift), up(p1, lift), up(p1, lift + 10 + noise(k, shelf) * 3), up(p0, lift + 10 + noise(k, shelf) * 3)]);
          ctx.fillStyle = hue;
          ctx.fill();
        }
      }
      break;
    }
    case "lamp": {
      ctx.strokeStyle = metal;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x, c.y - 44);
      ctx.stroke();
      poly(ctx, [{ x: c.x - 14, y: c.y - 44 }, { x: c.x + 14, y: c.y - 44 }, { x: c.x + 8, y: c.y - 58 }, { x: c.x - 8, y: c.y - 58 }]);
      ctx.fillStyle = mix(accent, "#ffffff", 0.2);
      ctx.fill();
      const g = ctx.createRadialGradient(c.x, c.y - 40, 4, c.x, c.y - 40, 60);
      g.addColorStop(0, rgba("#ffe6a3", 0.35 + night * 0.35));
      g.addColorStop(1, rgba("#ffe6a3", 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y - 40, 60, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "plant": {
      poly(ctx, [{ x: c.x - 9, y: c.y - 2 }, { x: c.x + 9, y: c.y - 2 }, { x: c.x + 7, y: c.y - 16 }, { x: c.x - 7, y: c.y - 16 }]);
      ctx.fillStyle = "#b5563a";
      ctx.fill();
      for (let i = 0; i < 5; i += 1) {
        const ang = (i / 5) * Math.PI * 2 + Math.sin(t + i) * 0.1;
        ctx.fillStyle = i % 2 ? "#3f8f4a" : "#57a85f";
        ctx.beginPath();
        ctx.ellipse(c.x + Math.cos(ang) * 9, c.y - 24 + Math.sin(ang) * 5, 9, 5, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "machine": {
      isoBox(ctx, o.x + 0.1, o.y + 0.1, 0.8, 0.8, 34, "#5d6b78");
      const f = toScreen(o.x + 0.55, o.y + 0.9);
      for (let i = 0; i < 3; i += 1) {
        ctx.fillStyle = i === Math.floor(t * 2) % 3 ? accent : "#2c2a2e";
        ctx.beginPath();
        ctx.arc(f.x - 10 + i * 8, f.y - 20, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "#2c2a2e";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(f.x + 4, f.y - 8, 5, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "sign": {
      ctx.strokeStyle = wood;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x, c.y - 30);
      ctx.stroke();
      ctx.fillStyle = "#f3ead9";
      ctx.fillRect(c.x - 24, c.y - 48, 48, 20);
      ctx.strokeStyle = wood;
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x - 24, c.y - 48, 48, 20);
      ctx.fillStyle = "#2c2a2e";
      ctx.font = `600 9px ${s.fonts.mono}`;
      ctx.textAlign = "center";
      ctx.fillText(o.label.slice(0, 10), c.x, c.y - 35);
      break;
    }
    case "telescope": {
      ctx.strokeStyle = metal;
      ctx.lineWidth = 2;
      for (const dx of [-10, 0, 10]) {
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - 28);
        ctx.lineTo(c.x + dx, c.y);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(c.x, c.y - 30);
      ctx.rotate(-0.7 + Math.sin(t * 0.3) * 0.05);
      ctx.fillStyle = "#3b4a5a";
      ctx.fillRect(-6, -28, 12, 34);
      ctx.fillStyle = accent;
      ctx.fillRect(-7, -30, 14, 4);
      ctx.restore();
      break;
    }
    case "counter": {
      isoBox(ctx, o.x + 0.05, o.y + 0.25, 0.9, 0.5, 22, wood);
      const bell = toScreen(o.x + 0.75, o.y + 0.5);
      ctx.fillStyle = "#e0b04a";
      ctx.beginPath();
      ctx.arc(bell.x, bell.y - 27, 4, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(bell.x - 5, bell.y - 27, 10, 2);
      break;
    }
    case "crate": {
      isoBox(ctx, o.x + 0.2, o.y + 0.2, 0.6, 0.6, 22, "#b08a5a");
      const a = toScreen(o.x + 0.2, o.y + 0.8);
      const b = toScreen(o.x + 0.8, o.y + 0.8);
      ctx.strokeStyle = rgba("#000000", 0.35);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y - 22);
      ctx.moveTo(a.x, a.y - 22);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      break;
    }
    case "terminal": {
      isoBox(ctx, o.x + 0.15, o.y + 0.25, 0.7, 0.5, 14, dark);
      const sc = toScreen(o.x + 0.5, o.y + 0.5);
      ctx.fillStyle = "#101a12";
      ctx.fillRect(sc.x - 13, sc.y - 40, 26, 20);
      ctx.fillStyle = "#4ade80";
      for (let i = 0; i < 3; i += 1) {
        const wline = 8 + ((i * 7 + Math.floor(t * 3)) % 12);
        ctx.fillRect(sc.x - 11, sc.y - 37 + i * 5, wline, 2);
      }
      if (Math.floor(t * 2) % 2 === 0) ctx.fillRect(sc.x - 11 + 8, sc.y - 22, 3, 2);
      break;
    }
    case "chair": {
      isoBox(ctx, o.x + 0.3, o.y + 0.3, 0.4, 0.4, 12, wood);
      isoBox(ctx, o.x + 0.3, o.y + 0.3, 0.4, 0.08, 18, wood, 12);
      break;
    }
    case "rug": {
      const r = toScreen(o.x + 0.5, o.y + 0.5);
      poly(ctx, [{ x: r.x, y: r.y - TILE_H * 0.7 }, { x: r.x + TILE_W * 0.7, y: r.y }, { x: r.x, y: r.y + TILE_H * 0.7 }, { x: r.x - TILE_W * 0.7, y: r.y }]);
      ctx.fillStyle = rgba(accent, 0.45);
      ctx.fill();
      ctx.strokeStyle = rgba(accent, 0.8);
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }
    case "fountain": {
      ctx.fillStyle = "#9aa3ad";
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 22, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5fb7e8";
      ctx.beginPath();
      ctx.ellipse(c.x, c.y - 2, 17, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 8; i += 1) {
        const ph = (t * 0.9 + i / 8) % 1;
        ctx.fillStyle = rgba("#bfe8ff", 1 - ph);
        ctx.beginPath();
        ctx.arc(c.x + Math.sin(i) * 10 * ph, c.y - 6 - Math.sin(ph * Math.PI) * 26, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "bed": {
      isoBox(ctx, o.x + 0.1, o.y + 0.15, 0.8, 0.7, 12, "#c9d7e8");
      isoBox(ctx, o.x + 0.12, o.y + 0.17, 0.3, 0.3, 6, "#ffffff", 12);
      break;
    }
    case "easel": {
      ctx.strokeStyle = wood;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(c.x - 12, c.y);
      ctx.lineTo(c.x, c.y - 48);
      ctx.lineTo(c.x + 12, c.y);
      ctx.stroke();
      ctx.fillStyle = "#fbf7ee";
      ctx.fillRect(c.x - 14, c.y - 40, 28, 24);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(c.x - 2, c.y - 28, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2980b9";
      ctx.fillRect(c.x + 2, c.y - 24, 8, 6);
      break;
    }
    case "cauldron": {
      ctx.fillStyle = "#2c2a2e";
      ctx.beginPath();
      ctx.ellipse(c.x, c.y - 10, 16, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = mix(accent, "#7cf29a", 0.5);
      ctx.beginPath();
      ctx.ellipse(c.x, c.y - 20, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 4; i += 1) {
        const ph = (t * 0.7 + i / 4) % 1;
        ctx.fillStyle = rgba("#b4ffc7", 1 - ph);
        ctx.beginPath();
        ctx.arc(c.x - 8 + i * 5, c.y - 22 - ph * 22, 2 + ph * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "piano": {
      isoBox(ctx, o.x + 0.1, o.y + 0.2, 0.8, 0.5, 26, "#1d1b1f");
      const a = toScreen(o.x + 0.1, o.y + 0.7);
      const b = toScreen(o.x + 0.9, o.y + 0.7);
      for (let k = 0; k < 10; k += 1) {
        const p0 = lerp(a, b, k / 10 + 0.01);
        const p1 = lerp(a, b, (k + 1) / 10 - 0.01);
        poly(ctx, [up(p0, 26), up(p1, 26), { x: p1.x - 4, y: p1.y - 22 }, { x: p0.x - 4, y: p0.y - 22 }]);
        ctx.fillStyle = k === Math.floor(t * 4) % 10 ? accent : "#f7f7f2";
        ctx.fill();
      }
      break;
    }
    case "aquarium": {
      isoBox(ctx, o.x + 0.15, o.y + 0.25, 0.7, 0.5, 8, wood);
      const a = toScreen(o.x + 0.15, o.y + 0.75);
      const b = toScreen(o.x + 0.85, o.y + 0.75);
      poly(ctx, [up(a, 8), up(b, 8), up(b, 36), up(a, 36)]);
      ctx.fillStyle = rgba("#5fb7e8", 0.55);
      ctx.fill();
      ctx.strokeStyle = rgba("#ffffff", 0.6);
      ctx.stroke();
      const fx = lerp(a, b, 0.5 + Math.sin(t * 1.3) * 0.32);
      ctx.fillStyle = "#ff8c42";
      ctx.beginPath();
      ctx.ellipse(fx.x, fx.y - 22 + Math.sin(t * 2.6) * 3, 4, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "vending": {
      isoBox(ctx, o.x + 0.2, o.y + 0.15, 0.6, 0.6, 50, "#c0392b");
      const f = toScreen(o.x + 0.2, o.y + 0.75);
      const g = toScreen(o.x + 0.8, o.y + 0.75);
      poly(ctx, [up(f, 16), up(g, 16), up(g, 44), up(f, 44)]);
      ctx.fillStyle = rgba("#bfe3ff", 0.7 + Math.sin(t * 3) * 0.05);
      ctx.fill();
      break;
    }
    case "globe": {
      ctx.strokeStyle = metal;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x, c.y - 18);
      ctx.stroke();
      ctx.fillStyle = "#2f7fb8";
      ctx.beginPath();
      ctx.arc(c.x, c.y - 32, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba("#ffffff", 0.6);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y - 32, 14 * Math.abs(Math.cos(t * 0.8)), 14, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#57a85f";
      ctx.beginPath();
      ctx.ellipse(c.x - 4 + Math.cos(t * 0.8) * 6, c.y - 35, 5, 3, 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  if (near) {
    const top = c.y - 66;
    ctx.font = `600 11px ${s.fonts.display}`;
    ctx.textAlign = "center";
    const tw = ctx.measureText(o.label).width + 14;
    ctx.fillStyle = "#101010";
    ctx.beginPath();
    ctx.roundRect(c.x - tw / 2, top - 10, tw, 18, 4);
    ctx.fill();
    ctx.fillStyle = "#f6f6f3";
    ctx.fillText(o.label, c.x, top + 3);
  }
}

// -------------------------------------------------------------- figures

export interface Look {
  shirt: string;
  skin: string;
  hair: string;
  cap: boolean;
  glasses: boolean;
  mustache: boolean;
  hat: "none" | "beanie" | "top" | "cone";
}

export const COLIN_LOOK: Look = { shirt: "#1f1d1b", skin: "#f1c9a5", hair: "#c98a4a", cap: true, glasses: true, mustache: true, hat: "none" };

export function keeperLook(seed: string, accent: string): Look {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const skins = ["#f1c9a5", "#d9a982", "#b07a52", "#8a5a3a", "#f5dcc3"];
  const hairs = ["#2c2a2e", "#c98a4a", "#7a4a2a", "#e8e0d0", "#b8322f"];
  const hats: Look["hat"][] = ["none", "beanie", "top", "cone", "none"];
  return {
    shirt: accent,
    skin: skins[h % skins.length],
    hair: hairs[(h >> 3) % hairs.length],
    cap: false,
    glasses: (h >> 6) % 3 === 0,
    mustache: (h >> 8) % 4 === 0,
    hat: hats[(h >> 10) % hats.length],
  };
}

export function drawFigure(s: Scene, x: number, y: number, moving: boolean, facing: number, look: Look) {
  const { ctx, t } = s;
  const c = toScreen(x, y);
  const bob = moving ? Math.abs(Math.sin(t * 9)) * 2.5 : 0;
  shadow(ctx, { x: c.x, y: c.y + 1 }, 9, 4.5);
  const y0 = c.y - bob;
  ctx.strokeStyle = "#2b2622";
  ctx.lineWidth = 3;
  const step = moving ? Math.sin(t * 9) * 3 : 0;
  ctx.beginPath();
  ctx.moveTo(c.x - 3, y0 - 8);
  ctx.lineTo(c.x - 3 + step, y0);
  ctx.moveTo(c.x + 3, y0 - 8);
  ctx.lineTo(c.x + 3 - step, y0);
  ctx.stroke();
  ctx.fillStyle = look.shirt;
  ctx.beginPath();
  ctx.roundRect(c.x - 7, y0 - 22, 14, 15, 3);
  ctx.fill();
  ctx.fillStyle = look.skin;
  ctx.beginPath();
  ctx.arc(c.x, y0 - 28, 6.5, 0, Math.PI * 2);
  ctx.fill();
  const dir = facing >= 0 ? 1 : -1;
  if (!look.cap && look.hat !== "top") {
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    ctx.arc(c.x, y0 - 30, 6.6, Math.PI, Math.PI * 2);
    ctx.fill();
  }
  if (look.glasses) {
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(c.x - 2.5 * dir, y0 - 28.5, 2, 0, Math.PI * 2);
    ctx.arc(c.x + 2.5 * dir, y0 - 28.5, 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (look.mustache) {
    ctx.strokeStyle = shade(look.hair, -0.2);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(c.x - 3, y0 - 25.2);
    ctx.quadraticCurveTo(c.x, y0 - 23.8, c.x + 3, y0 - 25.2);
    ctx.stroke();
  }
  if (look.cap) {
    ctx.fillStyle = "#efe6d3";
    ctx.beginPath();
    ctx.arc(c.x, y0 - 30, 6.8, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(c.x - 7 + (dir < 0 ? -3 : 0), y0 - 30.5, 13, 2);
    ctx.strokeStyle = "#ff8c42";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(c.x - 1.4, y0 - 32.5, 1.5, 1, 0, 0, Math.PI * 2);
    ctx.ellipse(c.x + 1.4, y0 - 32.5, 1.5, 1, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (look.hat === "beanie") {
    ctx.fillStyle = shade(look.shirt, 0.25);
    ctx.beginPath();
    ctx.arc(c.x, y0 - 30.5, 7, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(c.x - 7, y0 - 31, 14, 2.5);
  } else if (look.hat === "top") {
    ctx.fillStyle = "#1d1b1f";
    ctx.fillRect(c.x - 8, y0 - 33, 16, 2);
    ctx.fillRect(c.x - 5, y0 - 44, 10, 11);
  } else if (look.hat === "cone") {
    poly(ctx, [{ x: c.x - 7, y: y0 - 32 }, { x: c.x + 7, y: y0 - 32 }, { x: c.x, y: y0 - 48 }]);
    ctx.fillStyle = shade(look.shirt, -0.15);
    ctx.fill();
  }
}

export function drawChip(s: Scene, x: number, y: number, text: string, dy = 0) {
  const { ctx } = s;
  const c = toScreen(x, y);
  ctx.font = `500 10px ${s.fonts.mono}`;
  ctx.textAlign = "center";
  const tw = ctx.measureText(text).width + 12;
  ctx.fillStyle = rgba("#101010", 0.8);
  ctx.beginPath();
  ctx.roundRect(c.x - tw / 2, c.y + dy - 8, tw, 16, 4);
  ctx.fill();
  ctx.fillStyle = "#f6f6f3";
  ctx.fillText(text, c.x, c.y + dy + 4);
}

export function drawBubble(s: Scene, x: number, y: number, text: string) {
  const { ctx } = s;
  const c = toScreen(x, y);
  ctx.font = `500 12px ${s.fonts.display}`;
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > 190 && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  const width = Math.min(210, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20);
  const height = lines.length * 16 + 14;
  const bx = c.x - width / 2;
  const by = c.y - 58 - height;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = rgba("#101010", 0.2);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bx, by, width, height, 8);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(c.x - 5, by + height);
  ctx.lineTo(c.x, by + height + 7);
  ctx.lineTo(c.x + 5, by + height);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.fillStyle = "#101010";
  ctx.textAlign = "left";
  lines.forEach((l, i) => ctx.fillText(l, bx + 10, by + 18 + i * 16));
}
