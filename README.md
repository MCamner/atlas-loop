# atlas-loop

A minimal command surface for Instagram content systems.

Not a tool.
A loop.

```text
Ideas -> Reels -> Feedback -> Iteration
```

Most people post.
Few iterate.

`atlas-loop` is built for Instagram iteration: a small product-shaped workflow
for turning rough ideas into Reels, captions, feedback, and better next actions.

## Core Loop

```text
IDEAS -> REELS -> POST -> ANALYZE -> OPTIMIZE -> REPEAT
```

The same loop appears in the UI, CLI, prompts, and examples so the repo feels
like one system instead of scattered files.

The UI includes a minimal publish flow: copy content, mark it as posted, track
Instagram metrics, analyze performance, and save each post as an experiment in
the local loop history.

## What It Does

- generates Instagram ideas from a topic
- creates Hook Lab variants for the first 1-2 seconds of a Reel
- turns a goal into Reel, carousel, caption, CTA, and hashtag drafts
- critiques drafts before posting
- improves drafts for retention, saves, shares, comments, and action
- attaches an experiment brief: audience, pillar, hypothesis, format, metric, risk
- tracks reach, plays, likes, saves, shares, comments, follows, and profile visits
- calculates save, share, comment, and follow rates from reach
- scores posts with a lightweight Signal Score
- keeps a Next Test Queue after analysis
- extracts winner patterns from the best saved experiments
- stores recent posts locally so you can compare signals and repeat what works

## Run The UI

Open the static app directly:

```text
docs/index.html
```

Or serve it locally from the repo root:

```bash
python3 -m http.server 8000 --directory docs
```

Then open:

```text
http://127.0.0.1:8000/
```

## Run The Engine

For direct AI output, create a local `.env` file:

```bash
cp .env.example .env
```

Then edit `.env`:

```text
OPENAI_API_KEY="your_api_key_here"
OPENAI_MODEL="gpt-5.5"
```

Start the engine:

```bash
npm start
```

Then open:

```text
http://127.0.0.1:8787/
```

The browser sends prompts to the local `/api/run` endpoint. The API key stays
in the server process and is never stored in the static GitHub Pages app.
The `.env` file is ignored by git.

## Use The CLI

```bash
chmod +x cli/atlas-loop.sh
./cli/atlas-loop.sh ideas
./cli/atlas-loop.sh hook
./cli/atlas-loop.sh content
./cli/atlas-loop.sh crit
./cli/atlas-loop.sh optimize
./cli/atlas-loop.sh loop
./cli/atlas-loop.sh patterns
```

The CLI can also fill the prompt from an argument or stdin:

```bash
./cli/atlas-loop.sh ideas "endpoint troubleshooting for EUC operators"
echo "Draft caption here" | ./cli/atlas-loop.sh crit
```

## Analyze With Atlas Core

`scripts/core-analyze.mjs` hands exported experiments to
[Atlas Core](https://github.com/MCamner/atlas-core) for analysis. It changes
nothing: it posts nothing and opens no network connection.

```bash
node scripts/core-analyze.mjs history.json [--task "..."] [--workdir DIR]
```

`history.json` is what **Export history** copies. The script writes every
experiment into one `README.md` in a fresh workspace, then calls
`atlas create`, `atlas run --repo-path WORKSPACE --json` and `atlas inspect`.
`atlas` must be on `PATH`, or set `ATLAS_BIN`. It prints one JSON document
with Core's run id, status, stop reason, the sources Core read (path and
SHA-256), and the paths to the workspace and event log.

**Measurement stays with atlas-loop.** Rates and Signal Score are copied as
the UI recorded them; the script computes nothing, and a test fails if the
formula note drifts from `docs/app.js`.

**Publishing stays with atlas-loop.** Core runs with only `PATH`, `HOME`,
`LANG`, `LC_ALL` and `TMPDIR`. `OPENAI_API_KEY` and anything else in `.env`
never reach it. Nothing is ever passed through a shell.

**What Core adds is the record.** You get which sources Core read, their
digests, and an evidence-checked run document. Core's CLI has no live model,
so without one it writes its rule-based review and checks no claims about the
experiments.

`npm test` runs the contract against a fake `atlas`.

## Demo

```text
/ideas -> generate Instagram ideas
/hook -> generate and compare opening hooks
/content -> create Reels, captions, and CTAs
/crit -> review draft clarity, proof, and retention
/optimize -> improve Instagram content
/loop -> analyze Instagram performance
/patterns -> extract repeatable winning patterns
```

## Structure

```text
atlas-loop/
├── README.md
├── docs/
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   └── prompts/
├── server.mjs
├── package.json
├── cli/
│   └── atlas-loop.sh
├── examples/
└── LICENSE
```

## Product Position

This is not another generic social media tool.
This is not just another prompt repo.

It is a workflow, a mental model, and a lightweight command surface for
content iteration.

Version 1 is intentionally raw:

- fast
- functional
- readable
- easy to extend

## License

MIT
