# Fix Morning Pulse Score — Cascading Live Data + Server-Side History

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Morning Pulse score being stuck at 49 every day by implementing a cascading live data strategy (R730 API -> Yahoo Finance ETF proxy -> cached file) and moving score history from localStorage to server-side storage.

**Architecture:** `server.mjs` becomes a smart data layer: it tries the R730 upstream API first, falls back to computing breadth from Yahoo Finance sector ETF quotes, and only uses the stale cached file as a last resort. Every successful fetch updates both the cached `breadth.json` AND appends to a `breadth-history.json` file for the weekly trend chart. The frontend fetches history from a new `/api/market/breadth-history` endpoint instead of localStorage.

**Tech Stack:** Node.js 22 (server.mjs, no new npm deps), React 19 + TanStack Query (frontend), Yahoo Finance v8 chart API (free, no auth key)

---

## Root Cause Summary

1. `data/market/breadth.json` has been **identical in every commit** since it was first created — the daily refresh script fetches from `localhost:8002` but the local API returns the same stale data (database not updating with new prices), producing score 49 forever.
2. `server.mjs` serves the cached file **before** trying the upstream proxy — the live R730 API is never consulted if the file exists.
3. Weekly trend history lives in **browser localStorage** — fragile, per-device, and shows "Tracking started today" on every fresh visit or device.

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `server.mjs` | Modify | Add cascading breadth fetch (R730 -> Yahoo -> cache), breadth history endpoint, auto-save history |
| `data/market/breadth-history.json` | Create | Server-side daily score history (array of `{date, score, breadth}` objects) |
| `src/api/hooks/useMarket.ts` | Modify | Add `useMarketBreadthHistory()` hook |
| `src/api/types/market.ts` | Modify | Add `BreadthHistoryEntrySchema` |
| `src/features/morning-pulse/components/MarketMoodGauge.tsx` | Modify | Use server-side history instead of localStorage |
| `src/hooks/useMoodHistory.ts` | Delete | No longer needed — history is server-side |
| `Dockerfile` | Modify | Add writable volume for history persistence |

---

### Task 1: Add Yahoo Finance breadth proxy to server.mjs

This is the core fix. We flip the priority so live data comes first, add a Yahoo Finance fallback, and auto-save fresh data to the cache file.

**Files:**
- Modify: `/home/will/PeakDipVibe/server.mjs`

- [ ] **Step 1: Add the Yahoo Finance ETF fetch function**

Add this after the `drainQueue` function (after line 49) in `server.mjs`:

```javascript
// ─── Yahoo Finance ETF-based breadth fallback ───
// Fetches 11 SPDR sector ETFs + SPY to compute market breadth
// when R730 upstream is unavailable. Uses the free v8 chart API.
const SECTOR_ETFS = [
  "XLB", "XLC", "XLE", "XLF", "XLI", "XLK", "XLP", "XLRE", "XLU", "XLV", "XLY"
];
const BROAD_ETFS = ["SPY", "RSP"]; // SPY = cap-weighted, RSP = equal-weight S&P 500
const ALL_ETFS = [...SECTOR_ETFS, ...BROAD_ETFS];

function fetchJSON(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? require("node:https") : require("node:http");
    const req = proto.get(url, { timeout: timeoutMs, headers: { "User-Agent": "PeakDipVibe/1.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchJSON(res.headers.location, timeoutMs).then(resolve, reject);
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

async function fetchYahooBreadth() {
  // Fetch all ETFs in parallel using Yahoo Finance v8 chart API
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

      // Compute a simple RSI proxy from the last 5 days of closes
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
  const unchanged = sectors.length - advancers - decliners;

  // Scale sector counts to approximate S&P 500 breadth
  // Each sector ETF represents ~45 stocks on average (503 / 11)
  const scale = Math.round(503 / sectors.length);
  const scaledAdv = advancers * scale;
  const scaledDec = decliners * scale;
  const scaledUnch = 503 - scaledAdv - scaledDec;

  const adRatio = decliners > 0
    ? Math.round((advancers / decliners) * 100) / 100
    : advancers > 0 ? 9.99 : 1.0;

  // SMA proxy: % of sector ETFs trading above their 5-day average
  const aboveSma = sectors.filter((e) => e.changePct > 0).length; // rough proxy
  const pctAboveSma50 = Math.round((aboveSma / sectors.length) * 100 * 10) / 10;

  // Use RSP (equal-weight) for broader market signal if available
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
```

