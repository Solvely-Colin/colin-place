export interface FeedItem {
  id: string;
  kind: string;
  text: string;
  url?: string;
  at: string;
  source: "github" | "drop" | "site";
}

interface GhEvent {
  id: string;
  type: string;
  created_at: string;
  repo?: { name: string };
  payload?: {
    commits?: unknown[];
    action?: string;
    ref_type?: string;
    pull_request?: { number: number; title?: string; html_url?: string; merged?: boolean };
    issue?: { number: number; title?: string; html_url?: string };
    release?: { tag_name?: string; html_url?: string };
  };
}

function mapEvent(e: GhEvent): FeedItem | null {
  const repo = e.repo?.name;
  const repoUrl = repo ? "https://github.com/" + repo : undefined;
  switch (e.type) {
    case "PushEvent": {
      // The events API no longer includes payload.commits, so count pushes, not commits.
      if (!repo) return null;
      return {
        id: e.id,
        kind: "push",
        text: "Pushed to " + repo,
        url: repoUrl,
        at: e.created_at,
        source: "github",
      };
    }
    case "PullRequestEvent": {
      const pr = e.payload?.pull_request;
      if (!pr || !repo) return null;
      const merged = pr.merged === true;
      const opened = e.payload?.action === "opened";
      if (!merged && !opened) return null;
      return {
        id: e.id,
        kind: merged ? "merge" : "pr",
        text: (merged ? "Merged" : "Opened") + " PR #" + pr.number + " in " + repo + (pr.title ? ": " + pr.title : ""),
        url: "https://github.com/" + repo + "/pull/" + pr.number,
        at: e.created_at,
        source: "github",
      };
    }
    case "PullRequestReviewEvent": {
      const pr = e.payload?.pull_request;
      if (!pr || !repo) return null;
      return {
        id: e.id,
        kind: "review",
        text: "Reviewed PR #" + pr.number + " in " + repo + (pr.title ? ": " + pr.title : ""),
        url: "https://github.com/" + repo + "/pull/" + pr.number,
        at: e.created_at,
        source: "github",
      };
    }
    case "IssuesEvent": {
      const issue = e.payload?.issue;
      if (!issue || !repo || e.payload?.action !== "opened") return null;
      return {
        id: e.id,
        kind: "issue",
        text: "Filed issue #" + issue.number + " in " + repo + (issue.title ? ": " + issue.title : ""),
        url: "https://github.com/" + repo + "/issues/" + issue.number,
        at: e.created_at,
        source: "github",
      };
    }
    case "CreateEvent": {
      if (!repo || e.payload?.ref_type !== "repository") return null;
      return {
        id: e.id,
        kind: "create",
        text: "Created a new repo: " + repo,
        url: repoUrl,
        at: e.created_at,
        source: "github",
      };
    }
    case "ReleaseEvent": {
      const rel = e.payload?.release;
      if (!repo) return null;
      return {
        id: e.id,
        kind: "release",
        text: "Released " + (rel?.tag_name ?? "a release") + " in " + repo,
        url: rel?.html_url ?? repoUrl,
        at: e.created_at,
        source: "github",
      };
    }
    default:
      return null;
  }
}

export async function fetchGithubActivity(): Promise<FeedItem[]> {
  try {
    const res = await fetch(
      "https://api.github.com/users/Solvely-Colin/events/public?per_page=50",
      {
        headers: { Accept: "application/vnd.github+json", "User-Agent": "colin-place" },
        next: { revalidate: 600 },
      }
    );
    if (!res.ok) return [];
    const events = (await res.json()) as GhEvent[];
    return events
      .map(mapEvent)
      .filter((i): i is FeedItem => i !== null)
      .slice(0, 20);
  } catch {
    return [];
  }
}
