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
  "Find his most-discussed PR",
];

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hey. I'm Clippy Colin, the host here. Ask me anything about Colin. I read the live telemetry and can dig through his GitHub.",
};

const EVENT_PHRASES: Record<string, string> = {
  merge: "I just watched Colin merge something. Beautiful.",
  push: "Colin just pushed code. I saw it. I was there.",
  release: "A release! Colin shipped a whole release!",
  pr: "New PR from Colin. Someone should review that.",
  review: "Colin is reviewing PRs again. Maintainer things.",
  issue: "Colin filed an issue. Someone's getting a repro.",
};

// Where the bot's window ids land on this page.
const ACTION_ANCHORS: Record<string, string> = {
  projects: "#work",
  workshop: "#work",
  contact: "#contact",
  live: "#now",
  now: "#now",
  resume: "#path",
  about: "#about",
};

export function Companion() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSeen = useRef<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy, open]);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/feed");
        if (!res.ok) return;
        const data: { items?: FeedItem[] } = await res.json();
        const items = data.items;
        if (cancelled || !items || items.length === 0) return;
        if (lastSeen.current === null) {
          lastSeen.current = items[0].id;
          return;
        }
        if (items[0].id === lastSeen.current) return;
        lastSeen.current = items[0].id;
        setBubble(EVENT_PHRASES[items[0].kind] ?? "Fresh activity on the wire.");
      } catch {
        // Quiet mascot.
      }
    };
    check();
    const id = setInterval(check, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
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
      const data = (await res.json()) as { reply?: string; actions?: { type: string; id: string }[] };
      if (Array.isArray(data.actions)) {
        for (const a of data.actions) {
          if (a.type !== "open_window") continue;
          const anchor = ACTION_ANCHORS[a.id];
          if (anchor) document.querySelector(anchor)?.scrollIntoView({ behavior: "smooth" });
          else if (a.id === "town") window.location.assign("/town");
        }
      }
      setMessages((m) => [...m, { role: "assistant", content: data.reply ?? "My wires got crossed. Try again in a sec." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "My wires got crossed. Try again in a sec." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed z-[95] bottom-0 inset-x-0 sm:bottom-28 sm:right-6 sm:left-auto sm:w-[380px] bg-ground-2 border border-line sm:rounded-lg rounded-t-lg shadow-[0_24px_60px_-24px_rgba(16,16,16,0.35)] flex flex-col overflow-hidden"
            style={{ maxHeight: "min(520px, 78dvh)" }}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
              <img src="/clippy.png" alt="" className="w-8 h-auto" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink leading-tight">Clippy Colin</p>
                <p className="text-[11px] font-mono text-ink-mute leading-tight mt-0.5">briefed on Colin · reads live telemetry</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="ml-auto p-1.5 rounded-lg hover:bg-ink/10 text-ink-dim transition"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 p-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-[13.5px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-ink text-ground rounded-br-md"
                        : "bg-ground-3 text-ink rounded-bl-md border border-line"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="bg-ground-3 border border-line px-3.5 py-2 rounded-2xl rounded-bl-md text-[13px] text-ink-dim flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse text-loop" />
                    thinking…
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
                    className="px-2.5 py-1 rounded-md border border-line hover:border-loop hover:text-loop text-ink-dim text-[12px] transition"
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
              className="flex gap-2 p-3 border-t border-line"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about Colin…"
                maxLength={600}
                className="flex-1 min-w-0 px-3 py-2 rounded-md bg-ground border border-line text-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-loop"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="px-3 py-2 rounded-md bg-ink hover:bg-ink-dim disabled:opacity-40 text-ground transition"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed z-[90] bottom-4 right-4 sm:bottom-6 sm:right-6">
        <AnimatePresence>
          {bubble && !open && (
            <motion.button
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              onClick={() => setOpen(true)}
              className="absolute bottom-full right-0 mb-2 w-60 text-left bg-ground-2 border border-line rounded-lg rounded-br-md px-3.5 py-2.5 shadow-lg text-[13px] text-ink"
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
          transition={{ y: { duration: 2.6, repeat: Infinity, ease: "easeInOut" } }}
          className="block"
          aria-label={open ? "Close Clippy Colin" : "Chat with Clippy Colin"}
        >
          <img
            src="/clippy.png"
            alt=""
            className="w-16 sm:w-20 h-auto select-none"
            style={{ filter: "drop-shadow(0 10px 18px rgba(16,16,16,0.25))" }}
            draggable={false}
          />
        </motion.button>
      </div>
    </>
  );
}
