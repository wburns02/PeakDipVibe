# PeakDipVibe Remaining Work — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete all remaining PeakDipVibe infrastructure — catalyst classification, NASDAQ expansion, real-time polling, AI case studies, simulator integration, and self-learning automation.

**Architecture:** 10 tasks in 3 parallelism groups. Group A (Tasks 1-4) runs in parallel — independent backend work across different files. Group B (Tasks 5-7) runs after Group A completes — depends on NASDAQ data and catalyst enrichment. Group C (Tasks 8-10) is frontend + automation — runs after backend is solid.

**Tech Stack:** Python 3.12, SQLite, FastAPI, Node.js (server.mjs), React 19 + TypeScript, Finnhub API, Ollama (qwen2.5:72b on R730)

---

## Parallelism Map

```
GROUP A (parallel — no dependencies between them):
  Task 1: Qwen 2.5 72B download on R730
  Task 2: Catalyst classification backfill (Finnhub earnings data)
  Task 3: Add NASDAQ tickers to pipeline
  Task 4: Real-time polling in server.mjs

GROUP B (sequential — after Group A):
  Task 5: NASDAQ price download + scanner backfill
  Task 6: AI case study generation pipeline
  Task 7: Populate upcoming_earnings table

GROUP C (parallel — frontend + automation):
  Task 8: Simulator campaign mode frontend
  Task 9: Self-learning automation (cron)
  Task 10: Cache fresh tracker data + push to production
```

---

## File Map

| File | Action | Task |
|------|--------|------|
| `/home/will/stock-data-pipeline/catalyst_enricher.py` | Create | T2 — Batch Finnhub earnings enrichment |
| `/home/will/stock-data-pipeline/tickers.py` | Modify | T3 — Add NASDAQ full ticker list |
| `/home/will/stock-data-pipeline/pipeline.py` | Modify | T3, T5, T7 — Add commands |
| `/home/will/stock-data-pipeline/db.py` | Modify | T2 — Add earnings_surprise_pct column |
| `/home/will/PeakDipVibe/server.mjs` | Modify | T4 — Real-time polling for active dips |
| `/home/will/stock-data-pipeline/ai_case_studies.py` | Create | T6 — Sonnet/Qwen case study generator |
| `/home/will/PeakDipVibe/src/features/simulator/SimulatorPage.tsx` | Modify | T8 — Campaign mode + readiness integration |
| `/home/will/stock-data-pipeline/self_learning.py` | Create | T9 — Weekly recalibration script |
| `/home/will/stock-data-pipeline/daily-refresh.sh` | Modify | T9, T10 — Add recalibration + tracker cache |

---

### Task 1: Download Qwen 2.5 72B on R730

**Files:** None (R730 operations only)

- [ ] **Step 1: SSH to R730 and pull the model**

```bash
ssh 192.168.7.71 "nohup bash -c 'OLLAMA_HOST=http://localhost:11434 ollama pull qwen2.5:72b > /tmp/qwen72b-pull.log 2>&1' &"
```

- [ ] **Step 2: Monitor progress**

```bash
ssh 192.168.7.71 "tail -5 /tmp/qwen72b-pull.log"
```

Wait for download to complete (~47GB). Check periodically:
```bash
ssh 192.168.7.71 "OLLAMA_HOST=http://localhost:11434 ollama list | grep qwen2.5"
```

Expected: `qwen2.5:72b` appears in the list (~47GB size).

- [ ] **Step 3: Test the model**

```bash
ssh 192.168.7.71 "OLLAMA_HOST=http://localhost:11434 ollama run qwen2.5:72b 'What is a stock gap-up? Answer in one sentence.' 2>&1 | head -5"
```

Expected: Coherent one-sentence answer about gap-ups.

---

### Task 2: Catalyst classification backfill

Enrich the 11,734 existing events with catalyst data from Finnhub earnings surprises. This is the biggest data quality gap — 99% of events show "unknown" catalyst.

**Files:**
- Create: `/home/will/stock-data-pipeline/catalyst_enricher.py`
- Modify: `/home/will/stock-data-pipeline/db.py`
- Modify: `/home/will/stock-data-pipeline/pipeline.py`

- [ ] **Step 1: Add earnings_surprise_pct column to peak_dip_events**

In `/home/will/stock-data-pipeline/db.py`, add this migration at the end of `init_db()`, AFTER the `executescript` block:

```python
    # Migrations — add columns if they don't exist
    try:
        conn.execute("ALTER TABLE peak_dip_events ADD COLUMN earnings_surprise_pct REAL")
    except sqlite3.OperationalError:
        pass  # column already exists
```

- [ ] **Step 2: Create the catalyst enricher module**

Create `/home/will/stock-data-pipeline/catalyst_enricher.py`:

