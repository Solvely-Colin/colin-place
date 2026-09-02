// The model directs the photograph; this renders the direction. A canvas is
// laid over the portrait and the image is re-drawn each frame through a
// treatment, on a small buffer so the glitches stay chunky and cheap.

export type Treatment = "grey" | "channelshift" | "pixelsort" | "melt" | "double" | "drown" | "static" | "negative" | "eyes";

export interface PortraitDirection {
  treatment: Treatment;
  strength: number;
}

const W = 160;

export class PortraitFx {
  private img: HTMLImageElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private buf: HTMLCanvasElement;
  private bctx: CanvasRenderingContext2D;
  private raf = 0;
  private direction: PortraitDirection | null = null;
  private gain = 0;

  constructor(img: HTMLImageElement) {
    this.img = img;
    const parent = img.parentElement as HTMLElement;
    const canvas = document.createElement("canvas");
    canvas.className = "absolute inset-0 w-full h-full pointer-events-none";
    canvas.style.opacity = "0";
    canvas.style.transition = "opacity 2.5s";
    parent.appendChild(canvas);
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.buf = document.createElement("canvas");
    this.bctx = this.buf.getContext("2d", { willReadFrequently: true })!;
  }

  set(direction: PortraitDirection | null, gain: number) {
    this.direction = direction;
    this.gain = gain;
    this.canvas.style.opacity = direction && gain > 0 ? "1" : "0";
    if (direction && !this.raf) this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.canvas.remove();
  }

