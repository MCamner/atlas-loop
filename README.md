# atlas-loop

A minimal command surface for content systems.

Not a tool.
A loop.

```text
Ideas -> Execution -> Feedback -> Iteration
```

Most people post.
Few iterate.

`atlas-loop` is built for iteration: a small product-shaped workflow for
turning rough ideas into content, feedback, and better next actions.

## Core Loop

```text
IDEAS -> CONTENT -> POST -> ANALYZE -> OPTIMIZE -> REPEAT
```

The same loop appears in the UI, CLI, prompts, and examples so the repo feels
like one system instead of scattered files.

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
OPENAI_MODEL="gpt-5.2"
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
./cli/atlas-loop.sh content
./cli/atlas-loop.sh optimize
./cli/atlas-loop.sh loop
```

## Demo

```text
/ideas -> generate ideas
/content -> create content
/optimize -> improve content
/loop -> analyze performance
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

This is not another social media tool.
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
