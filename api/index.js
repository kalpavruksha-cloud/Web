const { randomUUID } = require("node:crypto");

const DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz4IMhPb_XqCFPBorxEBTgKsREaFOQaEmoKgBgedtIsfUHiXe4BbU91Yl6dy1P5oSMr/exec";
const DEFAULT_SPREADSHEET_ID = "19q6x5HPTrgcbH18wg2I1VoCrUdKLW98MFiQPO0ErPbI";
const DEPLOYMENT_MARKER = "vercel-native-api-env-fallback-2026-07-27-v2";

let jwtModulePromise;

module.exports = async function handler(req, res) {
  const requestId = String(req.headers["x-request-id"] || randomUUID());

  try {
    applyCors(req, res);
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    const env = getEnv();
    const path = getApiPath(req.url || "/");

    if (path === "/system/health" && req.method === "GET") {
      const data = await health(env, requestId);
      send(res, data.appsScriptCapability === "ready" && env.valid ? 200 : 503, ok({ ...data, configuration: { valid: env.valid, error: env.error } }, "System health checked", requestId));
      return;
    }

    if (path === "/system/startup" && req.method === "GET") {
      const healthData = await health(env, requestId);
      const data = {
        backend: {
          running: true,
          url: `${env.clientUrl}/api`,
          configuration: { valid: env.valid, error: env.error }
        },
        frontend: {
          running: true,
          url: env.clientUrl,
          status: 200,
          responseTimeMs: 0
        },
        appsScript: {
          reachable: healthData.appsScriptConnectivity === "reachable",
          capability: healthData.appsScriptCapability,
          urlConfigured: Boolean(env.appsScriptUrl),
          responseTimeMs: healthData.responseTimeMs,
          upstreamError: healthData.upstream.error
        },
        spreadsheet: {
          id: env.spreadsheetId,
          reachable: healthData.spreadsheetConnectivity === "verified_by_apps_script",
          status: healthData.spreadsheetConnectivity,
          requiredSheetAvailability: healthData.requiredSheetAvailability,
          authenticationReadiness: healthData.authenticationReadiness
        }
      };
      const complete = env.valid && data.appsScript.reachable && data.spreadsheet.reachable;
      send(res, complete ? 200 : 503, ok(data, "Startup health checked", requestId));
      return;
    }

    if (path === "/auth/login" && req.method === "POST") {
      const body = await readJson(req);
      if (!body.identifier || !body.password) {
        send(res, 400, fail("VALIDATION_ERROR", "Client ID/email and password are required", "Invalid request", requestId));
        return;
      }
      const upstream = await callAppsScript(env, "login", {
        identifier: body.identifier,
        password: body.password,
        expectedRole: body.expectedRole
      }, requestId, "GET");

      if (!upstream.success || !upstream.data || !upstream.data.user) {
        send(res, 401, fail(upstream.error?.code || "LOGIN_FAILED", upstream.error?.details || "Invalid credentials", "Login failed", requestId));
        return;
      }

      const user = normalizeUser(upstream.data.user);
      if (body.expectedRole && user.role !== body.expectedRole) {
        send(res, 403, fail("WRONG_PORTAL_ROLE", body.expectedRole === "admin" ? "Use an admin account with Role = admin." : "Use a client account.", "Login failed", requestId));
        return;
      }
      if (user.status !== "active") {
        send(res, 403, fail("ACCOUNT_INACTIVE", "Your account is not active. Please contact support.", "Account inactive", requestId));
        return;
      }

      const token = await signJwt(user, env, Boolean(body.remember));
      setCookie(res, "session", token, Boolean(body.remember), env.production);
      send(res, 200, ok({ user }, "Login successful", requestId));
      return;
    }

    if (path === "/auth/register" && req.method === "POST") {
      const body = await readJson(req);
      const upstream = await callAppsScript(env, "registerClient", body, requestId, "POST");
      send(res, upstream.success ? 201 : 400, upstream);
      return;
    }

    if (path === "/auth/logout" && req.method === "POST") {
      clearCookie(res, "session", env.production);
      send(res, 200, ok({ loggedOut: true }, "Logged out", requestId));
      return;
    }

    if (path === "/auth/session" && req.method === "GET") {
      const user = await authenticate(req, env);
      if (!user) {
        send(res, 401, fail("UNAUTHORIZED", "Please sign in to continue", "Unauthorized", requestId));
        return;
      }
      send(res, 200, ok({ user }, "Session active", requestId));
      return;
    }

    const user = await authenticate(req, env);
    if (!user) {
      send(res, 401, fail("UNAUTHORIZED", "Please sign in to continue", "Unauthorized", requestId));
      return;
    }

    const proxied = await proxyRoute(req, path, user, env, requestId);
    send(res, proxied.status, proxied.body);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    console.error("KALPAVRUKSHA_API_ERROR", error);
    send(res, 500, fail("SERVER_ERROR", details, "Operation failed", requestId));
  }
};

