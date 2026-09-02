// The ∞ — a lemniscate of Bernoulli. It is the site's whole motif: the
// "Feeling Loopy" hat, the loop between people and tools, the agents
// that build this page in a loop. Everything that draws one uses this.

export interface Pt {
  x: number;
  y: number;
}

const TAU = Math.PI * 2;

/** Point on a lemniscate with half-width `a`, centred at the origin. */
export function lemniscate(t: number, a: number): Pt {
  const s = Math.sin(t);
  const c = Math.cos(t);
  const d = 1 + s * s;
  return { x: (a * c) / d, y: (a * s * c) / d };
}

/** Unit tangent at t, via a tiny forward difference. */
export function lemniscateTangent(t: number, a: number): Pt {
  const p0 = lemniscate(t, a);
  const p1 = lemniscate(t + 0.0015, a);
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

/** SVG path data for an ∞ of half-width `a` centred on (cx, cy). */
export function lemniscatePath(a: number, cx: number, cy: number, steps = 240): string {
  let d = "";
  for (let i = 0; i <= steps; i += 1) {
    const p = lemniscate((i / steps) * TAU, a);
    d += (i === 0 ? "M" : "L") + (cx + p.x).toFixed(2) + " " + (cy + p.y).toFixed(2);
  }
  return d + "Z";
}

export { TAU };