  private frame(now: number) {
    this.raf = 0;
    const d = this.direction;
    if (!d) return;
    const t = now / 1000;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || !this.img.complete || this.img.naturalWidth === 0) {
      this.raf = requestAnimationFrame((n) => this.frame(n));
      return;
    }
    const H = Math.round((W * rect.height) / rect.width);
    if (this.buf.width !== W || this.buf.height !== H) {
      this.buf.width = W;
      this.buf.height = H;
    }
    const k = Math.max(0, Math.min(1, d.strength * this.gain));
    const b = this.bctx;
    // object-fit: cover
    const iw = this.img.naturalWidth;
    const ih = this.img.naturalHeight;
    const scale = Math.max(W / iw, H / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    b.clearRect(0, 0, W, H);
    b.drawImage(this.img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    const frame = b.getImageData(0, 0, W, H);
    const px = frame.data;
    const out = b.createImageData(W, H);
    const o = out.data;
    o.set(px);

    switch (d.treatment) {
      case "grey": {
        for (let i = 0; i < px.length; i += 4) {
          const l = 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2];
          const c = Math.pow(l / 255, 0.9) * 255;
          o[i] = px[i] + (c - px[i]) * k;
          o[i + 1] = px[i + 1] + (c - px[i + 1]) * k;
          o[i + 2] = px[i + 2] + (c - px[i + 2]) * k;
        }
        // Brittle: pixels flake off the bottom edge.
        for (let n = 0; n < 40 * k; n += 1) {
          const x = Math.floor(Math.random() * W);
          const y = H - 1 - Math.floor(Math.random() * H * 0.25 * k);
          const i = (y * W + x) * 4;
          o[i + 3] = 0;
        }
        break;
      }
      case "channelshift": {
        const dx = Math.round(3 + 10 * k * (0.5 + 0.5 * Math.sin(t * 2.3)));
        const dy = Math.round(4 * k * Math.sin(t * 1.7));
        for (let y = 0; y < H; y += 1) {
          for (let x = 0; x < W; x += 1) {
            const i = (y * W + x) * 4;
            const xr = Math.min(W - 1, Math.max(0, x + dx));
            const yb = Math.min(H - 1, Math.max(0, y + dy));
            o[i] = px[(y * W + xr) * 4];
            o[i + 2] = px[(yb * W + Math.max(0, x - dx)) * 4 + 2];
          }
        }
        // Tear lines
        for (let n = 0; n < 6 * k; n += 1) {
          const y = Math.floor(((t * 30 * (n + 1)) % 1) * H) % H;
          const shift = Math.floor((Math.random() - 0.5) * 30 * k);
          const row = px.slice(y * W * 4, (y + 1) * W * 4);
          for (let x = 0; x < W; x += 1) {
            const sx = (((x + shift) % W) + W) % W;
            const i = (y * W + x) * 4;
            o[i] = row[sx * 4];
            o[i + 1] = row[sx * 4 + 1];
            o[i + 2] = row[sx * 4 + 2];
          }
        }
        break;
      }
      case "pixelsort": {
        // Sort bright runs in each column downward: pixels sliding like sand.
        const cols = Math.floor(W * k);
        for (let c = 0; c < cols; c += 1) {
          const x = (c * 7 + Math.floor(t * 3)) % W;
          const thr = 120 + 60 * Math.sin(t + x);
          let start = -1;
          for (let y = 0; y <= H; y += 1) {
            const i = (y * W + x) * 4;
            const l = y < H ? 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2] : -1;
            if (l > thr && start < 0) start = y;
            if ((l <= thr || y === H) && start >= 0) {
              const run: number[][] = [];
              for (let yy = start; yy < y; yy += 1) {
                const j = (yy * W + x) * 4;
                run.push([px[j], px[j + 1], px[j + 2]]);
              }
              run.sort((a, bb) => a[0] + a[1] + a[2] - (bb[0] + bb[1] + bb[2]));
              run.forEach((p, idx) => {
                const j = ((start + idx) * W + x) * 4;
                o[j] = p[0];
                o[j + 1] = p[1];
                o[j + 2] = p[2];
              });
              start = -1;
            }
          }
        }
        break;
      }
      case "melt": {
        for (let x = 0; x < W; x += 1) {
          const drip = Math.max(0, Math.sin(x * 0.35 + t * 0.6)) * H * 0.35 * k + (Math.sin(x * 1.7) + 1) * 4 * k;
          for (let y = H - 1; y >= 0; y -= 1) {
            const sy = Math.max(0, Math.round(y - drip * (y / H)));
            const i = (y * W + x) * 4;
            const j = (sy * W + x) * 4;
            o[i] = px[j];
            o[i + 1] = px[j + 1];
            o[i + 2] = px[j + 2];
          }
        }
        break;
      }
      case "double": {
        const dx = Math.round(8 + 14 * k * Math.sin(t * 0.8));
        const dy = Math.round(-6 * k);
        for (let y = 0; y < H; y += 1) {
          for (let x = 0; x < W; x += 1) {
            const sx = x - dx;
            const sy = y - dy;
            if (sx < 0 || sx >= W || sy < 0 || sy >= H) continue;
            const i = (y * W + x) * 4;
            const j = (sy * W + sx) * 4;
            const a = 0.45 * k;
            o[i] = o[i] * (1 - a) + px[j] * a;
            o[i + 1] = o[i + 1] * (1 - a) + px[j + 1] * a;
            o[i + 2] = o[i + 2] * (1 - a) + px[j + 2] * a;
          }
        }
        break;
      }
      case "drown": {
        for (let y = 0; y < H; y += 1) {
          const wave = Math.sin(y * 0.25 + t * 2) * 4 * k + Math.sin(y * 0.07 - t * 1.1) * 6 * k;
          for (let x = 0; x < W; x += 1) {
            const sx = Math.min(W - 1, Math.max(0, Math.round(x + wave)));
            const i = (y * W + x) * 4;
            const j = (y * W + sx) * 4;
            const depth = y / H;
            o[i] = px[j] * (1 - 0.7 * k * depth);
            o[i + 1] = px[j + 1] * (1 - 0.3 * k * depth) + 20 * k;
            o[i + 2] = px[j + 2] * (1 - 0.35 * k * depth) + 25 * k;
          }
        }
        // Caustics
        for (let n = 0; n < 60 * k; n += 1) {
          const x = Math.floor(((n * 0.618 + t * 0.03) % 1) * W);
          const y = Math.floor(((n * 0.37 + Math.sin(t + n) * 0.02) % 1) * H);
          const i = (y * W + x) * 4;
          o[i] = Math.min(255, o[i] + 60);
          o[i + 1] = Math.min(255, o[i + 1] + 90);
          o[i + 2] = Math.min(255, o[i + 2] + 80);
        }
        break;
      }
      case "static": {
        for (let i = 0; i < px.length; i += 4) {
          if (Math.random() < 0.35 * k) {
            const v = Math.random() * 255;
            o[i] = v;
            o[i + 1] = v;
            o[i + 2] = v;
          }
        }
        const band = Math.floor(((t * 0.5) % 1) * H);
        for (let y = band; y < Math.min(H, band + 6); y += 1) {
          for (let x = 0; x < W; x += 1) {
            const i = (y * W + x) * 4;
            o[i] = o[i + 1] = o[i + 2] = 255 * k;
          }
        }
        break;
      }
      case "negative": {
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.7);
        const a = k * (0.6 + 0.4 * pulse);
        for (let i = 0; i < px.length; i += 4) {
          o[i] = px[i] + (255 - 2 * px[i]) * a;
          o[i + 1] = px[i + 1] + (255 - 2 * px[i + 1]) * a;
          o[i + 2] = px[i + 2] + (255 - 2 * px[i + 2]) * a;
        }
        break;
      }
      case "eyes": {
        // The Innsmouth look: the image bulges around the eyes and goes cold.
        const cx = W * 0.5;
        const cy = H * 0.42;
        const r = W * 0.42;
        for (let y = 0; y < H; y += 1) {
          for (let x = 0; x < W; x += 1) {
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.hypot(dx, dy);
            if (dist > r) continue;
            const f = 1 - (0.35 * k + 0.05 * Math.sin(t * 2)) * Math.pow(1 - dist / r, 2);
            const sx = Math.min(W - 1, Math.max(0, Math.round(cx + dx * f)));
            const sy = Math.min(H - 1, Math.max(0, Math.round(cy + dy * f)));
            const i = (y * W + x) * 4;
            const j = (sy * W + sx) * 4;
            o[i] = px[j] * (1 - 0.2 * k);
            o[i + 1] = px[j + 1];
            o[i + 2] = Math.min(255, px[j + 2] + 25 * k);
          }
        }
        break;
      }
    }
    b.putImageData(out, 0, 0);
    this.ctx.imageSmoothingEnabled = d.treatment === "double" || d.treatment === "drown" || d.treatment === "eyes";
    const cw = Math.round(rect.width);
    const ch = Math.round(rect.height);
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }
    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.drawImage(this.buf, 0, 0, cw, ch);
    this.raf = requestAnimationFrame((n) => this.frame(n));
  }
}
