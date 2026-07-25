"use client";

import { useEffect, useRef, useState } from "react";

// Inside Weather — the desktop has its own sky.
// Day: drifting clouds. Night: starfield + shooting stars.
// Any hour: the occasional rain shower rolling through the OS.
// Pure canvas, no assets, pointer-events none, sits above the wallpaper
// and below the windows.

type SkyMode = "day" | "night";
type ShowerState = "clear" | "rain";

interface Cloud {
  x: number;
  y: number;
  scale: number;
  speed: number;
  alpha: number;
}

interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface Drop {
  x: number;
  y: number;
  speed: number;
  len: number;
}

function skyMode(hour: number): SkyMode {
  return hour >= 20 || hour < 5 ? "night" : "day";
}

export function Weather() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ?weather=rain|clear lets us demo/test a state explicitly.
    const forced = new URLSearchParams(window.location.search).get("weather");

    let raf = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    let clouds: Cloud[] = [];
    let stars: Star[] = [];
    let shooting: ShootingStar[] = [];
    let drops: Drop[] = [];

    let mode: SkyMode = skyMode(new Date().getHours());
    let shower: ShowerState = "clear";
    let nextShowerCheck = 0;
    let showerEndsAt = 0;
    let nextShootingAt = 0;

    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    function seedSky() {
      clouds = Array.from({ length: 5 }, () => ({
        x: rand(-200, width),
        y: rand(40, height * 0.45),
        scale: rand(0.6, 1.6),
        speed: rand(4, 11),
        alpha: rand(0.25, 0.5),
      }));
      stars = Array.from({ length: 90 }, () => ({
        x: rand(0, width),
        y: rand(0, height),
        r: rand(0.4, 1.5),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.5, 2),
      }));
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      canvas!.style.width = width + "px";
      canvas!.style.height = height + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedSky();
    }

    function drawCloud(c: Cloud, dt: number) {
      c.x += c.speed * dt;
      if (c.x - 220 * c.scale > width) {
        c.x = -240 * c.scale;
        c.y = rand(40, height * 0.45);
      }
      const g = ctx!;
      g.save();
      g.globalAlpha = c.alpha;
      g.filter = "blur(14px)";
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.ellipse(c.x, c.y, 90 * c.scale, 26 * c.scale, 0, 0, Math.PI * 2);
      g.ellipse(c.x - 45 * c.scale, c.y + 10 * c.scale, 55 * c.scale, 20 * c.scale, 0, 0, Math.PI * 2);
      g.ellipse(c.x + 50 * c.scale, c.y + 8 * c.scale, 60 * c.scale, 22 * c.scale, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }

    function drawStars(t: number, dt: number) {
      const g = ctx!;
      for (const s of stars) {
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.phase + t * s.speed));
        g.globalAlpha = tw * 0.9;
        g.fillStyle = "#e8ecff";
        g.beginPath();
        g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;

      if (t * 1000 > nextShootingAt) {
        shooting.push({
          x: rand(width * 0.2, width * 0.9),
          y: rand(20, height * 0.3),
          vx: -rand(260, 420),
          vy: rand(120, 200),
          life: 1,
        });
        nextShootingAt = t * 1000 + rand(7000, 20000);
      }
      shooting = shooting.filter((s) => s.life > 0);
      for (const s of shooting) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt * 1.2;
        const grad = g.createLinearGradient(s.x, s.y, s.x - s.vx * 0.12, s.y - s.vy * 0.12);
        grad.addColorStop(0, "rgba(255,255,255," + Math.max(0, s.life) + ")");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        g.strokeStyle = grad;
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(s.x, s.y);
        g.lineTo(s.x - s.vx * 0.12, s.y - s.vy * 0.12);
        g.stroke();
      }
    }

    function drawRain(dt: number) {
      const g = ctx!;
      while (drops.length < 130) {
        drops.push({ x: rand(-40, width + 40), y: rand(-height, 0), speed: rand(420, 700), len: rand(9, 18) });
      }
      g.strokeStyle = "rgba(120, 150, 190, 0.35)";
      g.lineWidth = 1.1;
      g.beginPath();
      for (const d of drops) {
        d.y += d.speed * dt;
        d.x -= d.speed * 0.18 * dt;
        if (d.y > height + 20) {
          d.y = rand(-60, -10);
          d.x = rand(-40, width + 40);
        }
        g.moveTo(d.x, d.y);
        g.lineTo(d.x - d.len * 0.18, d.y + d.len);
      }
      g.stroke();
    }

    let last = performance.now();
    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = now / 1000;

      mode = skyMode(new Date().getHours());

      // Shower scheduler: every 5 minutes, 25% chance of a 60-120s shower.
      if (forced) {
        shower = forced === "rain" ? "rain" : "clear";
      } else if (now > nextShowerCheck) {
        if (shower === "clear" && Math.random() < 0.25) {
          shower = "rain";
          showerEndsAt = now + rand(60000, 120000);
          nextShowerCheck = showerEndsAt;
        } else {
          shower = "clear";
          drops = [];
          nextShowerCheck = now + 5 * 60 * 1000;
        }
      }

      ctx!.clearRect(0, 0, width, height);
      if (mode === "day") {
        for (const c of clouds) drawCloud(c, dt);
      } else {
        drawStars(t, dt);
      }
      if (shower === "rain") drawRain(dt);

      raf = requestAnimationFrame(frame);
    }

    function onVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-[1] pointer-events-none"
    />
  );
}
