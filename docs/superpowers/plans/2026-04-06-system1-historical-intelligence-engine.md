# System 1: Historical Intelligence Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the historical database of earnings gap-up → sell-off → recovery events across S&P 500 + full NASDAQ, with pounce scoring, outcome tracking, Tier 1 auto-summaries, and API endpoints — the statistical foundation for the Peak/Dip Tracker.

**Architecture:** New `peak_dip_scanner.py` module in stock-data-pipeline follows the existing `scanner.py` pattern — SQL-based detection from `daily_prices`, enrichment with catalyst data, composite scoring, outcome tracking. New `peak_dip_events` table stores results. New FastAPI router serves data. `server.mjs` proxies the endpoints to the frontend.

**Tech Stack:** Python 3.12 (stock-data-pipeline), SQLite (market.db), FastAPI, Node.js (server.mjs)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `/home/will/stock-data-pipeline/db.py` | Modify | Add `peak_dip_events` table to `init_db()`, add `upsert_peak_dip_event()` and `get_peak_dip_events()` helpers |
| `/home/will/stock-data-pipeline/peak_dip_scanner.py` | Create | Detection logic: find earnings gap-ups, classify sell-offs, compute pounce scores, generate Tier 1 summaries, track outcomes |
| `/home/will/stock-data-pipeline/pipeline.py` | Modify | Add `scan-peaks` CLI command and integrate into `watch` command |
| `/home/will/stock-data-pipeline/api/schemas/tracker.py` | Create | Pydantic models for peak/dip events and summary stats |
| `/home/will/stock-data-pipeline/api/routers/tracker.py` | Create | FastAPI endpoints: list events, get event detail, summary stats |
| `/home/will/stock-data-pipeline/api/main.py` | Modify | Mount tracker router |
| `/home/will/PeakDipVibe/server.mjs` | Modify | Add `/api/tracker/*` endpoint handling (proxy to R730, cached fallback) |
| `/home/will/stock-data-pipeline/daily-refresh.sh` | Modify | Add tracker data to cached JSON refresh |

---

### Task 1: Add peak_dip_events table to database schema

**Files:**
- Modify: `/home/will/stock-data-pipeline/db.py`

- [ ] **Step 1: Add the table creation SQL to init_db()**

In `/home/will/stock-data-pipeline/db.py`, find the `init_db()` function. Add the following table creation at the end of the `conn.executescript("""...""")` block, before the closing `""")`:

```sql
        CREATE TABLE IF NOT EXISTS peak_dip_events (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            ticker          TEXT NOT NULL,
            name            TEXT,
            sector          TEXT,
            market_cap_tier TEXT,
            earnings_date   TEXT,
            signal_date     TEXT NOT NULL,
            prev_close      REAL,
            gap_open        REAL,
            gap_pct         REAL,
            day_high        REAL,
            day_close       REAL,
            selloff_pct     REAL,
            selloff_volume  INTEGER,
            avg_volume      INTEGER,
            volume_ratio    REAL,
            catalyst_type   TEXT,
            catalyst_detail TEXT,
            market_regime   TEXT,
            gap_bucket      TEXT,
            selloff_bucket  TEXT,
            outcome_1d      REAL,
            outcome_3d      REAL,
            outcome_5d      REAL,
            outcome_10d     REAL,
            outcome_20d     REAL,
            win_1d          INTEGER,
            win_5d          INTEGER,
            win_10d         INTEGER,
            pounce_score    INTEGER,
            stage           TEXT DEFAULT 'resolved',
            summary_auto    TEXT,
            summary_ai      TEXT,
            ai_provider     TEXT,
            ai_generated_at TEXT,
            created_at      TEXT DEFAULT (datetime('now')),
            updated_at      TEXT DEFAULT (datetime('now')),
            UNIQUE(ticker, signal_date)
        );

        CREATE INDEX IF NOT EXISTS idx_pde_ticker_date ON peak_dip_events(ticker, signal_date);
        CREATE INDEX IF NOT EXISTS idx_pde_stage ON peak_dip_events(stage);
        CREATE INDEX IF NOT EXISTS idx_pde_earnings ON peak_dip_events(earnings_date);
        CREATE INDEX IF NOT EXISTS idx_pde_score ON peak_dip_events(pounce_score DESC);
        CREATE INDEX IF NOT EXISTS idx_pde_sector ON peak_dip_events(sector);
        CREATE INDEX IF NOT EXISTS idx_pde_catalyst ON peak_dip_events(catalyst_type);
```

- [ ] **Step 2: Add upsert_peak_dip_event() helper**

Add this function after the existing `upsert_pattern_signal()` function in `db.py`:

```python
def upsert_peak_dip_event(conn: sqlite3.Connection, event: dict) -> None:
    """Insert or update a peak/dip event."""
    cols = [
        "ticker", "name", "sector", "market_cap_tier", "earnings_date",
        "signal_date", "prev_close", "gap_open", "gap_pct", "day_high",
        "day_close", "selloff_pct", "selloff_volume", "avg_volume",
        "volume_ratio", "catalyst_type", "catalyst_detail", "market_regime",
        "gap_bucket", "selloff_bucket", "outcome_1d", "outcome_3d",
        "outcome_5d", "outcome_10d", "outcome_20d", "win_1d", "win_5d",
        "win_10d", "pounce_score", "stage", "summary_auto", "summary_ai",
        "ai_provider", "ai_generated_at",
    ]
    placeholders = ", ".join("?" for _ in cols)
    col_str = ", ".join(cols)
    update_str = ", ".join(f"{c} = excluded.{c}" for c in cols if c not in ("ticker", "signal_date"))
    values = [event.get(c) for c in cols]

    conn.execute(
        f"""INSERT INTO peak_dip_events ({col_str})
            VALUES ({placeholders})
            ON CONFLICT(ticker, signal_date) DO UPDATE SET
            {update_str}, updated_at = datetime('now')""",
        values,
    )
    conn.commit()
```

- [ ] **Step 3: Add get_peak_dip_events() query helper**

Add this function after `upsert_peak_dip_event()`:

