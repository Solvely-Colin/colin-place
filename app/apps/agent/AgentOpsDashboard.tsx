"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import initialSnapshot from "../../../public/agent-ops.json";
import {
  ArrowLeft,
  ArrowUpRight,
  Bot,
  CalendarClock,
  Check,
  Clock3,
  Code2,
  GitPullRequestArrow,
  HardDrive,
  MessageSquareQuote,
  RadioTower,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from "lucide-react";
import styles from "./agent-ops.module.css";

type Health = { key: "healthy" | "ready" | "running" | "attention"; label: string };

type AutomationJob = {
  key: string;
  displayName: string;
  shortName: string;
  purpose: string;
  cadenceLabel: string;
  mode: string;
  wakesModel: string;
  color: string;
  owner: string;
  health: Health;
  nextRunAt: string | null;
  lastActivityAt: string | null;
  lastActivityKind: string;
  lastDelivery: string;
  can: string[];
  never: string[];
};

type UpcomingRun = { jobKey: string; shortName: string; at: string; color: string };

type Finding = {
  id: string;
  severity: string;
  status: string;
  surface: string;
  summary: string;
  updatedAt: string;
  links: { label: string; url: string }[];
};

type Snapshot = {
  schemaVersion: number;
  generatedAt: string;
  timezone: string;
  source: string;
  scope: string;
  summary: {
    automationCount: number;
    headlessChecksPerDay: number;
    scheduledAgentRunsPerDay: number;
    automaticProjectWrites: number;
  };
  authority: { mode: string; requiresColin: string };
  findings: {
    headline: string;
    overallStatus: string;
    observedRevision: { sha: string; branch: string | null; observedAt: string | null } | null;
    findings: Finding[];
    topRisks: string[];
    nextActions: string[];
    unknowns: string[];
  };
  jobs: AutomationJob[];
  upcoming: UpcomingRun[];
};

const icons: Record<string, ReactNode> = {
  "host-signal": <HardDrive aria-hidden="true" />,
  "github-signal": <GitPullRequestArrow aria-hidden="true" />,
  "state-refresh": <RefreshCw aria-hidden="true" />,
  "daily-digest": <Sparkles aria-hidden="true" />,
  "build-matrix": <Code2 aria-hidden="true" />,
  "dashboard-publish": <RadioTower aria-hidden="true" />,
};

function timeLabel(value: string | null, timezone: string) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function dateTimeLabel(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function relativeLabel(value: string | null, now: number) {
  if (!value) return "No run yet";
  const minutes = Math.round((new Date(value).getTime() - now) / 60000);
  if (Math.abs(minutes) < 1) return "now";
  if (minutes > 0 && minutes < 60) return `in ${minutes}m`;
  if (minutes >= 60 && minutes < 1440) return `in ${Math.round(minutes / 60)}h`;
  const ago = Math.abs(minutes);
  if (ago < 60) return `${ago}m ago`;
  if (ago < 1440) return `${Math.round(ago / 60)}h ago`;
  return `${Math.round(ago / 1440)}d ago`;
}

function colorClass(color: string) {
  return styles[`color_${color}`] ?? styles.color_blue;
}

function severityClass(value: string) {
  return styles[`severity_${value}`] ?? styles.severity_info;
}

function statusClass(value: string) {
  return styles[`findingStatus_${value}`] ?? styles.findingStatus_firing;
}

export function AgentOpsDashboard() {
  const [snapshot, setSnapshot] = useState<Snapshot>(initialSnapshot as Snapshot);
  // Keep the server and first client render anchored to the same instant. The
  // live clock takes over after hydration so relative labels stay current.
  const [now, setNow] = useState(() => new Date(initialSnapshot.generatedAt).getTime());

  useEffect(() => {
    let active = true;
    const load = () =>
      fetch("/agent-ops.json", { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error("Snapshot unavailable");
          return response.json() as Promise<Snapshot>;
        })
        .then((data) => {
          if (!active) return;
          setSnapshot(data);
          setNow(Date.now());
        })
        .catch(() => undefined);
    load();
    const feedTimer = window.setInterval(load, 60_000);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      active = false;
      window.clearInterval(feedTimer);
      window.clearInterval(clockTimer);
    };
  }, []);

  const nextRuns = useMemo(
    () => snapshot?.upcoming.filter((run) => new Date(run.at).getTime() >= now).slice(0, 10) ?? [],
    [snapshot, now],
  );

  const healthy = snapshot.jobs.filter((job) => job.health.key !== "attention").length;

  return (
    <main className={styles.shell}>
      <div className={styles.noise} aria-hidden="true" />
      <nav className={styles.nav} aria-label="Page navigation">
        <Link href="/" className={styles.backLink}>
          <ArrowLeft aria-hidden="true" /> Colin.place
        </Link>
        <div className={styles.navStamp}>
          <span className={styles.liveDot} />
          Public operations view
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Mobile Clawd · automation operations</p>
          <h1>The machine should<br />explain itself.</h1>
          <p className={styles.lede}>
            A plain-English view of what runs, when it wakes, what it costs, and where human authority begins.
          </p>
        </div>
        <div className={styles.heroStatus}>
          <div className={styles.statusSeal}>
            <span>{healthy}/{snapshot.jobs.length}</span>
            <small>systems ready</small>
          </div>
          <div className={styles.statusCopy}>
            <strong>No autonomous code changes.</strong>
            <span>Observe, verify, build locally, report.</span>
          </div>
        </div>
      </header>

      <section className={styles.metrics} aria-label="Automation summary">
        <article>
          <span>Automations</span>
          <strong>{snapshot.summary.automationCount}</strong>
          <small>one mobile operating loop</small>
        </article>
        <article>
          <span>Cheap checks</span>
          <strong>{snapshot.summary.headlessChecksPerDay}</strong>
          <small>per day, no model by default</small>
        </article>
        <article>
          <span>Scheduled agent reviews</span>
          <strong>{snapshot.summary.scheduledAgentRunsPerDay}</strong>
          <small>per day, before the weekly build</small>
        </article>
        <article className={styles.zeroMetric}>
          <span>Automatic project writes</span>
          <strong>{snapshot.summary.automaticProjectWrites}</strong>
          <small>Colin remains the gate</small>
        </article>
      </section>

      <section className={styles.runway} aria-labelledby="runway-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>The next handoffs</p>
            <h2 id="runway-title">24-hour execution rail</h2>
          </div>
          <p>Each stop is a scheduled check. A model wakes only where the job contract says it should.</p>
        </div>

        <div className={styles.railViewport}>
          <div className={styles.railLine} aria-hidden="true" />
          <ol className={styles.railList}>
            {nextRuns.map((run, index) => (
              <li key={`${run.jobKey}-${run.at}`} className={`${styles.railStop} ${colorClass(run.color)}`}>
                <span className={styles.railIndex}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.railPin} aria-hidden="true" />
                <strong>{run.shortName}</strong>
                <time dateTime={run.at}>{timeLabel(run.at, snapshot.timezone)}</time>
                <small>{relativeLabel(run.at, now)}</small>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.findingsSection} aria-labelledby="findings-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>What it is actually finding</p>
            <h2 id="findings-title">Team findings, translated for humans</h2>
          </div>
          <p>
            This is the current mobile state Mobile Clawd is reconciling before it posts alerts and digests.
          </p>
        </div>

        <div className={styles.findingsLead}>
          <div className={styles.findingsHeadline}>
            <span className={`${styles.severityPill} ${severityClass(snapshot.findings.overallStatus)}`}>
              {snapshot.findings.overallStatus}
            </span>
            <p>{snapshot.findings.headline}</p>
          </div>
          <div className={styles.findingsMeta}>
            <div>
              <span>Observed revision</span>
              <strong>{snapshot.findings.observedRevision?.sha.slice(0, 7) ?? "unknown"}</strong>
            </div>
            <div>
              <span>Branch</span>
              <strong>{snapshot.findings.observedRevision?.branch ?? "unknown"}</strong>
            </div>
            <div>
              <span>As of</span>
              <strong>
                {snapshot.findings.observedRevision?.observedAt
                  ? dateTimeLabel(snapshot.findings.observedRevision.observedAt, snapshot.timezone)
                  : "unknown"}
              </strong>
            </div>
          </div>
        </div>

        <div className={styles.findingsGrid}>
          <article className={styles.findingsCard}>
            <header>
              <div className={styles.findingsIcon}><MessageSquareQuote aria-hidden="true" /></div>
              <div>
                <p className={styles.cardEyebrow}>Recent findings</p>
                <h3>What Mobile Clawd is sharing in ClickClack</h3>
              </div>
            </header>
            <div className={styles.findingList}>
              {snapshot.findings.findings.map((finding) => (
                <article key={finding.id} className={styles.findingItem}>
                  <div className={styles.findingTags}>
                    <span className={`${styles.severityPill} ${severityClass(finding.severity)}`}>{finding.severity}</span>
                    <span className={`${styles.statusPill} ${statusClass(finding.status)}`}>{finding.status}</span>
                    <span className={styles.surfacePill}>{finding.surface}</span>
                  </div>
                  <p>{finding.summary}</p>
                  {finding.links.length > 0 && (
                    <div className={styles.findingLinks} aria-label={`Evidence for ${finding.id}`}>
                      {finding.links.map((link) => (
                        <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                          {link.label} <ArrowUpRight aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  )}
                  <time dateTime={finding.updatedAt}>
                    {dateTimeLabel(finding.updatedAt, snapshot.timezone)} · {relativeLabel(finding.updatedAt, now)}
                  </time>
                </article>
              ))}
            </div>
          </article>

          <article className={styles.notesCard}>
            <div>
              <p className={styles.cardEyebrow}>Top risks</p>
              <ul className={styles.noteList}>
                {snapshot.findings.topRisks.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div>
              <p className={styles.cardEyebrow}>Next actions</p>
              <ul className={styles.noteList}>
                {snapshot.findings.nextActions.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div>
              <p className={styles.cardEyebrow}>Still unknown</p>
              <ul className={styles.noteList}>
                {snapshot.findings.unknowns.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.automationSection} aria-labelledby="automation-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Six contracts, not six mysteries</p>
            <h2 id="automation-title">What each automation does</h2>
          </div>
          <p>Names are written for the people reviewing the system—not for the scheduler running it.</p>
        </div>

        <div className={styles.jobGrid}>
          {snapshot.jobs.map((job) => (
            <article key={job.key} className={`${styles.jobCard} ${colorClass(job.color)}`}>
              <header className={styles.jobHeader}>
                <span className={styles.jobIcon}>{icons[job.key] ?? <Bot aria-hidden="true" />}</span>
                <span className={`${styles.health} ${styles[`health_${job.health.key}`]}`}>
                  <span /> {job.health.label}
                </span>
              </header>
              <div className={styles.jobTitle}>
                <p>{job.mode}</p>
                <h3>{job.displayName}</h3>
              </div>
              <p className={styles.jobPurpose}>{job.purpose}</p>
              <dl className={styles.jobFacts}>
                <div>
                  <dt><CalendarClock aria-hidden="true" /> Cadence</dt>
                  <dd>{job.cadenceLabel}</dd>
                </div>
                <div>
                  <dt><Clock3 aria-hidden="true" /> Next wake</dt>
                  <dd>
                    {job.health.key === "running" ? "Running now" : timeLabel(job.nextRunAt, snapshot.timezone)}
                    {job.health.key !== "running" && <span>{relativeLabel(job.nextRunAt, now)}</span>}
                  </dd>
                </div>
                <div>
                  <dt><TimerReset aria-hidden="true" /> Model posture</dt>
                  <dd>{job.wakesModel}</dd>
                </div>
              </dl>
              <div className={styles.capabilities}>
                <p>Allowed here</p>
                {job.can.map((item) => <span key={item}><Check aria-hidden="true" /> {item}</span>)}
              </div>
              <footer className={styles.jobFooter}>
                <span>{job.lastActivityKind}</span>
                <time title={job.lastActivityAt ? dateTimeLabel(job.lastActivityAt, snapshot.timezone) : undefined}>
                  {relativeLabel(job.lastActivityAt, now)}
                </time>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.authority} aria-labelledby="authority-title">
        <div className={styles.authorityIcon}><ShieldCheck aria-hidden="true" /></div>
        <div className={styles.authorityCopy}>
          <p className={styles.eyebrow}>The human line</p>
          <h2 id="authority-title">Monitoring is not permission.</h2>
          <p>{snapshot.authority.requiresColin} all require an explicit human instruction.</p>
        </div>
        <ul>
          {snapshot.jobs[0]?.never.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <footer className={styles.footer}>
        <div>
          <span className={styles.liveDot} />
          Snapshot generated {dateTimeLabel(snapshot.generatedAt, snapshot.timezone)}
        </div>
        <a href="/agent-ops.json" target="_blank" rel="noreferrer">
          Inspect the sanitized feed <ArrowUpRight aria-hidden="true" />
        </a>
      </footer>
    </main>
  );
}