- [ ] **Step 2: Add in-memory cache and cascading fetch logic**

Add after the Yahoo function:

```javascript
// ─── Breadth data cache ───
let breadthCache = { data: null, ts: 0, source: null };
const BREADTH_TTL = 5 * 60 * 1000; // 5 minutes

function upstreamBreadthUrl() {
  return `https://${UPSTREAM_HOST}${UPSTREAM_PREFIX}/api/market/breadth`;
}

async function fetchLiveBreadth() {
  // Try R730 upstream first
  try {
    const data = await fetchJSON(upstreamBreadthUrl(), 8000);
    if (data && typeof data.advancers === "number") {
      data._source = "r730-live";
      return data;
    }
  } catch (e) {
    console.log(`[breadth] R730 upstream failed: ${e.message}`);
  }

  // Fallback: Yahoo Finance ETF proxy
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

  // Return cache if fresh
  if (breadthCache.data && (now - breadthCache.ts) < BREADTH_TTL) {
    return breadthCache.data;
  }

  // Try live sources
  const live = await fetchLiveBreadth();
  if (live) {
    breadthCache = { data: live, ts: now, source: live._source };

    // Persist to cached file (fire-and-forget)
    try {
      const { writeFileSync } = await import("node:fs");
      const cachePath = join(DATA, "market/breadth.json");
      const { _source, ...clean } = live;
      writeFileSync(cachePath, JSON.stringify(clean));
      console.log(`[breadth] Updated cache from ${live._source}`);
    } catch (e) {
      console.log(`[breadth] Cache write failed: ${e.message}`);
    }

    // Append to history
    appendBreadthHistory(live);

    return live;
  }

  // Last resort: read cached file
  try {
    const cachePath = join(DATA, "market/breadth.json");
    if (existsSync(cachePath)) {
      const data = JSON.parse(readFileSync(cachePath, "utf-8"));
      data._source = "cached-file";
      breadthCache = { data, ts: now - BREADTH_TTL + 60000, source: "cached-file" }; // re-check in 1 min
      return data;
    }
  } catch (e) {
    console.log(`[breadth] Cache read failed: ${e.message}`);
  }

  return null;
}
```

- [ ] **Step 3: Add breadth history persistence**

Add after `getBreadthData`:

```javascript
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

  // Compute the mood score (same formula as frontend scoring.ts)
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

  // Replace today's entry if exists, else append
  const idx = entries.findIndex((e) => e.date === today);
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.push(entry);
  }

  // Trim to MAX_HISTORY_DAYS
  saveHistory(entries.slice(-MAX_HISTORY_DAYS));
}
```

- [ ] **Step 4: Replace the breadth route handler in the request handler**

In the `createServer` callback, replace the generic API data-file-then-proxy logic for the breadth endpoint specifically. Find the section that starts with `// API routes` (around line 242). Add a specific handler for breadth BEFORE the generic `resolveApiData` call:

Replace lines 242-265 (the entire `if (urlPath.startsWith("/api/"))` block) with:

```javascript
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

    // No cached data — queue proxy to upstream API (limits concurrency)
    enqueueProxy(req, res, urlPath, queryString || "");
    return;
  }
```

- [ ] **Step 5: Fix the import at top of server.mjs**

The file currently imports `readFileSync` and `existsSync` but not `writeFileSync`. Update line 3:

Change:
```javascript
import { readFileSync, existsSync, statSync } from "node:fs";
```
To:
```javascript
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
```

Also add `http` import at top (needed by `fetchJSON`). Change line 1-2:
```javascript
import { createServer } from "node:http";
import { request as httpsRequest } from "node:https";
```
To:
```javascript
import { createServer, get as httpGet } from "node:http";
import { request as httpsRequest, get as httpsGet } from "node:https";
```