async function proxyRoute(req, path, user, env, requestId) {
  const body = ["POST", "PUT", "DELETE"].includes(req.method) ? await readJson(req) : {};
  const query = Object.fromEntries(new URL(req.url || "/", "https://portal.local").searchParams.entries());
  const method = req.method === "GET" ? "GET" : "POST";

  const clientRoutes = [
    ["GET", /^\/client\/dashboard$/, "getClientDashboard"],
    ["GET", /^\/client\/account-overview$/, "getAccountOverview"],
    ["GET", /^\/client\/bank-details$/, "getBankDetails"],
    ["PUT", /^\/client\/bank-details$/, "updateBankDetails"],
    ["POST", /^\/client\/bank-change-requests$/, "createBankChangeRequest"],
    ["GET", /^\/client\/transactions$/, "getTransactions"],
    ["GET", /^\/client\/investment-plans$/, "getInvestmentPlans"],
    ["GET", /^\/client\/investment-requests$/, "getInvestmentRequests"],
    ["POST", /^\/client\/investment-requests$/, "createInvestmentRequest"],
    ["GET", /^\/client\/withdrawals$/, "getWithdrawals"],
    ["POST", /^\/client\/withdrawals$/, "createWithdrawal"],
    ["PUT", /^\/client\/withdrawals\/([^/]+)\/cancel$/, "cancelWithdrawal"],
    ["GET", /^\/client\/agreements$/, "getClientAgreements"],
    ["POST", /^\/client\/agreements\/([^/]+)\/upload-signed$/, "uploadSignedAgreement"],
    ["GET", /^\/client\/documents$/, "getClientDocuments"],
    ["POST", /^\/client\/documents\/upload$/, "uploadClientDocument"],
    ["PUT", /^\/client\/documents\/([^/]+)\/replace$/, "replaceClientDocument"],
    ["DELETE", /^\/client\/documents\/([^/]+)$/, "archiveClientDocument"],
    ["GET", /^\/client\/referrals$/, "getReferrals"],
    ["GET", /^\/client\/profile$/, "getProfile"],
    ["PUT", /^\/client\/profile$/, "updateProfile"],
    ["POST", /^\/client\/profile\/photo$/, "uploadProfilePhoto"],
    ["DELETE", /^\/client\/profile\/photo$/, "removeProfilePhoto"],
    ["GET", /^\/client\/faqs$/, "getFaqs"],
    ["GET", /^\/client\/support$/, "getSupportRequests"],
    ["GET", /^\/client\/support\/([^/]+)$/, "getSupportRequests"],
    ["POST", /^\/client\/support$/, "createSupportRequest"],
    ["GET", /^\/client\/settings$/, "getClientPreferences"],
    ["PUT", /^\/client\/settings$/, "updateClientPreferences"]
  ];

  for (const [verb, pattern, action] of clientRoutes) {
    const match = path.match(pattern);
    if (verb === req.method && match) {
      if (user.role !== "client") return { status: 403, body: fail("FORBIDDEN", "Use a client account for this page", "Permission denied", requestId) };
      const upstream = await callAppsScript(env, action, clientPayload(user, { ...query, ...body, id: match[1] }), requestId, method);
      return { status: upstream.success ? successStatus(req.method) : 502, body: upstream };
    }
  }

  if (path === "/dashboard" && req.method === "GET") {
    const upstream = await callAppsScript(env, "dashboard", { role: user.role, clientId: user.clientId }, requestId, "GET");
    return { status: upstream.success ? 200 : 502, body: upstream };
  }

  if (path === "/profile" && req.method === "GET") {
    const upstream = await callAppsScript(env, "getProfile", scopePayload(user, query), requestId, "GET");
    return { status: upstream.success ? 200 : 502, body: upstream };
  }

  if (path === "/profile" && req.method === "PUT") {
    const upstream = await callAppsScript(env, "updateProfile", scopePayload(user, body), requestId, "POST");
    return { status: upstream.success ? 200 : 502, body: upstream };
  }

  if (path === "/settings" && req.method === "GET") {
    const upstream = await callAppsScript(env, "getSettings", query, requestId, "GET");
    return { status: upstream.success ? 200 : 502, body: upstream };
  }

  if (path === "/admin/spreadsheet-schema" && req.method === "GET") {
    if (user.role !== "admin") return { status: 403, body: fail("FORBIDDEN", "You do not have permission to perform this action", "Permission denied", requestId) };
    const upstream = await callAppsScript(env, "schema", { role: "admin", actorId: user.id }, requestId, "GET");
    return { status: upstream.success ? 200 : 502, body: upstream };
  }

  const moduleRoute = matchModuleRoute(path, req.method);
  if (moduleRoute) {
    if (moduleRoute.adminOnly && user.role !== "admin") return { status: 403, body: fail("FORBIDDEN", "You do not have permission to perform this action", "Permission denied", requestId) };
    const payload = scopePayload(user, { ...query, ...body, ...(moduleRoute.id ? { id: moduleRoute.id } : {}) });
    const upstream = await callAppsScript(env, moduleRoute.action, payload, requestId, req.method === "GET" ? "GET" : "POST");
    return { status: upstream.success ? successStatus(req.method) : 502, body: upstream };
  }

  return { status: 404, body: fail("NOT_FOUND", `${req.method} ${path} was not found`, "Not found", requestId) };
}

