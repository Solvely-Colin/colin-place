import { NextRequest, NextResponse } from "next/server";
import { listBuildings, pushBuilding, removeBuilding, storeConfigured } from "../../../lib/town/store";

export const dynamic = "force-dynamic";

// Colin's approval gate. TOWN_ADMIN_TOKEN must be set; the token travels in
// the Authorization header. GET lists pending; POST approves or rejects one.
function authorized(req: NextRequest): boolean {
  const token = process.env.TOWN_ADMIN_TOKEN;
  if (!token) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === "Bearer " + token;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!storeConfigured()) return NextResponse.json({ pending: [], approved: [], configured: false });
  const [pending, approved] = await Promise.all([listBuildings("pending"), listBuildings("approved")]);
  return NextResponse.json({ pending, approved, configured: true });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!storeConfigured()) return NextResponse.json({ error: "store not configured" }, { status: 503 });
  let body: { id?: unknown; action?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  const action = body.action === "approve" || body.action === "reject" || body.action === "demolish" ? body.action : "";
  if (!id || !action) return NextResponse.json({ error: "bad request" }, { status: 400 });

  if (action === "demolish") {
    const removed = await removeBuilding("approved", id);
    return NextResponse.json({ ok: removed !== null });
  }
  const removed = await removeBuilding("pending", id);
  if (!removed) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (action === "approve") {
    const ok = await pushBuilding("approved", { ...removed, status: "approved" });
    return NextResponse.json({ ok });
  }
  return NextResponse.json({ ok: true });
}