```python
"""Catalyst Enricher — backfill catalyst_type for peak_dip_events using Finnhub.

Queries Finnhub earnings surprises API to match gap-up events with actual
earnings beats, then classifies the catalyst type and records the surprise %.
"""

import logging
import sqlite3
import time
from datetime import datetime, timedelta

from sources.finnhub_source import FinnhubClient
import config

log = logging.getLogger(__name__)

# Finnhub free tier: 60 calls/min
RATE_LIMIT_DELAY = 1.1  # seconds between calls (safe margin)


def enrich_catalysts(conn: sqlite3.Connection, limit: int = 0, dry_run: bool = False) -> int:
    """Backfill catalyst_type for events missing catalyst data.

    Queries Finnhub earnings surprises for each unique ticker that has
    events with catalyst_type IS NULL or 'unknown'.

    Args:
        conn: SQLite connection
        limit: Max events to process (0 = all)
        dry_run: If True, print what would be updated without writing

    Returns:
        Number of events updated
    """
    # Get unique tickers with missing catalysts
    cur = conn.execute("""
        SELECT DISTINCT ticker FROM peak_dip_events
        WHERE catalyst_type IS NULL OR catalyst_type = 'unknown'
        ORDER BY ticker
    """)
    tickers = [row["ticker"] for row in cur.fetchall()]
    log.info("Found %d tickers with missing catalyst data", len(tickers))

    if not tickers:
        return 0

    finnhub = FinnhubClient()
    if not finnhub.available():
        log.error("Finnhub API key not configured — set FINNHUB_API_KEY env var")
        return 0

    updated = 0
    total_tickers = len(tickers)

    for i, ticker in enumerate(tickers):
        if limit and updated >= limit:
            break

        log.info("[%d/%d] Enriching %s...", i + 1, total_tickers, ticker)

        # Fetch earnings surprises from Finnhub
        try:
            surprises = finnhub.get_earnings_surprises(ticker)
        except Exception as e:
            log.warning("  Finnhub error for %s: %s", ticker, e)
            time.sleep(RATE_LIMIT_DELAY)
            continue

        if not surprises:
            log.debug("  No earnings data for %s", ticker)
            time.sleep(RATE_LIMIT_DELAY)
            continue

        # Build a lookup: period date -> surprise info
        earnings_lookup = {}
        for s in surprises:
            period = s.get("period")
            if period:
                earnings_lookup[period] = {
                    "actual": s.get("actual"),
                    "estimate": s.get("estimate"),
                    "surprise_pct": s.get("surprisePercent", 0) or 0,
                }

        # Match events for this ticker
        events = conn.execute("""
            SELECT id, signal_date, catalyst_type FROM peak_dip_events
            WHERE ticker = ? AND (catalyst_type IS NULL OR catalyst_type = 'unknown')
        """, (ticker,)).fetchall()

        for ev in events:
            if limit and updated >= limit:
                break

            signal_date = ev["signal_date"]
            sig_dt = datetime.strptime(signal_date, "%Y-%m-%d")

            # Look for earnings within ±5 days of signal
            matched = None
            for period_date, info in earnings_lookup.items():
                try:
                    earn_dt = datetime.strptime(period_date, "%Y-%m-%d")
                except ValueError:
                    continue
                if abs((sig_dt - earn_dt).days) <= 5:
                    matched = (period_date, info)
                    break

            if matched:
                period_date, info = matched
                surprise_pct = info["surprise_pct"]

                if surprise_pct > 5:
                    catalyst_type = "earnings_beat"
                    detail = f"EPS surprise: +{surprise_pct:.1f}%"
                elif surprise_pct > 0:
                    catalyst_type = "earnings_beat"
                    detail = f"EPS surprise: +{surprise_pct:.1f}%"
                elif surprise_pct < -5:
                    catalyst_type = "earnings_miss"
                    detail = f"EPS miss: {surprise_pct:.1f}%"
                elif surprise_pct < 0:
                    catalyst_type = "earnings_miss"
                    detail = f"EPS miss: {surprise_pct:.1f}%"
                else:
                    catalyst_type = "earnings_inline"
                    detail = "EPS in line with estimates"

                if not dry_run:
                    conn.execute("""
                        UPDATE peak_dip_events
                        SET catalyst_type = ?,
                            catalyst_detail = ?,
                            earnings_date = ?,
                            earnings_surprise_pct = ?,
                            updated_at = datetime('now')
                        WHERE id = ?
                    """, (catalyst_type, detail, period_date, surprise_pct, ev["id"]))

                updated += 1
                log.debug("  %s %s -> %s (%s)", ticker, signal_date, catalyst_type, detail)

        conn.commit()
        time.sleep(RATE_LIMIT_DELAY)  # rate limit

    log.info("Catalyst enrichment complete: %d events updated", updated)
    return updated
```

- [ ] **Step 3: Add CLI command to pipeline.py**

Add after the `predict` command in `/home/will/stock-data-pipeline/pipeline.py`:

```python
@cli.command("enrich-catalysts")
@click.option("--limit", default=0, help="Max events to process (0 = all)")
@click.option("--dry-run", is_flag=True, help="Print changes without writing")
@click.pass_context
def enrich_catalysts_cmd(ctx, limit, dry_run):
    """Backfill catalyst_type for peak/dip events using Finnhub earnings data."""
    from catalyst_enricher import enrich_catalysts

    conn = ctx.obj["conn"]
    log.info("=" * 60)
    log.info("CATALYST ENRICHMENT — limit=%d, dry_run=%s", limit, dry_run)
    log.info("=" * 60)

    updated = enrich_catalysts(conn, limit=limit, dry_run=dry_run)
    log.info("Done: %d events enriched", updated)
```

- [ ] **Step 4: Test with a small batch**

```bash
cd /home/will/stock-data-pipeline
source .venv/bin/activate
python pipeline.py enrich-catalysts --limit 50
```

