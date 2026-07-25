"use client";

import { motion } from "framer-motion";
import { Command } from "lucide-react";
import { APP_META, AppId, WindowData } from "./Desktop";

interface DockProps {
  windows: WindowData[];
  activeId: AppId | null;
  onFocus: (id: AppId) => void;
  onOpenPalette: () => void;
}

export function Dock({ windows, activeId, onFocus, onOpenPalette }: DockProps) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="dock flex items-center gap-1.5 px-2 py-1.5 rounded-2xl"
      >
        {windows.length === 0 ? (
          <button
            onClick={onOpenPalette}
            className="flex items-center gap-2 px-3 py-2 text-xs text-stone-600 hover:text-stone-900 transition"
          >
            <span>Double-click an app, or press</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/70 border border-stone-300/60 text-[10px] font-semibold text-stone-700">
              ⌘K
            </kbd>
          </button>
        ) : (
          <>
            {windows.map((w) => {
              const meta = APP_META[w.id];
              const Icon = meta.Icon;
              const isActive = activeId === w.id;
              return (
                <motion.button
                  key={w.id}
                  layout
                  whileHover={{ scale: 1.08, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onFocus(w.id)}
                  className="relative group"
                >
                  <div
                    className={
                      "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white shadow-md transition " +
                      (isActive ? "ring-2 ring-stone-700/50 " : "") +
                      (w.minimized ? "opacity-45 saturate-50" : "")
                    }
                    style={{ backgroundColor: meta.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  {!w.minimized && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-stone-800" />
                  )}
                  <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 bg-stone-800/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap">
                    {meta.title}
                  </div>
                </motion.button>
              );
            })}
            <div className="w-px self-stretch bg-stone-400/30 mx-1" />
            <button
              onClick={onOpenPalette}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-white/60 hover:bg-white text-stone-700 border border-stone-300/60 transition"
              title="Commands (⌘K)"
            >
              <Command className="w-4 h-4" />
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
