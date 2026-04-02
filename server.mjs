import { createServer, get as httpGet } from "node:http";
import { request as httpsRequest, get as httpsGet } from "node:https";
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const PORT = process.env.PORT || 3000;
const DIST = join(import.meta.dirname, "dist");
const DATA = join(import.meta.dirname, "data");

// Upstream API proxy (public HTTPS endpoint on R730 via Tailscale Funnel)
const UPSTREAM_HOST = "r730.tailad2d5f.ts.net";
const UPSTREAM_PREFIX = "/stock-api";

// Request queue to limit concurrent upstream connections (Tailscale Funnel bottleneck)
const MAX_CONCURRENT = 4;
let activeRequests = 0;
const pendingQueue = [];

function enqueueProxy(req, res, urlPath, queryString) {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests++;
    proxyToUpstream(req, res, urlPath, queryString, 1, () => {
      activeRequests--;
      if (pendingQueue.length > 0) {
        const next = pendingQueue.shift();
        activeRequests++;
        proxyToUpstream(next.req, next.res, next.urlPath, next.queryString, 1, () => {
          activeRequests--;
          // Drain queue recursively
          if (pendingQueue.length > 0) {
            const n = pendingQueue.shift();
            activeRequests++;
            proxyToUpstream(n.req, n.res, n.urlPath, n.queryString, 1, () => { activeRequests--; drainQueue(); });
          }
        });
      }
    });
  } else {
    pendingQueue.push({ req, res, urlPath, queryString });
  }
}

function drainQueue() {
  while (pendingQueue.length > 0 && activeRequests < MAX_CONCURRENT) {
    const next = pendingQueue.shift();
    activeRequests++;
    proxyToUpstream(next.req, next.res, next.urlPath, next.queryString, 1, () => { activeRequests--; drainQueue(); });
  }
}

