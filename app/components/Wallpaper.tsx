"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type PaletteName = "dawn" | "day" | "dusk" | "night";

interface Palette {
  backgroundColor: string;
  backgroundImage: string;
}

const PALETTES: Record<PaletteName, Palette> = {
  // 5–8h: soft peach / rose
  dawn: {
    backgroundColor: "#f6e2d3",
    backgroundImage:
      "radial-gradient(circle at 25% 30%, rgba(224, 108, 159, 0.14) 0%, transparent 45%)," +
      "radial-gradient(circle at 75% 75%, rgba(255, 140, 66, 0.14) 0%, transparent 45%)," +
      "radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 60%)",
  },
  // 8–17h: warm cream, matches the body background in app/globals.css
  day: {
    backgroundColor: "#f0e9db",
    backgroundImage:
      "radial-gradient(circle at 20% 20%, rgba(255, 140, 66, 0.12) 0%, transparent 40%)," +
      "radial-gradient(circle at 80% 80%, rgba(91, 168, 196, 0.12) 0%, transparent 40%)," +
      "radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 60%)",
  },
  // 17–20h: amber to indigo
  dusk: {
    backgroundColor: "#3a3460",
    backgroundImage:
      "linear-gradient(180deg, rgba(255, 140, 66, 0.35) 0%, rgba(58, 52, 96, 0) 65%)," +
      "radial-gradient(circle at 30% 20%, rgba(255, 170, 90, 0.25) 0%, transparent 50%)," +
      "radial-gradient(circle at 75% 80%, rgba(88, 80, 160, 0.35) 0%, transparent 55%)",
  },
  // 20–5h: deep slate / indigo with a subtle glow
  night: {
    backgroundColor: "#181d2b",
    backgroundImage:
      "radial-gradient(circle at 30% 25%, rgba(88, 80, 160, 0.22) 0%, transparent 50%)," +
      "radial-gradient(circle at 75% 75%, rgba(91, 168, 196, 0.12) 0%, transparent 50%)," +
      "radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.04) 0%, transparent 60%)",
  },
};

function paletteForHour(hour: number): PaletteName {
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}

export function Wallpaper() {
  const [mounted, setMounted] = useState(false);
  const [palette, setPalette] = useState<PaletteName>("day");

  useEffect(() => {
    const update = () => setPalette(paletteForHour(new Date().getHours()));
    const id = setInterval(update, 60000);
    // Defer the first paint to the client so SSR and hydration agree (render null).
    const raf = requestAnimationFrame(() => {
      update();
      setMounted(true);
    });
    return () => {
      clearInterval(id);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!mounted) return null;

  const active = PALETTES[palette];

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <AnimatePresence>
        <motion.div
          key={palette}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: active.backgroundColor,
            backgroundImage: active.backgroundImage,
          }}
        />
      </AnimatePresence>
    </div>
  );
}
