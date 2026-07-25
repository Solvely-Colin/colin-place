import { NextRequest, NextResponse } from "next/server";

// Cursor positions must never be cached — every write and read is live.
export const dynamic = "force-dynamic";

const HASH_KEY = "presence:cursors";
const HASH_TTL_SECONDS = 30;
const CURSOR_MAX_AGE_MS = 10000;

interface CursorPoint {
  id: string;
  fx: number;
  fy: number;
}

interface PipelineResult {
  result?: unknown;
  error?: string;
}

function clampFraction(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(1.2, Math.max(0, value));
}

function validId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 64 && /^[a-zA-Z0-9-]+$/.test(value);
}

function parseCursor(id: string, raw: string, cutoff: number): CursorPoint | null {
  const parts = raw.split(",");
  if (parts.length !== 3) return null;
  const fx = Number(parts[0]);
  const fy = Number(parts[1]);
  const ts = Number(parts[2]);
  if (!Number.isFinite(fx) || !Number.isFinite(fy) || !Number.isFinite(ts)) return null;
  if (ts * 1000 < cutoff) return null;
  return { id, fx, fy };
}

async function runPipeline(url: string, token: string, commands: string[][]): Promise<PipelineResult[] | null> {
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as PipelineResult[];
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return NextResponse.json({ ok: false, configured: false });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, configured: true });
  }

  const { id, fx, fy } = (body ?? {}) as { id?: unknown; fx?: unknown; fy?: unknown };
  const cfx = clampFraction(fx);
  const cfy = clampFraction(fy);
  if (!validId(id) || cfx === null || cfy === null) {
    return NextResponse.json({ ok: false, configured: true });
  }

  const results = await runPipeline(url, token, [
    ["HSET", HASH_KEY, id, `${cfx},${cfy},${Math.floor(Date.now() / 1000)}`],
    ["EXPIRE", HASH_KEY, String(HASH_TTL_SECONDS)],
  ]);
  if (results === null) {
    return NextResponse.json({ ok: false, configured: false });
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return NextResponse.json({ cursors: [], configured: false });
  }

  const results = await runPipeline(url, token, [["HGETALL", HASH_KEY]]);
  if (results === null) {
    return NextResponse.json({ cursors: [], configured: false });
  }

  const raw = results[0]?.result;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ cursors: [], configured: true });
  }

  const cutoff = Date.now() - CURSOR_MAX_AGE_MS;
  const cursors: CursorPoint[] = [];
  for (let i = 0; i + 1 < raw.length; i += 2) {
    const id = raw[i];
    const value = raw[i + 1];
    if (typeof id !== "string" || typeof value !== "string") continue;
    const point = parseCursor(id, value, cutoff);
    if (point) cursors.push(point);
  }

  return NextResponse.json({ cursors, configured: true });
}
