"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Building } from "../../lib/town/types";
import { drawBuilding, type Scene } from "../engine/draw";
import { place } from "../engine/world";

// Colin's approval gate for visitor-built buildings. Token in sessionStorage.
export default function TownAdmin() {
  const [token, setToken] = useState("");
  const [pending, setPending] = useState<Building[]>([]);
  const [approved, setApproved] = useState<Building[]>([]);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    // Restore the token after mount; deferred so hydration stays clean.
    const id = setTimeout(() => {
      try {
        const saved = sessionStorage.getItem("town:admin");
        if (saved) setToken(saved);
      } catch {
        // ignore
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  async function refresh(t = token) {
    if (!t) return;
    const res = await fetch("/api/town/admin", { headers: { Authorization: "Bearer " + t }, cache: "no-store" });
    if (!res.ok) {
      setStatus(res.status === 401 ? "That token is not it." : "Could not load.");
      return;
    }
    const data = (await res.json()) as { pending: Building[]; approved: Building[]; configured: boolean };
    setPending(data.pending);
    setApproved(data.approved);
    setStatus(data.configured ? `${data.pending.length} waiting · ${data.approved.length} approved` : "Redis is not configured.");
    try {
      sessionStorage.setItem("town:admin", t);
    } catch {
      // ignore
    }
  }

  async function act(id: string, action: "approve" | "reject" | "demolish") {
    const res = await fetch("/api/town/admin", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (!res.ok) setStatus("That did not work.");
    await refresh();
  }

  return (
    <div className="min-h-screen px-5 sm:px-8 py-10 max-w-5xl mx-auto">
      <Link href="/town" className="font-mono text-[11px] text-ink-dim hover:text-ink">← the town</Link>
      <h1 className="display text-3xl text-ink mt-3">Zoning office</h1>
      <p className="text-ink-dim mt-2">Visitor-built buildings wait here until you approve them.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          refresh();
        }}
        className="mt-6 flex gap-2 max-w-md"
      >
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="TOWN_ADMIN_TOKEN"
          className="flex-1 px-3 py-2 rounded-lg bg-ground-2 border border-line-strong text-sm text-ink focus:outline-none focus:border-loop"
        />
        <button className="px-4 py-2 rounded-md bg-ink text-ground text-sm font-medium">Open</button>
      </form>
      {status && <p className="font-mono text-[11px] text-ink-mute mt-3">{status}</p>}

      <Section title="Waiting" items={pending} actions={[["approve", "Approve"], ["reject", "Reject"]]} onAct={act} />
      <Section title="Approved" items={approved} actions={[["demolish", "Demolish"]]} onAct={act} />
    </div>
  );
}

function Section({
  title,
  items,
  actions,
  onAct,
}: {
  title: string;
  items: Building[];
  actions: [("approve" | "reject" | "demolish"), string][];
  onAct: (id: string, action: "approve" | "reject" | "demolish") => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-ink mb-4">{title}</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((b) => (
          <div key={b.id} className="p-4 rounded-lg border border-line bg-ground-2 flex gap-4">
            <Thumb b={b} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg text-ink leading-tight">{b.name}</p>
              <p className="text-[13px] text-ink-dim mt-1">{b.tagline}</p>
              <p className="font-mono text-[11px] text-ink-mute mt-2">
                from: &ldquo;{b.description}&rdquo; · {b.source}
                {b.model ? ` · ${b.model}` : ""} · {b.createdAt.slice(0, 10)}
              </p>
              <p className="text-[12px] text-ink-dim mt-2 line-clamp-3">{b.interior.body[0]}</p>
              <div className="flex gap-2 mt-3">
                {actions.map(([action, label]) => (
                  <button
                    key={action}
                    onClick={() => onAct(b.id, action)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold ${
                      action === "approve" ? "bg-mint text-ground" : "border border-line-strong text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Thumb({ b }: { b: Building }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 140 * dpr;
    canvas.height = 150 * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, 140, 150);
    const p = place(b, 0);
    const css = getComputedStyle(document.documentElement);
    const scene: Scene = {
      ctx,
      t: 1,
      night: 0,
      fonts: { display: css.getPropertyValue("--font-display").trim() || "sans-serif", mono: "monospace" },
    };
    ctx.save();
    ctx.translate(70 - ((p.bx - p.by) * 64) / 2, 120 - ((p.bx + p.by) * 32) / 2 - 8);
    ctx.scale(0.8, 0.8);
    drawBuilding(scene, p);
    ctx.restore();
  }, [b]);
  return <canvas ref={ref} style={{ width: 140, height: 150 }} className="shrink-0 rounded-lg bg-ground" />;
}
