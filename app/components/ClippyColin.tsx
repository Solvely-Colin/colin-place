"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AppId } from "./Desktop";
import type { FeedItem } from "../lib/activity";

const PHRASES = {
  idle: [
    "It looks like you want to hire Colin. Need help with that?",
    "Feeling loopy? Me too.",
    "Click me and ask anything — I’m briefed on Colin.",
    "Pssst. Click Projects. Colin built things there.",
    "Colin builds product, community, and weird web stuff.",
    "Hire a person who cares about craft and community.",
    "I’m not a paperclip, but I am persistent.",
    "Move your mouse. I’ll follow you anywhere.",
  ],
  onIconHover: [
    "That icon does something. Bet you can’t guess what.",
    "Click it. You know you want to.",
    "Colin curated this section himself.",
    "Good eye. That one’s important.",
  ],
  onWindowOpen: [
    "Excellent choice. Colin would be proud.",
    "Now you’re cooking.",
    "That’s the good stuff right there.",
    "Window opened. Knowledge incoming.",
  ],
  onWindowClose: [
    "Closed already? Fine, be that way.",
    "I’ll just be here. Floating.",
    "Come back any time.",
  ],
  onTerminal: [
    "Ooh, terminal. You’re a fancy one.",
    "Try typing `surprise`. I dare you.",
    "Command line? Colin approves.",
  ],
};

const EVENT_PHRASES: Record<string, string> = {
  merge: "I just watched Colin merge something. Beautiful.",
  push: "Colin just pushed code. I saw it. I was there.",
  release: "A release! Colin shipped a whole release!",
  pr: "New PR from Colin — someone should review that.",
  review: "Colin is reviewing PRs again. Maintainer things.",
  issue: "Colin filed an issue. Someone’s getting a repro.",
};
const EVENT_PHRASE_DEFAULT = "Fresh activity in Colin’s orbit. Eyes everywhere.";

interface ClippyColinProps {
  openWindows: AppId[];
  hoveredIcon: AppId | null;
  onAsk: () => void;
}