And update `fetchJSON` to use these imports instead of `require`:

```javascript
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
```

- [ ] **Step 6: Test server.mjs locally**

```bash
cd /home/will/PeakDipVibe
npm run build
node server.mjs &
sleep 2

# Test breadth endpoint — should return live data with X-Breadth-Source header
curl -v http://localhost:3000/api/market/breadth 2>&1 | grep -E "X-Breadth-Source|advancers|decliners"

# Test history endpoint
curl -s http://localhost:3000/api/market/breadth-history | python3 -m json.tool

# Kill server
kill %1
```

Expected: breadth response with `X-Breadth-Source: yahoo-finance-etf-proxy` (since R730 is down), and score NOT 49 (reflecting actual market conditions). History endpoint returns array with today's entry.

- [ ] **Step 7: Commit**

```bash
cd /home/will/PeakDipVibe
git add server.mjs
git commit -m "fix: cascading live breadth data (R730 -> Yahoo Finance -> cache) + server-side history"
```

---

### Task 2: Seed breadth history with backdated entries

The history file starts empty. We should seed it with the current score so the trend chart has at least one data point immediately, and add a note that historical data will accumulate going forward.

**Files:**
- Create: `/home/will/PeakDipVibe/data/market/breadth-history.json`

- [ ] **Step 1: Create the seed history file**

```bash
cd /home/will/PeakDipVibe
echo '[]' > data/market/breadth-history.json
```

This will get populated automatically on the first live breadth fetch after deployment.

- [ ] **Step 2: Commit**

```bash
git add data/market/breadth-history.json
git commit -m "chore: add empty breadth history file for server-side trend tracking"
```

---

### Task 3: Add breadth history API hook to frontend

**Files:**
- Modify: `/home/will/PeakDipVibe/src/api/types/market.ts`
- Modify: `/home/will/PeakDipVibe/src/api/hooks/useMarket.ts`

- [ ] **Step 1: Add BreadthHistoryEntry schema**

In `/home/will/PeakDipVibe/src/api/types/market.ts`, add after the `MarketBreadthSchema` (after line 40):

```typescript
export const BreadthHistoryEntrySchema = z.object({
  date: z.string(),
  score: z.number(),
  advancers: z.number().optional(),
  decliners: z.number().optional(),
  ad_ratio: z.number().optional(),
  pct_above_sma50: z.number().optional(),
  avg_rsi: z.number().nullable().optional(),
  source: z.string().optional(),
});

export type BreadthHistoryEntry = z.infer<typeof BreadthHistoryEntrySchema>;
```

- [ ] **Step 2: Add useMarketBreadthHistory hook**

In `/home/will/PeakDipVibe/src/api/hooks/useMarket.ts`, add the import for the new schema. Update the imports from `../types/market` to include `BreadthHistoryEntrySchema`:

```typescript
import {
  MarketBreadthSchema,
  MarketOverviewSchema,
  SectorPerformanceSchema,
  StatusResponseSchema,
  UpcomingEarningsResponseSchema,
  BreadthHistoryEntrySchema,
} from "../types/market";
```

Then add this hook at the end of the file (after `usePipelineStatus`):

```typescript
export function useMarketBreadthHistory(days = 30) {
  return useQuery({
    queryKey: ["market-breadth-history", days],
    queryFn: async () => {
      const { data } = await api.get("/market/breadth-history", {
        params: { days },
      });
      return z.array(BreadthHistoryEntrySchema).parse(data);
    },
    staleTime: STALE_WARM,
  });
}
```

- [ ] **Step 3: Commit**

```bash
cd /home/will/PeakDipVibe
git add src/api/types/market.ts src/api/hooks/useMarket.ts
git commit -m "feat: add breadth history API hook and Zod schema"
```

---

### Task 4: Update MarketMoodGauge to use server-side history