function fetchJSON(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const getter = url.startsWith("https") ? httpsGet : httpGet;
    const req = getter(url, { timeout: timeoutMs, headers: { "User-Agent": "PeakDipVibe/1.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchJSON(res.headers.location, timeoutMs).then(resolve, reject);
        return;
      }
      if (res.statusCode >= 400) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

// ─── Yahoo Finance ETF-based breadth fallback ───
const SECTOR_ETFS = [
  "XLB", "XLC", "XLE", "XLF", "XLI", "XLK", "XLP", "XLRE", "XLU", "XLV", "XLY"
];
const BROAD_ETFS = ["SPY", "RSP"];
const ALL_ETFS = [...SECTOR_ETFS, ...BROAD_ETFS];

async function fetchYahooBreadth() {
  const results = await Promise.allSettled(
    ALL_ETFS.map(async (ticker) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=5d&interval=1d&includePrePost=false`;
      const data = await fetchJSON(url);
      const result = data?.chart?.result?.[0];
      if (!result) throw new Error(`No data for ${ticker}`);

      const closes = result.indicators?.quote?.[0]?.close?.filter(c => c != null);
      if (!closes || closes.length < 2) throw new Error(`Insufficient data for ${ticker}`);

      const latest = closes[closes.length - 1];
      const prev = closes[closes.length - 2];
      const changePct = ((latest - prev) / prev) * 100;

      let rsi = 50;
      if (closes.length >= 3) {
        let gains = 0, losses = 0, count = 0;
        for (let i = 1; i < closes.length; i++) {
          const diff = closes[i] - closes[i - 1];
          if (diff > 0) gains += diff;
          else losses -= diff;
          count++;
        }
        const avgGain = gains / count;
        const avgLoss = losses / count;
        rsi = avgLoss === 0 ? 100 : Math.round(100 - 100 / (1 + avgGain / avgLoss));
      }

      return { ticker, latest, prev, changePct, rsi };
    })
  );

  const etfs = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);

  if (etfs.length < 6) throw new Error(`Only ${etfs.length} ETFs returned data`);

  const sectors = etfs.filter((e) => SECTOR_ETFS.includes(e.ticker));
  const advancers = sectors.filter((e) => e.changePct > 0).length;
  const decliners = sectors.filter((e) => e.changePct < 0).length;

  const scale = Math.round(503 / sectors.length);
  const scaledAdv = advancers * scale;
  const scaledDec = decliners * scale;
  const scaledUnch = 503 - scaledAdv - scaledDec;

  const adRatio = decliners > 0
    ? Math.round((advancers / decliners) * 100) / 100
    : advancers > 0 ? 9.99 : 1.0;

  const aboveSma = sectors.filter((e) => e.changePct > 0).length;
  const pctAboveSma50 = Math.round((aboveSma / sectors.length) * 100 * 10) / 10;

  const rsp = etfs.find((e) => e.ticker === "RSP");
  const spy = etfs.find((e) => e.ticker === "SPY");
  const broadPct = rsp?.changePct ?? spy?.changePct ?? 0;
  const pctAboveSma200 = Math.round(Math.min(100, Math.max(0, 50 + broadPct * 8)) * 10) / 10;

  const avgRsi = Math.round(
    etfs.reduce((sum, e) => sum + e.rsi, 0) / etfs.length * 10
  ) / 10;
  const pctOversold = Math.round(
    (etfs.filter((e) => e.rsi < 30).length / etfs.length) * 100 * 10
  ) / 10;
  const pctOverbought = Math.round(
    (etfs.filter((e) => e.rsi > 70).length / etfs.length) * 100 * 10
  ) / 10;

  return {
    total_stocks: 503,
    advancers: scaledAdv,
    decliners: scaledDec,
    unchanged: Math.max(0, scaledUnch),
    advance_decline_ratio: adRatio,
    pct_above_sma50: pctAboveSma50,
    pct_above_sma200: pctAboveSma200,
    avg_rsi: avgRsi,
    pct_oversold: pctOversold,
    pct_overbought: pctOverbought,
    _source: "yahoo-finance-etf-proxy",
  };
}

// ─── Breadth data cache ───
let breadthCache = { data: null, ts: 0, source: null };
const BREADTH_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchLiveBreadth() {
  try {
    const url = `https://${UPSTREAM_HOST}${UPSTREAM_PREFIX}/api/market/breadth`;
    const data = await fetchJSON(url, 8000);
    if (data && typeof data.advancers === "number") {
      data._source = "r730-live";
      return data;
    }
  } catch (e) {
    console.log(`[breadth] R730 upstream failed: ${e.message}`);
  }

  try {
    const data = await fetchYahooBreadth();
    return data;
  } catch (e) {
    console.log(`[breadth] Yahoo Finance fallback failed: ${e.message}`);
  }

  return null;
}

async function getBreadthData() {
  const now = Date.now();

  if (breadthCache.data && (now - breadthCache.ts) < BREADTH_TTL) {
    return breadthCache.data;
  }

  const live = await fetchLiveBreadth();
  if (live) {
    breadthCache = { data: live, ts: now, source: live._source };

    try {
      const cachePath = join(DATA, "market/breadth.json");
      const { _source, ...clean } = live;
      writeFileSync(cachePath, JSON.stringify(clean));
      console.log(`[breadth] Updated cache from ${live._source}`);
    } catch (e) {
      console.log(`[breadth] Cache write failed: ${e.message}`);
    }

    appendBreadthHistory(live);
    return live;
  }

  try {
    const cachePath = join(DATA, "market/breadth.json");
    if (existsSync(cachePath)) {
      const data = JSON.parse(readFileSync(cachePath, "utf-8"));
      data._source = "cached-file";
      breadthCache = { data, ts: now - BREADTH_TTL + 60000, source: "cached-file" };
      return data;
    }
  } catch (e) {
    console.log(`[breadth] Cache read failed: ${e.message}`);
  }

  return null;
}

// ─── Breadth history (server-side, replaces localStorage) ───
const HISTORY_PATH = join(DATA, "market/breadth-history.json");
const MAX_HISTORY_DAYS = 90;

function loadHistory() {
  try {
    if (existsSync(HISTORY_PATH)) {
      return JSON.parse(readFileSync(HISTORY_PATH, "utf-8"));
    }
  } catch { /* ignore */ }
  return [];
}

function saveHistory(entries) {
  try {
    writeFileSync(HISTORY_PATH, JSON.stringify(entries, null, 0));
  } catch (e) {
    console.log(`[breadth-history] Save failed: ${e.message}`);
  }
}

function appendBreadthHistory(breadthData) {
  const today = new Date().toISOString().slice(0, 10);
  const entries = loadHistory();

  let score = 50;
  const ad = breadthData.advance_decline_ratio ?? 1;
  score += Math.min(20, Math.max(-20, (ad - 1) * 15));
  score += (breadthData.pct_above_sma50 - 50) * 0.3;
  score += (breadthData.pct_above_sma200 - 50) * 0.2;
  const rsi = breadthData.avg_rsi ?? 50;
  score += (rsi - 50) * 0.2;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const entry = {
    date: today,
    score,
    advancers: breadthData.advancers,
    decliners: breadthData.decliners,
    ad_ratio: breadthData.advance_decline_ratio,
    pct_above_sma50: breadthData.pct_above_sma50,
    avg_rsi: breadthData.avg_rsi,
    source: breadthData._source || "unknown",
  };

  const idx = entries.findIndex((e) => e.date === today);
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.push(entry);
  }

  saveHistory(entries.slice(-MAX_HISTORY_DAYS));
}

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

  if (route === "earnings/events-all") {
    const file = join(DATA, "earnings/events-all.json");
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
    const exSuffix = exchange ? `-${exchange}` : "";
    if (sortBy) {
      const file = join(DATA, `screener/${sortBy}-${sortDir || "desc"}${exSuffix}.json`);
      if (existsSync(file)) return file;
    }
    const file = join(DATA, `screener/default${exSuffix}.json`);
    if (existsSync(file)) return file;
  }

  // --- Direct file match (e.g. earnings/this-week, earnings/impact-summary,
  //     market/overview, market/breadth, market/sectors, status, tickers) ---
  const direct = join(DATA, route + ".json");
  if (existsSync(direct)) return direct;

  return null;
}

/**
 * Proxy an API request to the upstream R730 stock API via Tailscale Funnel.
 * Retries once on failure with a short delay to handle concurrent request bursts.
 */
function proxyToUpstream(req, res, urlPath, queryString, attempt = 1, done = () => {}) {
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
      timeout: 30000,
    },
    (proxyRes) => {
      // If upstream returned a server error and we haven't retried yet, retry
      if (proxyRes.statusCode >= 500 && attempt < 2) {
        proxyRes.resume();
        setTimeout(() => proxyToUpstream(req, res, urlPath, queryString, attempt + 1, done), 500);
        return;
      }
      const headers = {
        "Content-Type": proxyRes.headers["content-type"] || "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60",
      };
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res);
      proxyRes.on("end", done);
    },
  );

  proxyReq.on("error", (err) => {
    if (attempt < 2) {
      setTimeout(() => proxyToUpstream(req, res, urlPath, queryString, attempt + 1, done), 500);
      return;
    }
    console.error(`Proxy error (attempt ${attempt}): ${err.message}`);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "upstream unavailable", detail: err.message }));
    done();
  });

  proxyReq.on("timeout", () => {
    proxyReq.destroy();
    if (attempt < 2) {
      setTimeout(() => proxyToUpstream(req, res, urlPath, queryString, attempt + 1, done), 500);
      return;
    }
    res.writeHead(504, { "Content-Type": "application/json" });
    res.end('{"error":"upstream timeout"}');
    done();
  });

  proxyReq.end();
}

