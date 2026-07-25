interface GhRepo {
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  fork: boolean;
  archived: boolean;
  pushed_at: string;
}

export interface RepoCard {
  name: string;
  description: string | null;
  url: string;
  stars: number;
  language: string | null;
  pushedAt: string;
  role: "Creator" | "Contributor";
}

export interface ReposPayload {
  featured: RepoCard[];
  hacking: RepoCard[];
  fallback: boolean;
}

// Snapshot from 2026-07-18, used only if the GitHub API is unreachable.
const FALLBACK: { featured: RepoCard[]; hacking: RepoCard[] } = {
  featured: [
    {
      name: "Quorum",
      description: "Multi-AI deliberation framework — multiple models debate, critique, and vote. Consensus, validated.",
      url: "https://github.com/Solvely-Colin/Quorum",
      stars: 13,
      language: "TypeScript",
      pushedAt: "2026-05-20",
      role: "Creator",
    },
    {
      name: "SpecIt",
      description: "One interview. One spec. Adaptive AI interview that generates a structured .spec file and exports to other coding frameworks.",
      url: "https://github.com/Solvely-Colin/SpecIt",
      stars: 5,
      language: "Go",
      pushedAt: "2026-03-16",
      role: "Creator",
    },
    {
      name: "solvely-web",
      description: "solvely.net — company site and blog",
      url: "https://github.com/Solvely-Colin/solvely-web",
      stars: 0,
      language: "TypeScript",
      pushedAt: "2026-04-03",
      role: "Creator",
    },
  ],
  hacking: [
    {
      name: "openclaw",
      description: "Your own personal AI assistant. Any OS. Any Platform.",
      url: "https://github.com/Solvely-Colin/openclaw",
      stars: 0,
      language: null,
      pushedAt: "2026-07-13",
      role: "Contributor",
    },
    {
      name: "clickclack",
      description: "ClickClackClaw — the chat app with claws.",
      url: "https://github.com/Solvely-Colin/clickclack",
      stars: 0,
      language: null,
      pushedAt: "2026-07-13",
      role: "Contributor",
    },
  ],
};

function toCard(r: GhRepo, role: RepoCard["role"]): RepoCard {
  return {
    name: r.name,
    description: r.description,
    url: r.html_url,
    stars: r.stargazers_count,
    language: r.language,
    pushedAt: r.pushed_at.slice(0, 10),
    role,
  };
}

const JUNK = /proof|demo/i;

export async function fetchRepos(): Promise<ReposPayload> {
  try {
    const res = await fetch(
      "https://api.github.com/users/Solvely-Colin/repos?per_page=100&sort=pushed",
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "colin-place",
        },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) throw new Error(`github ${res.status}`);
    const repos = (await res.json()) as GhRepo[];

    const featured = repos
      .filter(
        (r) =>
          !r.fork &&
          !r.archived &&
          (r.stargazers_count > 0 || (r.description && !JUNK.test(r.name)))
      )
      .sort((a, b) =>
        b.stargazers_count !== a.stargazers_count
          ? b.stargazers_count - a.stargazers_count
          : b.pushed_at.localeCompare(a.pushed_at)
      )
      .slice(0, 6)
      .map((r) => toCard(r, "Creator"));

    const hacking = repos
      .filter((r) => r.fork && !r.archived && r.description)
      .sort((a, b) => b.pushed_at.localeCompare(a.pushed_at))
      .slice(0, 3)
      .map((r) => toCard(r, "Contributor"));

    if (featured.length === 0) throw new Error("empty curation");
    return { featured, hacking, fallback: false };
  } catch {
    return { ...FALLBACK, fallback: true };
  }
}
