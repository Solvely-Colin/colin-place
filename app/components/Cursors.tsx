"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const STORAGE_KEY = "colin-os-visitor-id";
const SEND_INTERVAL_MS = 400;
const POLL_INTERVAL_MS = 2000;

// Site-ish tones pulled from the stone/amber palette of the desktop chrome.
const PALETTE = ["#d97706", "#0284c7", "#059669", "#e11d48", "#7c3aed", "#db2777"];

interface RemoteCursor {
  id: string;
  fx: number;
  fy: number;
}

interface CursorsResponse {
  cursors?: RemoteCursor[];
  configured?: boolean;
}

function getVisitorId(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function colorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function Cursors() {
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);
  const [ready, setReady] = useState(false);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const selfIdRef = useRef("");

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    selfIdRef.current = getVisitorId();
    let cancelled = false;

    function trackViewport() {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    }
    trackViewport();
    window.addEventListener("resize", trackViewport);

    // --- outgoing: throttled position posts ---
    let lastSent = 0;
    let pending: { fx: number; fy: number } | null = null;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    function postCursor() {
      if (!pending) return;
      const { fx, fy } = pending;
      pending = null;
      lastSent = Date.now();
      fetch("/api/cursors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selfIdRef.current, fx, fy }),
        cache: "no-store",
      }).catch(() => {
        // Failure-silent: cursor sharing is best-effort.
      });
    }

    function onMouseMove(e: MouseEvent) {
      pending = { fx: e.clientX / window.innerWidth, fy: e.clientY / window.innerHeight };
      const elapsed = Date.now() - lastSent;
      if (elapsed >= SEND_INTERVAL_MS) {
        postCursor();
      } else if (flushTimer === null) {
        flushTimer = setTimeout(() => {
          flushTimer = null;
          postCursor();
        }, SEND_INTERVAL_MS - elapsed);
      }
    }
    window.addEventListener("mousemove", onMouseMove);

    // --- incoming: poll everyone else's cursors ---
    async function poll() {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/cursors", { cache: "no-store" });
        const data = (await res.json()) as CursorsResponse;
        if (cancelled) return;
        if (!data.configured || !Array.isArray(data.cursors)) {
          setCursors([]);
          return;
        }
        const others = data.cursors.filter((c) => c.id !== selfIdRef.current);
        setCursors(others);
        setReady(true);
      } catch {
        if (!cancelled) setCursors([]);
      }
    }

    poll();
    const pollTimer = setInterval(poll, POLL_INTERVAL_MS);
    function onVisibilityChange() {
      if (!document.hidden) poll();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", trackViewport);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(pollTimer);
      if (flushTimer !== null) clearTimeout(flushTimer);
    };
  }, []);

  // Render nothing until the API reports configured and we know the viewport.
  if (!ready || viewport.w === 0) return null;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      <AnimatePresence>
        {cursors.map((c) => {
          const color = colorFor(c.id);
          return (
            <motion.div
              key={c.id}
              className="absolute left-0 top-0"
              initial={{ opacity: 0 }}
              animate={{ x: c.fx * viewport.w, y: c.fy * viewport.h, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                x: { duration: 0.6, ease: "easeOut" },
                y: { duration: 0.6, ease: "easeOut" },
                opacity: { duration: 0.5 },
              }}
            >
              <svg
                width="14"
                height="18"
                viewBox="0 0 14 18"
                fill="none"
                className="drop-shadow-sm"
                aria-hidden="true"
              >
                <path
                  d="M1 1L13 8.2L7.8 9.4L5.4 14.6L1 1Z"
                  fill={color}
                  stroke="white"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="ml-3 -mt-1 inline-block whitespace-nowrap rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] leading-none text-stone-700 backdrop-blur-sm">
                guest-{c.id.slice(0, 4)}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
