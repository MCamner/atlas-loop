import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

await loadLocalEnv();

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8787);
const DOCS_DIR = new URL("./docs/", import.meta.url).pathname;
const MODEL = process.env.OPENAI_MODEL || "gpt-5.5";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

async function loadLocalEnv() {
  try {
    const envPath = new URL("./.env", import.meta.url);
    const content = await readFile(envPath, "utf8");

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const equalsIndex = trimmed.indexOf("=");

      if (equalsIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, equalsIndex).trim();
      const value = trimmed.slice(equalsIndex + 1).trim().replace(/^["']|["']$/g, "");

      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // A local .env file is optional.
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function readRequestBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function runPrompt(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    sendJson(res, 500, { error: "Missing OPENAI_API_KEY." });
    return;
  }

  let payload;

  try {
    payload = JSON.parse(await readRequestBody(req));
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body." });
    return;
  }

  if (!payload.prompt || typeof payload.prompt !== "string") {
    sendJson(res, 400, { error: "Missing prompt." });
    return;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        instructions: "You are atlas-loop: practical, direct, concise, and focused on content iteration.",
        input: payload.prompt
      })
    });

    const data = await response.json();

    if (!response.ok) {
      sendJson(res, response.status, { error: data.error?.message || "OpenAI API request failed." });
      return;
    }

    sendJson(res, 200, { output: data.output_text || "" });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Engine request failed." });
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const normalizedPath = normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(DOCS_DIR, normalizedPath);

  if (!filePath.startsWith(DOCS_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const content = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream"
    });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/run") {
    await runPrompt(req, res);
    return;
  }

  if (req.method === "GET") {
    await serveStatic(req, res);
    return;
  }

  res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Method not allowed");
}).listen(PORT, HOST, () => {
  console.log(`atlas-loop engine running at http://${HOST}:${PORT}`);
});