```python
def get_peak_dip_events(
    conn: sqlite3.Connection,
    stage: str | None = None,
    days: int = 30,
    min_score: int = 0,
    catalyst_type: str | None = None,
    sector: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict]:
    """Query peak/dip events with optional filters."""
    conditions = ["signal_date >= date('now', ?)"]
    params: list = [f"-{days} days"]

    if stage:
        conditions.append("stage = ?")
        params.append(stage)
    if min_score:
        conditions.append("pounce_score >= ?")
        params.append(min_score)
    if catalyst_type:
        conditions.append("catalyst_type = ?")
        params.append(catalyst_type)
    if sector:
        conditions.append("sector = ?")
        params.append(sector)

    where = " AND ".join(conditions)
    params.extend([limit, offset])

    cur = conn.execute(
        f"""SELECT * FROM peak_dip_events
            WHERE {where}
            ORDER BY signal_date DESC, pounce_score DESC
            LIMIT ? OFFSET ?""",
        params,
    )
    return [dict(row) for row in cur.fetchall()]


def get_peak_dip_summary(conn: sqlite3.Connection) -> dict:
    """Get summary stats for the tracker dashboard."""
    cur = conn.execute("""
        SELECT
            COUNT(*) FILTER (WHERE stage IN ('peaked', 'selling_off', 'dip_zone')) AS active_count,
            AVG(pounce_score) FILTER (WHERE stage IN ('peaked', 'selling_off', 'dip_zone')) AS avg_active_score,
            COUNT(*) FILTER (WHERE stage = 'recovering') AS recovering_count,
            COUNT(*) AS total_events,
            AVG(CASE WHEN win_5d = 1 THEN 100.0 ELSE 0.0 END) AS overall_win_rate_5d,
            COUNT(*) FILTER (WHERE win_5d IS NOT NULL) AS resolved_count
        FROM peak_dip_events
    """)
    row = cur.fetchone()
    if not row:
        return {"active_count": 0, "avg_active_score": 0, "recovering_count": 0,
                "total_events": 0, "overall_win_rate_5d": 0, "resolved_count": 0}
    return dict(row)
```

- [ ] **Step 4: Test table creation**

```bash
cd /home/will/stock-data-pipeline
source .venv/bin/activate
python -c "
import db
conn = db.get_conn()
db.init_db(conn)
# Verify table exists
cur = conn.execute(\"SELECT name FROM sqlite_master WHERE type='table' AND name='peak_dip_events'\")
assert cur.fetchone() is not None, 'Table not created!'
# Verify columns
cur = conn.execute('PRAGMA table_info(peak_dip_events)')
cols = [row[1] for row in cur.fetchall()]
assert 'pounce_score' in cols
assert 'summary_auto' in cols
assert 'stage' in cols
print(f'peak_dip_events table created with {len(cols)} columns')
conn.close()
"
```

Expected: `peak_dip_events table created with 36 columns`

- [ ] **Step 5: Commit**

```bash
cd /home/will/stock-data-pipeline
git add db.py
git commit -m "feat: add peak_dip_events table schema and query helpers"
```

---

### Task 2: Create the peak/dip scanner module

This is the core detection engine. It scans historical daily_prices for earnings gap-up → sell-off patterns and stores classified events.

**Files:**
- Create: `/home/will/stock-data-pipeline/peak_dip_scanner.py`

- [ ] **Step 1: Create the scanner module**

Create `/home/will/stock-data-pipeline/peak_dip_scanner.py`:

