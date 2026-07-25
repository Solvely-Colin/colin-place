import type { Metadata } from "next";
import Link from "next/link";
import {
  AppWindow,
  ArrowUpRight,
  Bot,
  GitFork,
  Mail,
  Radio,
  Star,
} from "lucide-react";
import { fetchPulse } from "./lib/pulse";
import { fetchGithubActivity, type FeedItem } from "./lib/activity";
import { fetchRepos, type RepoCard } from "./lib/repos";
import { DROPS } from "./lib/drops";
import { AGENT_LOG } from "./lib/agentlog";
import { formatDate } from "./lib/dates";
import agentOps from "../public/agent-ops.json";
import { Wire } from "./components/broadcast/Wire";
import { TimeAgo } from "./components/broadcast/TimeAgo";
import { TimelineFeed } from "./components/broadcast/TimelineFeed";
import { Companion } from "./components/broadcast/Companion";

export const revalidate = 600;

export const metadata: Metadata = {
  description:
    "A personal site that broadcasts itself: live GitHub telemetry, an agent-written changelog, and builds shipped in the open by Colin Johnson.",
};

const CONTACT_LINKS = [
  { label: "Email", value: "hello@colin.place", href: "mailto:hello@colin.place" },
  { label: "X / Twitter", value: "@colinsolvely", href: "https://x.com/colinsolvely" },
  { label: "GitHub", value: "Solvely-Colin", href: "https://github.com/Solvely-Colin" },
  { label: "LinkedIn", value: "Colin W. Johnson", href: "https://www.linkedin.com/in/colin-w-johnson/" },
];

const NOW_ITEMS = [
  {
    title: "Volunteer-maintaining OpenClaw",
    detail: "PR review, contributor onboarding, and QA evidence infrastructure for the open-source personal AI assistant.",
  },
  {
    title: "Building agent tooling at Solvely",
    detail: "This site included — every deploy here is planned, written, and shipped by agent sessions.",
  },
  {
    title: "Senior Manager, CRM at Youth Enrichment Brands",
    detail: "HubSpot architecture, custom apps, and lifecycle automation across four franchise brands.",
  },
  {
    title: "Exploring developer-relations & ecosystem roles",
    detail: "If that's you, contact is at the bottom of this page.",
  },
];

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Go: "#00add8",
  Python: "#3572a5",
  Rust: "#dea584",
  HTML: "#e34c26",
  CSS: "#563d7c",
  MDX: "#fcb32c",
};

function SectionHeading({
  id,
  title,
  blurb,
}: {
  id?: string;
  title: string;
  blurb: string;
}) {
  return (
    <div id={id} className="scroll-mt-20 mb-4">
      <h2 className="text-xl font-bold text-stone-800">{title}</h2>
      <p className="text-sm text-stone-600 mt-0.5">{blurb}</p>
    </div>
  );
}