**Files:**
- Modify: `/home/will/PeakDipVibe/src/features/morning-pulse/components/MarketMoodGauge.tsx`
- Delete: `/home/will/PeakDipVibe/src/hooks/useMoodHistory.ts`

- [ ] **Step 1: Rewrite MarketMoodGauge to use server-side history**

Replace the entire content of `/home/will/PeakDipVibe/src/features/morning-pulse/components/MarketMoodGauge.tsx`:

```tsx
import { useEffect, useState } from "react";
import type { MarketMood } from "../lib/scoring";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMarketBreadthHistory } from "@/api/hooks/useMarket";
import type { BreadthHistoryEntry } from "@/api/types/market";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const RADIUS = 80;
const STROKE = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_LENGTH = CIRCUMFERENCE * 0.75; // 270 degrees
const GAP_LENGTH = CIRCUMFERENCE * 0.25;
const VIEW_SIZE = (RADIUS + STROKE) * 2;
const CENTER = VIEW_SIZE / 2;

interface Props {
  mood: MarketMood;
  loading?: boolean;
}

function MoodTrendChart({ history, currentScore }: { history: BreadthHistoryEntry[]; currentScore: number }) {
  // Build entries: use server history, ensure today is included
  const today = new Date().toISOString().slice(0, 10);
  const hasToday = history.some((e) => e.date === today);
  const entries = hasToday
    ? history
    : [...history, { date: today, score: currentScore }];

  if (entries.length <= 1) {
    return (
      <div className="mt-5 w-full max-w-sm">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-semibold text-text-muted">Weekly Trend</h4>
          <span className="text-xs text-text-muted">Tracking started today</span>
        </div>
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-4">
          <div className="text-center">
            <span className="text-2xl font-bold text-accent">{entries[0]?.score ?? currentScore}</span>
            <p className="mt-1 text-xs text-text-muted">First score recorded — trend builds daily</p>
          </div>
        </div>
      </div>
    );
  }

  const W = 320;
  const H = 80;
  const PAD_X = 28;
  const PAD_Y = 12;
  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_Y * 2;

  const min = Math.min(...entries.map((e) => e.score)) - 5;
  const max = Math.max(...entries.map((e) => e.score)) + 5;
  const range = Math.max(max - min, 10);

  const points = entries.map((e, i) => ({
    x: PAD_X + (i / (entries.length - 1)) * chartW,
    y: PAD_Y + chartH - ((e.score - min) / range) * chartH,
    ...e,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const first = entries[0].score;
  const last = entries[entries.length - 1].score;
  const delta = last - first;
  const lineColor = delta > 2 ? "#22c55e" : delta < -2 ? "#ef4444" : "#f59e0b";

  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short" });
  };

  return (
    <div className="mt-5 w-full max-w-sm">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold text-text-muted">Weekly Trend</h4>
        <div className="flex items-center gap-1 text-xs" style={{ color: lineColor }}>
          {delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          <span className="font-semibold">{delta > 0 ? "+" : ""}{delta}</span>
          <span className="text-text-muted">pts</span>
        </div>
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Grid lines */}
        {[0, 0.5, 1].map((frac) => {
          const y = PAD_Y + frac * chartH;
          const val = Math.round(max - frac * range);
          return (
            <g key={frac}>
              <line x1={PAD_X} x2={W - PAD_X} y1={y} y2={y} stroke="currentColor" className="text-border" strokeWidth={0.5} strokeDasharray="4 4" />
              <text x={PAD_X - 4} y={y + 3} textAnchor="end" className="fill-text-muted" fontSize={9}>{val}</text>
            </g>
          );
        })}

        {/* Line */}
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots + day labels */}
        {points.map((p, i) => (
          <g key={p.date}>
            <circle cx={p.x} cy={p.y} r={3} fill={lineColor} />
            <text x={p.x} y={H - 1} textAnchor="middle" className="fill-text-muted" fontSize={8}>
              {i === 0 || i === points.length - 1 || entries.length <= 7 ? formatDay(p.date) : ""}
            </text>
            <title>{p.date}: {p.score}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function MarketMoodGauge({ mood, loading }: Props) {
  const [animated, setAnimated] = useState(0);
  const { data: history } = useMarketBreadthHistory(7);

  useEffect(() => {
    if (loading) return;
    const target = mood.score;
    let frame: number;
    const start = performance.now();
    const duration = 1200;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimated(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mood.score, loading]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-48 w-48 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  const offset = ARC_LENGTH * (1 - animated / 100);

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg
          width={VIEW_SIZE}
          height={VIEW_SIZE}
          viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
          className="drop-shadow-lg"
        >
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="65%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>

          {/* Background arc */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            className="text-bg-hover"
            strokeWidth={STROKE}
            strokeDasharray={`${ARC_LENGTH} ${GAP_LENGTH}`}
            strokeLinecap="round"
            transform={`rotate(135, ${CENTER}, ${CENTER})`}
          />

          {/* Foreground arc */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth={STROKE}
            strokeDasharray={`${ARC_LENGTH} ${GAP_LENGTH}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(135, ${CENTER}, ${CENTER})`}
            style={{ transition: "stroke-dashoffset 0.1s linear" }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-text-primary">
            {animated}
          </span>
          <span className="text-xs text-text-muted">/100</span>
          <span
            className="mt-1 rounded-full px-3 py-0.5 text-xs font-semibold"
            style={{ color: mood.color, backgroundColor: `${mood.color}15` }}
          >
            {mood.label}
          </span>
        </div>
      </div>

      {/* Summary */}
      {mood.summary && (
        <p className="mt-3 max-w-md text-center text-sm leading-relaxed text-text-secondary">
          {mood.summary}
        </p>
      )}

      {/* Contributing factors */}
      {mood.factors.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {mood.factors.map((f) => (
            <div
              key={f.label}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2.5 text-sm ${
                f.positive
                  ? "border-green/20 bg-green/5 text-green"
                  : "border-red/20 bg-red/5 text-red"
              }`}
            >
              <span className="text-text-muted">{f.label}</span>
              <span className="font-semibold">{f.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Weekly trend chart — from server-side history */}
      <MoodTrendChart history={history ?? []} currentScore={mood.score} />
    </div>
  );
}
```

- [ ] **Step 2: Delete the localStorage-based useMoodHistory hook**

```bash
rm /home/will/PeakDipVibe/src/hooks/useMoodHistory.ts
```

- [ ] **Step 3: Verify no other files import useMoodHistory**

```bash
cd /home/will/PeakDipVibe
grep -r "useMoodHistory" src/
```

Expected: No results (MarketMoodGauge was the only consumer, now rewritten).

- [ ] **Step 4: Commit**

```bash
cd /home/will/PeakDipVibe
git add -A
git commit -m "feat: replace localStorage mood history with server-side breadth history API"
```

---

### Task 5: Update Dockerfile for writable history

Railway containers have a writable filesystem but it resets on each deploy. The history file is in `data/` which is copied from the build, so each deploy starts with whatever was committed. This is fine — the daily refresh script will commit updated history to git, and the server writes to it at runtime.

However, `readFileSync` is used synchronously in the request path which is fine for small files but we should verify the `data/` directory is writable.

**Files:**
- Modify: `/home/will/PeakDipVibe/Dockerfile`

- [ ] **Step 1: Ensure data directory is writable in container**

Update the Dockerfile — the `data/` directory needs write permissions for the Node process:

```dockerfile
# Stage 1 — Build
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 2 — Production server
FROM node:22-alpine

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./server.mjs
COPY --from=builder /app/data ./data

