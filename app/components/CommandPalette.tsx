"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  actions: PaletteAction[];
}

export function CommandPalette({ open, onClose, actions }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );
  const clamped = Math.min(index, Math.max(filtered.length - 1, 0));

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setQuery("");
      setIndex(0);
      inputRef.current?.focus();
    }, 30);
    return () => clearTimeout(t);
  }, [open]);

  const choose = (action?: PaletteAction) => {
    if (!action) return;
    onClose();
    action.run();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[300] flex items-start justify-center pt-[18vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-stone-900/20 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.97, y: -8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, y: -8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-md rounded-xl bg-white/95 backdrop-blur-xl border border-stone-200 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-200/70">
              <Search className="w-4 h-4 text-stone-600" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setIndex((i) => Math.min(i + 1, filtered.length - 1));
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setIndex((i) => Math.max(i - 1, 0));
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    choose(filtered[clamped]);
                  }
                  if (e.key === "Escape") onClose();
                }}
                placeholder="Type a command or search…"
                className="flex-1 bg-transparent outline-none text-sm text-stone-800 placeholder:text-stone-600"
              />
              <kbd className="text-[10px] text-stone-600 border border-stone-200 rounded px-1.5 py-0.5">esc</kbd>
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-stone-600">
                  No matches. Colin is many things, but not that.
                </div>
              )}
              {filtered.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => choose(a)}
                  onMouseEnter={() => setIndex(i)}
                  className={
                    "w-full flex items-center justify-between px-4 py-2 text-sm transition " +
                    (i === clamped ? "bg-violet-500 text-white" : "text-stone-700")
                  }
                >
                  <span>{a.label}</span>
                  {a.hint && (
                    <span className={"text-xs " + (i === clamped ? "text-violet-100" : "text-stone-600")}>
                      {a.hint}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
