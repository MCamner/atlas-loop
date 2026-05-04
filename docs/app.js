const promptMap = {
  ideas: {
    label: "/ideas",
    prompt: `Generate 15 content ideas based on:

Topic:
[INPUT]

Group by:
- Teach
- Show
- Entertain
- Personal`
  },
  content: {
    label: "/content",
    prompt: `Create high-performing content.

Goal:
[INPUT]

Include:
- Hook
- Caption
- CTA`
  },
  optimize: {
    label: "/optimize",
    prompt: `Optimize this content for clarity, retention, and action.

Draft:
[INPUT]

Return:
- stronger hook
- tighter structure
- sharper CTA
- what to remove`
  },
  loop: {
    label: "/loop",
    prompt: `Analyze performance:

[INPUT]

Return:
- what worked
- what failed
- what to repeat`
  }
};

function getInput() {
  return document.getElementById("input").value.trim() || "[INPUT]";
}

function renderPrompt(key) {
  const item = promptMap[key];
  const text = item.prompt.replace("[INPUT]", getInput());
  output(`${item.label}\n\n${text}`);
}

function runIdeas() {
  renderPrompt("ideas");
}

function runContent() {
  renderPrompt("content");
}

function runOptimize() {
  renderPrompt("optimize");
}

function runLoop() {
  renderPrompt("loop");
}

function output(text) {
  document.getElementById("output").innerText = text;
}

async function copyOutput() {
  const text = document.getElementById("output").innerText;

  if (!navigator.clipboard) {
    output(`${text}\n\nCopy is not available in this browser context.`);
    return;
  }

  await navigator.clipboard.writeText(text);
}