```python
"""Peak/Dip Scanner — detect earnings gap-up → sell-off → recovery patterns.

Scans daily_prices for stocks that gapped up on earnings day and experienced
an intraday sell-off. Computes pounce scores, tracks outcomes, generates
Tier 1 auto-summaries.

Usage:
    from peak_dip_scanner import scan_peak_dips, backfill_peak_dips
    count = scan_peak_dips(conn, lookback_days=5)           # daily scan
    count = backfill_peak_dips(conn, start="2021-01-01")    # historical
"""

import logging
import sqlite3
from datetime import datetime, timedelta

import config
import db

log = logging.getLogger(__name__)

# Detection thresholds
GAPUP_MIN_PCT = 0.02       # 2% minimum gap-up
SELLOFF_MIN_PCT = 0.01     # 1% minimum intraday sell-off

# Gap buckets
def _gap_bucket(gap_pct: float) -> str:
    if gap_pct >= 20: return "massive"
    if gap_pct >= 10: return "large"
    if gap_pct >= 5: return "medium"
    return "small"

# Sell-off buckets
def _selloff_bucket(selloff_pct: float) -> str:
    if selloff_pct >= 5: return "deep"
    if selloff_pct >= 2: return "moderate"
    return "shallow"

# Market cap tier
def _cap_tier(market_cap: float | None) -> str:
    if not market_cap: return "unknown"
    if market_cap >= 10e9: return "large"
    if market_cap >= 2e9: return "mid"
    if market_cap >= 300e6: return "small"
    return "micro"


# ---------------------------------------------------------------------------
# Market regime detection
# ---------------------------------------------------------------------------

def _get_market_regime(conn: sqlite3.Connection, date: str) -> str:
    """Determine bull/bear/neutral regime on a given date.

    Uses % of stocks above SMA-50 and average RSI from the indicators table.
    """
    cur = conn.execute("""
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN dp.close > sma.value THEN 1 ELSE 0 END) AS above_sma50,
            AVG(rsi.value) AS avg_rsi
        FROM daily_prices dp
        LEFT JOIN indicators sma ON dp.ticker = sma.ticker AND sma.date = dp.date AND sma.indicator = 'SMA_50'
        LEFT JOIN indicators rsi ON dp.ticker = rsi.ticker AND rsi.date = dp.date AND rsi.indicator = 'RSI_14'
        WHERE dp.date = ? AND dp.close IS NOT NULL AND dp.close > 0
    """, (date,))
    row = cur.fetchone()
    if not row or not row["total"]:
        return "neutral"

    pct_above = (row["above_sma50"] or 0) / row["total"] * 100 if row["total"] > 0 else 50
    avg_rsi = row["avg_rsi"] or 50

    if pct_above > 60 and avg_rsi > 55:
        return "bull"
    elif pct_above < 35 and avg_rsi < 42:
        return "bear"
    return "neutral"


# ---------------------------------------------------------------------------
# Pounce score computation
# ---------------------------------------------------------------------------

def compute_pounce_score(
    conn: sqlite3.Connection,
    gap_pct: float,
    selloff_pct: float,
    volume_ratio: float | None,
    catalyst_type: str | None,
    market_regime: str,
    gap_bucket: str,
    sector: str | None,
) -> tuple[int, dict]:
    """Compute pounce score (0-100) from 5 weighted factors.

    Returns (total_score, component_scores_dict).
    """
    # --- Historical win rate (30 pts) ---
    # Query similar past events for their win rate
    conditions = ["win_5d IS NOT NULL"]
    params = []
    if gap_bucket:
        conditions.append("gap_bucket = ?")
        params.append(gap_bucket)
    if catalyst_type:
        conditions.append("catalyst_type = ?")
        params.append(catalyst_type)
    if market_regime:
        conditions.append("market_regime = ?")
        params.append(market_regime)

    where = " AND ".join(conditions)
    cur = conn.execute(
        f"""SELECT COUNT(*) AS n, SUM(win_5d) AS wins
            FROM peak_dip_events WHERE {where}""",
        params,
    )
    row = cur.fetchone()
    n_similar = row["n"] if row else 0
    win_rate = (row["wins"] / n_similar * 100) if n_similar > 0 and row["wins"] else 50
    # More data = more confidence, scale by sample size
    confidence = min(1.0, n_similar / 20)  # full confidence at 20+ similar events
    hist_score = (win_rate / 100) * 30 * confidence

    # --- Catalyst strength (20 pts) ---
    catalyst_scores = {
        "earnings_beat": 20,
        "guidance_raise": 18,
        "revenue_beat": 16,
        "upgrade": 14,
        "guidance": 12,
        "positive_news": 8,
        "neutral": 4,
    }
    catalyst_score = catalyst_scores.get(catalyst_type or "", 4)

    # --- Sell-off depth (20 pts) ---
    # Moderate sell-offs (2-5%) are ideal — deep enough to be real, not so deep it's trouble
    if 2 <= selloff_pct <= 5:
        selloff_score = 20
    elif 1 <= selloff_pct < 2:
        selloff_score = selloff_pct / 2 * 20  # linear 0-20
    elif selloff_pct > 5:
        selloff_score = max(5, 20 - (selloff_pct - 5) * 2)  # penalty for deep sell-offs
    else:
        selloff_score = 5

    # --- Volume profile (15 pts) ---
    # Sell-off on declining volume = weak selling = higher score
    if volume_ratio is not None:
        if volume_ratio < 1.0:
            vol_score = 15  # below-average volume sell-off = best
        elif volume_ratio < 1.5:
            vol_score = 12
        elif volume_ratio < 2.5:
            vol_score = 8
        else:
            vol_score = 3  # heavy volume sell-off = distribution
    else:
        vol_score = 7  # neutral if unknown

    # --- Market regime (15 pts) ---
    regime_scores = {"bull": 15, "neutral": 10, "bear": 5}
    regime_score = regime_scores.get(market_regime, 10)

    total = int(round(hist_score + catalyst_score + selloff_score + vol_score + regime_score))
    total = min(100, max(0, total))

    components = {
        "historical_win_rate": round(hist_score, 1),
        "catalyst_strength": round(catalyst_score, 1),
        "selloff_depth": round(selloff_score, 1),
        "volume_profile": round(vol_score, 1),
        "market_regime": round(regime_score, 1),
        "n_similar": n_similar,
        "win_rate_pct": round(win_rate, 1),
    }

    return total, components


# ---------------------------------------------------------------------------
# Tier 1 auto-summary generation
# ---------------------------------------------------------------------------

def generate_auto_summary(event: dict) -> str:
    """Generate a Tier 1 template-based summary for an event."""
    ticker = event["ticker"]
    name = event.get("name") or ticker
    gap_pct = event.get("gap_pct", 0)
    selloff_pct = event.get("selloff_pct", 0)
    catalyst = event.get("catalyst_type") or "news catalyst"
    catalyst_detail = event.get("catalyst_detail") or ""

    # Catalyst label
    catalyst_labels = {
        "earnings_beat": "earnings beat",
        "guidance_raise": "guidance raise",
        "revenue_beat": "revenue beat",
        "upgrade": "analyst upgrade",
        "guidance": "positive guidance",
        "positive_news": "positive news",
    }
    catalyst_label = catalyst_labels.get(catalyst, catalyst.replace("_", " "))

    summary = f"{name} ({ticker}) gapped up {gap_pct:.1f}% on {catalyst_label}."

    if catalyst_detail:
        summary += f" {catalyst_detail}"

    summary += f" Sold off {selloff_pct:.1f}% from peak."

    # Add outcome if resolved
    outcome_5d = event.get("outcome_5d")
    if outcome_5d is not None:
        if outcome_5d > 0:
            summary += f" Recovery: +{outcome_5d:.1f}% over 5 days."
        else:
            summary += f" Continued declining: {outcome_5d:.1f}% over 5 days."

    win_5d = event.get("win_5d")
    if win_5d is not None:
        summary += " ✓ WIN" if win_5d else " ✗ LOSS"

    return summary


# ---------------------------------------------------------------------------
# Core detection: find earnings gap-ups with sell-offs
# ---------------------------------------------------------------------------

def _find_earnings_gap_ups(
    conn: sqlite3.Connection,
    start_date: str,
    end_date: str | None = None,
) -> list[dict]:
    """Find all gap-up events from daily_prices within a date range.

    Returns candidates with gap_up_pct >= 2% and selloff_pct >= 1%.
    Uses SQL joins for efficiency — no API calls needed.
    """
    end_clause = f"AND d0.date <= '{end_date}'" if end_date else ""

    cur = conn.execute(f"""
        SELECT
            d0.ticker,
            t.name,
            t.sector,
            t.market_cap,
            p.date AS prev_date,
            p.close AS prev_close,
            d0.date AS signal_date,
            d0.open AS gap_open,
            d0.high AS day_high,
            d0.low AS day_low,
            d0.close AS day_close,
            d0.volume AS selloff_volume,
            (d0.open - p.close) / p.close AS gap_pct_raw,
            CASE WHEN d0.high > 0 THEN (d0.high - d0.close) / d0.high ELSE 0 END AS selloff_pct_raw
        FROM daily_prices d0
        JOIN daily_prices p ON d0.ticker = p.ticker
            AND p.date = (
                SELECT MAX(date) FROM daily_prices
                WHERE ticker = d0.ticker AND date < d0.date
            )
        LEFT JOIN tickers t ON d0.ticker = t.ticker
        WHERE d0.date >= ?
            {end_clause}
            AND p.close > 0 AND d0.open > 0 AND d0.close > 0 AND d0.high > 0
            AND (d0.open - p.close) / p.close >= {GAPUP_MIN_PCT}
            AND CASE WHEN d0.high > 0 THEN (d0.high - d0.close) / d0.high ELSE 0 END >= {SELLOFF_MIN_PCT}
        ORDER BY d0.date ASC
    """, (start_date,))

    candidates = []
    for row in cur.fetchall():
        r = dict(row)
        r["gap_pct"] = round(r.pop("gap_pct_raw") * 100, 2)
        r["selloff_pct"] = round(r.pop("selloff_pct_raw") * 100, 2)
        r["market_cap_tier"] = _cap_tier(r.pop("market_cap", None))
        r["gap_bucket"] = _gap_bucket(r["gap_pct"])
        r["selloff_bucket"] = _selloff_bucket(r["selloff_pct"])
        candidates.append(r)

    return candidates


def _get_avg_volume(conn: sqlite3.Connection, ticker: str, before_date: str) -> int | None:
    """Get 20-day average volume for a ticker before a given date."""
    cur = conn.execute("""
        SELECT AVG(volume) AS avg_vol FROM (
            SELECT volume FROM daily_prices
            WHERE ticker = ? AND date < ? AND volume > 0
            ORDER BY date DESC LIMIT 20
        )
    """, (ticker, before_date))
    row = cur.fetchone()
    return int(row["avg_vol"]) if row and row["avg_vol"] else None


def _get_future_prices(conn: sqlite3.Connection, ticker: str, after_date: str, days: int = 20) -> list[dict]:
    """Get the next N trading days of prices after a date."""
    cur = conn.execute("""
        SELECT date, close, volume FROM daily_prices
        WHERE ticker = ? AND date > ?
        ORDER BY date ASC LIMIT ?
    """, (ticker, after_date, days))
    return [dict(row) for row in cur.fetchall()]


def _compute_outcomes(day_close: float, future_prices: list[dict]) -> dict:
    """Compute 1d, 3d, 5d, 10d, 20d outcomes from future prices."""
    outcomes = {}
    for day_n, key in [(0, "1d"), (2, "3d"), (4, "5d"), (9, "10d"), (19, "20d")]:
        if len(future_prices) > day_n and future_prices[day_n]["close"] and day_close > 0:
            pct = round((future_prices[day_n]["close"] - day_close) / day_close * 100, 2)
            outcomes[f"outcome_{key}"] = pct
            if key in ("1d", "5d", "10d"):
                outcomes[f"win_{key}"] = 1 if pct > 0 else 0
    return outcomes


# ---------------------------------------------------------------------------
# Catalyst matching (uses existing earnings data)
# ---------------------------------------------------------------------------

def _match_catalyst(conn: sqlite3.Connection, ticker: str, signal_date: str) -> tuple[str | None, str | None, str | None]:
    """Match a gap-up event to a catalyst from news_events or earnings data.

    Returns (catalyst_type, catalyst_detail, earnings_date).
    """
    # Check news_events table first (populated by existing scanner)
    cur = conn.execute("""
        SELECT category, headline FROM news_events
        WHERE ticker = ? AND date BETWEEN date(?, '-3 days') AND ?
        ORDER BY CASE category
            WHEN 'earnings_beat' THEN 1
            WHEN 'upgrade' THEN 2
            WHEN 'guidance' THEN 3
            WHEN 'positive_news' THEN 4
            ELSE 5
        END
        LIMIT 1
    """, (ticker, signal_date, signal_date))
    news = cur.fetchone()
    if news:
        return news["category"], news["headline"], None

    # Check upcoming_earnings table for earnings date match
    cur = conn.execute("""
        SELECT earnings_date FROM upcoming_earnings
        WHERE ticker = ? AND ABS(julianday(earnings_date) - julianday(?)) <= 3
    """, (ticker, signal_date))
    earn = cur.fetchone()
    if earn:
        return "earnings_beat", f"Earnings reported around {earn['earnings_date']}", earn["earnings_date"]

    # Check if existing pattern_signals has catalyst info for this ticker/date
    cur = conn.execute("""
        SELECT catalyst_type, catalyst_headline FROM pattern_signals
        WHERE ticker = ? AND signal_date = ?
    """, (ticker, signal_date))
    sig = cur.fetchone()
    if sig and sig["catalyst_type"]:
        return sig["catalyst_type"], sig["catalyst_headline"], None

    return None, None, None


# ---------------------------------------------------------------------------
# Main scan functions
# ---------------------------------------------------------------------------

def scan_peak_dips(conn: sqlite3.Connection, lookback_days: int = 5) -> int:
    """Scan recent trading days for new peak/dip events (daily use).

    Args:
        conn: SQLite connection
        lookback_days: How many trading days back to scan

    Returns:
        Number of new events detected
    """
    # Get the date range
    cur = conn.execute(
        "SELECT DISTINCT date FROM daily_prices ORDER BY date DESC LIMIT ?",
        (lookback_days + 1,),
    )
    dates = [row["date"] for row in cur.fetchall()]
    if not dates:
        log.warning("No trading dates found")
        return 0

    start_date = min(dates)
    log.info("Scanning peak/dip events from %s (lookback=%d days)", start_date, lookback_days)

    return _process_date_range(conn, start_date)


def backfill_peak_dips(conn: sqlite3.Connection, start: str = "2021-01-01", end: str | None = None) -> int:
    """Backfill historical peak/dip events over a date range.

    Args:
        conn: SQLite connection
        start: Start date YYYY-MM-DD
        end: End date YYYY-MM-DD (default: today)

    Returns:
        Number of events detected
    """
    log.info("Backfilling peak/dip events from %s to %s", start, end or "now")
    return _process_date_range(conn, start, end)


def _process_date_range(conn: sqlite3.Connection, start_date: str, end_date: str | None = None) -> int:
    """Process a date range: detect events, enrich, score, store."""
    candidates = _find_earnings_gap_ups(conn, start_date, end_date)
    log.info("Found %d gap-up + sell-off candidates", len(candidates))

    if not candidates:
        return 0

    count = 0
    for c in candidates:
        ticker = c["ticker"]
        signal_date = c["signal_date"]

        # Skip if already exists
        existing = conn.execute(
            "SELECT id FROM peak_dip_events WHERE ticker = ? AND signal_date = ?",
            (ticker, signal_date),
        ).fetchone()
        if existing:
            continue

        # Get average volume
        avg_vol = _get_avg_volume(conn, ticker, signal_date)
        volume_ratio = round(c["selloff_volume"] / avg_vol, 2) if avg_vol and avg_vol > 0 else None

        # Get market regime
        regime = _get_market_regime(conn, signal_date)

        # Match catalyst
        catalyst_type, catalyst_detail, earnings_date = _match_catalyst(conn, ticker, signal_date)

        # Get future prices for outcome tracking
        future = _get_future_prices(conn, ticker, signal_date, 20)
        outcomes = _compute_outcomes(c["day_close"], future)

        # Determine stage
        if outcomes.get("outcome_5d") is not None:
            stage = "resolved"
        elif outcomes.get("outcome_1d") is not None:
            stage = "recovering" if outcomes["outcome_1d"] > 0 else "selling_off"
        else:
            stage = "dip_zone"

        # Compute pounce score
        score, components = compute_pounce_score(
            conn, c["gap_pct"], c["selloff_pct"], volume_ratio,
            catalyst_type, regime, c["gap_bucket"], c.get("sector"),
        )

        # Build event
        event = {
            "ticker": ticker,
            "name": c.get("name"),
            "sector": c.get("sector"),
            "market_cap_tier": c.get("market_cap_tier"),
            "earnings_date": earnings_date,
            "signal_date": signal_date,
            "prev_close": c["prev_close"],
            "gap_open": c["gap_open"],
            "gap_pct": c["gap_pct"],
            "day_high": c["day_high"],
            "day_close": c["day_close"],
            "selloff_pct": c["selloff_pct"],
            "selloff_volume": c["selloff_volume"],
            "avg_volume": avg_vol,
            "volume_ratio": volume_ratio,
            "catalyst_type": catalyst_type,
            "catalyst_detail": catalyst_detail,
            "market_regime": regime,
            "gap_bucket": c["gap_bucket"],
            "selloff_bucket": c["selloff_bucket"],
            "pounce_score": score,
            "stage": stage,
            **outcomes,
        }

        # Generate Tier 1 summary
        event["summary_auto"] = generate_auto_summary(event)

        # Store
        db.upsert_peak_dip_event(conn, event)
        count += 1

        if count % 100 == 0:
            log.info("  Processed %d events so far...", count)

    log.info("Peak/dip scan complete: %d new events stored", count)
    return count


def update_peak_dip_outcomes(conn: sqlite3.Connection) -> int:
    """Update outcomes for unresolved events and recompute pounce scores."""
    cur = conn.execute("""
        SELECT id, ticker, signal_date, day_close, gap_pct, selloff_pct,
               volume_ratio, catalyst_type, market_regime, gap_bucket, sector
        FROM peak_dip_events
        WHERE stage != 'resolved'
           OR (outcome_5d IS NULL AND signal_date < date('now', '-7 days'))
    """)
    events = cur.fetchall()
    updated = 0

    for ev in events:
        future = _get_future_prices(conn, ev["ticker"], ev["signal_date"], 20)
        outcomes = _compute_outcomes(ev["day_close"], future)

        if not outcomes:
            continue

        # Determine stage
        if outcomes.get("outcome_5d") is not None:
            stage = "resolved"
        elif outcomes.get("outcome_1d") is not None:
            stage = "recovering" if outcomes["outcome_1d"] > 0 else "selling_off"
        else:
            stage = "dip_zone"

        # Recompute pounce score (may change as more historical data accumulates)
        score, _ = compute_pounce_score(
            conn, ev["gap_pct"], ev["selloff_pct"], ev["volume_ratio"],
            ev["catalyst_type"], ev["market_regime"], ev["gap_bucket"], ev["sector"],
        )

        updates = {**outcomes, "stage": stage, "pounce_score": score}

        # Regenerate auto summary with outcomes
        event_dict = dict(ev)
        event_dict.update(updates)
        updates["summary_auto"] = generate_auto_summary(event_dict)

        set_clauses = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [ev["id"]]
        conn.execute(f"UPDATE peak_dip_events SET {set_clauses}, updated_at = datetime('now') WHERE id = ?", values)
        updated += 1

    if updated:
        conn.commit()
        log.info("Updated outcomes for %d peak/dip events", updated)

    return updated
```

