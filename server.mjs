import { createServer } from "node:http";
import { request as httpsRequest } from "node:https";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const PORT = process.env.PORT || 3000;
const DIST = join(import.meta.dirname, "dist");
const DATA = join(import.meta.dirname, "data");

// Upstream API proxy (public HTTPS endpoint on soc-api via Tailscale Funnel)
const UPSTREAM_HOST = "soc-api.tailad2d5f.ts.net";
const UPSTREAM_PREFIX = "/stock-api";

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
  const params = new URLSearchParams(query);

  // --- Earnings ---
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

  // --- Market ---
  if (route === "market/upcoming-earnings") {
    const limit = params.get("limit") || "8";
    const file = join(DATA, `market/upcoming-earnings--${limit}.json`);
    if (existsSync(file)) return file;
  }

  // --- Signals ---
  if (route === "signals/patterns") {
    const days = params.get("days") || "14";
    const sortBy = params.get("sort_by");
    const limit = params.get("limit");
    // Check for specific combo file first (e.g., patterns--14-signal_strength-30)
    if (sortBy && limit) {
      const combo = join(DATA, `signals/patterns--${days}-${sortBy}-${limit}.json`);
      if (existsSync(combo)) return combo;
    }
    const file = join(DATA, `signals/patterns--${days}.json`);
    if (existsSync(file)) return file;
  }

  if (route === "signals/patterns/stats") {
    const days = params.get("days") || "14";
    const file = join(DATA, `signals/stats--${days}.json`);
    if (existsSync(file)) return file;
  }

  // --- Screener ---
  if (route === "screener") {
    const sortBy = params.get("sort_by");
    const sortDir = params.get("sort_dir");
    const exchange = params.get("exchange");
    // Exchange-filtered requests always go to upstream (no pre-cached files)
    if (exchange) return null;
    if (sortBy) {
      const file = join(DATA, `screener/${sortBy}-${sortDir || "desc"}.json`);
      if (existsSync(file)) return file;
    }
    const file = join(DATA, "screener/default.json");
    if (existsSync(file)) return file;
  }

  // --- Direct file match (e.g. earnings/this-week, earnings/impact-summary,
  //     market/overview, market/breadth, market/sectors, status, tickers) ---
  const direct = join(DATA, route + ".json");
  if (existsSync(direct)) return direct;

  return null;
}

/**
 * Proxy an API request to the upstream R730 stock API via soc-api Tailscale Funnel.
 */
function proxyToUpstream(req, res, urlPath, queryString) {
  const upstreamPath = UPSTREAM_PREFIX + urlPath + (queryString ? "?" + queryString : "");

  const proxyReq = httpsRequest(
    {
      hostname: UPSTREAM_HOST,
      port: 443,
      path: upstreamPath,
      method: req.method,
      headers: {
        accept: "application/json",
        "user-agent": "PeakDipVibe-Server/1.0",
      },
      timeout: 15000,
    },
    (proxyRes) => {
      const headers = {
        "Content-Type": proxyRes.headers["content-type"] || "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60",
      };
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", (err) => {
    console.error(`Proxy error: ${err.message}`);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "upstream unavailable", detail: err.message }));
  });

  proxyReq.on("timeout", () => {
    proxyReq.destroy();
    res.writeHead(504, { "Content-Type": "application/json" });
    res.end('{"error":"upstream timeout"}');
  });

  // For GET requests, just end the proxy request (no body to forward)
  proxyReq.end();
}

const server = createServer((req, res) => {
  // Health check
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end('{"status":"ok"}');
    return;
  }

  const [urlPath, queryString] = (req.url || "/").split("?");

  // CORS preflight
  if (req.method === "OPTIONS" && urlPath.startsWith("/api/")) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    });
    res.end();
    return;
  }

  // API routes — serve pre-computed JSON data, fallback to upstream proxy
  if (urlPath.startsWith("/api/")) {
    // API health shortcut
    if (urlPath === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"status":"ok"}');
      return;
    }

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

    // No cached data — proxy to upstream API
    proxyToUpstream(req, res, urlPath, queryString || "");
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
  console.log(`Upstream proxy: https://${UPSTREAM_HOST}${UPSTREAM_PREFIX}`);
});
