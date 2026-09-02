import { NextRequest, NextResponse } from "next/server";
import { fetchGithubActivity } from "../../lib/activity";
import { clientIp, overLimit } from "../../lib/ollama";
import { whisper, type Copy, type VisitorContext } from "../../lib/wrongness";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TIMES = ["a minute", "a few minutes", "a long time"] as const;
const SCROLLS = ["the top", "the middle", "the bottom"] as const;
const HOURS = ["morning", "afternoon", "evening", "late night"] as const;
const VISITS = ["first", "returning", "many"] as const;

function pick<T extends string>(v: unknown, list: readonly T[], fallback: T): T {
  return typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : fallback;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "?" }, { status: 400 });
  }
  const band = Math.max(1, Math.min(4, Math.round(Number(body.band) || 1)));
  const ctx: VisitorContext = {
    band,
    time: pick(body.time, TIMES, "a minute"),
    scroll: pick(body.scroll, SCROLLS, "the top"),
    hour: pick(body.hour, HOURS, "afternoon"),
    visits: pick(body.visits, VISITS, "first"),
    hovered: Math.max(0, Math.min(99, Number(body.hovered) || 0)),
    idle: body.idle === true,
  };
  // The model runs at most a handful of times per visitor per day; after that
  // the cache and the hand-written fallback carry the effect.
  const copy: Copy = {};
  if (body.copy && typeof body.copy === "object") {
    let total = 0;
    for (const [k, v] of Object.entries(body.copy as Record<string, unknown>)) {
      if (typeof v !== "string" || !/^[a-z0-9-]{1,40}$/.test(k)) continue;
      const text = v.replace(/\s+/g, " ").trim().slice(0, 400);
      if (!text) continue;
      total += text.length;
      if (total > 9000 || Object.keys(copy).length >= 90) break;
      copy[k] = text;
    }
  }
  const nonce = typeof body.nonce === "string" ? body.nonce.slice(0, 24) : Math.random().toString(36).slice(2, 10);
  const allowModel = !overLimit("whisper", clientIp(req), 16, 900);
  const events = await fetchGithubActivity();
  const result = await whisper(ctx, copy, events, allowModel, nonce);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
