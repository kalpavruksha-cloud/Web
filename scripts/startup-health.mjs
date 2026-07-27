import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...readEnv(resolve(root, ".env")), ...process.env };
const apiBase = env.VITE_API_BASE_URL || "http://localhost:8080/api";
const frontendUrl = env.CLIENT_URL || "http://localhost:5173";

const checks = {
  backend: await check(`${apiBase}/system/health`),
  startup: await check(`${apiBase}/system/startup`),
  frontend: await check(frontendUrl)
};

console.log(JSON.stringify(checks, null, 2));

if (!checks.backend.ok || !checks.frontend.ok) {
  process.exit(1);
}

async function check(url) {
  const started = Date.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      url,
      responseTimeMs: Date.now() - started,
      body: parseBody(text)
    };
  } catch (error) {
    return {
      ok: false,
      url,
      responseTimeMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function parseBody(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text.slice(0, 300);
  }
}

function readEnv(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}
