#!/usr/bin/env node
// Analyze exported Instagram experiments with Atlas Core.
//
//   node scripts/core-analyze.mjs HISTORY.json [--task TEXT] [--workdir DIR]
//
// Read-only with respect to the experiment history and publishing: it writes
// only a new directory of its own (under --workdir, or the system temp dir),
// holding the workspace and Core's event log.
//
// HISTORY.json is what the UI's "Export history" copies. Every experiment is
// written, as atlas-loop recorded it, into one README.md in a fresh workspace,
// and Atlas Core reads that workspace through `atlas run --repo-path`:
//
//   atlas create -> atlas run --run-id --event-log --repo-path --json -> atlas inspect
//
// What stays atlas-loop's:
// - Measurement. Rates and Signal Score are the values the UI computed and
//   stored; this script copies them and computes nothing, so Core never gets
//   a second definition of a metric.
// - Publishing. This script posts nothing and opens no network connection.
//   Core runs with a minimal environment (PATH, HOME, LANG), so
//   OPENAI_API_KEY or anything else from atlas-loop's .env never reaches it.
//
// Output: one JSON document on stdout, with Core's run status, stop reason,
// sources (path and SHA-256) and the paths to the workspace and event log.
// Exit 0 when Core answered, whatever it answered; 1 when it could not be
// asked.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const DEFAULT_TASK =
  "Analyze which Instagram experiments had the strongest save and share rates, and why";
const MAX_CONTENT = 280;
const METRICS = ["reach", "plays", "likes", "saves", "shares", "comments", "follows", "profileVisits"];
const RATES = ["saveRate", "shareRate", "commentRate", "followRate"];
const BRIEF = ["audience", "pillar", "hypothesis", "format", "metricToWin", "risk"];

export class HistoryRefused extends Error {}