# Ensure data directory is writable for runtime breadth cache updates
RUN chmod -R 777 ./data

EXPOSE 3000
CMD ["node", "server.mjs"]
```

- [ ] **Step 2: Commit**

```bash
cd /home/will/PeakDipVibe
git add Dockerfile
git commit -m "fix: ensure data/ dir is writable in container for breadth cache updates"
```

---

### Task 6: Build, test with Playwright, push to GitHub

**Files:**
- No new files — integration testing

- [ ] **Step 1: Build the project**

```bash
cd /home/will/PeakDipVibe
npm run build
```

Expected: Clean build, no TypeScript errors.

- [ ] **Step 2: Start server and test endpoints manually**

```bash
cd /home/will/PeakDipVibe
node server.mjs &
SERVER_PID=$!
sleep 2

# Test breadth — should NOT be 49 anymore (unless market is genuinely neutral)
echo "=== Breadth ==="
curl -s http://localhost:3000/api/market/breadth | python3 -m json.tool

# Check source header
echo "=== Source ==="
curl -sI http://localhost:3000/api/market/breadth 2>&1 | grep X-Breadth-Source

# Test history
echo "=== History ==="
curl -s http://localhost:3000/api/market/breadth-history | python3 -m json.tool

# Health check
echo "=== Health ==="
curl -s http://localhost:3000/health