const server = createServer((req, res) => {
  // Health check
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", deployed: new Date().toISOString() }));
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

  // API routes
  if (urlPath.startsWith("/api/")) {
    // API health shortcut
    if (urlPath === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"status":"ok"}');
      return;
    }

    // ─── Breadth: cascading live fetch ───
    if (urlPath === "/api/market/breadth") {
      getBreadthData().then((data) => {
        if (data) {
          const { _source, ...clean } = data;
          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=60",
            "Access-Control-Allow-Origin": "*",
            "X-Breadth-Source": _source || "unknown",
          });
          res.end(JSON.stringify(clean));
        } else {
          res.writeHead(503, { "Content-Type": "application/json" });
          res.end('{"error":"breadth data unavailable from all sources"}');
        }
      }).catch((err) => {
        console.error(`[breadth] Error: ${err.message}`);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }

    // ─── Breadth history endpoint ───
    if (urlPath === "/api/market/breadth-history") {
      const params = new URLSearchParams(queryString || "");
      const days = parseInt(params.get("days") || "30", 10);
      const entries = loadHistory().slice(-days);
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify(entries));
      return;
    }

    // ─── All other API routes: serve cached JSON, fallback to upstream proxy ───
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

    enqueueProxy(req, res, urlPath, queryString || "");
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

  // SPA fallback — serve index.html (no-cache so deploys take effect immediately)
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-cache, no-store, must-revalidate",
  });
  res.end(indexHtml);
});

server.listen(PORT, () => {
  console.log(`PeakDipVibe server listening on port ${PORT}`);
  console.log(`Upstream proxy: https://${UPSTREAM_HOST}${UPSTREAM_PREFIX}`);
});