- [ ] **Step 2: Test the scanner on existing data**

```bash
cd /home/will/stock-data-pipeline
source .venv/bin/activate
python -c "
import db
import peak_dip_scanner as pds

conn = db.get_conn()
db.init_db(conn)

# Test on recent data (last 30 days)
count = pds.scan_peak_dips(conn, lookback_days=30)
print(f'Found {count} peak/dip events in last 30 days')

# Check what was stored
cur = conn.execute('SELECT COUNT(*) AS n FROM peak_dip_events')
print(f'Total events in table: {cur.fetchone()[\"n\"]}')

# Show first few
cur = conn.execute('SELECT ticker, signal_date, gap_pct, selloff_pct, pounce_score, stage, catalyst_type FROM peak_dip_events ORDER BY signal_date DESC LIMIT 5')
for row in cur.fetchall():
    print(f'  {row[\"ticker\"]:6s} {row[\"signal_date\"]} gap={row[\"gap_pct\"]:5.1f}% sell={row[\"selloff_pct\"]:5.1f}% score={row[\"pounce_score\"]:3d} stage={row[\"stage\"]:10s} catalyst={row[\"catalyst_type\"]}')

conn.close()
"
```

Expected: Events detected from recent data, stored with scores and stages.

- [ ] **Step 3: Commit**

