"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTime } from "../hooks/useTime";
import { Wifi, Battery, Volume2, Command, RotateCcw } from "lucide-react";

interface MenuBarProps {
  activeTitle: string | null;
  onAbout: () => void;
  onCloseAll: () => void;
  onRestart: () => void;
  onOpenPalette: () => void;
}

export function MenuBar({ activeTitle, onAbout, onCloseAll, onRestart, onOpenPalette }: MenuBarProps) {
  const time = useTime();
  const [menuOpen, setMenuOpen] = useState(false);

  const item =
    "w-full text-left px-3 py-1.5 text-sm hover:bg-blue-500 hover:text-white transition flex items-center gap-2";

  return (
    <div className="fixed top-0 left-0 right-0 h-8 z-[200] menu-bar flex items-center justify-between px-4 text-sm select-none">
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 font-bold rounded px-1.5 py-0.5 -ml-1.5 hover:bg-white/40 transition"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-orange-500" fill="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="3" />
            </svg>
            <span className="text-stone-800">Colin OS</span>
          </button>
          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40 cursor-default" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 top-full mt-1 z-50 w-56 rounded-lg bg-white/95 backdrop-blur-xl border border-stone-200 shadow-xl py-1 text-stone-700"
                >
                  <button onClick={() => { setMenuOpen(false); onAbout(); }} className={item}>
                    About Colin OS
                  </button>
                  <button onClick={() => { setMenuOpen(false); onCloseAll(); }} className={item}>
                    Close All Windows
                  </button>
                  <div className="my-1 h-px bg-stone-200" />
                  <button onClick={() => { setMenuOpen(false); onRestart(); }} className={item}>
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restart…
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
        {activeTitle && (
          <span className="text-stone-700 hidden sm:inline text-[13px]">— {activeTitle}</span>
        )}
      </div>

      <div className="flex items-center gap-3 text-stone-700">
        <button
          onClick={onOpenPalette}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/50 hover:bg-white/90 border border-stone-300/50 text-xs text-stone-600 transition"
        >
          <Command className="w-3 h-3" />K
        </button>
        <Volume2 className="w-4 h-4 hidden sm:block" />
        <Wifi className="w-4 h-4" />
        <Battery className="w-4 h-4 hidden sm:block" />
        <span className="font-medium hidden sm:inline">
          {time?.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </span>
        <span className="font-medium w-16 text-right">
          {time?.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
