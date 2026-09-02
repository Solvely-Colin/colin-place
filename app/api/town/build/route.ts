import { NextRequest, NextResponse } from "next/server";
import { generateBuilding } from "../../../lib/town/generate";
import { pushBuilding, storeConfigured } from "../../../lib/town/store";
import { newId, slugify, type Building } from "../../../lib/town/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Best-effort per-instance rate limits, like the Ask route.
const DAY_LIMIT_IP = 12;
const DAY_LIMIT_GLOBAL = 400;
const perIp = new Map<string, { count: number; day: string }>();
let globalCount = { count: 0, day: "" };

function limited(ip: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  if (globalCount.day !== day) globalCount = { count: 0, day };
  const entry = perIp.get(ip) ?? { count: 0, day };
  if (entry.day !== day) {
    entry.count = 0;
    entry.day = day;
  }
  if (entry.count >= DAY_LIMIT_IP || globalCount.count >= DAY_LIMIT_GLOBAL) return true;
  entry.count += 1;
  globalCount.count += 1;
  perIp.set(ip, entry);
  if (perIp.size > 5000) perIp.clear();
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) {
    return NextResponse.json({ error: "The town is full for today. Come back tomorrow." }, { status: 429 });
  }

  let body: { description?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Say what you want built." }, { status: 400 });
  }
  const description =
    typeof body.description === "string"
      ? body.description.replace(/[\x00-\x1f\x7f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 280)
      : "";
  if (description.length < 3) {
    return NextResponse.json({ error: "Say a little more than that." }, { status: 400 });
  }

  const gen = await generateBuilding(description);
  const building: Building = {
    ...gen.spec,
    id: newId(),
    slug: slugify(gen.spec.name) || "place",
    description,
    source: gen.source,
    status: "pending",
    model: gen.model,
    createdAt: new Date().toISOString(),
  };

  const stored = storeConfigured() ? await pushBuilding("pending", building) : false;

  return NextResponse.json({ building, stored, ms: gen.ms, reason: gen.reason });
}
