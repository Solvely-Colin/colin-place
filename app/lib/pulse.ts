export interface PulsePr {
  repo: string;
  number: number;
  title: string;
  url: string;
  draft: boolean;
  updatedAt: string;
}

export interface PulseRepo {
  name: string;
  url: string;
  pushedAt: string;
}

export interface PulseLang {
  name: string;
  share: number; // 0-100
}

export interface PulseData {
  openPrs: PulsePr[];
  pushes7d: number;
  pushes30d: number;
  shepherding: PulseRepo[];
  languages: PulseLang[];
  generatedAt: string;
  ok: boolean;
}

const GH_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "colin-place",
};

const DAY = 24 * 60 * 60 * 1000;

const JUNK = /proof|demo/i;

interface GhSearchItem {
  number: number;
  title?: string;
  html_url: string;
  repository_url: string;
  draft?: boolean;
  updated_at: string;
}

interface GhEvent {
  type: string;
  created_at: string;
  repo?: { name: string };
}

interface GhRepo {
  name: string;
  html_url: string;
  language: string | null;
  fork: boolean;
  archived: boolean;
  pushed_at: string;
}

export const EMPTY_PULSE: PulseData = {
  openPrs: [],
  pushes7d: 0,
  pushes30d: 0,
  shepherding: [],
  languages: [],
  generatedAt: new Date().toISOString(),
  ok: false,
};

async function gh<T>(url: string, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: GH_HEADERS,
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchPulse(): Promise<PulseData> {
  const [search, eventsPages, repos] = await Promise.all([
    gh<{ items?: GhSearchItem[] }>(
      "https://api.github.com/search/issues?q=type:pr+author:Solvely-Colin+is:open&sort=updated&order=desc&per_page=10",
      600
    ),
    // The events API caps at 300 events; 3 pages widens the 30-day window.
    Promise.all(
      [1, 2, 3].map((page) =>
        gh<GhEvent[]>(
          "https://api.github.com/users/Solvely-Colin/events/public?per_page=100&page=" + page,
          600
        )
      )
    ),
    gh<GhRepo[]>(
      "https://api.github.com/users/Solvely-Colin/repos?per_page=100&sort=pushed",
      3600
    ),
  ]);
  const events = eventsPages.some((p) => p !== null) ? eventsPages.flatMap((p) => p ?? []) : null;

  const now = Date.now();
  const pulse: PulseData = { ...EMPTY_PULSE, generatedAt: new Date().toISOString() };

  if (search?.items) {
    pulse.openPrs = search.items.map((i) => ({
      repo: i.repository_url.split("/repos/")[1] ?? "",
      number: i.number,
      title: i.title ?? "Untitled PR",
      url: i.html_url,
      draft: i.draft === true,
      updatedAt: i.updated_at,
    }));
  }

  if (events) {
    const seen = new Set<string>();
    for (const e of events) {
      if (e.type !== "PushEvent") continue;
      const age = now - new Date(e.created_at).getTime();
      if (age <= 7 * DAY) {
        pulse.pushes7d += 1;
        // Events arrive newest-first, so first sighting is the most recent push.
        if (e.repo?.name && !JUNK.test(e.repo.name) && !seen.has(e.repo.name)) {
          seen.add(e.repo.name);
          pulse.shepherding.push({
            name: e.repo.name,
            url: "https://github.com/" + e.repo.name,
            pushedAt: e.created_at,
          });
        }
      }
      if (age <= 30 * DAY) pulse.pushes30d += 1;
    }
    pulse.shepherding = pulse.shepherding.slice(0, 4);
  }

  if (repos) {
    const recent = repos.filter(
      (r) => !r.fork && !r.archived && r.language && now - new Date(r.pushed_at).getTime() <= 180 * DAY
    );
    const counts = new Map<string, number>();
    for (const r of recent) {
      counts.set(r.language as string, (counts.get(r.language as string) ?? 0) + 1);
    }
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    if (total > 0) {
      pulse.languages = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, n]) => ({ name, share: Math.round((n / total) * 100) }));
    }
  }

  pulse.ok = search !== null || events !== null || repos !== null;
  return pulse;
}