function matchModuleRoute(path, method) {
  const configs = {
    clients: { list: "getClients", get: "getClient", create: "createClient", update: "updateClient", adminOnly: true },
    investments: { list: "getInvestments", get: "getInvestment", create: "createInvestment", update: "updateInvestment" },
    transactions: { list: "getTransactions", get: "getTransaction", create: "createTransaction", adminOnlyCreate: true },
    withdrawals: { list: "getWithdrawals", create: "createWithdrawal" },
    referrals: { list: "getReferrals", create: "createReferral", update: "updateReferral" },
    documents: { list: "getDocuments", create: "createDocument", delete: "deleteDocument", adminOnlyCreate: true },
    notifications: { list: "getNotifications", create: "createNotification", update: "markNotificationRead", adminOnlyCreate: true },
    reports: { list: "getReports" }
  };

  const special = [
    ["PUT", /^\/withdrawals\/([^/]+)\/approve$/, "approveWithdrawal", true],
    ["PUT", /^\/withdrawals\/([^/]+)\/reject$/, "rejectWithdrawal", true],
    ["PUT", /^\/withdrawals\/([^/]+)\/paid$/, "markWithdrawalPaid", true],
    ["PUT", /^\/notifications\/read-all$/, "markAllNotificationsRead", false]
  ];
  for (const [verb, pattern, action, adminOnly] of special) {
    const match = path.match(pattern);
    if (verb === method && match) return { action, id: match[1], adminOnly };
  }

  const reportMatch = path.match(/^\/reports\/([^/]+)$/);
  if (method === "GET" && reportMatch) return { action: "getReports", id: undefined, adminOnly: false };

  const match = path.match(/^\/([^/]+)(?:\/([^/]+))?$/);
  if (!match) return null;
  const config = configs[match[1]];
  if (!config) return null;

  if (method === "GET" && !match[2]) return { action: config.list, adminOnly: Boolean(config.adminOnly) };
  if (method === "GET" && match[2] && config.get) return { action: config.get, id: match[2], adminOnly: Boolean(config.adminOnly) };
  if (method === "POST" && config.create) return { action: config.create, adminOnly: Boolean(config.adminOnly || config.adminOnlyCreate) };
  if (method === "PUT" && match[2] && config.update) return { action: config.update, id: match[2], adminOnly: Boolean(config.adminOnly) };
  if (method === "DELETE" && match[2] && config.delete) return { action: config.delete, id: match[2], adminOnly: true };
  return null;
}

async function health(env, requestId) {
  const started = Date.now();
  const upstream = env.valid
    ? await callAppsScript(env, "health", {}, requestId, "GET")
    : fail("INVALID_ENVIRONMENT", env.error || "Invalid environment configuration", "Operation failed", requestId);

  return {
    backend: "ok",
    deploymentMarker: DEPLOYMENT_MARKER,
    environmentDiagnostics: environmentDiagnostics(),
    appsScriptConnectivity: upstream.success || upstream.error?.code !== "APPS_SCRIPT_UNAVAILABLE" ? "reachable" : "unreachable",
    appsScriptCapability: upstream.success ? "ready" : "missing_required_action",
    spreadsheetConnectivity: upstream.success ? "verified_by_apps_script" : "not_verified",
    requiredSheetAvailability: upstream.success ? upstream.data?.requiredSheetAvailability ?? "unknown" : "not_verified",
    authenticationReadiness: upstream.success ? upstream.data?.authenticationReadiness ?? "unknown" : "not_verified",
    responseTimeMs: Date.now() - started,
    upstream
  };
}