Expected: Events get catalyst_type updated from "unknown" to "earnings_beat"/"earnings_miss"/etc.

- [ ] **Step 5: Run full enrichment**

```bash
python pipeline.py enrich-catalysts 2>&1 | tee logs/catalyst-enrichment.log
```

This will take ~3-4 hours at 60 calls/min rate limit (one call per ticker, ~500 tickers).

- [ ] **Step 6: Verify results**

```bash
python -c "
import db
conn = db.get_conn()
cur = conn.execute('SELECT catalyst_type, COUNT(*) AS n FROM peak_dip_events GROUP BY catalyst_type ORDER BY n DESC')
for row in cur.fetchall():
    print(f'  {(row[\"catalyst_type\"] or \"NULL\"):20s} {row[\"n\"]:5d}')
conn.close()
"
```

- [ ] **Step 7: Commit**

```bash
cd /home/will/stock-data-pipeline
git add catalyst_enricher.py db.py pipeline.py
git commit -m "feat: catalyst enricher — backfill earnings surprise data from Finnhub"
git push origin main
```

---

### Task 3: Add full NASDAQ tickers to pipeline

Currently only ~517 tickers (S&P 500 + NASDAQ 100 + Dow 30). Need to add full NASDAQ.

**Files:**
- Modify: `/home/will/stock-data-pipeline/tickers.py`

- [ ] **Step 1: Add NASDAQ full ticker list to tickers.py**

Read `/home/will/stock-data-pipeline/tickers.py`. Add a new function after the existing `get_nasdaq100_tickers()`:

```python
def get_nasdaq_all_tickers() -> list[str]:
    """Get all NASDAQ-listed tickers from the NASDAQ FTP site.

    Downloads the full NASDAQ-listed securities CSV.
    Returns ~3,000+ ticker symbols.
    """
    import csv
    import io

    url = "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt"
    log.info("Fetching full NASDAQ ticker list from %s", url)

    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        log.error("Failed to fetch NASDAQ list: %s", e)
        return []

    # File is pipe-delimited with a header and footer
    lines = resp.text.strip().split("\n")
    tickers = []
    for line in lines[1:]:  # skip header
        if line.startswith("File Creation Time"):
            break  # footer
        parts = line.split("|")
        if len(parts) >= 2:
            symbol = parts[0].strip()
            # Skip test symbols and warrants
            if symbol and not symbol.endswith("W") and len(symbol) <= 5:
                tickers.append(symbol.replace(".", "-"))  # BRK.B -> BRK-B for yfinance

    log.info("Found %d NASDAQ tickers", len(tickers))
    return sorted(set(tickers))
```

Also update `get_all_tickers()` to support a "nasdaq_all" market:

Find the market resolution section and add:
```python
    if "nasdaq_all" in markets or "all" in markets:
        all_tickers.update(get_nasdaq_all_tickers())
```

- [ ] **Step 2: Test the new ticker list**

```bash
cd /home/will/stock-data-pipeline
source .venv/bin/activate
python -c "
from tickers import get_nasdaq_all_tickers
t = get_nasdaq_all_tickers()
print(f'NASDAQ tickers: {len(t)}')
print(f'First 10: {t[:10]}')
print(f'Last 10: {t[-10:]}')
"
```

Expected: ~3,000+ tickers.

- [ ] **Step 3: Commit**

```bash
git add tickers.py
git commit -m "feat: add full NASDAQ ticker list (~3000 tickers)"
git push origin main
```

---

### Task 4: Real-time Yahoo Finance polling for active dips

When stocks are in active stages (peaked, selling_off, dip_zone), poll Yahoo Finance every 15 minutes during market hours to track the sell-off progression.

**Files:**
- Modify: `/home/will/PeakDipVibe/server.mjs`

- [ ] **Step 1: Add active dip polling to server.mjs**

Read `/home/will/PeakDipVibe/server.mjs`. After the breadth history functions (after `appendBreadthHistory`), add:

