import type { Building } from "../../lib/town/types";

// The town is a spiral of lots. Each lot is LOT tiles square with ROAD tiles
// of street between lots. Lot 0 is the centre; the spiral walks outward.
export const LOT = 4;
export const ROAD = 1;
export const PITCH = LOT + ROAD;

export interface LotPos {
  lx: number;
  ly: number;
}

export function lotSpiral(count: number): LotPos[] {
  const out: LotPos[] = [{ lx: 0, ly: 0 }];
  let ring = 1;
  while (out.length < count) {
    for (let lx = -ring; lx <= ring; lx += 1) out.push({ lx, ly: -ring });
    for (let ly = -ring + 1; ly <= ring; ly += 1) out.push({ lx: ring, ly });
    for (let lx = ring - 1; lx >= -ring; lx -= 1) out.push({ lx, ly: ring });
    for (let ly = ring - 1; ly >= -ring + 1; ly -= 1) out.push({ lx: -ring, ly });
    ring += 1;
  }
  return out.slice(0, count);
}

export const LOTS = lotSpiral(81);
export const RINGS = 4;

export function lotOrigin(lot: LotPos): { tx: number; ty: number } {
  return { tx: lot.lx * PITCH, ty: lot.ly * PITCH };
}

export function isRoad(tx: number, ty: number): boolean {
  const mx = ((tx % PITCH) + PITCH) % PITCH;
  const my = ((ty % PITCH) + PITCH) % PITCH;
  return mx >= LOT || my >= LOT;
}

export interface Placed {
  building: Building;
  lotIndex: number;
  /** Footprint origin tile. */
  bx: number;
  by: number;
  w: number;
  d: number;
  /** Continuous coordinates of the tile in front of the door. */
  door: { x: number; y: number };
  /** Grid x of the door column on the +y face. */
  doorCol: number;
}

export function place(building: Building, lotIndex: number): Placed {
  const o = lotOrigin(LOTS[lotIndex]);
  const w = building.footprint.w;
  const d = building.footprint.d;
  // Back of the lot, so the yard is in front of the door.
  const bx = o.tx + Math.floor((LOT - w) / 2);
  const by = o.ty;
  const doorCol = bx + Math.floor((w - 1) / 2);
  return {
    building,
    lotIndex,
    bx,
    by,
    w,
    d,
    doorCol,
    door: { x: doorCol + 0.5, y: by + d + 0.6 },
  };
}

/** Assign lots: seeds first, then approved, then local, skipping duplicates. */
export function layout(groups: Building[][]): Placed[] {
  const seen = new Set<string>();
  const out: Placed[] = [];
  let lot = 0;
  for (const group of groups) {
    for (const b of group) {
      if (seen.has(b.id) || lot >= LOTS.length) continue;
      seen.add(b.id);
      out.push(place(b, lot));
      lot += 1;
    }
  }
  return out;
}

export function nextEmptyLot(placed: Placed[]): number {
  const used = new Set(placed.map((p) => p.lotIndex));
  for (let i = 0; i < LOTS.length; i += 1) if (!used.has(i)) return i;
  return -1;
}

export function blockedAt(x: number, y: number, placed: Placed[], margin = 0.15): Placed | null {
  for (const p of placed) {
    if (x > p.bx - margin && x < p.bx + p.w + margin && y > p.by - margin && y < p.by + p.d + margin) return p;
  }
  return null;
}

export function lotCentre(lotIndex: number): { x: number; y: number } {
  const o = lotOrigin(LOTS[lotIndex]);
  return { x: o.tx + LOT / 2, y: o.ty + LOT / 2 };
}
