import type { Building, BuildingSpec } from "../../lib/town/types";
import { FLOOR_H, TILE_H, TILE_W, mix, noise, rgba, shade, toScreen, type Vec } from "./iso";
import { LOT, LOTS, ROAD, lotOrigin, type Placed } from "./world";
import { COLIN_LOOK, drawFigure } from "./room";

// Everything that touches the canvas. The scene is painted back-to-front
// (painter's algorithm by grid depth), then a night tint, then lights.

export interface Scene {
  ctx: CanvasRenderingContext2D;
  t: number; // seconds
  night: number; // 0 day .. 1 night
  fonts: { display: string; mono: string };
}

function diamond(ctx: CanvasRenderingContext2D, c: Vec, w = TILE_W, h = TILE_H) {
  ctx.beginPath();
  ctx.moveTo(c.x, c.y - h / 2);
  ctx.lineTo(c.x + w / 2, c.y);
  ctx.lineTo(c.x, c.y + h / 2);
  ctx.lineTo(c.x - w / 2, c.y);
  ctx.closePath();
}

function poly(ctx: CanvasRenderingContext2D, pts: Vec[]) {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

const up = (p: Vec, h: number): Vec => ({ x: p.x, y: p.y - h });
const lerp = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

// ---------------------------------------------------------------- ground

export function drawGround(s: Scene, minX: number, maxX: number, minY: number, maxY: number) {
  const { ctx, night } = s;
  const grass = mix("#8db56a", "#2f3d3a", night * 0.7);
  const grass2 = mix("#88af64", "#2c3936", night * 0.7);
  const path = mix("#cdb98e", "#3a342b", night * 0.65);
  const pathEdge = mix("#b9a377", "#2f2a23", night * 0.65);
  for (let gy = minY; gy <= maxY; gy += 1) {
    for (let gx = minX; gx <= maxX; gx += 1) {
      const c = toScreen(gx + 0.5, gy + 0.5);
      const mx = ((gx % (LOT + ROAD)) + LOT + ROAD) % (LOT + ROAD);
      const my = ((gy % (LOT + ROAD)) + LOT + ROAD) % (LOT + ROAD);
      const onRoad = mx >= LOT || my >= LOT;
      diamond(ctx, c);
      if (onRoad) {
        ctx.fillStyle = path;
        ctx.fill();
        ctx.strokeStyle = pathEdge;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      } else {
        ctx.fillStyle = noise(gx, gy, 3) > 0.5 ? grass : grass2;
        ctx.fill();
      }
    }
  }
}

export function drawEmptyLot(s: Scene, lotIndex: number, highlight: boolean) {
  const { ctx } = s;
  const o = lotOrigin(LOTS[lotIndex]);
  const pts = [
    toScreen(o.tx + 0.3, o.ty + 0.3),
    toScreen(o.tx + LOT - 0.3, o.ty + 0.3),
    toScreen(o.tx + LOT - 0.3, o.ty + LOT - 0.3),
    toScreen(o.tx + 0.3, o.ty + LOT - 0.3),
  ];
  if (!highlight) return;
  poly(ctx, pts);
  ctx.strokeStyle = rgba("#2b45ff", 0.9);
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  {
    const c = toScreen(o.tx + LOT / 2, o.ty + LOT / 2);
    const label = "next lot · describe a building";
    ctx.font = `500 11px ${s.fonts.mono}`;
    ctx.textAlign = "center";
    const tw = ctx.measureText(label).width + 14;
    ctx.fillStyle = "#f6f6f3";
    ctx.beginPath();
    ctx.roundRect(c.x - tw / 2, c.y - 8, tw, 18, 3);
    ctx.fill();
    ctx.strokeStyle = "#2b45ff";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#2b45ff";
    ctx.fillText(label, c.x, c.y + 5);
  }
}

export function drawTree(s: Scene, gx: number, gy: number, seed: number) {
  const { ctx, night, t } = s;
  const c = toScreen(gx, gy);
  const size = 8 + noise(seed, 1) * 8;
  const sway = Math.sin(t * 0.8 + seed) * 1.2;
  ctx.fillStyle = rgba("#000000", 0.18);
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + 2, size * 0.9, size * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = mix("#5a3a22", "#1c1510", night * 0.6);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(c.x, c.y);
  ctx.lineTo(c.x + sway * 0.3, c.y - size * 1.1);
  ctx.stroke();
  const leaf = mix(noise(seed, 2) > 0.5 ? "#4f8a3f" : "#6aa04a", "#1f2d24", night * 0.65);
  ctx.fillStyle = leaf;
  ctx.beginPath();
  ctx.arc(c.x + sway, c.y - size * 1.4, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(leaf, 0.18);
  ctx.beginPath();
  ctx.arc(c.x + sway - size * 0.35, c.y - size * 1.7, size * 0.55, 0, Math.PI * 2);
  ctx.fill();
}

// ------------------------------------------------------------- buildings

interface Box {
  A: Vec;
  B: Vec;
  C: Vec;
  D: Vec;
  H: number;
}

function box(p: Placed): Box {
  return {
    A: toScreen(p.bx, p.by),
    B: toScreen(p.bx + p.w, p.by),
    C: toScreen(p.bx + p.w, p.by + p.d),
    D: toScreen(p.bx, p.by + p.d),
    H: heightOf(p.building),
  };
}

export function heightOf(b: BuildingSpec): number {
  const tall = b.kind === "tower" || b.kind === "observatory" ? 1.15 : 1;
  return b.floors * FLOOR_H * tall;
}

function windowsOnFace(
  s: Scene,
  from: Vec,
  to: Vec,
  H: number,
  floors: number,
  cols: number,
  accent: string,
  seed: number,
  skipCol: number,
  lights: boolean
) {
  const { ctx, night } = s;
  const floorH = H / floors;
  for (let f = 0; f < floors; f += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (f === 0 && c === skipCol) continue;
      const lit = noise(seed, f, c) > 0.35;
      if (lights && !lit) continue;
      const t0 = (c + 0.25) / cols;
      const t1 = (c + 0.75) / cols;
      const base0 = lerp(from, to, t0);
      const base1 = lerp(from, to, t1);
      const y0 = H - f * floorH - floorH * 0.22;
      const y1 = H - f * floorH - floorH * 0.72;
      poly(ctx, [up(base0, y0), up(base1, y0), up(base1, y1), up(base0, y1)]);
      if (lights) {
        ctx.fillStyle = rgba(accent, 0.55 * night);
        ctx.fill();
      } else {
        ctx.fillStyle = night > 0.5 && lit ? mix(accent, "#fff6df", 0.5) : rgba("#1a2430", 0.55);
        ctx.fill();
      }
    }
  }
}

export function drawBuilding(s: Scene, p: Placed, opts: { hover?: boolean; rise?: number } = {}) {
  const { ctx, t, night } = s;
  const b = p.building;
  const bx = box(p);
  const rise = opts.rise ?? 1;
  const H = bx.H * rise;
  const { A, B, C, D } = bx;
  const wall = b.palette.wall;
  const leftFace = mix(wall, "#0e0d0b", 0.08 + night * 0.35);
  const rightFace = mix(wall, "#0e0d0b", 0.3 + night * 0.35);
  const topFace = mix(b.palette.roof, "#0e0d0b", night * 0.4);

  // Shadow
  ctx.fillStyle = rgba("#000000", 0.22);
  poly(ctx, [A, B, { x: C.x + 10, y: C.y + 5 }, { x: D.x + 10, y: D.y + 5 }]);
  ctx.fill();

  if (b.features.includes("garden")) {
    for (let i = 0; i < 9; i += 1) {
      const gx = p.bx - 0.3 + noise(p.lotIndex, i, 7) * (p.w + 0.6);
      const gy = p.by + p.d + 0.15 + noise(p.lotIndex, i, 8) * 0.5;
      const c = toScreen(gx, gy);
      ctx.fillStyle = mix(i % 3 === 0 ? b.palette.accent : "#5da05a", "#1f2d24", night * 0.5);
      ctx.beginPath();
      ctx.arc(c.x, c.y - 3, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Faces
  poly(ctx, [D, C, up(C, H), up(D, H)]);
  ctx.fillStyle = leftFace;
  ctx.fill();
  poly(ctx, [C, B, up(B, H), up(C, H)]);
  ctx.fillStyle = rightFace;
  ctx.fill();
  // Edge lines
  ctx.strokeStyle = rgba("#000000", 0.25);
  ctx.lineWidth = 1;
  poly(ctx, [D, C, up(C, H), up(D, H)]);
  ctx.stroke();
  poly(ctx, [C, B, up(B, H), up(C, H)]);
  ctx.stroke();

  // Windows
  const floors = b.floors;
  const doorIdx = p.doorCol - p.bx;
  windowsOnFace(s, D, C, H, floors, p.w, b.palette.accent, p.lotIndex * 7 + 1, doorIdx, false);
  windowsOnFace(s, C, B, H, floors, p.d, b.palette.accent, p.lotIndex * 7 + 2, -1, false);

  // Door on the +y (left) face, in column doorIdx.
  const floorH = H / floors;
  const d0 = lerp(D, C, (doorIdx + 0.2) / p.w);
  const d1 = lerp(D, C, (doorIdx + 0.8) / p.w);
  poly(ctx, [d0, d1, up(d1, floorH * 0.8), up(d0, floorH * 0.8)]);
  ctx.fillStyle = mix(b.palette.roof, "#0e0d0b", 0.4);
  ctx.fill();
  ctx.strokeStyle = b.palette.accent;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  if (b.features.includes("awning")) {
    const a0 = lerp(D, C, (doorIdx - 0.15) / p.w);
    const a1 = lerp(D, C, (doorIdx + 1.15) / p.w);
    const top = floorH * 0.95;
    poly(ctx, [up(a0, top), up(a1, top), { x: a1.x - 4, y: a1.y - top + 9 }, { x: a0.x - 4, y: a0.y - top + 9 }]);
    ctx.fillStyle = b.palette.accent;
    ctx.fill();
    ctx.strokeStyle = rgba("#ffffff", 0.6);
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (b.features.includes("balcony") && floors > 1) {
    const level = H - floorH * Math.min(floors - 1, 1);
    const r0 = lerp(C, B, 0.15);
    const r1 = lerp(C, B, 0.85);
    poly(ctx, [up(r0, level), up(r1, level), { x: r1.x + 6, y: r1.y - level + 4 }, { x: r0.x + 6, y: r0.y - level + 4 }]);
    ctx.fillStyle = shade(wall, -0.35);
    ctx.fill();
    ctx.strokeStyle = b.palette.accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(r0.x + 6, r0.y - level + 4);
    ctx.lineTo(r0.x + 6, r0.y - level - 6);
    ctx.lineTo(r1.x + 6, r1.y - level - 6);
    ctx.lineTo(r1.x + 6, r1.y - level + 4);
    ctx.stroke();
  }

  if (b.features.includes("banner")) {
    const r = lerp(C, B, 0.5);
    const top = H - 4;
    poly(ctx, [up(r, top), { x: r.x + 9, y: r.y - top - 4 }, { x: r.x + 9, y: r.y - top + H * 0.5 }, { x: r.x + 4.5, y: r.y - top + H * 0.5 + 6 }, up(r, top - H * 0.5)]);
    ctx.fillStyle = b.palette.accent;
    ctx.fill();
  }

  // Roof
  const At = up(A, H);
  const Bt = up(B, H);
  const Ct = up(C, H);
  const Dt = up(D, H);
  ctx.fillStyle = topFace;
  switch (b.roof) {
    case "gable": {
      const RH = 14 + Math.min(p.w, p.d) * 4;
      const ra = up(lerp(At, Dt, 0.5), RH);
      const rb = up(lerp(Bt, Ct, 0.5), RH);
      poly(ctx, [At, Bt, rb, ra]);
      ctx.fillStyle = shade(b.palette.roof, -0.15 - night * 0.3);
      ctx.fill();
      poly(ctx, [Dt, Ct, rb, ra]);
      ctx.fillStyle = mix(b.palette.roof, "#0e0d0b", night * 0.4);
      ctx.fill();
      poly(ctx, [Bt, Ct, rb]);
      ctx.fillStyle = mix(rightFace, b.palette.roof, 0.2);
      ctx.fill();
      ctx.strokeStyle = rgba("#000000", 0.25);
      poly(ctx, [Dt, Ct, rb, ra]);
      ctx.stroke();
      break;
    }
    case "spire": {
      const RH = 26 + floors * 3;
      const apex = up(lerp(At, Ct, 0.5), RH);
      poly(ctx, [Dt, Ct, apex]);
      ctx.fillStyle = mix(b.palette.roof, "#0e0d0b", night * 0.4);
      ctx.fill();
      poly(ctx, [Ct, Bt, apex]);
      ctx.fillStyle = shade(b.palette.roof, -0.3 - night * 0.2);
      ctx.fill();
      ctx.strokeStyle = b.palette.accent;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(apex.x, apex.y);
      ctx.lineTo(apex.x, apex.y - 10);
      ctx.stroke();
      break;
    }
    case "dome": {
      poly(ctx, [At, Bt, Ct, Dt]);
      ctx.fillStyle = shade(wall, -0.2 - night * 0.3);
      ctx.fill();
      const c = lerp(At, Ct, 0.5);
      const rx = Math.abs(Bt.x - Dt.x) * 0.38;
      const ry = rx * 0.9;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, rx, ry, 0, Math.PI, Math.PI * 2);
      ctx.fillStyle = mix(b.palette.roof, "#0e0d0b", night * 0.4);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, rx, rx * 0.45, 0, 0, Math.PI);
      ctx.fillStyle = shade(b.palette.roof, -0.3);
      ctx.fill();
      // highlight
      ctx.beginPath();
      ctx.ellipse(c.x - rx * 0.3, c.y - ry * 0.45, rx * 0.25, ry * 0.3, -0.5, 0, Math.PI * 2);
      ctx.fillStyle = rgba("#ffffff", 0.18);
      ctx.fill();
      break;
    }
    case "sawtooth": {
      const teeth = Math.max(2, p.w);
      const RH = 12;
      for (let i = 0; i < teeth; i += 1) {
        const t0 = i / teeth;
        const t1 = (i + 1) / teeth;
        const a0 = lerp(At, Bt, t0);
        const d0 = lerp(Dt, Ct, t0);
        const a1 = lerp(At, Bt, t1);
        const d1 = lerp(Dt, Ct, t1);
        poly(ctx, [up(a0, RH), up(d0, RH), d1, a1]);
        ctx.fillStyle = mix(b.palette.roof, "#0e0d0b", night * 0.4);
        ctx.fill();
        poly(ctx, [d0, up(d0, RH), up(a0, RH), a0]);
        ctx.fillStyle = rgba(b.palette.accent, 0.5);
        ctx.fill();
      }
      break;
    }
    default: {
      poly(ctx, [At, Bt, Ct, Dt]);
      ctx.fill();
      // Parapet
      const inset = 0.12;
      const iA = lerp(At, Ct, inset);
      const iC = lerp(Ct, At, inset);
      const iB = lerp(Bt, Dt, inset);
      const iD = lerp(Dt, Bt, inset);
      poly(ctx, [iA, iB, iC, iD]);
      ctx.fillStyle = shade(b.palette.roof, -0.18 - night * 0.2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = rgba("#000000", 0.25);
  ctx.lineWidth = 1;
  poly(ctx, [At, Bt, Ct, Dt]);
  ctx.stroke();

  // Roof features
  const roofTop = (b.roof === "gable" ? 14 + Math.min(p.w, p.d) * 4 : b.roof === "spire" ? 26 + floors * 3 : b.roof === "dome" ? Math.abs(Bt.x - Dt.x) * 0.34 : 0) + H;
  if (b.features.includes("antenna")) {
    const base = up(lerp(At, Bt, 0.75), H);
    ctx.strokeStyle = shade(wall, -0.5);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(base.x, base.y - 26);
    ctx.stroke();
    const blink = (Math.sin(t * 3 + p.lotIndex) + 1) / 2;
    ctx.fillStyle = rgba("#ff4d4d", 0.4 + blink * 0.6);
    ctx.beginPath();
    ctx.arc(base.x, base.y - 27, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (b.features.includes("chimney")) {
    const cpos = up(lerp(At, Bt, 0.3), roofTop - (b.roof === "flat" ? 0 : 6));
    ctx.fillStyle = shade(wall, -0.4);
    ctx.fillRect(cpos.x - 4, cpos.y - 14, 8, 14);
    ctx.fillStyle = shade(wall, -0.55);
    ctx.fillRect(cpos.x - 5, cpos.y - 16, 10, 3);
    for (let i = 0; i < 3; i += 1) {
      const ph = (t * 0.5 + i * 0.33 + p.lotIndex * 0.1) % 1;
      ctx.fillStyle = rgba("#f3ead9", (1 - ph) * 0.35);
      ctx.beginPath();
      ctx.arc(cpos.x + Math.sin(ph * 6) * 3, cpos.y - 18 - ph * 22, 2 + ph * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (b.features.includes("flag")) {
    const base = up(Bt, 0);
    ctx.strokeStyle = shade(wall, -0.5);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(base.x, base.y - 30);
    ctx.stroke();
    const wave = Math.sin(t * 4 + p.lotIndex) * 2;
    poly(ctx, [
      { x: base.x, y: base.y - 30 },
      { x: base.x + 16, y: base.y - 27 + wave },
      { x: base.x, y: base.y - 21 },
    ]);
    ctx.fillStyle = b.palette.accent;
    ctx.fill();
  }
  if (b.features.includes("satellite")) {
    const base = up(lerp(At, Ct, 0.55), roofTop - (b.roof === "dome" ? 4 : 0));
    ctx.strokeStyle = shade(wall, -0.5);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(base.x, base.y - 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(base.x + 3, base.y - 14, 9, 5, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = mix("#e5e7eb", "#4b5563", night * 0.5);
    ctx.fill();
    ctx.strokeStyle = rgba("#000000", 0.3);
    ctx.stroke();
  }
  if (b.features.includes("windmill")) {
    const base = up(lerp(At, Bt, 0.5), roofTop);
    ctx.strokeStyle = shade(wall, -0.5);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(base.x, base.y - 22);
    ctx.stroke();
    const hub = { x: base.x, y: base.y - 22 };
    ctx.strokeStyle = b.palette.accent;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      const ang = t * 1.6 + (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(hub.x, hub.y);
      ctx.lineTo(hub.x + Math.cos(ang) * 14, hub.y + Math.sin(ang) * 14 * 0.6);
      ctx.stroke();
    }
  }

  // Sign over the door
  const signAt = up(lerp(d0, d1, 0.5), floorH * 0.8 + (b.features.includes("awning") ? 22 : 10));
  const neon = b.features.includes("neon");
  ctx.font = `700 11px ${s.fonts.display}`;
  ctx.textAlign = "center";
  const tw = ctx.measureText(b.sign).width + 12;
  ctx.fillStyle = neon ? rgba("#0e0d0b", 0.85) : rgba("#0e0d0b", 0.7);
  ctx.fillRect(signAt.x - tw / 2, signAt.y - 9, tw, 15);
  if (neon) {
    ctx.strokeStyle = b.palette.accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(signAt.x - tw / 2, signAt.y - 9, tw, 15);
  }
  ctx.fillStyle = neon ? b.palette.accent : "#f3ead9";
  ctx.fillText(b.sign, signAt.x, signAt.y + 2.5);

  if (opts.hover) {
    ctx.strokeStyle = rgba("#2b45ff", 0.95);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    poly(ctx, [A, B, up(B, H), up(A, H)]);
    ctx.stroke();
    poly(ctx, [D, C, up(C, H), up(D, H)]);
    ctx.stroke();
    poly(ctx, [C, B, up(B, H), up(C, H)]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

/** Second pass, after the night tint: window glow and neon. */
export function drawLights(s: Scene, p: Placed) {
  const { ctx, night } = s;
  if (night < 0.15) return;
  const b = p.building;
  const bx = box(p);
  const { B, C, D, H } = bx;
  const doorIdx = p.doorCol - p.bx;
  ctx.globalCompositeOperation = "lighter";
  windowsOnFace(s, D, C, H, b.floors, p.w, b.palette.accent, p.lotIndex * 7 + 1, doorIdx, true);
  windowsOnFace(s, C, B, H, b.floors, p.d, b.palette.accent, p.lotIndex * 7 + 2, -1, true);
  if (b.features.includes("neon")) {
    const floorH = H / b.floors;
    const d0 = lerp(D, C, (doorIdx + 0.2) / p.w);
    const d1 = lerp(D, C, (doorIdx + 0.8) / p.w);
    const signAt = up(lerp(d0, d1, 0.5), floorH * 0.8 + (b.features.includes("awning") ? 22 : 10));
    const grad = ctx.createRadialGradient(signAt.x, signAt.y, 2, signAt.x, signAt.y, 44);
    grad.addColorStop(0, rgba(b.palette.accent, 0.45 * night));
    grad.addColorStop(1, rgba(b.palette.accent, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(signAt.x, signAt.y, 44, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

export function drawConstruction(s: Scene, lotIndex: number, progress: number) {
  const { ctx, t } = s;
  const o = lotOrigin(LOTS[lotIndex]);
  const fake: Placed = {
    building: { footprint: { w: 2, d: 2 }, floors: 2, kind: "workshop" } as Building,
    lotIndex,
    bx: o.tx + 1,
    by: o.ty,
    w: 2,
    d: 2,
    doorCol: o.tx + 1,
    door: { x: 0, y: 0 },
  };
  const { A, B, C, D } = box(fake);
  const H = 40 * Math.min(1, progress + 0.15);
  ctx.strokeStyle = rgba("#2b45ff", 0.9);
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 4]);
  ctx.lineDashOffset = -t * 20;
  poly(ctx, [A, B, up(B, H), up(A, H)]);
  ctx.stroke();
  poly(ctx, [D, C, up(C, H), up(D, H)]);
  ctx.stroke();
  poly(ctx, [C, B, up(B, H), up(C, H)]);
  ctx.stroke();
  poly(ctx, [up(A, H), up(B, H), up(C, H), up(D, H)]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  // Crane
  const base = up(lerp(A, B, 0.9), 0);
  ctx.strokeStyle = "#ffb27a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.lineTo(base.x, base.y - 70);
  ctx.lineTo(base.x - 40, base.y - 70);
  ctx.stroke();
  const hook = base.y - 70 + 20 + Math.sin(t * 1.5) * 12;
  ctx.beginPath();
  ctx.moveTo(base.x - 28, base.y - 70);
  ctx.lineTo(base.x - 28, hook);
  ctx.stroke();
  ctx.fillStyle = "#ff8c42";
  ctx.fillRect(base.x - 34, hook, 12, 8);
  const c = toScreen(o.tx + LOT / 2, o.ty + LOT / 2 + 1.2);
  ctx.font = `500 11px ${s.fonts.mono}`;
  ctx.textAlign = "center";
  const dots = ".".repeat(1 + (Math.floor(t * 2) % 3));
  const label = "the architect is drawing" + dots;
  const tw = ctx.measureText("the architect is drawing...").width + 14;
  ctx.fillStyle = "#101010";
  ctx.beginPath();
  ctx.roundRect(c.x - tw / 2, c.y + 4, tw, 18, 3);
  ctx.fill();
  ctx.fillStyle = "#f6f6f3";
  ctx.fillText(label, c.x, c.y + 17);
}

// ---------------------------------------------------------------- avatar

export function drawAvatar(s: Scene, x: number, y: number, moving: boolean, facing: number) {
  drawFigure(s, x, y, moving, facing, COLIN_LOOK);
}

export function drawTarget(s: Scene, x: number, y: number) {
  const { ctx, t } = s;
  const c = toScreen(x, y);
  const pulse = (t * 2) % 1;
  ctx.strokeStyle = rgba("#2b45ff", 1 - pulse);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, 8 + pulse * 14, 4 + pulse * 7, 0, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number, hour: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  const d = dayCurve(hour);
  const top = mix(mix("#0b1026", "#8fc3e8", d), "#f2a35e", duskCurve(hour) * 0.5);
  const bottom = mix(mix("#1a1c3a", "#dceaf2", d), "#ffd0a3", duskCurve(hour) * 0.6);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** 0 at night, 1 in full day. */
export function dayCurve(hour: number): number {
  const x = ((hour % 24) + 24) % 24;
  const rise = smooth((x - 5.5) / 2);
  const set = 1 - smooth((x - 18.5) / 2);
  return Math.max(0, Math.min(1, Math.min(rise, set)));
}

function duskCurve(hour: number): number {
  const x = ((hour % 24) + 24) % 24;
  const dawn = Math.max(0, 1 - Math.abs(x - 6.5) / 1.5);
  const dusk = Math.max(0, 1 - Math.abs(x - 19.5) / 1.5);
  return Math.max(dawn, dusk);
}

function smooth(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export function drawStars(ctx: CanvasRenderingContext2D, w: number, h: number, night: number, t: number) {
  if (night < 0.2) return;
  for (let i = 0; i < 90; i += 1) {
    const x = noise(i, 11) * w;
    const y = noise(i, 12) * h * 0.55;
    const tw = 0.5 + 0.5 * Math.sin(t * (1 + noise(i, 13) * 2) + i);
    ctx.fillStyle = rgba("#f3ead9", night * tw * 0.9);
    ctx.fillRect(x, y, 1.5, 1.5);
  }
}
