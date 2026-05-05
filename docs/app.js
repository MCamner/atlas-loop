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

const presetConfigs = {
  system: `Preset: SYSTEM / TECH
Style:
- clear
- structured
- system thinking
- no fluff

Audience:
- architects
- builders
- technical thinkers

Goal:
- teach
- clarify complexity
- show thinking`,

  art: `Preset: BLACK IRIS / ART
Style:
- minimal
- conceptual
- slightly abstract
- editorial tone

Audience:
- art / culture
- thinkers

Goal:
- provoke thought
- create atmosphere
- not explain too much`,

  linkedin: `Preset: LINKEDIN / POSITIONING
Style:
- sharp
- confident
- insight-driven
- slightly provocative

Audience:
- professionals
- decision makers

Goal:
- authority
- clarity
- engagement`
};

let activeMode = "ideas";

function getInput(overrideInput) {
  return (overrideInput || document.getElementById("input").value).trim() || "[INPUT]";
}

function getPresetText() {
  const preset = document.getElementById("preset").value;
  return presetConfigs[preset] || presetConfigs.system;
}

function buildPrompt(mode, overrideInput) {
  return `${getPresetText()}

${prompts[mode].replace("{{input}}", getInput(overrideInput))}`;
}

function setActiveMode(mode) {
  activeMode = mode;

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });
}

async function run(mode, overrideInput) {
  setActiveMode(mode);

  const prompt = buildPrompt(mode, overrideInput);
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

function markPosted() {
  const content = document.getElementById("output").innerText.trim();

  if (!content || content === "Running...") {
    document.getElementById("postStatus").innerText = "Nothing to post";
    return;
  }

  const postedAt = new Date().toISOString();
  localStorage.setItem("atlasLoopLastPost", JSON.stringify({ content, postedAt }));
  document.getElementById("postStatus").innerText = "Posted";
}

function analyzeMetrics() {
  const lastPost = JSON.parse(localStorage.getItem("atlasLoopLastPost") || "{}");
  const metricsInput = `Posted content:
${lastPost.content || document.getElementById("output").innerText}

Metrics:
Likes: ${document.getElementById("likes").value || "0"}
Saves: ${document.getElementById("saves").value || "0"}
Shares: ${document.getElementById("shares").value || "0"}
Comments: ${document.getElementById("comments").value || "0"}`;

  run("loop", metricsInput);
}

document.getElementById("input").addEventListener("input", () => {
  document.getElementById("prompt").innerText = buildPrompt(activeMode);
});

document.getElementById("preset").addEventListener("change", () => {
  document.getElementById("prompt").innerText = buildPrompt(activeMode);
});

setActiveMode(activeMode);
document.getElementById("prompt").innerText = buildPrompt(activeMode);
