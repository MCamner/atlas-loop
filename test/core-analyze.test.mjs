// node --test: atlas-loop hands its experiments to Atlas Core for analysis only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_TASK, HistoryRefused, analyze, coreEnvironment, renderWorkspace, validateHistory,
} from "../scripts/core-analyze.mjs";

const HISTORY = JSON.parse(readFileSync(new URL("../examples/history-export.json", import.meta.url)));

// A Core CLI that records every call (argv and environment) and answers like Core.
function fakeAtlas(mode = "") {
  const dir = mkdtempSync(join(tmpdir(), "fake-atlas-"));
  const calls = join(dir, "calls.jsonl");
  const bin = join(dir, "atlas");
  writeFileSync(bin, `#!/usr/bin/env node
const fs = require("fs");
fs.appendFileSync(${JSON.stringify(calls)}, JSON.stringify({ argv: process.argv.slice(2), env: process.env }) + "\\n");
const [cmd] = process.argv.slice(2);
if (cmd === "create") console.log("run-1");
const mode = ${JSON.stringify(mode)};
if (cmd === "run") console.log(mode === "no-schema" ? JSON.stringify({ evaluations: [] })
  : JSON.stringify({ schema: "atlas-run.v1", run_id: mode === "other-run" ? "run-OTHER" : "run-1",
                     evaluations: [{ passed: true }], outputs: ["ok"] }));
if (cmd === "inspect") console.log(JSON.stringify({ schema: mode === "bad-inspect" ? "atlas-inspect.v9" : "atlas-inspect.v1",
  run_id: "run-1", status: "done", stop_reason: "passed",
  source_details: [{ path: "README.md", content_sha256: "a".repeat(64), source_id: "s" }], uncertainties: [] }));
`);
  chmodSync(bin, 0o755);
  return { bin, dir, calls: () => readFileSync(calls, "utf8").trim().split("\n").map((l) => JSON.parse(l)) };
}

