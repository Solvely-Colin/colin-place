import { NextRequest, NextResponse } from "next/server";
import { fetchGithubActivity } from "../../lib/activity";
import { clientIp, overLimit } from "../../lib/ollama";
import { whisper, type VisitorContext } from "../../lib/wrongness";

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
  const allowModel = !overLimit("whisper", clientIp(req), 12, 800);
  const events = await fetchGithubActivity();
  const result = await whisper(ctx, events, allowModel);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