async function callAppsScript(env, action, body, requestId, method = "POST") {
  if (!env.appsScriptUrl || !env.spreadsheetId) {
    return fail("INVALID_ENVIRONMENT", "APPS_SCRIPT_URL and SPREADSHEET_ID are required", "Operation failed", requestId);
  }

  const payload = { action, spreadsheetId: env.spreadsheetId, requestId, ...(body || {}) };
  const url = new URL(env.appsScriptUrl);
  const init = {
    method,
    headers: { "Content-Type": "application/json", "X-Request-ID": requestId },
    signal: AbortSignal.timeout(env.timeoutMs)
  };

  if (method === "GET") {
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    });
  } else {
    init.body = JSON.stringify(payload);
    url.searchParams.set("action", action);
  }

  try {
    const response = await fetch(url, init);
    const text = await response.text();
    try {
      const parsed = JSON.parse(text);
      return typeof parsed.success === "boolean"
        ? parsed
        : fail("INVALID_APPS_SCRIPT_RESPONSE", "Apps Script returned JSON without a success flag", "Operation failed", requestId);
    } catch {
      return fail("INVALID_APPS_SCRIPT_RESPONSE", `Apps Script did not return valid JSON. HTTP ${response.status}; body: ${stripTags(text).slice(0, 800)}`, "Operation failed", requestId);
    }
  } catch (error) {
    return fail("APPS_SCRIPT_UNAVAILABLE", error instanceof Error ? error.message : "Unable to reach Apps Script", "Apps Script unavailable", requestId);
  }
}

async function authenticate(req, env) {
  const token = parseCookies(req.headers.cookie || "").session || parseBearer(req.headers.authorization);
  if (!token) return null;
  try {
    const jwt = await loadJwt();
    return normalizeUser(jwt.verify(token, env.jwtSecret));
  } catch {
    return null;
  }
}

async function signJwt(user, env, remember) {
  if (!env.jwtSecret || env.jwtSecret.length < 32) throw new Error("JWT_SECRET must be at least 32 characters");
  const jwt = await loadJwt();
  return jwt.sign(user, env.jwtSecret, { expiresIn: remember ? "30d" : env.jwtExpiresIn });
}

function loadJwt() {
  if (!jwtModulePromise) jwtModulePromise = Promise.resolve().then(() => require("jsonwebtoken"));
  return jwtModulePromise;
}

function getApiPath(rawUrl) {
  const url = new URL(rawUrl, "https://portal.local");
  return url.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
}

function getEnv() {
  const nodeEnv = normalizeNodeEnv(process.env.NODE_ENV);
  const clientUrl = firstEnv("CLIENT_URL", "FRONTEND_URL", "SITE_URL") || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:5173");
  const env = {
    production: nodeEnv === "production",
    nodeEnv,
    clientUrl,
    appsScriptUrl: firstEnv("APPS_SCRIPT_URL", "GOOGLE_APPS_SCRIPT_URL", "APPS_SCRIPT_WEB_APP_URL") || DEFAULT_APPS_SCRIPT_URL,
    spreadsheetId: firstEnv("SPREADSHEET_ID", "GOOGLE_SPREADSHEET_ID", "SHEET_ID") || DEFAULT_SPREADSHEET_ID,
    jwtSecret: firstEnv("JWT_SECRET", "PORTAL_JWT_SECRET", "KALPAVRUKSHA_JWT_SECRET", "AUTH_SECRET", "VERCEL_JWT_SECRET") || firstSecretLikeEnv(),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
    timeoutMs: Number(process.env.APPS_SCRIPT_TIMEOUT_MS || 15000),
    corsOrigins: unique([
      ...String(process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:3000").split(",").map((item) => item.trim()).filter(Boolean),
      clientUrl,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""
    ]),
    valid: true,
    error: null
  };

  const errors = [];
  if (!isUrl(env.appsScriptUrl)) errors.push("APPS_SCRIPT_URL must be a valid URL");
  if (env.spreadsheetId.length < 10) errors.push("SPREADSHEET_ID is required");
  if (env.jwtSecret.length < 32) errors.push("JWT_SECRET must be at least 32 characters");
  if (!isUrl(env.clientUrl)) errors.push("CLIENT_URL must be a valid URL");
  if (errors.length) {
    env.valid = false;
    env.error = errors.join("; ");
  }
  return env;
}

function environmentDiagnostics() {
  const names = ["JWT_SECRET", "PORTAL_JWT_SECRET", "KALPAVRUKSHA_JWT_SECRET", "AUTH_SECRET", "VERCEL_JWT_SECRET"];
  return {
    runtime: process.version,
    vercel: Boolean(process.env.VERCEL),
    vercelEnv: process.env.VERCEL_ENV || null,
    vercelUrlPresent: Boolean(process.env.VERCEL_URL),
    secretLikeEnvironmentKeys: Object.keys(process.env)
      .filter((name) => /JWT|SECRET|AUTH/i.test(name))
      .sort()
      .map((name) => {
        const raw = process.env[name] || "";
        return {
          name,
          rawLength: raw.length,
          trimmedLength: stripWrappingQuotes(raw.trim()).length
        };
      }),
    jwtCandidates: names.map((name) => {
      const raw = process.env[name];
      const stripped = raw ? stripWrappingQuotes(raw.trim()) : "";
      return {
        name,
        present: Boolean(raw),
        rawLength: raw ? raw.length : 0,
        trimmedLength: stripped.length
      };
    })
  };
}

function firstEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return stripWrappingQuotes(value.trim());
  }
  return "";
}

