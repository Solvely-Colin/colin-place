import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Building2, GitFork, GitPullRequestDraft, Star } from "lucide-react";
import { after } from "next/server";
import { fetchPulse } from "./lib/pulse";
import { loadAbout, regenerateAbout } from "./lib/about";
import { fetchGithubActivity, type FeedItem } from "./lib/activity";
import { fetchRepos, type RepoCard } from "./lib/repos";
import { DROPS } from "./lib/drops";
import { AGENT_LOG } from "./lib/agentlog";
import { formatDate } from "./lib/dates";
import { BIG_NUMBERS, CONTACT_LINKS, ECOSYSTEMS, NOW_ITEMS, STACK } from "./lib/profile";
import agentOps from "../public/agent-ops.json";
import { Intro } from "./components/site/Intro";
import { Nav } from "./components/site/Nav";
import { LoopField } from "./components/site/LoopField";
import { Ticker } from "./components/site/Ticker";
import { Section } from "./components/site/Section";
import { Reveal, Stagger, Item } from "./components/site/Reveal";
import { CountUp } from "./components/site/CountUp";
import { TiltCard } from "./components/site/TiltCard";
import { LocalClock } from "./components/site/LocalClock";
import { Presence } from "./components/site/Presence";
import { TimeAgo } from "./components/site/TimeAgo";
import { Journey } from "./components/site/Journey";
import { Companion } from "./components/site/Companion";

export const revalidate = 600;

export const metadata: Metadata = {
  description:
    "Colin Johnson builds in the open: open-source maintainer, community builder, CRM architect by day. A playground site his agents build and deploy, with a town where described ideas become buildings.",
};

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Go: "#00add8",
  Python: "#3572a5",
  Rust: "#dea584",
  HTML: "#e34c26",
  CSS: "#563d7c",
  MDX: "#fcb32c",
  Swift: "#f05138",
  Kotlin: "#a97bff",
};

function RepoTile({ repo }: { repo: RepoCard }) {
  return (
    <TiltCard href={repo.url} external className="p-5 h-full" max={4}>
      <div className="flex items-start justify-between gap-3">
        <span className="font-medium text-lg text-ink leading-tight tracking-tight">{repo.name}</span>
        <span className="flex items-center gap-3 font-mono text-[11px] text-ink-mute shrink-0 pt-1">
          {repo.stars > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-ink-mute text-ink-mute" />
              {repo.stars}
            </span>
          )}
          {repo.language && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LANG_COLORS[repo.language] ?? "#8b8b8b" }} />
              {repo.language}
            </span>
          )}
        </span>
      </div>
      <p className="text-[14px] text-ink-dim mt-2 leading-relaxed line-clamp-2">
        {repo.description ?? "Fresh from the Solvely lab."}
      </p>
      <p className="font-mono text-[11px] text-ink-mute mt-4">
        {repo.role} · pushed {formatDate(repo.pushedAt)}
      </p>
    </TiltCard>
  );
}

