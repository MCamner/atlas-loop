// node --test: atlas-loop hands its experiments to Atlas Core for analysis only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  HistoryRefused, analyze, coreEnvironment, renderWorkspace, validateHistory,
} from "../scripts/core-analyze.mjs";

const HISTORY = JSON.parse(readFileSync(new URL("../examples/history-export.json", import.meta.url)));

// A Core CLI that records every call (argv and environment) and answers like Core.
function fakeAtlas() {
  const dir = mkdtempSync(join(tmpdir(), "fake-atlas-"));
  const calls = join(dir, "calls.jsonl");
  const bin = join(dir, "atlas");
  writeFileSync(bin, `#!/usr/bin/env node
const fs = require("fs");
fs.appendFileSync(${JSON.stringify(calls)}, JSON.stringify({ argv: process.argv.slice(2), env: process.env }) + "\\n");
const [cmd] = process.argv.slice(2);
if (cmd === "create") console.log("run-1");
if (cmd === "run") console.log(JSON.stringify({ evaluations: [{ passed: true }], outputs: ["ok"] }));
if (cmd === "inspect") console.log(JSON.stringify({ status: "done", stop_reason: "passed",
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
  assert.equal(run[run.indexOf("--repo-path") + 1], join(atlas.dir, "workspace"));
  assert.equal(run[run.indexOf("--run-id") + 1], "run-1");
  assert.ok(!run.includes("propose") && !calls.some((c) => c.argv[0] === "propose"));
  assert.equal(out.stop_reason, "passed");
  assert.equal(out.experiments, 3);
  assert.deepEqual(out.sources, [{ path: "README.md", sha256: "a".repeat(64) }]);
  assert.ok(existsSync(join(atlas.dir, "workspace", "README.md")));
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
