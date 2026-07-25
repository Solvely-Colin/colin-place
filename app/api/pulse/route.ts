import { NextResponse } from "next/server";
import { fetchPulse } from "../../lib/pulse";

export const revalidate = 600;

export async function GET() {
  const pulse = await fetchPulse();
  return NextResponse.json(pulse);
}