```javascript
// ─── Active dip real-time polling ───
// Polls Yahoo Finance for current prices of stocks in active dip stages
// Updates cached event data every 15 minutes during market hours

let activeDipCache = { data: null, ts: 0 };
const ACTIVE_DIP_TTL = 15 * 60 * 1000; // 15 minutes

function isMarketHours() {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const h = et.getHours();
  const m = et.getMinutes();
  const day = et.getDay();
  if (day === 0 || day === 6) return false;
  const mins = h * 60 + m;
  return mins >= 9 * 60 + 30 && mins <= 16 * 60; // 9:30 AM - 4:00 PM ET
}

async function pollActiveDips() {
  const now = Date.now();
  if (activeDipCache.data && (now - activeDipCache.ts) < ACTIVE_DIP_TTL) {
    return activeDipCache.data;
  }

  // Read cached events to find active tickers
  const eventsPath = join(DATA, "tracker/events.json");
  if (!existsSync(eventsPath)) return null;

  let events;
  try {
    events = JSON.parse(readFileSync(eventsPath, "utf-8"));
  } catch { return null; }

  if (!Array.isArray(events) || events.length === 0) return null;

  // Get active tickers (not resolved)
  const activeTickers = events
    .filter((e) => ["peaked", "selling_off", "dip_zone", "recovering"].includes(e.stage))
    .map((e) => e.ticker)
    .slice(0, 20); // cap at 20

  if (activeTickers.length === 0) return events;

  // Only poll during market hours
  if (!isMarketHours()) {
    activeDipCache = { data: events, ts: now };
    return events;
  }

  // Fetch current quotes from Yahoo Finance
  const quotes = await Promise.allSettled(
    activeTickers.map(async (ticker) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1d&interval=1m&includePrePost=false`;
      const data = await fetchJSON(url, 8000);
      const result = data?.chart?.result?.[0];
      if (!result) return null;
      const meta = result.meta;
      return {
        ticker,
        current_price: meta?.regularMarketPrice,
        day_high: meta?.regularMarketDayHigh,
        day_low: meta?.regularMarketDayLow,
        prev_close: meta?.previousClose,
        volume: meta?.regularMarketVolume,
      };
    })
  );

  const quoteMap = {};
  for (const r of quotes) {
    if (r.status === "fulfilled" && r.value) {
      quoteMap[r.value.ticker] = r.value;
    }
  }

  // Enrich events with live quotes
  for (const event of events) {
    const quote = quoteMap[event.ticker];
    if (quote) {
      event._live_price = quote.current_price;
      event._live_high = quote.day_high;
      event._live_volume = quote.volume;
      event._polled_at = new Date().toISOString();
    }
  }

  activeDipCache = { data: events, ts: now };
  console.log(`[active-dips] Polled ${Object.keys(quoteMap).length} tickers`);
  return events;
}
```

Then update the tracker handler. Find `// ─── Tracker: proxy to upstream, cache results ───` and in the `.catch()` fallback for the events endpoint, replace the cached file serving with the polled data:

Replace the catch block's file-reading section with:
```javascript
      }).catch(async () => {
        // R730 unavailable — use polled data or cached files
        if (urlPath === "/api/tracker/events") {
          const polled = await pollActiveDips();
          if (polled) {
            // Apply stage filter from query params if present
            const params = new URLSearchParams(queryString || "");
            const stageFilter = params.get("stage");
            let filtered = polled;
            if (stageFilter) {
              filtered = polled.filter((e) => e.stage === stageFilter);
            }
            const limit = parseInt(params.get("limit") || "50", 10);
            res.writeHead(200, {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "public, max-age=60",
              "Access-Control-Allow-Origin": "*",
              "X-Tracker-Source": "cached-polled",
            });
            res.end(JSON.stringify(filtered.slice(0, limit)));
            return;
          }
        }

        // Fallback to static cached files
        const route = urlPath.replace(/^\/api\//, "");
        const direct = join(DATA, route + ".json");
        if (existsSync(direct)) {
          const json = readFileSync(direct);
          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "Access-Control-Allow-Origin": "*",
            "X-Tracker-Source": "cached-file",
          });
          res.end(json);
        } else {
          const isEmpty = urlPath.includes("/summary");
          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(isEmpty
            ? '{"active_count":0,"avg_active_score":null,"recovering_count":0,"total_events":0,"overall_win_rate_5d":null,"resolved_count":0,"best_active_ticker":null,"best_active_score":null}'
            : "[]"
          );
        }
      });
```

- [ ] **Step 2: Build and test**

```bash
cd /home/will/PeakDipVibe
npm run build
```

- [ ] **Step 3: Commit and push**

```bash
git add server.mjs
git commit -m "feat: real-time Yahoo Finance polling for active dips (15-min TTL during market hours)"
git push origin main
```

---

### Task 5: NASDAQ price download + scanner backfill

After Task 3 adds the ticker list, download historical prices and run the peak/dip scanner on them.

**Files:** None new — uses existing pipeline commands

- [ ] **Step 1: Download NASDAQ ticker metadata**

```bash
cd /home/will/stock-data-pipeline
source .venv/bin/activate
python pipeline.py full --source yfinance --market nasdaq_all --start 2021-01-01 --skip-indicators 2>&1 | tee logs/nasdaq-download.log
```

This downloads ~3,000 tickers of daily OHLCV from 2021. Will take several hours due to yfinance rate limits.

- [ ] **Step 2: Compute indicators for new tickers**

```bash
python pipeline.py indicators --start 2021-01-01 2>&1 | tee logs/nasdaq-indicators.log
```

- [ ] **Step 3: Run scanner backfill on expanded universe**

```bash
python pipeline.py scan-peaks --start 2021-01-01 2>&1 | tee logs/nasdaq-scanner.log
```

- [ ] **Step 4: Verify expanded data**

```bash
python -c "
import db
conn = db.get_conn()
print(f'Tickers: {conn.execute(\"SELECT COUNT(DISTINCT ticker) FROM daily_prices\").fetchone()[0]}')
print(f'Peak/dip events: {conn.execute(\"SELECT COUNT(*) FROM peak_dip_events\").fetchone()[0]}')
conn.close()
"
```

Expected: ~3,500+ tickers, significantly more peak/dip events.

- [ ] **Step 5: Commit data note**

```bash
git add -A
git commit -m "data: NASDAQ full expansion — prices, indicators, peak/dip events" 2>/dev/null || echo "Nothing to commit"
git push origin main
```

---

### Task 6: AI case study generation pipeline

Create the pipeline for generating AI case studies — Sonnet for S&P 500 gold-standard, Qwen for the bulk.

