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

  hook: `Create a Hook Lab for this Instagram idea or draft:

{{input}}

Return:
- 10 hook options for the first 1-2 seconds
- hook pattern for each option: pain, contrast, proof, myth, workflow, or curiosity
- strongest 3 hooks
- why each strong hook could work
- one hook to avoid and why`,

  content: `Create Instagram content.

Goal:
{{input}}

Include:
- Reel hook
- short script or carousel outline
- caption
- CTA
- suggested hashtags`,

  crit: `Review this Instagram content with practical, direct feedback:

{{input}}

Return:
- strongest part
- weakest part
- unclear claims
- missing proof
- weak retention points
- one concrete improvement`,

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
- metric signal quality
- next post to test`,

  patterns: `Analyze these Instagram post experiments:

{{input}}

Return:
- strongest hooks or opening patterns
- best performing formats
- recurring topics or pillars
- CTA patterns to repeat
- weak patterns to stop using
- 3 next controlled tests`
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
const historyKey = "atlasLoopPosts";
const lastPostKey = "atlasLoopLastPost";
const queueKey = "atlasLoopNextTests";
const briefFields = ["audience", "pillar", "hypothesis", "format", "metricToWin", "risk"];

function getInput(overrideInput) {
  return (overrideInput || document.getElementById("input").value).trim() || "[INPUT]";
}

function getPresetText() {
  const preset = document.getElementById("preset").value;
  return presetConfigs[preset] || presetConfigs.system;
}

function buildPrompt(mode, overrideInput) {
  return `${getPresetText()}

${getBriefText()}

${prompts[mode].replace("{{input}}", getInput(overrideInput))}`;
}

function getBrief() {
  return {
    audience: document.getElementById("audience").value.trim(),
    pillar: document.getElementById("pillar").value.trim(),
    hypothesis: document.getElementById("hypothesis").value.trim(),
    format: document.getElementById("format").value.trim(),
    metricToWin: document.getElementById("metricToWin").value.trim(),
    risk: document.getElementById("risk").value.trim()
  };
}

function getBriefText() {
  const brief = getBrief();
  const rows = [
    ["Audience", brief.audience],
    ["Pillar", brief.pillar],
    ["Hypothesis", brief.hypothesis],
    ["Format", brief.format],
    ["Metric to win", brief.metricToWin],
    ["Risk", brief.risk]
  ].filter(([, value]) => value);

  if (!rows.length) {
    return "Experiment Brief: [not set]";
  }

  return `Experiment Brief:
${rows.map(([label, value]) => `${label}: ${value}`).join("\n")}`;
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
      const errorText = await response.text();
      throw new Error(readApiError(errorText));
    }

    const data = await response.json();
    const result = data.output || "No output returned.";
    output(result);
    return result;
  } catch (error) {
    const fallback = (
      "-> Copy this prompt into ChatGPT\n\n" +
        "Engine unavailable in this context. Start the local server with `npm start` and set OPENAI_API_KEY to generate output directly.\n\n" +
        `Details: ${error.message}`
    );
    output(fallback);
    return fallback;
  }
}

function readApiError(errorText) {
  try {
    return JSON.parse(errorText).error || errorText;
  } catch {
    return errorText || "Request failed.";
  }
}

function runIdeas() {
  run("ideas");
}

function runHookLab() {
  run("hook");
}

function runContent() {
  run("content");
}

function runCrit() {
  run("crit");
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

  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    fallbackTarget.innerText = `${fallbackTarget.innerText}\n\nCopy failed: ${error.message}`;
  }
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

  const post = {
    id: createId(),
    content,
    input: document.getElementById("input").value.trim(),
    prompt: document.getElementById("prompt").innerText,
    brief: getBrief(),
    mode: activeMode,
    preset: document.getElementById("preset").value,
    postedAt: new Date().toISOString(),
    metrics: null,
    rates: null,
    signalScore: 0,
    nextTest: ""
  };

  const posts = getPosts();
  posts.unshift(post);
  savePosts(posts);
  localStorage.setItem(lastPostKey, JSON.stringify(post));
  document.getElementById("postStatus").innerText = "Posted";
  renderHistory();
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function analyzeMetrics() {
  const lastPost = JSON.parse(localStorage.getItem(lastPostKey) || "{}");
  const metrics = readMetrics();
  const rates = calculateRates(metrics);
  const signalScore = calculateSignalScore(metrics);
  let activePost = null;

  if (lastPost.id) {
    const posts = getPosts();
    const post = posts.find((item) => item.id === lastPost.id);

    if (post) {
      post.metrics = metrics;
      post.rates = rates;
      post.signalScore = signalScore;
      activePost = post;
      savePosts(posts);
      localStorage.setItem(lastPostKey, JSON.stringify(post));
      renderHistory();
    }
  }

  const metricsInput = `Posted content:
