#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(dirname, "../public/agent-ops.json");
const projectStatePath = path.resolve(dirname, "../../openclaw-mobile-clawd/state/project-state.json");
const timezone = "America/Indiana/Indianapolis";

const registry = {
  "mobile-clawd:host-signal:v1": {
    key: "host-signal",
    displayName: "Mac readiness",
    shortName: "Host",
    purpose: "Checks that the Mac, gateway, disk, and shared build lane are ready for mobile work.",
    cadenceLabel: "Every 5 minutes",
    mode: "Headless detector",
    wakesModel: "Only after a new, changed, or recovered incident",
    color: "blue",
    can: ["Read host health", "Track incident fingerprints", "Wake Mobile Clawd on change"],
  },
  "mobile-clawd:github-signal:v2": {
    key: "github-signal",
    displayName: "Mobile CI watch",
    shortName: "GitHub",
    purpose: "Watches mobile pull-request checks and the default branch for current, actionable failures.",
    cadenceLabel: "Every 15 minutes",
    mode: "Headless detector",
    wakesModel: "Only after a material incident change",
    color: "indigo",
    can: ["Read public GitHub state", "Deduplicate failed revisions", "Wake Mobile Clawd on change"],
  },
  "mobile-clawd:hourly-state:v1": {
    key: "state-refresh",
    displayName: "Project reconciliation",
    shortName: "State",
    purpose: "Reconciles GitHub, ClawSweeper, project decisions, and unlabeled work into one mobile state.",
    cadenceLabel: "Hourly at :07",
    mode: "Agent review",
    wakesModel: "Every scheduled run",
    color: "amber",
    can: ["Read project evidence", "Update local state", "Report material changes"],
  },
  "mobile-clawd:daily-digest:v1": {
    key: "daily-digest",
    displayName: "Daily mobile brief",
    shortName: "Digest",
    purpose: "Turns the day’s mobile activity, blockers, decisions, and evidence into a short team brief.",
    cadenceLabel: "Daily at 5:30 PM",
    mode: "Agent synthesis",
    wakesModel: "Every scheduled run",
    color: "coral",
    can: ["Read canonical state", "Summarize evidence", "Post the approved digest format"],
  },
  "mobile-clawd:weekly-build-matrix:v1": {
    key: "build-matrix",
    displayName: "Four-surface build",
    shortName: "Build",
    purpose: "Runs unsigned Android, Wear OS, iOS/iPadOS, and watchOS acceptance builds on one revision.",
    cadenceLabel: "Sunday at 9:00 AM",
    mode: "Agent + local builds",
    wakesModel: "Every scheduled run",
    color: "green",
    can: ["Create an isolated worktree", "Run unsigned local builds", "Write local evidence"],
  },
  "mobile-clawd:dashboard-publish:v1": {
    key: "dashboard-publish",
    displayName: "Findings page sync",
    shortName: "Publish",
    purpose: "Publishes the sanitized findings feed when team-facing mobile state materially changes.",
    cadenceLabel: "Every 10 minutes",
    mode: "Headless publisher",
    wakesModel: "Never; deploys only after the findings fingerprint changes",
    color: "blue",
    can: ["Read sanitized local state", "Detect finding changes", "Publish the public dashboard"],
  },
};

const never = [
  "Dispatch coding workers",
  "Edit project code",
  "Push or update pull requests",
  "Merge, sign, or release",
];

const surfaceLabels = {
  android: "Android",
  "wear-os": "Wear OS",
  "ios-ipados": "iOS/iPadOS",
  watchos: "watchOS",
  "shared-mobile": "Shared mobile",
  project: "Project",
};

function readJobs() {
  const binary = "/opt/homebrew/bin/openclaw";
  if (!fs.existsSync(binary)) return null;
  const stdout = execFileSync(binary, ["cron", "list", "--json"], {
    encoding: "utf8",
    env: { ...process.env, HOME: "/Users/solvely" },
    stdio: ["ignore", "pipe", "ignore"],
  });
  return JSON.parse(stdout).jobs;
}

function activityFor(job) {
  const triggerAt = job.state?.lastTriggerEvalAtMs ?? null;
  const modelAt = job.state?.lastRunAtMs ?? null;
  if (triggerAt && (!modelAt || triggerAt > modelAt)) {
    return { at: new Date(triggerAt).toISOString(), kind: "Detector check" };
  }
  if (modelAt) return { at: new Date(modelAt).toISOString(), kind: "Agent run" };
  return { at: null, kind: "Awaiting first run" };
}

function healthFor(job) {
  if (job.status === "running") return { key: "running", label: "Running now" };
  if (job.state?.lastRunStatus === "error" || job.status === "error") {
    return { key: "attention", label: "Needs attention" };
  }
  if (job.status === "ok") return { key: "healthy", label: "On schedule" };
  return { key: "ready", label: "Ready" };
}

function matchesSchedule(key, date) {
  const minute = date.getMinutes();
  if (key === "host-signal") return minute >= 3 && (minute - 3) % 5 === 0;
  if (key === "github-signal") return minute % 15 === 0;
  if (key === "state-refresh") return minute === 7;
  if (key === "daily-digest") return date.getHours() === 17 && minute === 30;
  if (key === "build-matrix") return date.getDay() === 0 && date.getHours() === 9 && minute === 0;
  if (key === "dashboard-publish") return minute >= 4 && (minute - 4) % 10 === 0;
  return false;
}

