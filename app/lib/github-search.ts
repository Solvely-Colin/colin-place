export interface GitHubSearchResult {
  title: string;
  url: string;
  repo: string;
  kind: string;
  updatedAt: string;
}

const GH_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "colin-place",
};

interface GhSearchItem {
  title?: string;
  html_url: string;
  repository_url: string;
  updated_at: string;
  pull_request?: { html_url?: string };
}

// General-purpose GitHub search over issues/PRs/comments Colin is involved
// in — powers the Ask bot's agent loop so it can hunt down a specific PR
// review or discussion. Returns [] on any failure.
export async function searchGitHub(query: string): Promise<GitHubSearchResult[]> {
  try {
    const res = await fetch(
      "https://api.github.com/search/issues?q=" +
        encodeURIComponent(query + " commenter:Solvely-Colin") +
        "&sort=updated&order=desc&per_page=5",
      {
        headers: GH_HEADERS,
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: GhSearchItem[] };
    if (!Array.isArray(data.items)) return [];
    return data.items.map((item) => ({
      title: item.title ?? "Untitled",
      url: item.html_url,
      repo: item.repository_url.split("/repos/")[1] ?? "",
      kind: item.pull_request ? "pr" : "issue",
      updatedAt: item.updated_at,
    }));
  } catch {
    return [];
  }
}