```bash
cd /home/will/stock-data-pipeline
git add peak_dip_scanner.py
git commit -m "feat: peak/dip scanner — detect earnings gap-up sell-off patterns with pounce scoring"
```

---

### Task 3: Add CLI commands to pipeline.py

**Files:**
- Modify: `/home/will/stock-data-pipeline/pipeline.py`

- [ ] **Step 1: Add scan-peaks command**

Add after the existing `scan_news` command (around line 357):

```python
# ---------------------------------------------------------------------------
# scan-peaks — detect earnings gap-up + sell-off patterns
# ---------------------------------------------------------------------------

@cli.command("scan-peaks")
@click.option("--lookback", default=5, help="Trading days to look back")
@click.option("--start", default=None, help="Backfill start date (YYYY-MM-DD)")
@click.option("--end", default=None, help="Backfill end date (YYYY-MM-DD)")
@click.pass_context
def scan_peaks(ctx, lookback, start, end):
    """Scan for earnings gap-up + sell-off peak/dip patterns.

    Daily mode (default): Scans last N trading days for new events.
    Backfill mode (--start): Processes all events in the date range.

    Examples:
        python pipeline.py scan-peaks                    # last 5 days
        python pipeline.py scan-peaks --lookback 30      # last 30 days
        python pipeline.py scan-peaks --start 2021-01-01 # full backfill
    """
    import peak_dip_scanner as pds

    conn = ctx.obj["conn"]

    log.info("=" * 60)

    if start:
        log.info("PEAK/DIP BACKFILL — %s to %s", start, end or "now")
        log.info("=" * 60)
        count = pds.backfill_peak_dips(conn, start=start, end=end)
    else:
        log.info("PEAK/DIP SCANNER — lookback=%d", lookback)
        log.info("=" * 60)
        count = pds.scan_peak_dips(conn, lookback_days=lookback)

    # Update outcomes for older events
    updated = pds.update_peak_dip_outcomes(conn)

    log.info("Scan complete: %d new events, %d outcomes updated", count, updated)
```

