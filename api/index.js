const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

let appPromise;

module.exports = async function handler(req, res) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    console.error("KALPAVRUKSHA_API_BOOT_FAILED", error);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({
      success: false,
      message: "API startup failed",
      data: null,
      error: {
        code: "API_BOOT_FAILED",
        details
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers["x-request-id"] || "vercel-startup"
      }
    }));
  }
};

async function getApp() {
  if (!appPromise) {
    appPromise = import(pathToFileURL(join(__dirname, "../server/dist/src/app.js")).href)
      .then((module) => module.createApp());
  }
  return appPromise;
}
