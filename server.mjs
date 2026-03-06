import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const PORT = process.env.PORT || 3000;
const DIST = join(import.meta.dirname, "dist");
const DATA = join(import.meta.dirname, "data");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
};

const indexHtml = readFileSync(join(DIST, "index.html"));

/**
 * Map an API request path + query to a pre-computed JSON file in data/.
 * Returns the file path if found, null otherwise.
 */
function resolveApiData(urlPath, query) {
  // Strip /api/ prefix
  const route = urlPath.replace(/^\/api\//, "");

  // Direct file match (e.g. earnings/impact-summary → data/earnings/impact-summary.json)
  const direct = join(DATA, route + ".json");
  if (existsSync(direct)) return direct;

  // Parameterized routes — map query params to file variants
  const params = new URLSearchParams(query);

  if (route === "earnings/price-journey") {
    const moveSize = params.get("move_size") || "all";
    const file = join(DATA, `earnings/price-journey--${moveSize}.json`);
    if (existsSync(file)) return file;
  }

  if (route === "earnings/sector-breakdown") {
    const days = params.get("days") || "365";
    const file = join(DATA, `earnings/sector-breakdown--${days}.json`);
    if (existsSync(file)) return file;
  }

  if (route === "earnings/forward-look") {
    const months = params.get("months") || "3";
    const file = join(DATA, `earnings/forward-look--${months}.json`);
    if (existsSync(file)) return file;
  }

  if (route === "earnings/events") {
    const page = params.get("page") || "1";
    const file = join(DATA, `earnings/events--page-${page}.json`);
    if (existsSync(file)) return file;
  }

  if (route === "earnings/this-week") {
    const file = join(DATA, "earnings/this-week.json");
    if (existsSync(file)) return file;
  }

  return null;
}

const server = createServer((req, res) => {
  // Health check
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end('{"status":"ok"}');
    return;
  }

  const [urlPath, queryString] = (req.url || "/").split("?");

  // API routes — serve pre-computed JSON data
  if (urlPath.startsWith("/api/")) {
    const dataFile = resolveApiData(urlPath, queryString || "");
    if (dataFile) {
      const json = readFileSync(dataFile);
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(json);
      return;
    }

    // API health
    if (urlPath === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"status":"ok"}');
      return;
    }

    // Unknown API route
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end('{"error":"not found"}');
    return;
  }

  // Try to serve static file
  const filePath = join(DIST, urlPath);

  if (urlPath !== "/" && existsSync(filePath) && statSync(filePath).isFile()) {
    const ext = extname(filePath);
    const contentType = MIME[ext] || "application/octet-stream";
    const file = readFileSync(filePath);

    const headers = { "Content-Type": contentType };
    // Cache hashed assets for 1 year
    if (urlPath.includes("/assets/")) {
      headers["Cache-Control"] = "public, max-age=31536000, immutable";
    }

    res.writeHead(200, headers);
    res.end(file);
    return;
  }

  // SPA fallback — serve index.html
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(indexHtml);
});

server.listen(PORT, () => {
  console.log(`PeakDipVibe server listening on port ${PORT}`);
});