- [ ] **Step 2: Add peak/dip scanning to the watch command**

In the `watch` function, add a new step after the existing scan-news step. Find the line that says `# Step 3: Update outcomes` (or similar) and add before it:

```python
    # Step 2b: Scan for peak/dip patterns
    log.info("[2b/5] Scanning for peak/dip patterns...")
    import peak_dip_scanner as pds
    pds_count = pds.scan_peak_dips(conn, lookback_days=lookback)
    pds_updated = pds.update_peak_dip_outcomes(conn)
    log.info("  %d new peak/dip events, %d outcomes updated", pds_count, pds_updated)
```

- [ ] **Step 3: Test CLI commands**

```bash
cd /home/will/stock-data-pipeline
source .venv/bin/activate

# Test daily scan
python pipeline.py scan-peaks --lookback 10

# Test backfill (small range first)
python pipeline.py scan-peaks --start 2026-01-01
```

Expected: Events detected and stored, outcomes updated.

- [ ] **Step 4: Commit**

```bash
cd /home/will/stock-data-pipeline
git add pipeline.py
git commit -m "feat: add scan-peaks CLI command and integrate into watch pipeline"
```

---

### Task 4: Create FastAPI tracker endpoints

**Files:**
- Create: `/home/will/stock-data-pipeline/api/schemas/tracker.py`
- Create: `/home/will/stock-data-pipeline/api/routers/tracker.py`
- Modify: `/home/will/stock-data-pipeline/api/main.py`

- [ ] **Step 1: Create Pydantic schemas**

Create `/home/will/stock-data-pipeline/api/schemas/tracker.py`:

```python
"""Pydantic schemas for Peak/Dip Tracker endpoints."""

from pydantic import BaseModel


class PeakDipEvent(BaseModel):
    id: int
    ticker: str
    name: str | None = None
    sector: str | None = None
    market_cap_tier: str | None = None
    earnings_date: str | None = None
    signal_date: str
    prev_close: float | None = None
    gap_open: float | None = None
    gap_pct: float | None = None
    day_high: float | None = None
    day_close: float | None = None
    selloff_pct: float | None = None
    selloff_volume: int | None = None
    avg_volume: int | None = None
    volume_ratio: float | None = None
    catalyst_type: str | None = None
    catalyst_detail: str | None = None
    market_regime: str | None = None
    gap_bucket: str | None = None
    selloff_bucket: str | None = None
    outcome_1d: float | None = None
    outcome_3d: float | None = None
    outcome_5d: float | None = None
    outcome_10d: float | None = None
    outcome_20d: float | None = None
    win_1d: int | None = None
    win_5d: int | None = None
    win_10d: int | None = None
    pounce_score: int | None = None
    stage: str | None = None
    summary_auto: str | None = None
    summary_ai: str | None = None
    ai_provider: str | None = None
    ai_generated_at: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class TrackerSummary(BaseModel):
    active_count: int
    avg_active_score: float | None = None
    recovering_count: int
    total_events: int
    overall_win_rate_5d: float | None = None
    resolved_count: int
    best_active_ticker: str | None = None
    best_active_score: int | None = None


class TrackerStats(BaseModel):
    total_events: int
    win_rate_5d: float | None = None
    avg_pounce_score: float | None = None
    by_catalyst: list[dict] | None = None
    by_sector: list[dict] | None = None
    by_gap_bucket: list[dict] | None = None
```

