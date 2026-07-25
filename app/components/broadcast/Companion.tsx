"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Sparkles, X } from "lucide-react";
import type { FeedItem } from "../../lib/activity";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What does Colin do?",
  "What shipped this week?",
  "Is Colin open to work?",
  "How do I reach Colin?",
];

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hey! I'm Clippy Colin, the host of this broadcast. Ask me anything about Colin — I read the live telemetry.",
};

const EVENT_PHRASES: Record<string, string> = {
  merge: "I just watched Colin merge something. Beautiful.",
  push: "Colin just pushed code. I saw it. I was there.",
  release: "A release! Colin shipped a whole release!",
  pr: "New PR from Colin — someone should review that.",
  review: "Colin is reviewing PRs again. Maintainer things.",
  issue: "Colin filed an issue. Someone's getting a repro.",
};

// Where the OS windows land on the Broadcast: in-page sections where one
// exists, the OS itself for the rest.
const ACTION_ANCHORS: Record<string, string> = {
  projects: "#projects",
  contact: "#contact",
  live: "#wire",
  journal: "#log",
  workshop: "#log",
  agents: "#log",
  now: "#now",
};

export function Companion() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSeenFeedId = useRef<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy, open]);

  // React to fresh wire events with a one-liner bubble when the chat is closed.
  useEffect(() => {
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
        if (items[0].id === lastSeenFeedId.current) return;
        const fresh = items[0];
        lastSeenFeedId.current = fresh.id;
        setBubble(
          EVENT_PHRASES[fresh.kind] ?? "Fresh activity on the wire. Eyes everywhere."
        );
      } catch {
        // Quiet mascot on feed failure.
      }
    };
    checkFeed();
    const interval = setInterval(checkFeed, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!bubble) return;
    const t = setTimeout(() => setBubble(null), 7000);
    return () => clearTimeout(t);
  }, [bubble]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-8) }),
      });
      const data = (await res.json()) as {
        reply?: string;
        actions?: { type: string; id: string }[];
      };
      if (Array.isArray(data.actions)) {
        for (const a of data.actions) {
          if (a.type !== "open_window") continue;
          const anchor = ACTION_ANCHORS[a.id];
          if (anchor) {
            document.querySelector(anchor)?.scrollIntoView({ behavior: "smooth" });
          } else if (["about", "resume", "terminal"].includes(a.id)) {
            window.open("/os", "_blank", "noopener");
          }
        }
      }
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply ?? "My wires got crossed — try again in a sec." },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "My wires got crossed — try again in a sec." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="fixed z-[95] bottom-0 inset-x-0 sm:bottom-24 sm:right-5 sm:left-auto sm:w-[360px] bg-white/95 backdrop-blur-xl border border-stone-200 sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: "min(480px, 75dvh)" }}
          >
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-stone-200/70 bg-violet-50/60">
              <img src="/clippy.png" alt="" className="w-7 h-auto" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-stone-800 leading-tight">Clippy Colin</p>
                <p className="text-[11px] text-stone-500 leading-tight">
                  Briefed on Colin · reads live telemetry
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="ml-auto p-1.5 rounded-lg hover:bg-stone-200/70 text-stone-500 transition"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 p-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-violet-500 text-white rounded-br-md"
                        : "bg-stone-100 text-stone-800 rounded-bl-md border border-stone-200/60"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="bg-stone-100 border border-stone-200/60 px-3 py-2 rounded-2xl rounded-bl-md text-sm text-stone-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    Clippy is thinking…
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {messages.length === 1 && (
              <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="px-2.5 py-1 rounded-full bg-violet-100 hover:bg-violet-200 text-violet-700 text-xs transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2 p-3 border-t border-stone-200/70"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about Colin…"
                maxLength={600}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white border border-stone-200 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="px-3 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 disabled:opacity-40 text-white transition"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Corner mascot */}
      <div className="fixed z-[90] bottom-4 right-4 sm:bottom-5 sm:right-5">
        <AnimatePresence>
          {bubble && !open && (
            <motion.button
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              onClick={() => setOpen(true)}
              className="absolute bottom-full right-0 mb-2 w-56 text-left bg-white rounded-2xl rounded-br-md px-3.5 py-2.5 shadow-xl border border-stone-200 text-[13px] font-medium text-stone-800"
            >
              {bubble}
            </motion.button>
          )}
        </AnimatePresence>
        <motion.button
          onClick={() => setOpen((o) => !o)}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          animate={{ y: [0, -5, 0] }}
          transition={{ y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }}
          className="block"
          aria-label={open ? "Close Clippy Colin" : "Chat with Clippy Colin"}
        >
          <img
            src="/clippy.png"
            alt=""
            className="w-16 sm:w-20 h-auto select-none"
            style={{ filter: "drop-shadow(0 10px 16px rgba(0,0,0,0.2))" }}
            draggable={false}
          />
        </motion.button>
      </div>
    </>
  );
}