**Files:**
- Create: `/home/will/stock-data-pipeline/ai_case_studies.py`
- Modify: `/home/will/stock-data-pipeline/pipeline.py`

- [ ] **Step 1: Create the AI case study generator**

Create `/home/will/stock-data-pipeline/ai_case_studies.py`:

```python
"""AI Case Study Generator — generate detailed analysis for peak/dip events.

Supports two providers:
- Ollama (qwen2.5:72b on R730) — free, for bulk processing
- Anthropic Claude (API) — paid, for gold-standard S&P 500 events

Usage:
    python pipeline.py generate-studies --provider ollama --limit 100
    python pipeline.py generate-studies --provider claude --limit 50
"""

import json
import logging
import sqlite3
import time
from datetime import datetime

import requests

log = logging.getLogger(__name__)

# R730 Ollama endpoint
OLLAMA_URL = "http://100.85.99.69:11434"
OLLAMA_MODEL = "qwen2.5:72b"

CASE_STUDY_PROMPT = """You are a stock market analyst. Write a concise case study (150-200 words) for this peak/dip trading event.

EVENT DATA:
- Ticker: {ticker} ({name})
- Sector: {sector}
- Date: {signal_date}
- Gap Up: +{gap_pct:.1f}% (opened at ${gap_open:.2f}, previous close ${prev_close:.2f})
- Day High: ${day_high:.2f}
- Sell-off: -{selloff_pct:.1f}% from peak (closed at ${day_close:.2f})
- Volume: {volume_ratio:.1f}x average
- Catalyst: {catalyst_type} — {catalyst_detail}
- Market Regime: {market_regime}
- 5-Day Outcome: {outcome_str}

Write your analysis in this structure:
1. **Why it gapped**: What drove the move
2. **The sell-off**: Why profit-taking happened, was volume heavy or light
3. **Recovery analysis**: Did it recover? Why or why not?
4. **Key lesson**: One actionable takeaway for future trades

Be specific and data-driven. No generic advice."""


def generate_with_ollama(prompt: str, timeout: int = 120) -> str | None:
    """Generate text using Ollama on R730."""
    try:
        resp = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=timeout,
        )
        resp.raise_for_status()
        return resp.json().get("response", "").strip()
    except Exception as e:
        log.warning("Ollama error: %s", e)
        return None


def generate_with_claude(prompt: str) -> str | None:
    """Generate text using Claude API (requires ANTHROPIC_API_KEY env var)."""
    import os
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        log.error("ANTHROPIC_API_KEY not set")
        return None

    try:
        resp = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-6",
                "max_tokens": 500,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30,
        )
        resp.raise_for_status()
        content = resp.json().get("content", [])
        return content[0]["text"].strip() if content else None
    except Exception as e:
        log.warning("Claude API error: %s", e)
        return None


def generate_case_studies(
    conn: sqlite3.Connection,
    provider: str = "ollama",
    limit: int = 100,
    min_score: int = 0,
    sector: str | None = None,
    force: bool = False,
) -> int:
    """Generate AI case studies for events missing them.

    Args:
        conn: SQLite connection
        provider: "ollama" or "claude"
        limit: Max studies to generate
        min_score: Only generate for events with pounce_score >= this
        sector: Filter by sector
        force: Regenerate even if summary_ai exists

    Returns:
        Number of studies generated
    """
    conditions = ["catalyst_type IS NOT NULL", "catalyst_type != 'unknown'"]
    params = []

    if not force:
        conditions.append("summary_ai IS NULL")
    if min_score:
        conditions.append("pounce_score >= ?")
        params.append(min_score)
    if sector:
        conditions.append("sector = ?")
        params.append(sector)

    where = " AND ".join(conditions)
    params.append(limit)

    cur = conn.execute(f"""
        SELECT * FROM peak_dip_events
        WHERE {where}
        ORDER BY pounce_score DESC
        LIMIT ?
    """, params)
    events = [dict(r) for r in cur.fetchall()]

    if not events:
        log.info("No events need case studies (provider=%s)", provider)
        return 0

    log.info("Generating %d case studies with %s...", len(events), provider)

    generate_fn = generate_with_ollama if provider == "ollama" else generate_with_claude
    generated = 0

    for i, event in enumerate(events):
        # Build outcome string
        if event.get("outcome_5d") is not None:
            outcome_5d = event["outcome_5d"]
            outcome_str = f"{'+'if outcome_5d >= 0 else ''}{outcome_5d:.1f}% ({'WIN' if event.get('win_5d') else 'LOSS'})"
        else:
            outcome_str = "Pending — not yet resolved"

        prompt = CASE_STUDY_PROMPT.format(
            ticker=event["ticker"],
            name=event.get("name") or event["ticker"],
            sector=event.get("sector") or "Unknown",
            signal_date=event["signal_date"],
            gap_pct=event.get("gap_pct") or 0,
            gap_open=event.get("gap_open") or 0,
            prev_close=event.get("prev_close") or 0,
            day_high=event.get("day_high") or 0,
            selloff_pct=event.get("selloff_pct") or 0,
            day_close=event.get("day_close") or 0,
            volume_ratio=event.get("volume_ratio") or 1.0,
            catalyst_type=event.get("catalyst_type") or "unknown",
            catalyst_detail=event.get("catalyst_detail") or "No details available",
            market_regime=event.get("market_regime") or "neutral",
            outcome_str=outcome_str,
        )

        study = generate_fn(prompt)
        if study:
            conn.execute("""
                UPDATE peak_dip_events
                SET summary_ai = ?, ai_provider = ?, ai_generated_at = datetime('now'), updated_at = datetime('now')
                WHERE id = ?
            """, (study, provider, event["id"]))
            conn.commit()
            generated += 1
            log.info("  [%d/%d] %s %s — %d chars", i + 1, len(events), event["ticker"], event["signal_date"], len(study))
        else:
            log.warning("  [%d/%d] %s — generation failed", i + 1, len(events), event["ticker"])

        # Rate limiting
        if provider == "claude":
            time.sleep(0.5)  # Claude API rate limit
        else:
            time.sleep(0.1)  # Ollama is local, minimal delay

    log.info("Case study generation complete: %d/%d generated with %s", generated, len(events), provider)
    return generated
```

