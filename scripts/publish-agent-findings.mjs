#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(dirname, "..");
const snapshotPath = path.join(projectDir, "public/agent-ops.json");
const statePath = "/Users/solvely/clawd/state/mobile-clawd-dashboard-publish.json";
const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

function run(file, args) {
  return execFileSync(file, args, {
    cwd: projectDir,
    env: { ...process.env, HOME: "/Users/solvely" },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

run("/opt/homebrew/bin/node", [path.join(dirname, "export-automation-status.mjs")]);
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
const content = JSON.stringify(snapshot.findings);
const fingerprint = createHash("sha256").update(content).digest("hex");
const previous = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, "utf8")) : null;
const changed = force || previous?.fingerprint !== fingerprint;

if (!changed || dryRun) {
  process.stdout.write(`${JSON.stringify({ ok: true, changed, deployed: false, fingerprint })}\n`);
  process.exit(0);
}

const output = run("/opt/homebrew/bin/npx", ["vercel", "--prod", "--yes"]);
const url = output
  .split("\n")
  .map((line) => line.trim())
  .find((line) => line.startsWith("https://")) ?? "https://colin.place/apps/agent";

fs.mkdirSync(path.dirname(statePath), { recursive: true });
fs.writeFileSync(statePath, `${JSON.stringify({ fingerprint, deployedAt: new Date().toISOString(), url }, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ ok: true, changed: true, deployed: true, fingerprint, url })}\n`);
