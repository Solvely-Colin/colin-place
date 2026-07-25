"use client";

import { useEffect, useState } from "react";
import { Star, GitFork, ExternalLink, FolderGit2 } from "lucide-react";

interface RepoCard {
  name: string;
  description: string | null;
  url: string;
  stars: number;
  language: string | null;
  pushedAt: string;
  role: "Creator" | "Contributor";
}

interface ReposPayload {
  featured: RepoCard[];
  hacking: RepoCard[];
  fallback: boolean;
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Go: "#00add8",
  Python: "#3572a5",
  HTML: "#e34c26",
  CSS: "#563d7c",
  MDX: "#fcb32c",
};

function RepoRow({ repo }: { repo: RepoCard }) {
  return (
    <a
      href={repo.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 rounded-lg bg-white/60 border border-stone-200/60 hover:border-stone-300 hover:bg-white transition group"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-stone-800 group-hover:text-blue-600 flex items-center gap-1.5 min-w-0">
          <span className="truncate">{repo.name}</span>
          <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-60 transition" />
        </span>
        <span className="flex items-center gap-2 text-xs text-stone-700 shrink-0">
          {repo.stars > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {repo.stars}
            </span>
          )}
          {repo.language && (
            <span className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: LANG_COLORS[repo.language] ?? "#8b8b8b" }}
              />
              {repo.language}
            </span>
          )}
        </span>
      </div>
      <p className="text-xs text-stone-600 mt-1 leading-relaxed">
        {repo.description ?? "Fresh from the Solvely lab."}
      </p>
    </a>
  );
}

export function Projects() {
  const [data, setData] = useState<ReposPayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/repos")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="text-center py-8 space-y-3">
        <FolderGit2 className="w-8 h-8 mx-auto text-stone-600" />
        <p className="text-sm text-stone-600">
          Couldn&apos;t load repos right now — they&apos;re all on GitHub though.
        </p>
        <a
          href="https://github.com/Solvely-Colin"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 rounded-lg bg-stone-800 text-white text-sm hover:bg-stone-700 transition"
        >
          Open GitHub profile
        </a>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-3 animate-pulse">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-stone-200/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-stone-700 flex items-center gap-1.5">
        <FolderGit2 className="w-3.5 h-3.5" />
        {data.fallback
          ? "A snapshot of Colin's public GitHub work."
          : "Pulled live from Colin's public GitHub."}
      </p>

      <div className="space-y-2">
        {data.featured.map((repo) => (
          <RepoRow key={repo.name} repo={repo} />
        ))}
      </div>

      {data.hacking.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <GitFork className="w-3.5 h-3.5" />
            Forks he hacks on
          </p>
          <div className="space-y-2">
            {data.hacking.map((repo) => (
              <RepoRow key={repo.name} repo={repo} />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-stone-700 italic">
        Also in the mix: positioning &amp; GTM for Radius, and company ops at
        Solvely — more in About.
      </p>
    </div>
  );
}
