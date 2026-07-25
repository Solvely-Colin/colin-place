"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { AppId, APP_META } from "./Desktop";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What does Colin do?",
  "Is Colin open to work?",
  "What has Colin built?",
  "How do I reach Colin?",
];

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hey! I’m Clippy Colin — site mascot with a direct line to Colin’s fact sheet. Ask me anything about him.",
};

interface AskColinProps {
  onOpenApp: (id: AppId) => void;
}

export function AskColin({ onOpenApp }: AskColinProps) {
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

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
          if (a.type === "open_window" && a.id in APP_META && a.id !== "ask") {
            onOpenApp(a.id as AppId);
          }
        }
      }
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.reply ?? "My wires got crossed — try again in a sec.",
        },
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
    <div className="flex flex-col h-[380px] -m-1">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2.5 p-1">
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

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="flex flex-wrap gap-1.5 py-2">
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

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 pt-2 border-t border-stone-200/60"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about Colin…"
          maxLength={600}
          className="flex-1 px-3 py-2 rounded-lg bg-white border border-stone-200 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
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
    </div>
  );
}
