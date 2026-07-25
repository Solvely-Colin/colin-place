import { NextResponse } from "next/server";
import { fetchGithubActivity, FeedItem } from "../../lib/activity";
import { DROPS } from "../../lib/drops";

export const revalidate = 600;

export async function GET() {
  const github = await fetchGithubActivity();
  const items: FeedItem[] = [...github, ...DROPS]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 30);
  return NextResponse.json({
    items,
    generatedAt: new Date().toISOString(),
    githubOk: github.length > 0,
  });
}