- [ ] **Step 2: Create the router**

Create `/home/will/stock-data-pipeline/api/routers/tracker.py`:

```python
"""Peak/Dip Tracker API endpoints."""

import sqlite3

from fastapi import APIRouter, Depends, Query

from api.deps import get_db
from api.schemas.tracker import PeakDipEvent, TrackerSummary, TrackerStats
import db

router = APIRouter(prefix="/tracker", tags=["tracker"])


@router.get("/events", response_model=list[PeakDipEvent])
def list_events(
    stage: str | None = Query(None, description="Filter by stage: peaked, selling_off, dip_zone, recovering, resolved"),
    days: int = Query(30, ge=1, le=1825),
    min_score: int = Query(0, ge=0, le=100),
    catalyst_type: str | None = Query(None),
    sector: str | None = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    conn: sqlite3.Connection = Depends(get_db),
):
    """List peak/dip events with optional filters."""
    rows = db.get_peak_dip_events(
        conn, stage=stage, days=days, min_score=min_score,
        catalyst_type=catalyst_type, sector=sector, limit=limit, offset=offset,
    )
    return [PeakDipEvent(**r) for r in rows]


@router.get("/events/{event_id}", response_model=PeakDipEvent)
def get_event(event_id: int, conn: sqlite3.Connection = Depends(get_db)):
    """Get a single peak/dip event by ID."""
    cur = conn.execute("SELECT * FROM peak_dip_events WHERE id = ?", (event_id,))
    row = cur.fetchone()
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Event not found")
    return PeakDipEvent(**dict(row))


@router.get("/summary", response_model=TrackerSummary)
def get_summary(conn: sqlite3.Connection = Depends(get_db)):
    """Get summary stats for the tracker dashboard."""
    summary = db.get_peak_dip_summary(conn)

    # Get best active event
    cur = conn.execute("""
        SELECT ticker, pounce_score FROM peak_dip_events
        WHERE stage IN ('peaked', 'selling_off', 'dip_zone')
        ORDER BY pounce_score DESC LIMIT 1
    """)
    best = cur.fetchone()

    return TrackerSummary(
        **summary,
        best_active_ticker=best["ticker"] if best else None,
        best_active_score=best["pounce_score"] if best else None,
    )


@router.get("/stats", response_model=TrackerStats)
def get_stats(
    days: int = Query(365, ge=1, le=1825),
    conn: sqlite3.Connection = Depends(get_db),
):
    """Get aggregate statistics for historical analysis."""
    date_filter = f"-{days} days"

    # Overall stats
    cur = conn.execute("""
        SELECT
            COUNT(*) AS total,
            AVG(CASE WHEN win_5d = 1 THEN 100.0 ELSE 0.0 END) AS win_rate_5d,
            AVG(pounce_score) AS avg_score
        FROM peak_dip_events
        WHERE signal_date >= date('now', ?) AND win_5d IS NOT NULL
    """, (date_filter,))
    overall = dict(cur.fetchone())

    # By catalyst
    cur = conn.execute("""
        SELECT catalyst_type,
               COUNT(*) AS count,
               AVG(CASE WHEN win_5d = 1 THEN 100.0 ELSE 0.0 END) AS win_rate,
               AVG(outcome_5d) AS avg_return
        FROM peak_dip_events
        WHERE signal_date >= date('now', ?) AND win_5d IS NOT NULL AND catalyst_type IS NOT NULL
        GROUP BY catalyst_type ORDER BY count DESC
    """, (date_filter,))
    by_catalyst = [dict(r) for r in cur.fetchall()]

    # By sector
    cur = conn.execute("""
        SELECT sector,
               COUNT(*) AS count,
               AVG(CASE WHEN win_5d = 1 THEN 100.0 ELSE 0.0 END) AS win_rate,
               AVG(outcome_5d) AS avg_return
        FROM peak_dip_events
        WHERE signal_date >= date('now', ?) AND win_5d IS NOT NULL AND sector IS NOT NULL
        GROUP BY sector ORDER BY count DESC
    """, (date_filter,))
    by_sector = [dict(r) for r in cur.fetchall()]

    # By gap bucket
    cur = conn.execute("""
        SELECT gap_bucket,
               COUNT(*) AS count,
               AVG(CASE WHEN win_5d = 1 THEN 100.0 ELSE 0.0 END) AS win_rate,
               AVG(outcome_5d) AS avg_return
        FROM peak_dip_events
        WHERE signal_date >= date('now', ?) AND win_5d IS NOT NULL
        GROUP BY gap_bucket ORDER BY count DESC
    """, (date_filter,))
    by_gap = [dict(r) for r in cur.fetchall()]

    return TrackerStats(
        total_events=overall["total"] or 0,
        win_rate_5d=round(overall["win_rate_5d"], 1) if overall["win_rate_5d"] else None,
        avg_pounce_score=round(overall["avg_score"], 1) if overall["avg_score"] else None,
        by_catalyst=by_catalyst,
        by_sector=by_sector,
        by_gap_bucket=by_gap,
    )
```

- [ ] **Step 3: Mount the router in main.py**

In `/home/will/stock-data-pipeline/api/main.py`, add the import and mount. Find the router imports section and add:

```python
from api.routers import tracker
```

Then find the `app.include_router(...)` block and add:

```python
    app.include_router(tracker.router, prefix="/api")
```

- [ ] **Step 4: Test the API endpoints**

```bash
cd /home/will/stock-data-pipeline
source .venv/bin/activate

# Start the API server temporarily
uvicorn api.main:app --port 8099 &
sleep 2

# Test endpoints
echo "=== EVENTS ==="
curl -s http://localhost:8099/api/tracker/events?days=365\&limit=5 | python3 -m json.tool | head -30

echo "=== SUMMARY ==="
curl -s http://localhost:8099/api/tracker/summary | python3 -m json.tool

echo "=== STATS ==="
curl -s http://localhost:8099/api/tracker/stats?days=365 | python3 -m json.tool | head -20

kill %1
```