- [ ] **Step 2: Add CLI command**

Add to `/home/will/stock-data-pipeline/pipeline.py` after the `enrich_catalysts_cmd`:

```python
@cli.command("generate-studies")
@click.option("--provider", type=click.Choice(["ollama", "claude"]), default="ollama", help="AI provider")
@click.option("--limit", default=100, help="Max studies to generate")
@click.option("--min-score", default=0, help="Minimum pounce score")
@click.option("--sector", default=None, help="Filter by sector")
@click.option("--force", is_flag=True, help="Regenerate existing studies")
@click.pass_context
def generate_studies(ctx, provider, limit, min_score, sector, force):
    """Generate AI case studies for peak/dip events."""
    from ai_case_studies import generate_case_studies

    conn = ctx.obj["conn"]
    log.info("=" * 60)
    log.info("AI CASE STUDY GENERATION — provider=%s, limit=%d", provider, limit)
    log.info("=" * 60)

    count = generate_case_studies(conn, provider=provider, limit=limit,
                                  min_score=min_score, sector=sector, force=force)
    log.info("Done: %d studies generated", count)
```

- [ ] **Step 3: Test with Ollama (small batch)**

```bash
cd /home/will/stock-data-pipeline
source .venv/bin/activate
python pipeline.py generate-studies --provider ollama --limit 5
```

- [ ] **Step 4: Commit**

```bash
git add ai_case_studies.py pipeline.py
git commit -m "feat: AI case study pipeline — Ollama (qwen) + Claude (sonnet) providers"
git push origin main
```

---

### Task 7: Populate upcoming_earnings table

The prediction engine needs earnings dates. Fetch them from yfinance.

**Files:**
- Modify: `/home/will/stock-data-pipeline/pipeline.py`

- [ ] **Step 1: Add earnings refresh command**

Add to pipeline.py:

```python
@cli.command("refresh-earnings")
@click.pass_context
def refresh_earnings(ctx):
    """Refresh upcoming earnings dates from yfinance."""
    import yfinance as yf
    from datetime import date, timedelta

    conn = ctx.obj["conn"]
    ticker_list = ticker_mod.get_ticker_list(conn)

    log.info("Refreshing upcoming earnings for %d tickers...", len(ticker_list))

    # Clear old entries
    conn.execute("DELETE FROM upcoming_earnings")

    found = 0
    for i, ticker in enumerate(tqdm(ticker_list, desc="earnings dates", disable=None)):
        try:
            info = yf.Ticker(ticker).calendar
            if info is not None and not info.empty:
                # yfinance returns a DataFrame or dict depending on version
                if hasattr(info, "iloc"):
                    earnings_date = info.iloc[0, 0] if len(info.columns) > 0 else None
                elif isinstance(info, dict):
                    earnings_date = info.get("Earnings Date", [None])[0] if "Earnings Date" in info else None
                else:
                    earnings_date = None

                if earnings_date:
                    if hasattr(earnings_date, "strftime"):
                        date_str = earnings_date.strftime("%Y-%m-%d")
                    else:
                        date_str = str(earnings_date)[:10]

                    conn.execute(
                        "INSERT OR REPLACE INTO upcoming_earnings (ticker, earnings_date, fetched_at) VALUES (?, ?, datetime('now'))",
                        (ticker, date_str),
                    )
                    found += 1
        except Exception:
            pass

        if (i + 1) % 100 == 0:
            conn.commit()

    conn.commit()
    log.info("Found upcoming earnings for %d tickers", found)
```

- [ ] **Step 2: Run the command**

```bash
python pipeline.py refresh-earnings 2>&1 | tee logs/earnings-refresh.log
```

- [ ] **Step 3: Commit**

```bash
git add pipeline.py
git commit -m "feat: add refresh-earnings command to populate upcoming earnings dates"
git push origin main
```

---

### Task 8: Simulator campaign mode frontend

Connect the existing Simulator to the readiness score system and add campaign mode.

**Files:**
- Modify: `/home/will/PeakDipVibe/src/features/simulator/SimulatorPage.tsx`
- Create: `/home/will/PeakDipVibe/src/features/simulator/components/ReadinessWidget.tsx`

- [ ] **Step 1: Create the ReadinessWidget**

Create `/home/will/PeakDipVibe/src/features/simulator/components/ReadinessWidget.tsx`:

