import { NextResponse } from "next/server";
import { fetchRepos } from "../../lib/repos";

export const revalidate = 3600;

export async function GET() {
  return NextResponse.json(await fetchRepos());
}