${lastPost.content || document.getElementById("output").innerText}

Metrics:
Reach: ${metrics.reach}
Plays: ${metrics.plays}
Likes: ${metrics.likes}
Saves: ${metrics.saves}
Shares: ${metrics.shares}
Comments: ${metrics.comments}
Follows: ${metrics.follows}
Profile visits: ${metrics.profileVisits}
Signal score: ${signalScore}

Rates:
Save rate: ${rates.saveRate}
Share rate: ${rates.shareRate}
Comment rate: ${rates.commentRate}
Follow conversion: ${rates.followRate}

Return one concrete next post to test.`;

  const analysis = await run("loop", metricsInput);

  if (activePost) {
    const posts = getPosts();
    const post = posts.find((item) => item.id === activePost.id);

    if (post) {
      post.analysis = analysis;
      post.nextTest = extractNextTest(analysis);
      queueNextTest(post.nextTest, post.id);
      savePosts(posts);
      localStorage.setItem(lastPostKey, JSON.stringify(post));
      renderHistory();
      renderNextQueue();
    }
  }
}

function readMetric(id) {
  const value = Number.parseInt(document.getElementById(id).value, 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function readMetrics() {
  return {
    reach: readMetric("reach"),
    plays: readMetric("plays"),
    likes: readMetric("likes"),
    saves: readMetric("saves"),
    shares: readMetric("shares"),
    comments: readMetric("comments"),
    follows: readMetric("follows"),
    profileVisits: readMetric("profileVisits")
  };
}

function calculateRates(metrics) {
  const reach = metrics.reach || 1;

  return {
    saveRate: formatRate(metrics.saves, reach),
    shareRate: formatRate(metrics.shares, reach),
    commentRate: formatRate(metrics.comments, reach),
    followRate: formatRate(metrics.follows, reach)
  };
}

function formatRate(value, base) {
  return `${((value / base) * 100).toFixed(2)}%`;
}

function calculateSignalScore(metrics) {
  return (
    metrics.likes +
    metrics.saves * 3 +
    metrics.shares * 3 +
    metrics.comments * 2 +
    metrics.follows * 4 +
    metrics.profileVisits
  );
}

function updateSignalScore() {
  const score = calculateSignalScore(readMetrics());
  document.getElementById("signalScore").innerText = `Signal Score: ${score}`;
}

function getPosts() {
  try {
    const posts = JSON.parse(localStorage.getItem(historyKey) || "[]");
    return Array.isArray(posts) ? posts : [];
  } catch {
    return [];
  }
}

function savePosts(posts) {
  localStorage.setItem(historyKey, JSON.stringify(posts.slice(0, 50)));
}

function renderHistory() {
  const history = document.getElementById("history");
  const posts = getPosts();

  if (!posts.length) {
    history.innerText = "No saved posts yet.";
    return;
  }

  history.innerHTML = posts
    .slice(0, 8)
    .map((post) => {
      const metrics = post.metrics;
      const postedAt = new Date(post.postedAt).toLocaleString();
      const title = escapeHtml(firstLine(post.content));
      const detail = metrics
        ? `Score ${post.signalScore || 0} / Reach ${metrics.reach} / Saves ${metrics.saves} / Shares ${metrics.shares} / Comments ${metrics.comments}`
        : "No metrics yet";
      const nextTest = post.nextTest ? `<small>Next: ${escapeHtml(post.nextTest)}</small>` : "";

      return `<button type="button" class="history-item" onclick="loadPost('${post.id}')">
        <span>${title}</span>
        <small>${postedAt} / ${post.preset} / ${detail}</small>
        ${nextTest}
      </button>`;
    })
    .join("");
}

function extractNextTest(text) {
  const match = text.match(/next(?:\s+post)?(?:\s+to)?\s+test[:\-\s]+(.+)/i);
  return match ? match[1].trim().slice(0, 140) : "";
}

function firstLine(text) {
  return text.split(/\r?\n/).find(Boolean)?.slice(0, 90) || "Untitled post";
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[character];
  });
}

function loadPost(id) {
  const post = getPosts().find((item) => item.id === id);

  if (!post) {
    return;
  }

  document.getElementById("input").value = post.input || "";
  document.getElementById("prompt").innerText = post.prompt || buildPrompt(post.mode || activeMode);
  output(post.content);
  document.getElementById("preset").value = post.preset || "system";
  setBrief(post.brief || {});
  setActiveMode(post.mode || "content");
  localStorage.setItem(lastPostKey, JSON.stringify(post));
  document.getElementById("postStatus").innerText = "Loaded saved post";

  if (post.metrics) {
    Object.entries(post.metrics).forEach(([key, value]) => {
      const input = document.getElementById(key);

      if (input) {
        input.value = value || "";
      }
    });
  } else {
    Object.keys(readMetrics()).forEach((key) => {
      document.getElementById(key).value = "";
    });
  }

  updateSignalScore();
}

async function exportHistory() {
  await copyText(JSON.stringify(getPosts(), null, 2), document.getElementById("history"));
}

function setBrief(brief) {
  briefFields.forEach((field) => {
    const input = document.getElementById(field);

    if (input) {
      input.value = brief[field] || "";
    }
  });
}

function getNextQueue() {
  try {
    const items = JSON.parse(localStorage.getItem(queueKey) || "[]");
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function saveNextQueue(items) {
  localStorage.setItem(queueKey, JSON.stringify(items.slice(0, 30)));
}

function queueNextTest(text, sourcePostId) {
  if (!text) {
    return;
  }

  const items = getNextQueue();

  if (items.some((item) => item.text === text && !item.done)) {
    return;
  }

  items.unshift({
    id: createId(),
    text,
    sourcePostId,
    createdAt: new Date().toISOString(),
    done: false
  });

  saveNextQueue(items);
}

function addManualNextTest() {
  const text = document.getElementById("output").innerText.trim();

  if (!text || text === "Running...") {
    return;
  }

  queueNextTest(firstLine(text), null);
  renderNextQueue();
}

function renderNextQueue() {
  const queue = document.getElementById("nextQueue");
  const items = getNextQueue();

  if (!items.length) {
    queue.innerText = "No next tests yet.";
    return;
  }

  queue.innerHTML = items
    .slice(0, 8)
    .map((item) => {
      const className = item.done ? "history-item is-done" : "history-item";
      const status = item.done ? "Done" : "Planned";

      return `<button type="button" class="${className}" onclick="loadNextTest('${item.id}')">
        <span>${escapeHtml(item.text)}</span>
        <small>${status} / click to turn into input</small>
      </button>`;
    })
    .join("");
}

function loadNextTest(id) {
  const items = getNextQueue();
  const item = items.find((candidate) => candidate.id === id);

  if (!item) {
    return;
  }

  document.getElementById("input").value = item.text;
  setActiveMode("content");
  document.getElementById("prompt").innerText = buildPrompt("content");
  item.done = true;
  saveNextQueue(items);
  renderNextQueue();
}

async function analyzeWinnerPatterns() {
  const previousMode = activeMode;
  const winners = getPosts()
    .filter((post) => post.metrics)
    .sort((a, b) => (b.signalScore || 0) - (a.signalScore || 0))
    .slice(0, 5);

  if (!winners.length) {
    document.getElementById("patterns").innerText = "Save posts with metrics first.";
    return;
  }

  const input = winners
    .map((post, index) => {
      const metrics = post.metrics;
      const brief = post.brief || {};

      return `Post ${index + 1}
