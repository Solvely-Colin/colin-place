"use client";

import { motion, useMotionValue } from "framer-motion";
import { X, Minus, Square, Maximize2 } from "lucide-react";
import { ReactNode } from "react";

interface WindowProps {
  id: string;
  title: string;
  icon: ReactNode;
  color: string;
  children: ReactNode;
  position: { x: number; y: number };
  zIndex: number;
  isActive: boolean;
  minimized: boolean;
  zoomed: boolean;
  onClose: () => void;
  onFocus: () => void;
  onMinimize: () => void;
  onZoom: () => void;
  onMove: (id: string, position: { x: number; y: number }) => void;
}

export function Window({
  id,
  title,
  icon,
  color,
  children,
  position,
  zIndex,
  isActive,
  minimized,
  zoomed,
  onClose,
  onFocus,
  onMinimize,
  onZoom,
  onMove,
}: WindowProps) {
  // Position lives in the transform (motion values), not left/top, so drags
  // persist across re-renders. State is synced on drop via onMove, keeping
  // the animate targets equal to the dragged spot — no rubber-banding.
  const x = useMotionValue(position.x);
  const y = useMotionValue(position.y);

  return (
    <motion.div
      drag={!zoomed && !minimized}
      dragMomentum={false}
      dragConstraints={{ left: -200, right: 800, top: 0, bottom: 500 }}
      onDragEnd={() => onMove(id, { x: x.get(), y: y.get() })}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={
        minimized
          ? { scale: 0.6, opacity: 0, y: 300 }
          : zoomed
            ? { scale: 1, opacity: 1, x: 0, y: 0 }
            : { scale: 1, opacity: 1, x: position.x, y: position.y }
      }
      exit={{ scale: 0.8, opacity: 0, y: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onPointerDown={onFocus}
      className={
        "absolute rounded-xl overflow-hidden window-glass flex flex-col " +
        (isActive && !minimized ? "ring-1 ring-blue-400/50 " : "") +
        (zoomed
          ? "w-[92vw] sm:w-[85vw] max-w-[1000px] h-[80vh]"
          : "w-[90vw] sm:w-[500px] md:w-[550px] min-h-[300px]")
      }
      style={{
        x,
        y,
        left: zoomed ? "4vw" : 0,
        top: zoomed ? 48 : 0,
        zIndex,
        pointerEvents: minimized ? "none" : "auto",
      }}
    >
      {/* Title bar */}
      <div
        className="h-10 flex items-center justify-between px-3 border-b border-black/5 cursor-default shrink-0"
        style={{ backgroundColor: color + "15" }}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 flex items-center justify-center group"
              title="Close"
            >
              <X className="w-2 h-2 text-red-800 opacity-0 group-hover:opacity-100" />
            </button>
            <button
              onClick={onMinimize}
              className="w-3 h-3 rounded-full bg-amber-400 hover:bg-amber-500 flex items-center justify-center group"
              title="Minimize"
            >
              <Minus className="w-2 h-2 text-amber-800 opacity-0 group-hover:opacity-100" />
            </button>
            <button
              onClick={onZoom}
              className="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 flex items-center justify-center group"
              title="Zoom"
            >
              {zoomed ? (
                <Square className="w-2 h-2 text-green-800 opacity-0 group-hover:opacity-100" />
              ) : (
                <Maximize2 className="w-2 h-2 text-green-800 opacity-0 group-hover:opacity-100" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <span className="w-4 h-4" style={{ color }}>{icon}</span>
            <span className="text-sm font-medium text-stone-700">{title}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={"flex-1 p-5 overflow-y-auto " + (zoomed ? "" : "max-h-[60vh] sm:max-h-[500px]")}>
        {children}
      </div>
    </motion.div>
  );
}