```tsx
import { useReadinessScore } from "@/api/hooks/useTracker";

export function ReadinessWidget() {
  const { data: score, isLoading } = useReadinessScore("user");

  if (isLoading || !score) return null;

  const color =
    score.overall_score >= 85 ? "#6366f1" :
    score.overall_score >= 70 ? "#22c55e" :
    score.overall_score >= 40 ? "#f59e0b" : "#ef4444";

  const level =
    score.graduation_level === "graduate" ? "Graduate" :
    score.graduation_level === "ready" ? "Ready" :
    score.graduation_level === "getting_there" ? "Getting There" : "Beginner";

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {score.overall_score}
        </div>
        <div>
          <div className="text-sm font-semibold text-text-primary">Your Readiness</div>
          <div className="text-xs" style={{ color }}>{level}</div>
          <div className="text-[10px] text-text-muted">{score.total_trades} trades</div>
        </div>
      </div>
      {score.notes && (
        <p className="mt-2 text-xs text-text-muted">{score.notes}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add ReadinessWidget to SimulatorPage**

Read `/home/will/PeakDipVibe/src/features/simulator/SimulatorPage.tsx`. Add the import at the top:

```tsx
import { ReadinessWidget } from "./components/ReadinessWidget";
```

Add the widget somewhere visible in the page — find the main return JSX and add it near the top or in a sidebar position:

```tsx
<ReadinessWidget />
```

The exact placement depends on the current layout. Add it after the header section or in the controls area.

- [ ] **Step 3: Build and test**

```bash
cd /home/will/PeakDipVibe
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/features/simulator/
git commit -m "feat: add readiness score widget to simulator page"
git push origin main
```

---

### Task 9: Self-learning automation

Create scripts for weekly factor recalibration and integrate into the daily refresh.

**Files:**
- Create: `/home/will/stock-data-pipeline/self_learning.py`
- Modify: `/home/will/stock-data-pipeline/daily-refresh.sh`

- [ ] **Step 1: Create the self-learning module**

Create `/home/will/stock-data-pipeline/self_learning.py`:

```python
"""Self-Learning Module — recalibrate pounce scores and track model accuracy.

Runs weekly to:
1. Recompute pounce scores for all events (as historical data grows, scores improve)
2. Track prediction accuracy over time
3. Generate a learning summary
"""

import logging
import sqlite3
from datetime import datetime

import db
from peak_dip_scanner import compute_pounce_score, generate_auto_summary

log = logging.getLogger(__name__)


def recalibrate_scores(conn: sqlite3.Connection) -> dict:
    """Recompute pounce scores for all resolved events.

    As more historical data accumulates, the historical win rate component
    becomes more accurate. This recalibration propagates that improvement.

    Returns dict with recalibration stats.
    """
    cur = conn.execute("""
        SELECT id, ticker, gap_pct, selloff_pct, volume_ratio,
               catalyst_type, market_regime, gap_bucket, sector,
               pounce_score AS old_score, day_close,
               outcome_1d, outcome_3d, outcome_5d, outcome_10d, outcome_20d,
               win_1d, win_5d, win_10d, name, gap_open, prev_close,
               day_high, selloff_volume, catalyst_detail
        FROM peak_dip_events
        WHERE win_5d IS NOT NULL
    """)
    events = cur.fetchall()

    if not events:
        log.info("No resolved events to recalibrate")
        return {"total": 0, "changed": 0, "avg_delta": 0}

    changed = 0
    total_delta = 0

    for ev in events:
        new_score, _ = compute_pounce_score(
            conn, ev["gap_pct"], ev["selloff_pct"], ev["volume_ratio"],
            ev["catalyst_type"], ev["market_regime"], ev["gap_bucket"], ev["sector"],
        )

        old_score = ev["old_score"] or 0
        delta = abs(new_score - old_score)
        total_delta += delta

        if delta >= 2:  # only update if meaningful change
            # Regenerate auto summary too
            event_dict = dict(ev)
            event_dict["pounce_score"] = new_score
            summary = generate_auto_summary(event_dict)

            conn.execute("""
                UPDATE peak_dip_events
                SET pounce_score = ?, summary_auto = ?, updated_at = datetime('now')
                WHERE id = ?
            """, (new_score, summary, ev["id"]))
            changed += 1

    conn.commit()

    stats = {
        "total": len(events),
        "changed": changed,
        "avg_delta": round(total_delta / len(events), 2) if events else 0,
        "recalibrated_at": datetime.now().isoformat(),
    }

    log.info("Recalibration complete: %d/%d scores changed (avg delta: %.1f)",
             changed, len(events), stats["avg_delta"])
    return stats