test("the workspace carries atlas-loop's own recorded values, not recomputed ones", () => {
  const doc = renderWorkspace(HISTORY);
  assert.match(doc, /## Experiment exp-carousel-checklist/);
  assert.match(doc, /saveRate 6\.77%/);
  assert.match(doc, /signalScore: 1301/);
  assert.match(doc, /## Experiment exp-unmeasured\n\n[^#]*- metrics: not measured/);
  // A stored rate that disagrees with the counts is copied, not "fixed".
  const edited = structuredClone(HISTORY);
  edited[0].rates.saveRate = "99.00%";
  assert.match(renderWorkspace(edited), /saveRate 99\.00%/);
});

test("Core is called create -> run -> inspect, without a shell, read-only", () => {
  const atlas = fakeAtlas();
  const out = analyze(HISTORY, { bin: atlas.bin, workdir: atlas.dir, env: { PATH: process.env.PATH } });
  const calls = atlas.calls();
  assert.deepEqual(calls.map((c) => c.argv[0]), ["create", "run", "inspect"]);
  const run = calls[1].argv;
  assert.equal(run[1], DEFAULT_TASK);
  assert.equal(run[run.indexOf("--repo-path") + 1], out.workspace);
  assert.ok(out.workspace.startsWith(join(atlas.dir, "atlas-loop-core-")));
  assert.equal(run[run.indexOf("--run-id") + 1], "run-1");
  assert.ok(!run.includes("propose") && !calls.some((c) => c.argv[0] === "propose"));
  assert.equal(out.stop_reason, "passed");
  assert.equal(out.experiments, 3);
  assert.deepEqual(out.sources, [{ path: "README.md", sha256: "a".repeat(64) }]);
  assert.ok(existsSync(join(out.workspace, "README.md")));
});

test("nothing from atlas-loop's environment reaches Core", () => {
  const atlas = fakeAtlas();
  analyze(HISTORY, {
    bin: atlas.bin, workdir: atlas.dir,
    env: { PATH: process.env.PATH, HOME: "/home/x", OPENAI_API_KEY: "sk-live-secret",
           OPENAI_MODEL: "gpt", ATLAS_MODEL_PROVIDER: "openai", INSTAGRAM_TOKEN: "ig" },
  });
  for (const call of atlas.calls()) {
    for (const leaked of ["OPENAI_API_KEY", "OPENAI_MODEL", "ATLAS_MODEL_PROVIDER", "INSTAGRAM_TOKEN"]) {
      assert.equal(call.env[leaked], undefined, `${leaked} reached atlas ${call.argv[0]}`);
    }
    assert.equal(call.env.HOME, "/home/x");
  }
  assert.deepEqual(Object.keys(coreEnvironment({ PATH: "p", OPENAI_API_KEY: "k", HOME: "h" })).sort(),
                   ["HOME", "PATH"]);
});

test("malformed exports are refused before Core is called", () => {
  const cases = [
    {}, [], [{ id: "a" }, { id: "a" }], [{ id: "../x" }], [{ id: "a", metrics: { reach: -1 } }],
    [{ id: "a", metrics: { saves: "12" } }], Array.from({ length: 51 }, (_, i) => ({ id: `p${i}` })),
  ];
  for (const history of cases) {
    assert.throws(() => validateHistory(history), HistoryRefused);
  }
  const atlas = fakeAtlas();
  assert.throws(() => analyze([{ id: "a" }, { id: "a" }], { bin: atlas.bin, workdir: atlas.dir }),
                HistoryRefused);
  assert.equal(existsSync(join(atlas.dir, "calls.jsonl")), false);
});

test("no shell ever reads a post's text", () => {
  const atlas = fakeAtlas();
  const pwned = join(atlas.dir, "pwned");
  const hostile = [{ id: "x", content: `$(touch ${pwned}) \`touch ${pwned}\``, brief: { hypothesis: "; touch " + pwned } }];
  analyze(hostile, { bin: atlas.bin, workdir: atlas.dir, env: { PATH: process.env.PATH },
                     task: `analyze; touch ${pwned}` });
  assert.equal(existsSync(pwned), false);
});

test("the workspace's metric text matches the UI's definitions", () => {
  const app = readFileSync(new URL("../docs/app.js", import.meta.url), "utf8");
  for (const term of ["metrics.saves * 3", "metrics.shares * 3", "metrics.comments * 2",
                      "metrics.follows * 4", "metrics.profileVisits", "const reach = metrics.reach"]) {
    assert.ok(app.includes(term), `docs/app.js no longer has ${term}; update renderWorkspace's note`);
  }
});

test("only Core's own documents are read: anything else fails closed", () => {
  for (const mode of ["no-schema", "bad-inspect", "other-run"]) {
    const atlas = fakeAtlas(mode);
    assert.throws(
      () => analyze(HISTORY, { bin: atlas.bin, workdir: atlas.dir, env: { PATH: process.env.PATH } }),
      HistoryRefused, mode);
  }
});

test("--workdir is a parent: an existing workspace is never overwritten", () => {
  const atlas = fakeAtlas();
  const existing = join(atlas.dir, "workspace");
  mkdirSync(existing);
  writeFileSync(join(existing, "README.md"), "mine");
  const out = analyze(HISTORY, { bin: atlas.bin, workdir: atlas.dir, env: { PATH: process.env.PATH } });
  assert.equal(readFileSync(join(existing, "README.md"), "utf8"), "mine");
  assert.notEqual(out.workspace, existing);
  const second = analyze(HISTORY, { bin: atlas.bin, workdir: atlas.dir, env: { PATH: process.env.PATH } });
  assert.notEqual(second.workspace, out.workspace);
  assert.throws(() => analyze(HISTORY, { bin: atlas.bin, workdir: join(atlas.dir, "missing") }),
                HistoryRefused);
});

test("a run document for another run is refused even when inspect is right", () => {
  const atlas = fakeAtlas("other-run");
  assert.throws(
    () => analyze(HISTORY, { bin: atlas.bin, workdir: atlas.dir, env: { PATH: process.env.PATH } }),
    /atlas-run\.v1 for run-1/);
  const calls = atlas.calls().map((c) => c.argv[0]);
  assert.deepEqual(calls, ["create", "run", "inspect"]);
});

test("a task that looks like an option is refused before Core is called", () => {
  for (const task of ["--unsafe-legacy-unbounded", "-h", "", "   "]) {
    const atlas = fakeAtlas();
    assert.throws(() => analyze(HISTORY, { bin: atlas.bin, workdir: atlas.dir, task }), HistoryRefused);
    assert.equal(existsSync(join(atlas.dir, "calls.jsonl")), false);
  }
});

test("the script runs from a path with a space", async () => {
  const { spawnSync } = await import("node:child_process");
  const { copyFileSync } = await import("node:fs");
  const dir = mkdtempSync(join(tmpdir(), "dir with space-"));
  const copy = join(dir, "core-analyze.mjs");
  copyFileSync(new URL("../scripts/core-analyze.mjs", import.meta.url), copy);
  const result = spawnSync(process.execPath, [copy], { encoding: "utf8" });
  assert.equal(result.status, 1, "must reach main() and print usage, not exit 0 silently");
  assert.match(result.stderr, /usage: core-analyze\.mjs/);
});
