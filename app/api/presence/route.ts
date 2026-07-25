import { NextRequest, NextResponse } from "next/server";

// Presence must never be cached — every beat is a live write + count.
export const dynamic = "force-dynamic";

const SET_KEY = "presence:visitors";
const SET_TTL_SECONDS = 120;

interface PipelineResult {
  result?: number;
  error?: string;
}

export async function GET(request: NextRequest) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return NextResponse.json({ visitors: 0, configured: false });
  }

  const visitor = request.nextUrl.searchParams.get("t");
  if (!visitor || visitor.length > 128) {
    return NextResponse.json({ visitors: 0, configured: true });
  }

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["SADD", SET_KEY, visitor],
        ["EXPIRE", SET_KEY, String(SET_TTL_SECONDS)],
        ["SCARD", SET_KEY],
      ]),
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ visitors: 0, configured: false });
    }

    const results = (await res.json()) as PipelineResult[];
    const visitors = typeof results?.[2]?.result === "number" ? results[2].result : 0;
    return NextResponse.json({ visitors, configured: true });
  } catch {
    return NextResponse.json({ visitors: 0, configured: false });
  }
}