function upcomingRuns(jobs, start) {
  const events = [];
  const cursor = new Date(start);
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  while (cursor <= end && events.length < 80) {
    for (const job of jobs) {
      if (matchesSchedule(job.key, cursor)) {
        events.push({ jobKey: job.key, shortName: job.shortName, at: cursor.toISOString(), color: job.color });
      }
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return events;
}

function readProjectState() {
  if (!fs.existsSync(projectStatePath)) return null;
  return JSON.parse(fs.readFileSync(projectStatePath, "utf8"));
}

function humanSurface(surface) {
  if (typeof surface !== "string") return "Unknown";
  if (surface.includes(",")) {
    return surface
      .split(",")
      .map((part) => humanSurface(part.trim()))
      .join(" + ");
  }
  return surfaceLabels[surface] ?? surface;
}

function findingNumber(alert) {
  const value = `${alert.alertId ?? ""} ${alert.incidentKey ?? ""} ${alert.summary ?? ""}`;
  const match = value.match(/(?:#|pull\/|issues\/|:)(\d{4,})\b/);
  return match ? Number(match[1]) : null;
}

function linkLabel(url, number) {
  if (url.includes("/actions/runs/")) return "CI evidence";
  if (url.includes("#issuecomment-")) return "Review evidence";
  if (url.includes(`/pull/${number}`)) return `PR #${number}`;
  if (url.includes(`/issues/${number}`)) return `Issue #${number}`;
  return "Evidence";
}

function evidenceLinksFor(alert, state) {
  const number = findingNumber(alert);
  if (!number) return [];

  const links = new Map();
  const add = (url) => {
    if (typeof url !== "string" || !url.startsWith("https://github.com/openclaw/openclaw/")) return;
    links.set(url, { label: linkLabel(url, number), url });
  };

  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    const context = JSON.stringify(value);
    if (context.includes(`#${number}`) || context.includes(`/pull/${number}`) || context.includes(`/issues/${number}`)) {
      add(value.url);
    }
    Object.values(value).forEach(visit);
  };

  add(`https://github.com/openclaw/openclaw/pull/${number}`);
  visit(state.sources);
  visit(state.surfaces);
  visit(state.sharedMobile);

  return Array.from(links.values())
    .sort((a, b) => {
      const rank = (link) => link.label.startsWith("PR #") ? 0 : link.label === "CI evidence" ? 1 : 2;
      return rank(a) - rank(b);
    })
    .slice(0, 4);
}

function extractFindings(state) {
  if (!state) {
    return {
      headline: "Current findings are unavailable because the canonical mobile state snapshot was not present.",
      overallStatus: "unknown",
      observedRevision: null,
      findings: [],
      topRisks: [],
      nextActions: [],
      unknowns: [],
    };
  }

  const findings = Array.isArray(state.alerts)
    ? state.alerts
        .slice()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 8)
        .map((alert) => ({
          id: alert.alertId,
          severity: alert.severity,
          status: alert.status,
          surface: humanSurface(alert.surface),
          summary: alert.summary,
          updatedAt: alert.updatedAt,
          links: evidenceLinksFor(alert, state),
        }))
    : [];

  return {
    headline: state.summary?.headline ?? state.overall?.reason ?? "No current headline available.",
    overallStatus: state.overall?.status ?? "unknown",
    observedRevision: state.observedRevision?.sha
      ? {
          sha: state.observedRevision.sha,
          branch: state.observedRevision.branch ?? null,
          observedAt: state.observedRevision.observedAt ?? null,
        }
      : null,
    findings,
    topRisks: Array.isArray(state.summary?.topRisks) ? state.summary.topRisks.slice(0, 5) : [],
    nextActions: Array.isArray(state.summary?.nextActions) ? state.summary.nextActions.slice(0, 5) : [],
    unknowns: Array.isArray(state.summary?.unknowns) ? state.summary.unknowns.slice(0, 3) : [],
  };
}

let rawJobs;
try {
  rawJobs = readJobs();
} catch (error) {
  if (fs.existsSync(outputPath)) {
    process.stdout.write(`Automation snapshot unchanged: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(0);
  }
  throw error;
}

if (!rawJobs) {
  if (fs.existsSync(outputPath)) {
    process.stdout.write("Automation snapshot unchanged: OpenClaw is unavailable in this build environment.\n");
    process.exit(0);
  }
  throw new Error("OpenClaw is unavailable and no existing automation snapshot is present.");
}

const projectState = readProjectState();
const jobs = rawJobs
  .filter((job) => job.enabled && registry[job.declarationKey])
  .map((job) => {
    const definition = registry[job.declarationKey];
    const activity = activityFor(job);
    const health = healthFor(job);
    return {
      ...definition,
      owner: "Mobile Clawd",
      schedule: job.schedule?.expr ?? "",
      timezone,
      health,
      nextRunAt: job.state?.nextRunAtMs ? new Date(job.state.nextRunAtMs).toISOString() : null,
      lastActivityAt: activity.at,
      lastActivityKind: activity.kind,
      lastDelivery: job.state?.lastDelivered === true ? "Shared" : "Quiet",
      triggerEvaluations: job.state?.triggerEvalCount ?? null,
      never,
    };
  });

const now = new Date();
const snapshot = {
  schemaVersion: 2,
  generatedAt: now.toISOString(),
  timezone,
  source: "OpenClaw scheduler · sanitized public snapshot",
  scope: "OpenClaw mobile project operations",
  summary: {
    automationCount: jobs.length,
    headlessChecksPerDay: 528,
    scheduledAgentRunsPerDay: 25,
    automaticProjectWrites: 0,
  },
  authority: {
    mode: "Observe, verify, build locally, and report",
    requiresColin: "Worker dispatch, code changes, GitHub writes, signing, release, cleanup, and service changes",
  },
  findings: extractFindings(projectState),
  jobs,
  upcoming: upcomingRuns(jobs, now),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
process.stdout.write(`Wrote sanitized automation snapshot with ${jobs.length} jobs to ${outputPath}\n`);