- [ ] **Step 5: Commit**

```bash
cd /home/will/stock-data-pipeline
git add api/schemas/tracker.py api/routers/tracker.py api/main.py
git commit -m "feat: add Peak/Dip Tracker API endpoints (events, summary, stats)"
```

---

### Task 5: Add tracker endpoints to server.mjs

**Files:**
- Modify: `/home/will/PeakDipVibe/server.mjs`

- [ ] **Step 1: Add tracker endpoint handling**

In `/home/will/PeakDipVibe/server.mjs`, find the signals handler block (the one starting with `// ─── Signals: try upstream first`). Add the tracker handler BEFORE the signals block:

```javascript
    // ─── Tracker: proxy to upstream, cache results ───
    if (urlPath.startsWith("/api/tracker/")) {
      const upstreamPath = `${UPSTREAM_PREFIX}${urlPath}${queryString ? "?" + queryString : ""}`;
      const upstreamUrl = `https://${UPSTREAM_HOST}${upstreamPath}`;

      fetchJSON(upstreamUrl, 10000).then((data) => {
        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=60",
          "Access-Control-Allow-Origin": "*",
          "X-Tracker-Source": "r730-live",
        });
        res.end(JSON.stringify(data));
      }).catch(() => {
        // R730 unavailable — check for cached tracker data
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
          // Return empty state
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
      return;
    }
```

- [ ] **Step 2: Build and test**

```bash
cd /home/will/PeakDipVibe
npm run build
```

- [ ] **Step 3: Commit**

```bash
cd /home/will/PeakDipVibe
git add server.mjs
git commit -m "feat: add tracker API endpoint proxying in server.mjs"
```

---

### Task 6: Add tracker data to daily refresh

**Files:**
- Modify: `/home/will/stock-data-pipeline/daily-refresh.sh`

- [ ] **Step 1: Add tracker fetches to the refresh script**

In `/home/will/stock-data-pipeline/daily-refresh.sh`, find the `# Market` section (around line 66). Add after the market fetches:

```bash
# Tracker (peak/dip events)
fetch "$API/tracker/summary" "$DATA/tracker/summary.json"
fetch "$API/tracker/events?stage=dip_zone&limit=20" "$DATA/tracker/events-active.json"
fetch "$API/tracker/events?stage=recovering&limit=20" "$DATA/tracker/events-recovering.json"
fetch "$API/tracker/stats?days=365" "$DATA/tracker/stats.json"
```

Also create the directory in the PeakDipVibe data folder:

```bash
mkdir -p "$DATA/tracker"
```

Add that `mkdir` line before the first `fetch` call (around line 60, before `# Status & tickers`).

- [ ] **Step 2: Commit**

```bash
cd /home/will/stock-data-pipeline
git add daily-refresh.sh
git commit -m "feat: add tracker data to daily JSON refresh pipeline"
```

---

### Task 7: Run the historical backfill

This is the big one — scan 5 years of data across all tickers in the database.

**Files:**
- No new files — running existing code

- [ ] **Step 1: Run the backfill**

```bash
cd /home/will/stock-data-pipeline
source .venv/bin/activate

# Backfill from 2021 to present
python pipeline.py scan-peaks --start 2021-01-01 2>&1 | tee logs/backfill-peak-dip.log
```

This will take a while depending on data volume. Expected: hundreds to thousands of events detected.

- [ ] **Step 2: Verify the backfill**

```bash
cd /home/will/stock-data-pipeline
source .venv/bin/activate
python -c "
import db
conn = db.get_conn()

# Total events
cur = conn.execute('SELECT COUNT(*) AS n FROM peak_dip_events')
print(f'Total events: {cur.fetchone()[\"n\"]}')

# By stage
cur = conn.execute('SELECT stage, COUNT(*) AS n FROM peak_dip_events GROUP BY stage ORDER BY n DESC')
for row in cur.fetchall():
    print(f'  {row[\"stage\"]:15s} {row[\"n\"]:5d}')

# Win rate
cur = conn.execute('SELECT COUNT(*) AS total, SUM(win_5d) AS wins FROM peak_dip_events WHERE win_5d IS NOT NULL')
row = cur.fetchone()
if row['total'] > 0:
    print(f'Win rate (5d): {row[\"wins\"] / row[\"total\"] * 100:.1f}% ({row[\"wins\"]}/{row[\"total\"]})')

# By catalyst
cur = conn.execute('SELECT catalyst_type, COUNT(*) AS n, AVG(CASE WHEN win_5d=1 THEN 100.0 ELSE 0.0 END) AS wr FROM peak_dip_events WHERE win_5d IS NOT NULL GROUP BY catalyst_type ORDER BY n DESC LIMIT 10')
print('\\nBy catalyst type:')
for row in cur.fetchall():
    print(f'  {row[\"catalyst_type\"]:20s} n={row[\"n\"]:4d} win_rate={row[\"wr\"]:5.1f}%')

# Top pounce scores
cur = conn.execute('SELECT ticker, signal_date, gap_pct, selloff_pct, pounce_score, stage FROM peak_dip_events ORDER BY pounce_score DESC LIMIT 10')
print('\\nTop 10 pounce scores:')
for row in cur.fetchall():
    print(f'  {row[\"ticker\"]:6s} {row[\"signal_date\"]} gap={row[\"gap_pct\"]:5.1f}% sell={row[\"selloff_pct\"]:5.1f}% score={row[\"pounce_score\"]:3d} {row[\"stage\"]}')

conn.close()
"
```

- [ ] **Step 3: Push both repos**

```bash
cd /home/will/stock-data-pipeline
git push origin main

cd /home/will/PeakDipVibe
git push origin main
```

- [ ] **Step 4: Commit backfill data note**

```bash
cd /home/will/stock-data-pipeline
git add -A
git commit -m "data: initial peak/dip historical backfill complete" 2>/dev/null || echo "Nothing to commit"
```