export default async function Home() {
  const [pulse, github, repos] = await Promise.all([fetchPulse(), fetchGithubActivity(), fetchRepos()]);
  const allEvents: FeedItem[] = [...github, ...DROPS].sort((a, b) => b.at.localeCompare(a.at));
  const wireItems = allEvents.slice(0, 30);
  const aboutInputs = { pulse, events: allEvents, repos };
  const about = await loadAbout(aboutInputs);
  if (about.stale && about.canRewrite) {
    // Serve what we have now; rewrite after the response and it shows on the next visit.
    after(() => regenerateAbout(aboutInputs));
  }
  const lastDeploy = AGENT_LOG[0];
  const ops = agentOps as unknown as {
    generatedAt: string;
    summary: { automationCount: number; scheduledAgentRunsPerDay: number };
  };

  const liveStats = [
    { n: pulse.pushes7d, label: "pushes this week" },
    { n: pulse.openPrs.length, label: "open PRs" },
    { n: ops.summary.automationCount, label: "automations on duty" },
    { n: ops.summary.scheduledAgentRunsPerDay, label: "agent runs / day" },
  ];

  return (
    <>
      <Intro />
      <Nav />

      <main>
        {/* ---------------------------------------------------------------- */}
        {/* Hero: the ∞ drawn in real events                                  */}
        {/* ---------------------------------------------------------------- */}
        <section className="relative min-h-[100svh] flex flex-col justify-end overflow-hidden border-b border-line">
          <LoopField events={wireItems} />

          <div className="relative z-10 pointer-events-none mx-auto max-w-[1400px] w-full px-5 sm:px-8 pt-28 pb-10 sm:pb-14">
            <Reveal>
              <p className="eyebrow mb-5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-ink-dim">Colin Johnson</span>
                <span>·</span>
                <span>Mishawaka, Indiana</span>
                <span>·</span>
                <span className="text-loop flex items-center gap-2"><span className="live-dot" /> live</span>
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="display text-[clamp(2.8rem,8vw,7rem)] text-ink">
                Hi, I&apos;m Colin.
                <br />
                I build in the open.
              </h1>
            </Reveal>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] items-end gap-8 mt-10">
              <Reveal delay={0.16}>
                <p className="pointer-events-auto max-w-[48ch] text-ink-dim text-base sm:text-lg leading-relaxed">
                  I maintain open-source tools, help run a couple of developer communities, and
                  build CRM systems by day. This site is my playground: my agents plan, write, and
                  deploy it, and the town is where new ideas get built first. Everything here links
                  to something real.
                </p>
              </Reveal>
              <Reveal delay={0.24} className="pointer-events-auto flex flex-wrap gap-3">
                <Link
                  href="/town"
                  className="group inline-flex items-center gap-2 h-10 px-4 rounded-md bg-ink text-ground font-medium text-sm hover:bg-ink-dim transition"
                >
                  <Building2 className="w-4 h-4" />
                  Walk the town
                </Link>
                <a
                  href="#about"
                  className="group inline-flex items-center gap-2 h-10 px-4 rounded-md border border-line-strong bg-ground-2 text-ink text-sm font-medium hover:border-ink transition"
                >
                  About me
                  <ArrowDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
                </a>
              </Reveal>
            </div>

            <Reveal delay={0.3}>
              <div className="pointer-events-auto mt-12 flex flex-wrap items-end gap-x-10 gap-y-5">
                {liveStats.map((s) => (
                  <div key={s.label}>
                    <p className="font-mono text-2xl sm:text-3xl text-ink leading-none">{s.n}</p>
                    <p className="eyebrow mt-1.5 !text-[10px]">{s.label}</p>
                  </div>
                ))}
                <div className="ml-auto text-right">
                  <p className="font-mono text-[11px] text-ink-mute">
                    telemetry <TimeAgo iso={pulse.generatedAt} /> · last agent deploy {formatDate(lastDeploy.date)}
                  </p>
                  <Presence className="font-mono text-[11px] text-ink-dim mt-1 inline-block" />
                </div>
              </div>
              <p className="font-mono text-[11px] text-ink-mute mt-8">
                <span className="live-dot mr-2 align-middle" />
                each light on the loop is a real event from Colin&apos;s public GitHub feed · hover one
              </p>
            </Reveal>
          </div>
        </section>

        <Ticker initialItems={wireItems} />

        {/* ---------------------------------------------------------------- */}
        {/* 01 Now                                                           */}
        {/* ---------------------------------------------------------------- */}
        <Section
          id="now"
          index="01"
          kicker="Right now"
          title={
            <>
              What he&apos;s actually doing
            </>
          }
          blurb={
            <>
              <LocalClock withStatus className="block text-ink font-mono text-[13px]" />
              <span className="block mt-2">
                The status line is a guess. Everything else on this page is not.
              </span>
            </>
          }
        >
          <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 lg:gap-10 items-start">
            <Reveal className="relative">
              <div className="relative rounded-lg overflow-hidden border border-line bg-ground-2 aspect-[3/4] max-w-[520px]">
                <Image
                  src="/colin.jpg"
                  alt="Colin Johnson at his desk, wearing a cap that says Feeling Loopy"
                  width={900}
                  height={1200}
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="eyebrow mt-3">feeling loopy · the hat is real, so is the loop above</p>
            </Reveal>

            <Stagger className="grid sm:grid-cols-2 gap-3">
              {NOW_ITEMS.map((item) => (
                <Item key={item.title}>
                  <TiltCard href={item.href} external={!!item.href && !item.href.startsWith("#")} className="p-5 h-full" max={4}>
                    <h3 className="font-medium text-lg text-ink leading-snug tracking-tight">{item.title}</h3>
                    <p className="text-[14px] text-ink-dim mt-2 leading-relaxed">{item.detail}</p>
                  </TiltCard>
                </Item>
              ))}
              {pulse.shepherding.length > 0 && (
                <Item className="sm:col-span-2">
                  <div className="p-5 rounded-lg border border-line bg-ground-2">
                    <p className="eyebrow mb-2">Repos he pushed to this week</p>
                    <p className="text-ink-dim leading-relaxed">
                      {pulse.shepherding.map((repo, i) => (
                        <span key={repo.name}>
                          {i > 0 && (i === pulse.shepherding.length - 1 ? " and " : ", ")}
                          <a
                            href={repo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-draw text-ink font-medium"
                          >
                            {repo.name}
                          </a>
                        </span>
                      ))}
                      .
                    </p>
                  </div>
                </Item>
              )}
            </Stagger>
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* 02 Numbers                                                       */}
        {/* ---------------------------------------------------------------- */}
        <Section
          id="numbers"
          index="02"
          kicker="By the numbers"
          title={
            <>
              Counted, not claimed
            </>
          }
          blurb="Each one links to the public page it comes from. If GitHub disagrees, GitHub wins."
        >
          <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-line rounded-lg overflow-hidden border border-line">
            {BIG_NUMBERS.map((n) => {
              const inner = (
                <>
                  <p className="display text-[clamp(3rem,6vw,5rem)] text-ink leading-none">
                    <CountUp to={n.value} suffix={n.suffix} />
                  </p>
                  <p className="font-medium text-lg text-ink mt-4 tracking-tight">{n.label}</p>
                  <p className="text-[14px] text-ink-dim mt-1 leading-relaxed">{n.note}</p>
                  {n.href && (
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-mute group-hover:text-loop mt-4 transition">
                      receipt <ArrowUpRight className="w-3 h-3" />
                    </span>
                  )}
                </>
              );
              return (
                <Item key={n.label} className="bg-ground">
                  {n.href ? (
                    <a href={n.href} target="_blank" rel="noopener noreferrer" className="spot group block p-7 sm:p-9 h-full">
                      {inner}
                    </a>
                  ) : (
                    <div className="p-7 sm:p-9 h-full">{inner}</div>
                  )}
                </Item>
              );
            })}
            <Item className="bg-ground">
              <div className="p-7 sm:p-9 h-full flex flex-col">
                <p className="eyebrow mb-4">Ships in</p>
                <div className="flex flex-wrap gap-2">
                  {STACK.map((s) => (
                    <span key={s} className="px-2 py-1 rounded border border-line font-mono text-[11px] text-ink-mute">
                      {s}
                    </span>
                  ))}
                </div>
                {pulse.languages.length > 0 && (
                  <div className="mt-auto pt-6">
                    <p className="eyebrow mb-2 !text-[10px]">language mix, last 180 days</p>
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-line">
                      {pulse.languages.map((l) => (
                        <span
                          key={l.name}
                          style={{ width: l.share + "%", backgroundColor: LANG_COLORS[l.name] ?? "#8b8b8b" }}
                          title={`${l.name} ${l.share}%`}
                        />
                      ))}
                    </div>
                    <p className="font-mono text-[11px] text-ink-mute mt-2">
                      {pulse.languages.map((l) => `${l.name} ${l.share}%`).join(" · ")}
                    </p>
                  </div>
                )}
              </div>
            </Item>
          </Stagger>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* 03 Work                                                          */}
        {/* ---------------------------------------------------------------- */}
        <Section
          id="work"
          index="03"
          kicker="Work"
          title={
            <>
              Four ecosystems, one habit
            </>
          }
          blurb="Find the friction developers keep hitting, turn it into issues, docs, and fixes, and prove the fix with something a reviewer can re-run."
        >
          <Stagger className="grid md:grid-cols-2 gap-4">
            {ECOSYSTEMS.map((eco) => (
              <Item key={eco.name}>
                <TiltCard href={eco.href} external className="p-6 sm:p-8 h-full">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="eyebrow !text-loop mb-2">{eco.role}</p>
                      <h3 className="display text-2xl sm:text-3xl text-ink">{eco.name}</h3>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-ink-mute shrink-0 mt-1" />
                  </div>
                  <p className="text-ink-dim mt-5 leading-relaxed">{eco.blurb}</p>
                  <div className="flex flex-wrap gap-1.5 mt-6">
                    {eco.tags.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded border border-line font-mono text-[11px] text-ink-mute">
                        {t}
                      </span>
                    ))}
                  </div>
                </TiltCard>
              </Item>
            ))}
          </Stagger>

          <div className="mt-14">
            <Reveal>
              <div className="flex items-baseline justify-between gap-4 mb-5">
                <h3 className="font-medium text-xl text-ink tracking-tight">From the lab</h3>
                <p className="font-mono text-[11px] text-ink-mute">
                  {repos.fallback ? "snapshot · GitHub unreachable" : "pulled live from GitHub"}
                </p>
              </div>
            </Reveal>
            <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {repos.featured.map((repo) => (
                <Item key={repo.name}>
                  <RepoTile repo={repo} />
                </Item>
              ))}
            </Stagger>
            {repos.hacking.length > 0 && (
              <>
                <Reveal>
                  <p className="eyebrow mt-8 mb-3 flex items-center gap-2">
                    <GitFork className="w-3.5 h-3.5" /> forks he hacks on
                  </p>
                </Reveal>
                <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {repos.hacking.map((repo) => (
                    <Item key={repo.name}>
                      <RepoTile repo={repo} />
                    </Item>
                  ))}
                </Stagger>
              </>
            )}
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* 04 About, written by the site                                     */}
        {/* ---------------------------------------------------------------- */}
        <Section
          id="about"
          index="04"
          kicker="About"
          title="About Colin, rewritten as he ships"
          blurb={
            <span className="font-mono text-[12px] leading-relaxed">
              {about.record.source === "model" ? (
                <>
                  Written by {about.record.model} from his public GitHub, <TimeAgo iso={about.record.generatedAt} />.
                  {about.stale ? " New activity since; the next rewrite is queued." : " Up to date with the wire."}
                </>
              ) : (
                <>
                  Hand-written for now. Once the model key is in, the site rewrites this itself whenever a PR, release, or repo lands.
                </>
              )}
            </span>
          }
        >
          <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-10 lg:gap-16">
            <Reveal>
              <p className="text-[clamp(1.35rem,2.4vw,1.9rem)] font-medium tracking-tight leading-snug text-ink max-w-[30ch]">
                {about.record.narrative.lede}
              </p>
              <div className="mt-7 space-y-5 text-ink-dim leading-relaxed max-w-[62ch]">
                {about.record.narrative.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <p className="mt-6 font-mono text-[11px] text-ink-mute">
                Last rewrite: {about.record.narrative.reason}
              </p>
            </Reveal>

            <div>
              <Reveal>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="font-medium text-xl text-ink tracking-tight">Open right now</h3>
                  <span className="font-mono text-[11px] text-ink-mute">{pulse.openPrs.length} open</span>
                </div>
              </Reveal>
              {pulse.openPrs.length === 0 ? (
                <p className="text-ink-dim">
                  {pulse.ok ? "Nothing open. Inbox zero, PR edition." : "GitHub is not answering right now."}
                </p>
              ) : (
                <Stagger className="divide-y divide-line border-y border-line" gap={0.05}>
                  {pulse.openPrs.slice(0, 6).map((pr) => (
                    <Item key={pr.url}>
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group grid grid-cols-[auto_1fr_auto] items-start gap-4 py-3 hover:bg-ground-2 -mx-3 px-3 rounded-md transition"
                      >
                        <span className="font-mono text-[12px] text-ink-mute pt-0.5">#{pr.number}</span>
                        <span className="min-w-0">
                          <span className="block text-[15px] text-ink group-hover:text-loop transition leading-snug">{pr.title}</span>
                          <span className="block font-mono text-[11px] text-ink-mute mt-1">
                            {pr.repo}
                            {pr.draft && (
                              <span className="inline-flex items-center gap-1 ml-2 text-butter">
                                <GitPullRequestDraft className="w-3 h-3" /> draft
                              </span>
                            )}
                          </span>
                        </span>
                        <TimeAgo iso={pr.updatedAt} className="font-mono text-[11px] text-ink-mute pt-0.5" />
                      </a>
                    </Item>
                  ))}
                </Stagger>
              )}

              {about.record.narrative.highlights.length > 0 && (
                <Reveal className="mt-10">
                  <h3 className="font-medium text-xl text-ink tracking-tight mb-3">Worth a look</h3>
                  <div className="grid gap-2">
                    {about.record.narrative.highlights.map((h) => (
                      <a
                        key={h.url + h.title}
                        href={h.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="spot group flex items-center gap-4 p-4 rounded-lg border border-line bg-ground-2 transition"
                      >
                        <span className="min-w-0">
                          <span className="block text-[14px] font-medium text-ink group-hover:text-loop transition">{h.title}</span>
                          <span className="block text-[13px] text-ink-dim mt-0.5">{h.detail}</span>
                        </span>
                        <ArrowUpRight className="w-4 h-4 ml-auto shrink-0 text-ink-mute group-hover:text-loop transition" />
                      </a>
                    ))}
                  </div>
                </Reveal>
              )}
            </div>
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* 05 Path                                                          */}
        {/* ---------------------------------------------------------------- */}
        <Section
          id="path"
          index="05"
          kicker="The path"
          title={
            <>
              From CRM hygiene to maintainer
            </>
          }
          blurb="Sales ops taught him that a system nobody trusts is a system nobody uses. He has been building trust into systems ever since."
        >
          <div className="max-w-3xl">
            <Journey />
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* 06 Contact                                                       */}
        {/* ---------------------------------------------------------------- */}
        <section id="contact" className="scroll-mt-20 relative py-20 sm:py-28 border-t border-line">
          <div className="relative mx-auto max-w-[1400px] px-5 sm:px-8">
            <Reveal>
              <p className="eyebrow mb-5">
                <span className="text-loop">06</span> / Contact
              </p>
              <h2 className="display text-[clamp(2.4rem,6vw,5rem)] text-ink">
                Let&apos;s build something.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <a
                href="mailto:hello@colin.place"
                className="link-draw inline-block mt-8 font-medium tracking-tight text-[clamp(1.4rem,3.5vw,2.75rem)] text-ink hover:text-loop transition-colors"
              >
                hello@colin.place
              </a>
              <p className="text-ink-dim mt-4 max-w-xl leading-relaxed">
                Open-source, collaborations, interesting technical problems, or just to say hi.
                He reads everything.
              </p>
            </Reveal>

            <Stagger className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-12">
              {CONTACT_LINKS.map((link) => (
                <Item key={link.label}>
                  <a
                    href={link.href}
                    target={link.href.startsWith("mailto:") ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    className="spot group flex items-center justify-between p-5 rounded-lg border border-line bg-ground-2 transition"
                  >
                    <span>
                      <span className="eyebrow block">{link.label}</span>
                      <span className="block text-ink mt-1 group-hover:text-loop transition">{link.value}</span>
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-ink-mute group-hover:text-loop transition" />
                  </a>
                </Item>
              ))}
            </Stagger>

            <Reveal delay={0.1}>
              <Link
                href="/town"
                className="spot group mt-6 flex items-center gap-5 p-6 rounded-lg border border-line bg-ground-2 hover:border-loop transition"
              >
                <Building2 className="w-8 h-8 text-loop shrink-0" />
                <span className="min-w-0">
                  <span className="block font-medium text-lg text-ink tracking-tight">This site also has a town.</span>
                  <span className="block text-[14px] text-ink-dim mt-1">
                    Every building is an idea. Walk around, walk in, and describe a new one: the architect
                    builds it on the next empty lot while you watch.
                  </span>
                </span>
                <ArrowUpRight className="w-5 h-5 ml-auto shrink-0 text-ink-mute group-hover:text-loop transition" />
              </Link>
            </Reveal>
          </div>
        </section>

        <footer className="border-t border-line">
          <div className="mx-auto max-w-[1400px] px-5 sm:px-8 py-10 grid sm:grid-cols-[1fr_auto] gap-6 items-end">
            <p className="text-[13px] text-ink-mute leading-relaxed max-w-xl">
              Every pixel of this page, including this sentence, was planned, written, and deployed by
              agent sessions, with Colin approving what ships. The latest of those deploys:{" "}
              <span className="text-ink-dim">&ldquo;{lastDeploy.title}&rdquo;</span>.
            </p>
            <p className="font-mono text-[11px] text-ink-mute sm:text-right">
              colin.place · live from GitHub · {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </main>

      <Companion />
    </>
  );
}
