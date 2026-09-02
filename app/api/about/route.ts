import { NextRequest, NextResponse } from "next/server";
import { fetchPulse } from "../../lib/pulse";
import { fetchGithubActivity } from "../../lib/activity";
import { fetchRepos } from "../../lib/repos";
import { loadAbout, regenerateAbout } from "../../lib/about";
import { DROPS } from "../../lib/drops";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function inputs() {
  const [pulse, github, repos] = await Promise.all([fetchPulse(), fetchGithubActivity(), fetchRepos()]);
  const events = [...github, ...DROPS].sort((a, b) => b.at.localeCompare(a.at));
  return { pulse, events, repos };
}

// GET: the current About and whether it is stale.
export async function GET() {
  const state = await loadAbout(await inputs());
  return NextResponse.json(state);
}

// POST: force a rewrite. Needs the admin token (TOWN_ADMIN_TOKEN, kept under its old name).
export async function POST(req: NextRequest) {
  const token = process.env.TOWN_ADMIN_TOKEN;
  if (!token || req.headers.get("authorization") !== "Bearer " + token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const record = await regenerateAbout(await inputs());
  if (!record) return NextResponse.json({ error: "rewrite failed; is OLLAMA_API_KEY set?" }, { status: 503 });
  return NextResponse.json({ ok: true, record });
}
