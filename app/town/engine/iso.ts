// Isometric projection. Grid x runs screen right-down, grid y runs
// screen left-down. One tile is a 64x32 diamond.
export const TILE_W = 64;
export const TILE_H = 32;
export const FLOOR_H = 20;

export interface Vec {
  x: number;
  y: number;
}

export function toScreen(gx: number, gy: number): Vec {
  return { x: ((gx - gy) * TILE_W) / 2, y: ((gx + gy) * TILE_H) / 2 };
}

export function toGrid(sx: number, sy: number): Vec {
  const a = sx / (TILE_W / 2);
  const b = sy / (TILE_H / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

/** Accepts #rrggbb or an rgb(r,g,b) string, so mixes can be nested. */
export function hexToRgb(color: string): [number, number, number] {
  if (color.startsWith("rgb")) {
    const m = color.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
    return [0, 0, 0];
  }
  const n = Number.parseInt(color.slice(1), 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** amount > 0 lightens toward white, < 0 darkens toward black. */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (c: number) => {
    const v = amount > 0 ? c + (255 - c) * amount : c + c * amount;
    return Math.max(0, Math.min(255, Math.round(v)));
  };
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const l = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${l(r1, r2)},${l(g1, g2)},${l(b1, b2)})`;
}

/** Deterministic 0..1 from integers. */
export function noise(...seeds: number[]): number {
  let h = 2166136261;
  for (const s of seeds) {
    h ^= Math.floor(s * 1000) & 0xffffffff;
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}
