const prompts = {
  ideas: `Generate 15 content ideas.

Topic:
{{input}}

Group by:
- Teach
- Show
- Entertain
- Personal`,

  content: `Create high-performing content.

Goal:
{{input}}

Include:
- Hook
- Caption
- CTA`,

  optimize: `Improve this content:

{{input}}

Make it:
- clearer
- stronger hook
- better CTA`,

  loop: `Analyze performance:

{{input}}

Return:
- what worked
- what failed
- what to repeat`
};

let activeMode = "ideas";

function getInput() {
  return document.getElementById("input").value.trim() || "[INPUT]";
}

function buildPrompt(mode) {
  return prompts[mode].replace("{{input}}", getInput());
}

function setActiveMode(mode) {
  activeMode = mode;

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });
}

async function run(mode) {
  setActiveMode(mode);

  const prompt = buildPrompt(mode);
  document.getElementById("prompt").innerText = prompt;
  output("Running...");

  try {
    const response = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, prompt })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = await response.json();
    output(data.output || "No output returned.");
  } catch (error) {
    output(
      "-> Copy this prompt into ChatGPT\n\n" +
        "Engine unavailable in this context. Start the local server with `npm start` and set OPENAI_API_KEY to generate output directly."
    );
  }
}

function runIdeas() {
  run("ideas");
}

function runContent() {
  run("content");
}

function runOptimize() {
  run("optimize");
}

function runLoop() {
  run("loop");
}

function output(text) {
  document.getElementById("output").innerText = text;
}

async function copyText(text, fallbackTarget) {
  if (!navigator.clipboard) {
    fallbackTarget.innerText = `${fallbackTarget.innerText}\n\nCopy is not available in this browser context.`;
    return;
  }

  await navigator.clipboard.writeText(text);
}

async function copyPrompt() {
  const prompt = document.getElementById("prompt").innerText;
  await copyText(prompt, document.getElementById("prompt"));
}

async function copyOutput() {
  const text = document.getElementById("output").innerText;
  await copyText(text, document.getElementById("output"));
}

document.getElementById("input").addEventListener("input", () => {
  document.getElementById("prompt").innerText = buildPrompt(activeMode);
});

setActiveMode(activeMode);
document.getElementById("prompt").innerText = buildPrompt(activeMode);