kill $SERVER_PID
```

Expected:
- Breadth returns fresh data (from Yahoo Finance if R730 is down)
- `X-Breadth-Source: yahoo-finance-etf-proxy` header present
- Score reflects actual market conditions (not stuck at 49)
- History has at least one entry with today's date

- [ ] **Step 3: Test with Playwright**

Run Playwright against the local server to verify the Pulse page renders correctly:

```bash
cd /home/will/PeakDipVibe
node server.mjs &
SERVER_PID=$!
sleep 2
```

Then with Playwright, navigate to `http://localhost:3000/pulse` and verify:
1. The score gauge shows a number (may or may not be 49 depending on actual market)
2. The "Weekly Trend" section shows either a chart (if history > 1 day) or "First score recorded" (if first day)
3. The key numbers section shows breadth stats
4. No console errors

```bash
kill $SERVER_PID
```

- [ ] **Step 4: Push to GitHub (triggers Railway auto-deploy)**

```bash
cd /home/will/PeakDipVibe
git push origin main
```

- [ ] **Step 5: Verify Railway deployment**

```bash
# Wait ~2 minutes for deploy, then check
curl -s https://stocks.ecbtx.com/health | python3 -m json.tool
curl -s https://stocks.ecbtx.com/api/market/breadth | python3 -m json.tool
curl -sI https://stocks.ecbtx.com/api/market/breadth 2>&1 | grep X-Breadth-Source
```

- [ ] **Step 6: Test production with Playwright**

Navigate Playwright to `https://stocks.ecbtx.com/pulse` and verify:
1. Score is displayed (likely different from 49 now)
2. Weekly trend section visible
3. Key numbers reflect live market data
4. No errors

---

### Task 7: Update daily-refresh.sh to also commit history

The daily refresh script should include `breadth-history.json` in its git commits so that fresh deploys start with accumulated history.

**Files:**
- Modify: `/home/will/stock-data-pipeline/daily-refresh.sh`

- [ ] **Step 1: Add history commit to daily refresh**

After line 68 (`fetch "$API/market/breadth" "$DATA/market/breadth.json"`), add a step to also save a history entry from the local API:

No changes needed to the fetch section — the server.mjs `appendBreadthHistory` already handles this at runtime. But we need the git commit to include the history file.

Change line 118 from:
```bash
    git add data/
```
To:
```bash
    git add data/
```

Actually this already adds all files under `data/` including `breadth-history.json`. The important thing is that the server writes to `breadth-history.json` at runtime, and then when the daily refresh runs and commits, it picks up the updated file.

But wait — the daily refresh runs on the **local machine**, not on Railway. The history file on Railway is written at runtime but lost on redeploy. We need the daily refresh to also update the local copy.

Add after line 68:

```bash
# Also fetch the history from production so we preserve runtime entries
fetch "https://stocks.ecbtx.com/api/market/breadth-history?days=90" "$DATA/market/breadth-history.json" 10
```

This fetches the accumulated history from the running Railway instance before it gets redeployed, preserving all runtime entries.

- [ ] **Step 2: Commit**

```bash
cd /home/will/stock-data-pipeline
git add daily-refresh.sh
git commit -m "fix: preserve breadth history from production during daily refresh"
git push origin main
```