Signal score: ${post.signalScore || 0}
Pillar: ${brief.pillar || "unknown"}
Format: ${brief.format || post.mode}
Hypothesis: ${brief.hypothesis || "unknown"}
Metrics: reach ${metrics.reach}, saves ${metrics.saves}, shares ${metrics.shares}, comments ${metrics.comments}, follows ${metrics.follows}
Content:
${post.content}`;
    })
    .join("\n\n---\n\n");

  const analysis = await run("patterns", input);
  document.getElementById("patterns").innerText = analysis;
  setActiveMode(previousMode);
}

document.getElementById("input").addEventListener("input", () => {
  document.getElementById("prompt").innerText = buildPrompt(activeMode);
});

document.getElementById("preset").addEventListener("change", () => {
  document.getElementById("prompt").innerText = buildPrompt(activeMode);
});

briefFields.forEach((field) => {
  document.getElementById(field).addEventListener("input", () => {
    document.getElementById("prompt").innerText = buildPrompt(activeMode);
  });
});

Object.keys(readMetrics()).forEach((field) => {
  document.getElementById(field).addEventListener("input", updateSignalScore);
});

setActiveMode(activeMode);
document.getElementById("prompt").innerText = buildPrompt(activeMode);
renderHistory();
renderNextQueue();
updateSignalScore();
