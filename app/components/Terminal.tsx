"use client";

import { useState, useRef, useEffect } from "react";
import type { AppId } from "./Desktop";

interface TerminalProps {
  onOpenApp: (id: AppId) => void;
}

export function Terminal({ onOpenApp }: TerminalProps) {
  const [history, setHistory] = useState<string[]>([
    "Colin OS Terminal v1.0",
    "Type 'help' to see available commands.",
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();
    let response: string[] = [];

    switch (trimmed) {
      case "help":
        response = [
          "Available commands:",
          "  whoami     - Open About",
          "  projects   - Open Projects (live GitHub)",
          "  resume     - Open Resume",
          "  now        - What Colin is doing now",
          "  ask        - Chat with Clippy Colin",
          "  live       - Open the live activity stream",
          "  journal    - The Journal — approved entries only",
          "  workshop   - The Workshop — playable artifacts",
          "  agents     - Built by Agents — the site narrating itself",
          "  contact    - Contact info",
          "  clear      - Clear terminal",
          "  surprise   - A hidden easter egg",
        ];
        break;
      case "whoami":
        onOpenApp("about");
        response = ["Opening About…"];
        break;
      case "projects":
        onOpenApp("projects");
        response = ["Opening Projects — live from GitHub…"];
        break;
      case "resume":
        onOpenApp("resume");
        response = ["Opening Resume…"];
        break;
      case "now":
        onOpenApp("now");
        response = ["Opening Now…"];
        break;
      case "ask":
        onOpenApp("ask");
        response = ["Opening Ask — Clippy Colin is listening…"];
        break;
      case "live":
        onOpenApp("live");
        response = ["Opening Live — the orbit of Colin’s work…"];
        break;
      case "journal":
        onOpenApp("journal");
        response = ["Opening The Journal — nothing here without Colin’s ✓…"];
        break;
      case "workshop":
        onOpenApp("workshop");
        response = ["Opening The Workshop — artifacts, not bullets…"];
        break;
      case "agents":
        onOpenApp("agents");
        response = ["Opening Built by Agents — the site narrating itself…"];
        break;
      case "contact":
        onOpenApp("contact");
        response = [
          "Opening Contact…",
          "Email: hello@colin.place",
          "X: @colinsolvely",
          "GitHub: Solvely-Colin",
          "LinkedIn: colin-w-johnson",
        ];
        break;
      case "surprise":
        response = [
          "🎉 You found the easter egg!",
          "Colin is currently: Feeling Loopy",
        ];
        break;
      case "clear":
        setHistory([]);
        setInput("");
        return;
      default:
        response = ["Command not found: " + cmd + ". Try 'help'."];
    }

    setHistory((prev) => [...prev, "$ " + cmd, ...response]);
    setInput("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      handleCommand(input);
    }
  };

  return (
    <div className="h-full font-mono text-sm text-green-400 bg-stone-900 rounded-lg p-4 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-1">
        {history.map((line, i) => (
          <div key={i} className={line.startsWith("$") ? "text-stone-300" : ""}>
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="mt-2 flex items-center gap-2">
        <span className="text-green-400">$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent outline-none text-green-300"
          autoFocus
          spellCheck={false}
        />
      </form>
    </div>
  );
}