def compute_accuracy_report(conn: sqlite3.Connection) -> dict:
    """Generate an accuracy report for the prediction model.

    Compares pounce scores against actual outcomes to measure
    how well the scoring predicts wins.
    """
    cur = conn.execute("""
        SELECT
            CASE
                WHEN pounce_score >= 65 THEN 'high'
                WHEN pounce_score >= 45 THEN 'medium'
                ELSE 'low'
            END AS score_tier,
            COUNT(*) AS total,
            SUM(win_5d) AS wins,
            AVG(outcome_5d) AS avg_return
        FROM peak_dip_events
        WHERE win_5d IS NOT NULL AND pounce_score IS NOT NULL
        GROUP BY score_tier
    """)

    report = {}
    for row in cur.fetchall():
        tier = row["score_tier"]
        total = row["total"]
        wins = row["wins"] or 0
        report[tier] = {
            "total": total,
            "wins": wins,
            "win_rate": round(wins / total * 100, 1) if total > 0 else 0,
            "avg_return": round(row["avg_return"], 2) if row["avg_return"] else 0,
        }

    # The model is "working" if high-score events have higher win rates than low-score
    high_wr = report.get("high", {}).get("win_rate", 0)
    low_wr = report.get("low", {}).get("win_rate", 0)
    report["model_calibrated"] = high_wr > low_wr

    log.info("Accuracy report: high=%.1f%% medium=%.1f%% low=%.1f%% calibrated=%s",
             report.get("high", {}).get("win_rate", 0),
             report.get("medium", {}).get("win_rate", 0),
             report.get("low", {}).get("win_rate", 0),
             report["model_calibrated"])

    return report
```

- [ ] **Step 2: Add CLI command**

Add to pipeline.py:

```python
@cli.command("recalibrate")
@click.pass_context
def recalibrate(ctx):
    """Recalibrate pounce scores using accumulated historical data."""
    from self_learning import recalibrate_scores, compute_accuracy_report

    conn = ctx.obj["conn"]
    log.info("=" * 60)
    log.info("SELF-LEARNING RECALIBRATION")
    log.info("=" * 60)

    stats = recalibrate_scores(conn)
    report = compute_accuracy_report(conn)

    print(f"\nRecalibration: {stats['changed']}/{stats['total']} scores updated (avg delta: {stats['avg_delta']})")
    print(f"\nAccuracy Report:")
    for tier in ["high", "medium", "low"]:
        if tier in report:
            r = report[tier]
            print(f"  {tier:8s} — {r['win_rate']:5.1f}% win rate ({r['wins']}/{r['total']}), avg return: {r['avg_return']:+.2f}%")
    print(f"  Model calibrated: {'YES' if report.get('model_calibrated') else 'NO — needs more data'}")
```

- [ ] **Step 3: Add weekly recalibration to daily-refresh.sh**

In `/home/will/stock-data-pipeline/daily-refresh.sh`, add after the pipeline watch step:

```bash
# Weekly recalibration (runs on Fridays only)
if [ "$(date +%u)" -eq 5 ]; then
    echo "[WEEKLY] Running pounce score recalibration..."
    python pipeline.py recalibrate 2>&1 || true
fi
```

- [ ] **Step 4: Test recalibration**

```bash
cd /home/will/stock-data-pipeline
source .venv/bin/activate
python pipeline.py recalibrate
```

- [ ] **Step 5: Commit**

```bash
git add self_learning.py pipeline.py daily-refresh.sh
git commit -m "feat: self-learning automation — weekly score recalibration + accuracy reports"
git push origin main
```

---

### Task 10: Cache fresh tracker data + push to production

After all enrichment is done, refresh the cached JSON files and deploy.

**Files:** None new — operational task

- [ ] **Step 1: Start local API and cache data**

```bash
cd /home/will/stock-data-pipeline
source .venv/bin/activate
uvicorn api.main:app --port 8099 &
sleep 3

mkdir -p /home/will/PeakDipVibe/data/tracker
curl -s http://localhost:8099/api/tracker/summary -o /home/will/PeakDipVibe/data/tracker/summary.json
curl -s "http://localhost:8099/api/tracker/events?days=30&limit=50" -o /home/will/PeakDipVibe/data/tracker/events.json
curl -s "http://localhost:8099/api/tracker/events?stage=recovering&limit=50" -o /home/will/PeakDipVibe/data/tracker/events-recovering.json
curl -s "http://localhost:8099/api/tracker/events?days=1825&limit=50" -o /home/will/PeakDipVibe/data/tracker/events-history.json
curl -s "http://localhost:8099/api/tracker/stats?days=365" -o /home/will/PeakDipVibe/data/tracker/stats.json
curl -s "http://localhost:8099/api/tracker/predictions" -o /home/will/PeakDipVibe/data/tracker/predictions.json

kill %1
```

- [ ] **Step 2: Push to production**

```bash
cd /home/will/PeakDipVibe
git add data/tracker/
git commit -m "data: refresh tracker cache with enriched catalyst data + expanded events"
git push origin main

cd /home/will/stock-data-pipeline
git push origin main
```

- [ ] **Step 3: Verify production**

```bash
sleep 90
curl -s https://stocks.ecbtx.com/api/tracker/summary | python3 -m json.tool
curl -s "https://stocks.ecbtx.com/api/tracker/events?limit=3" | python3 -c "
import sys, json
events = json.load(sys.stdin)
for e in events:
    print(f'{e[\"ticker\"]:6s} score={e.get(\"pounce_score\",0):3d} catalyst={e.get(\"catalyst_type\",\"?\")} ai={\"yes\" if e.get(\"summary_ai\") else \"no\"}')"
```

- [ ] **Step 4: Playwright verification**

Navigate to `https://stocks.ecbtx.com/tracker` and verify:
1. Summary bar shows updated counts and win rates
2. Event cards show catalyst types (not all "unknown")
3. Expanded events show AI case studies where generated
4. All 5 tabs work
