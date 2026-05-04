const prompts = {
  ideas: `Generate 15 Instagram content ideas.

Topic:
{{input}}

Group by:
- Reels
- Carousels
- Stories
- Captions

For each idea, include:
- hook
- format
- why it could work on Instagram`,

  content: `Create Instagram content.

Goal:
{{input}}

Include:
- Reel hook
- short script or carousel outline
- caption
- CTA
- suggested hashtags`,

  optimize: `Improve this Instagram content:

{{input}}

Make it:
- clearer in the first 2 seconds
- stronger for saves and shares
- easier to comment on
- tighter caption
- better CTA`,

  loop: `Analyze Instagram performance:

{{input}}

Return:
- what worked
- what failed
- what to repeat
- next post to test`
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