function text(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function validateHistory(history) {
  if (!Array.isArray(history)) throw new HistoryRefused("history must be a JSON array of posts");
  if (history.length === 0) throw new HistoryRefused("history has no posts");
  if (history.length > 50) throw new HistoryRefused("history has more than 50 posts");
  const seen = new Set();
  for (const [index, post] of history.entries()) {
    if (!post || typeof post !== "object" || Array.isArray(post)) {
      throw new HistoryRefused(`post ${index} is not an object`);
    }
    if (typeof post.id !== "string" || !/^[A-Za-z0-9-]{1,64}$/.test(post.id)) {
      throw new HistoryRefused(`post ${index} has no usable id`);
    }
    if (seen.has(post.id)) throw new HistoryRefused(`post id ${post.id} appears twice`);
    seen.add(post.id);
    if (post.metrics !== null && post.metrics !== undefined) {
      for (const key of METRICS) {
        const value = post.metrics[key];
        if (value !== undefined && !(Number.isFinite(value) && value >= 0)) {
          throw new HistoryRefused(`post ${post.id}: metrics.${key} is not a count`);
        }
      }
    }
  }
  return history;
}

// One markdown document holding every experiment as atlas-loop recorded it.
export function renderWorkspace(history) {
  const lines = [
    "# Instagram experiments (atlas-loop export)",
    "",
    "Rates and Signal Score are atlas-loop's own values, copied as recorded:",
    "rate = count / reach; Signal Score = likes + 3*saves + 3*shares + 2*comments",
    "+ 4*follows + profileVisits. A post without metrics has not been measured.",
    "",
  ];
  for (const post of history) {
    lines.push(`## Experiment ${post.id}`, "");
    lines.push(`- posted: ${text(post.postedAt) || "unknown"}`);
    lines.push(`- mode: ${text(post.mode) || "unknown"}`);
    for (const key of BRIEF) {
      const value = text(post.brief?.[key]);
      if (value) lines.push(`- ${key}: ${value}`);
    }
    if (post.metrics) {
      lines.push(`- metrics: ${METRICS.map((key) => `${key} ${post.metrics[key] ?? "n/a"}`).join(", ")}`);
      lines.push(`- rates: ${RATES.map((key) => `${key} ${text(post.rates?.[key]) || "n/a"}`).join(", ")}`);
      lines.push(`- signalScore: ${Number.isFinite(post.signalScore) ? post.signalScore : "n/a"}`);
    } else {
      lines.push("- metrics: not measured");
    }
    const next = text(post.nextTest);
    if (next) lines.push(`- nextTest: ${next}`);
    const content = text(post.content);
    if (content) {
      lines.push(`- content: ${content.slice(0, MAX_CONTENT)}${content.length > MAX_CONTENT ? " …" : ""}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

// Only what a process needs to find `atlas` and run. Nothing from .env.
export function coreEnvironment(env = process.env) {
  const kept = {};
  for (const key of ["PATH", "HOME", "LANG", "LC_ALL", "TMPDIR"]) {
    if (env[key] !== undefined) kept[key] = env[key];
  }
  return kept;
}

function atlas(bin, args, env) {
  const result = spawnSync(bin, args, { env, encoding: "utf8", timeout: 120_000, shell: false });
  if (result.error) throw new HistoryRefused(`cannot run ${bin}: ${result.error.message}`);
  return result;
}

export function analyze(history, { task = DEFAULT_TASK, workdir, bin, env = process.env } = {}) {
  validateHistory(history);
  const atlasBin = bin || env.ATLAS_BIN || "atlas";
  const coreEnv = coreEnvironment(env);
  // Always a fresh directory of our own: --workdir names where to put it,
  // never a directory to write into, so nothing already there is touched.
  if (workdir !== undefined && !(existsSync(workdir) && statSync(workdir).isDirectory())) {
    throw new HistoryRefused(`--workdir is not an existing directory: ${workdir}`);
  }
  const root = mkdtempSync(join(workdir ?? tmpdir(), "atlas-loop-core-"));
  const workspace = join(root, "workspace");
  mkdirSync(workspace, { recursive: true });
  writeFileSync(join(workspace, "README.md"), renderWorkspace(history));
  const eventLog = join(root, "events.jsonl");

  const created = atlas(atlasBin, ["create"], coreEnv);
  const runId = created.stdout.trim();
  if (created.status !== 0 || !runId) {
    throw new HistoryRefused(`atlas create failed: ${created.stderr.trim()}`);
  }
  const run = atlas(atlasBin, [
    "run", task, "--run-id", runId, "--event-log", eventLog,
    "--repo-path", workspace, "--max-output-bytes", "262144", "--json",
  ], coreEnv);
  const inspected = atlas(atlasBin, ["inspect", runId, "--event-log", eventLog, "--json"], coreEnv);
  let document = null;
  let inspection = null;
  try { document = JSON.parse(run.stdout); } catch { document = null; }
  try { inspection = JSON.parse(inspected.stdout); } catch { inspection = null; }
  // Only Core's own documents are read. Anything else — no document, another
  // schema, a later version this client does not know — is refused rather
  // than read field by field.
  if (document?.schema !== "atlas-run.v1") {
    throw new HistoryRefused(
      `atlas run did not return atlas-run.v1 (exit ${run.status}): ${run.stderr.trim().slice(0, 300)}`);
  }
  if (inspection?.schema !== "atlas-inspect.v1" || inspection.run_id !== runId) {
    throw new HistoryRefused(
      `atlas inspect did not return atlas-inspect.v1 for ${runId}: ${inspected.stderr.trim().slice(0, 300)}`);
  }
  const evaluations = document?.evaluations ?? [];
  return {
    schema: "atlas-loop-core-analysis.v1",
    core_run_id: runId,
    exit_code: run.status,
    status: inspection.status ?? null,
    stop_reason: inspection.stop_reason ?? null,
    passed: evaluations.length ? evaluations[evaluations.length - 1].passed : null,
    experiments: history.length,
    sources: (inspection.source_details ?? []).map(({ path, content_sha256 }) => ({ path, sha256: content_sha256 })),
    uncertainties: inspection.uncertainties ?? [],
    output: document?.outputs?.at(-1) ?? null,
    workspace,
    event_log: eventLog,
  };
}

function main(argv) {
  const args = [...argv];
  const file = args.shift();
  const options = {};
  while (args.length) {
    const flag = args.shift();
    if (flag === "--task") options.task = args.shift();
    else if (flag === "--workdir") options.workdir = args.shift();
    else throw new HistoryRefused(`unknown option ${flag}`);
  }
  if (!file) throw new HistoryRefused("usage: core-analyze.mjs HISTORY.json [--task TEXT] [--workdir DIR]");
  let history;
  try {
    history = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new HistoryRefused(`cannot read ${file}: ${error.message}`);
  }
  process.stdout.write(`${JSON.stringify(analyze(history, options), null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`core-analyze: ${error.message}\n`);
    process.exit(1);
  }
}