function RepoTile({ repo }: { repo: RepoCard }) {
  return (
    <a
      href={repo.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block p-4 rounded-xl bg-white/70 border border-stone-200/70 hover:border-stone-300 hover:bg-white hover:shadow-md transition"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-stone-800 group-hover:text-orange-700 transition truncate">
          {repo.name}
        </span>
        <span className="flex items-center gap-2 text-xs text-stone-600 shrink-0">
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
      <p className="text-sm text-stone-600 mt-1 leading-relaxed line-clamp-2">
        {repo.description ?? "Fresh from the Solvely lab."}
      </p>
    </a>
  );
}

export default async function Broadcast() {
  const [pulse, github, repos] = await Promise.all([
    fetchPulse(),
    fetchGithubActivity(),
    fetchRepos(),
  ]);
  const wireItems: FeedItem[] = [...github, ...DROPS]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12);
  const lastDeploy = AGENT_LOG[0];
  const ops = agentOps as unknown as {
    generatedAt: string;
    summary: { automationCount: number; scheduledAgentRunsPerDay: number };
  };

  const stats = [
    { n: pulse.pushes7d, label: "pushes this week" },
    { n: pulse.openPrs.length, label: "open PRs" },
    { n: ops.summary.automationCount, label: "automations on duty" },
    { n: ops.summary.scheduledAgentRunsPerDay, label: "agent runs / day" },
  ];

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#f0e9db]/80 border-b border-stone-200/60">
        <div className="mx-auto max-w-2xl px-5 h-12 flex items-center gap-4">
          <Link href="/" className="font-bold text-stone-800 tracking-tight">
            colin<span className="text-orange-500">.</span>place
          </Link>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-red-600">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
              <span className="relative inline-flex rounded-full w-2 h-2 bg-red-500" />
            </span>
            Live
          </span>
          <nav className="ml-auto flex items-center gap-4 text-sm text-stone-600">
            <a href="#log" className="hidden sm:inline hover:text-stone-900 transition">Log</a>
            <a href="#projects" className="hidden sm:inline hover:text-stone-900 transition">Projects</a>
            <a href="#contact" className="hidden sm:inline hover:text-stone-900 transition">Contact</a>
            <Link
              href="/os"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 text-white text-xs font-medium hover:bg-stone-700 transition"
            >
              <AppWindow className="w-3.5 h-3.5" />
              Colin OS
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-40">
        {/* Hero */}
        <section className="pt-12 sm:pt-16 pb-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-600 mb-3">
                Live from Colin&apos;s workshop
              </p>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-stone-900">
                Colin Johnson
              </h1>
              <p className="text-stone-700 leading-relaxed mt-4 max-w-lg">
                Builder, connector, community person. This site is planned, written,
                tested, and deployed by AI agents — in the open, with receipts. What
                you&apos;re reading is the feed of that happening.
              </p>
            </div>
            <img
              src="/clippy.png"
              alt="Clippy Colin, the site mascot"
              className="w-24 sm:w-32 h-auto shrink-0 -mt-2"
              style={{ filter: "drop-shadow(0 12px 20px rgba(0,0,0,0.15))" }}
            />
          </div>

          {/* Live status card */}
          <div id="now" className="scroll-mt-20 mt-8 p-4 sm:p-5 rounded-2xl bg-white/70 border border-stone-200/70 shadow-sm">
            <div className="flex items-baseline justify-between gap-2 mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-red-500" />
                Right now
              </p>
              <p className="text-[11px] text-stone-500">
                telemetry <TimeAgo iso={pulse.generatedAt} />
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              {stats.map((stat) => (
                <div key={stat.label} className="p-2.5 rounded-xl bg-stone-50/80 border border-stone-200/60">
                  <p className="text-xl font-extrabold text-stone-800 tabular-nums">{stat.n}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 leading-tight">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
            {pulse.shepherding.length > 0 && (
              <p className="text-sm text-stone-600 mt-3">
                Currently shepherding{" "}
                {pulse.shepherding.map((repo, i) => (
                  <span key={repo.name}>
                    {i > 0 && (i === pulse.shepherding.length - 1 ? " and " : ", ")}
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-stone-800 hover:text-orange-700 underline underline-offset-4 decoration-stone-300"
                    >
                      {repo.name}
                    </a>
                  </span>
                ))}
                .
              </p>
            )}
            <p className="text-sm text-stone-600 mt-1.5 flex items-start gap-1.5">
              <Bot className="w-4 h-4 shrink-0 mt-0.5 text-pink-600" />
              <span>
                Latest agent deploy — <span className="font-semibold text-stone-800">&ldquo;{lastDeploy.title}&rdquo;</span>{" "}
                · {formatDate(lastDeploy.date)}
              </span>
            </p>
          </div>

          {/* Now items */}
          <div className="mt-4 grid sm:grid-cols-2 gap-2">
            {NOW_ITEMS.map((item) => (
              <div key={item.title} className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-100/80">
                <h3 className="font-semibold text-stone-800 text-sm">{item.title}</h3>
                <p className="text-sm text-stone-600 mt-0.5 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The wire */}
        <section className="py-8 border-t border-stone-200/70">
          <SectionHeading
            id="wire"
            title="On the wire"
            blurb="Colin's raw public activity, straight from GitHub. Refreshes itself."
          />
          <Wire initialItems={wireItems} />
        </section>

        {/* The log */}
        <section className="py-8 border-t border-stone-200/70">
          <SectionHeading
            id="log"
            title="The log"
            blurb="One stream: Colin's journal, the agents' own changelog, and builds from the workshop. Every entry is a link."
          />
          <TimelineFeed />
        </section>

        {/* Projects */}
        <section className="py-8 border-t border-stone-200/70">
          <SectionHeading
            id="projects"
            title="Projects"
            blurb={
              repos.fallback
                ? "A snapshot of Colin's public GitHub work."
                : "Pulled live from Colin's public GitHub."
            }
          />
          <div className="grid sm:grid-cols-2 gap-2">
            {repos.featured.map((repo) => (
              <RepoTile key={repo.name} repo={repo} />
            ))}
          </div>
          {repos.hacking.length > 0 && (
            <>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mt-4 mb-2 flex items-center gap-1.5">
                <GitFork className="w-3.5 h-3.5" />
                Forks he hacks on
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {repos.hacking.map((repo) => (
                  <RepoTile key={repo.name} repo={repo} />
                ))}
              </div>
            </>
          )}
        </section>

        {/* Contact + OS easter egg */}
        <section className="py-8 border-t border-stone-200/70">
          <SectionHeading
            id="contact"
            title="Let's build something"
            blurb="Open to collaborations, consulting, and interesting technical work."
          />
          <div className="grid sm:grid-cols-2 gap-2">
            {CONTACT_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith("mailto:") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 rounded-xl bg-white/70 border border-stone-200/70 hover:bg-white hover:border-stone-300 transition group"
              >
                <span className="text-stone-600 text-sm flex items-center gap-2">
                  {link.label === "Email" && <Mail className="w-3.5 h-3.5" />}
                  {link.label}
                </span>
                <span className="font-medium text-stone-800 group-hover:text-orange-700 transition text-sm">
                  {link.value}
                </span>
              </a>
            ))}
          </div>

          <Link
            href="/os"
            className="group mt-6 flex items-center gap-4 p-5 rounded-2xl bg-stone-900 text-white hover:bg-stone-800 transition"
          >
            <AppWindow className="w-8 h-8 text-orange-400 shrink-0" />
            <span className="min-w-0">
              <span className="block font-bold">This site also has an operating system.</span>
              <span className="block text-sm text-stone-300 mt-0.5">
                Windows, a dock, a terminal, weather, shared cursors — the original Colin OS
                lives on at /os. Try Cmd+K when you&apos;re in there.
              </span>
            </span>
            <ArrowUpRight className="w-5 h-5 ml-auto shrink-0 text-stone-400 group-hover:text-white transition" />
          </Link>

          <p className="text-xs text-stone-500 mt-8 leading-relaxed">
            Every pixel of this page — including this sentence — was written and deployed
            by agent sessions, with Colin approving what ships.
          </p>
        </section>
      </main>

      <Companion />
    </div>
  );
}