function stripWrappingQuotes(value) {
  return value.replace(/^["']|["']$/g, "");
}

function firstSecretLikeEnv() {
  const key = Object.keys(process.env)
    .filter((name) => /JWT|SECRET|AUTH/i.test(name))
    .find((name) => stripWrappingQuotes(String(process.env[name] || "").trim()).length >= 32);
  return key ? stripWrappingQuotes(String(process.env[key] || "").trim()) : "";
}

function applyCors(req, res) {
  const env = getEnv();
  const origin = req.headers.origin;
  if (!origin || env.corsOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || env.clientUrl);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
}

function scopePayload(user, payload) {
  if (user.role === "admin") return { ...payload, role: "admin", actorId: user.id };
  return { ...payload, role: "client", actorId: user.id, clientId: user.clientId };
}

function clientPayload(user, payload) {
  return { ...payload, role: "client", actorId: user.id, clientId: user.clientId };
}

function normalizeUser(user) {
  return {
    ...user,
    id: String(user.id || user.userId || user.clientId || user.email || ""),
    clientId: user.clientId ? String(user.clientId).toUpperCase() : undefined,
    role: String(user.role || "client").toLowerCase() === "admin" ? "admin" : "client",
    status: String(user.status || "active").toLowerCase()
  };
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function ok(data, message, requestId) {
  return { success: true, message, data, error: null, meta: { timestamp: new Date().toISOString(), requestId } };
}

function fail(code, details, message, requestId) {
  return { success: false, message, data: null, error: { code, details }, meta: { timestamp: new Date().toISOString(), requestId } };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text) resolve({});
      else {
        try {
          resolve(JSON.parse(text));
        } catch {
          reject(new Error("Invalid JSON request body"));
        }
      }
    });
    req.on("error", reject);
  });
}

function setCookie(res, name, value, remember, production) {
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8;
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", `Max-Age=${maxAge}`, production ? "Secure" : "", production ? "SameSite=None" : "SameSite=Lax"];
  res.setHeader("Set-Cookie", parts.filter(Boolean).join("; "));
}

function clearCookie(res, name, production) {
  const parts = [`${name}=`, "Path=/", "HttpOnly", "Max-Age=0", production ? "Secure" : "", production ? "SameSite=None" : "SameSite=Lax"];
  res.setHeader("Set-Cookie", parts.filter(Boolean).join("; "));
}

function parseCookies(cookieHeader) {
  return Object.fromEntries(String(cookieHeader).split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
  }));
}

function parseBearer(value) {
  return value && value.startsWith("Bearer ") ? value.slice("Bearer ".length) : undefined;
}

function successStatus(method) {
  return method === "POST" ? 201 : 200;
}

function normalizeNodeEnv(value) {
  const normalized = String(value || (process.env.VERCEL ? "production" : "development")).toLowerCase();
  return ["development", "test", "production"].includes(normalized) ? normalized : "production";
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function isUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function stripTags(value) {
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