const MASCOT_WIDTH = 160;
const MASCOT_HEIGHT = 240;
const BUBBLE_WIDTH = 240;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function ClippyColin({ openWindows, hoveredIcon, onAsk }: ClippyColinProps) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ x: 300, y: 500 });
  const [target, setTarget] = useState({ x: 300, y: 500 });
  const [message, setMessage] = useState("Hey! I’m Clippy Colin. Click me — I answer questions now.");
  const [showBubble, setShowBubble] = useState(true);
  const [facingRight, setFacingRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const grabOffset = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);
  const lastMessageAt = useRef(0);
  const lastSeenFeedId = useRef<string | null>(null);
  const lastCategoryAt = useRef<Partial<Record<keyof typeof PHRASES, number>>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);

  const getBounds = useCallback(() => {
    const width = typeof window !== "undefined" ? window.innerWidth : 1280;
    const height = typeof window !== "undefined" ? window.innerHeight : 800;
    return {
      minX: 12,
      maxX: width - MASCOT_WIDTH - 12,
      minY: 64,
      maxY: height - MASCOT_HEIGHT - 84,
    };
  }, []);

  const pickPhrase = useCallback((category: keyof typeof PHRASES) => {
    const list = PHRASES[category];
    return list[Math.floor(Math.random() * list.length)];
  }, []);

  const showMessage = useCallback(
    (category: keyof typeof PHRASES, minIntervalMs = 3000) => {
      const now = Date.now();
      const lastForCategory = lastCategoryAt.current[category] || 0;
      if (now - lastForCategory < minIntervalMs || now - lastMessageAt.current < 1500) {
        return;
      }
      lastCategoryAt.current[category] = now;
      lastMessageAt.current = now;
      const candidates = PHRASES[category].filter((p) => p !== message);
      const list = candidates.length > 0 ? candidates : PHRASES[category];
      setMessage(list[Math.floor(Math.random() * list.length)]);
      setShowBubble(true);
    },
    [message]
  );

  const hideBubble = useCallback(() => {
    setShowBubble(false);
  }, []);

  // React to a new feed event, respecting the global message throttle
  const showEventReaction = useCallback((kind: string) => {
    const now = Date.now();
    if (now - lastMessageAt.current < 1500) return;
    lastMessageAt.current = now;
    setMessage(EVENT_PHRASES[kind] ?? EVENT_PHRASE_DEFAULT);
    setShowBubble(true);
  }, []);

  // Poll the activity feed; seed the newest id on mount without reacting
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;

    const checkFeed = async () => {
      try {
        const res = await fetch("/api/feed");
        if (!res.ok) return;
        const data: { items?: FeedItem[] } = await res.json();
        const items = data.items;
        if (cancelled || !items || items.length === 0) return;
        if (lastSeenFeedId.current === null) {
          lastSeenFeedId.current = items[0].id;
          return;
        }
        const seenIndex = items.findIndex((item) => item.id === lastSeenFeedId.current);
        const fresh = seenIndex === -1 ? items : items.slice(0, seenIndex);
        if (fresh.length === 0) return;
        lastSeenFeedId.current = items[0].id;
        showEventReaction(fresh[0].kind);
      } catch {
        // Feed failures are silent — the mascot just stays quiet.
      }
    };

    checkFeed();
    const interval = setInterval(checkFeed, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [mounted, showEventReaction]);

  // Auto-hide bubble after 6 seconds
  useEffect(() => {
    if (!showBubble) return;
    const timer = setTimeout(() => setShowBubble(false), 6000);
    return () => clearTimeout(timer);
  }, [showBubble, message]);

  // Initial position and resize handling
  useEffect(() => {
    const handleResize = () => {
      const bounds = getBounds();
      setPosition((prev) => ({
        x: clamp(prev.x, bounds.minX, bounds.maxX),
        y: clamp(prev.y, bounds.minY, bounds.maxY),
      }));
      setTarget((prev) => ({
        x: clamp(prev.x, bounds.minX, bounds.maxX),
        y: clamp(prev.y, bounds.minY, bounds.maxY),
      }));
    };

    const raf = requestAnimationFrame(() => {
      setMounted(true);
      const width = window.innerWidth;
      const height = window.innerHeight;
      const bounds = getBounds();
      const startX = clamp(width / 2 - MASCOT_WIDTH / 2, bounds.minX, bounds.maxX);
      const startY = clamp(height - 240, bounds.minY, bounds.maxY);
      setPosition({ x: startX, y: startY });
      setTarget({ x: startX, y: startY });
    });
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
    };
  }, [getBounds]);

  // Idle random phrases
  useEffect(() => {
    if (!mounted || isDragging) return;
    const interval = setInterval(() => {
      if (Math.random() > 0.4) {
        showMessage("idle", 8000);
      }
    }, 9000);
    return () => clearInterval(interval);
  }, [isDragging, mounted, showMessage]);

  // React to hovered icon (throttled)
  useEffect(() => {
    if (hoveredIcon) {
      showMessage("onIconHover", 3500);
    }
  }, [hoveredIcon, showMessage]);

  // React to opened windows
  useEffect(() => {
    if (openWindows.length > 0) {
      const last = openWindows[openWindows.length - 1];
      if (last === "terminal") {
        showMessage("onTerminal", 3000);
      } else {
        showMessage("onWindowOpen", 3000);
      }
    }
  }, [openWindows, showMessage]);

  // Wander around
  useEffect(() => {
    if (!mounted || isDragging) return;

    const interval = setInterval(() => {
      const bounds = getBounds();
      const newTarget = {
        x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
        y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY),
      };
      setTarget(newTarget);
      setFacingRight(newTarget.x > position.x);
    }, 4000);

    return () => clearInterval(interval);
  }, [isDragging, mounted, position.x, position.y, getBounds]);

  // Smooth movement
  useEffect(() => {
    if (!mounted || isDragging) return;
    const interval = setInterval(() => {
      setPosition((prev) => {
        const dx = target.x - prev.x;
        const dy = target.y - prev.y;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return prev;
        const bounds = getBounds();
        return {
          x: clamp(prev.x + dx * 0.03, bounds.minX, bounds.maxX),
          y: clamp(prev.y + dy * 0.03, bounds.minY, bounds.maxY),
        };
      });
    }, 16);
    return () => clearInterval(interval);
  }, [isDragging, mounted, target, getBounds]);

  // Manual drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    movedRef.current = false;
    hideBubble();
    const bounds = getBounds();
    grabOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    containerRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    movedRef.current = true;
    const bounds = getBounds();
    const nextX = clamp(e.clientX - grabOffset.current.x, bounds.minX, bounds.maxX);
    const nextY = clamp(e.clientY - grabOffset.current.y, bounds.minY, bounds.maxY);
    setPosition({ x: nextX, y: nextY });
    // Keep the wander target glued to the drag so he doesn't rubber-band
    // back to the old anchor on release.
    setTarget({ x: nextX, y: nextY });
    setFacingRight(e.clientX > position.x + MASCOT_WIDTH / 2);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    containerRef.current?.releasePointerCapture(e.pointerId);
  };

  const bubbleRight = position.x + BUBBLE_WIDTH + 16 > (typeof window !== "undefined" ? window.innerWidth : 1280);

  if (!mounted) return null;

  return (
    <motion.div
      ref={containerRef}
      className="fixed z-[100] pointer-events-auto cursor-grab active:cursor-grabbing"
      initial={{ opacity: 0, scale: 0, y: 100 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{ left: position.x, top: position.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={() => {
        if (!movedRef.current) onAsk();
      }}
    >
      <div className="relative">
        <AnimatePresence>
          {showBubble && message && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: 10 }}
              className="absolute bottom-full mb-3 bg-white rounded-2xl px-4 py-3 shadow-xl border border-stone-200 text-sm font-medium text-stone-800"
              style={{
                width: BUBBLE_WIDTH,
                left: bubbleRight ? "auto" : 0,
                right: bubbleRight ? 0 : "auto",
              }}
            >
              {message}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  hideBubble();
                }}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-600 flex items-center justify-center text-xs"
              >
                ×
              </button>
              <div
                className="absolute -bottom-2 w-4 h-4 bg-white border-b border-r border-stone-200 rotate-45"
                style={{
                  left: bubbleRight ? "auto" : 20,
                  right: bubbleRight ? 20 : "auto",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.img
            src="/clippy.png"
            alt="Clippy Colin"
            className="w-36 sm:w-44 h-auto select-none"
            style={{ filter: "drop-shadow(0 16px 24px rgba(0,0,0,0.18))" }}
            animate={{ scaleX: facingRight ? 1 : -1 }}
            transition={{ scaleX: { duration: 0.3 } }}
            draggable={false}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
