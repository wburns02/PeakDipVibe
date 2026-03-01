# PeakDipVibe — Complete Project Summary

## What Is This?

PeakDipVibe is a full-stack stock market analytics platform that answers one question: **"When a stock gaps up on big news, what happens next?"**

It tracks S&P 500 gap-up events (earnings beats, analyst upgrades, major news) and shows the patterns that follow — the peak, the dip from profit-taking, and whether the stock bounces back. Built for retail investors who want data-driven insights without Wall Street jargon.

---

## Tech Stack

### Frontend
- **React 19** + **TypeScript 5.9** + **Vite 7.3** + **Tailwind CSS 4**
- **TanStack Query 5** for server state (all API responses cached + Zod-validated)
- **Recharts 3** for line/area charts, **Lightweight Charts 5** for candlestick charts
- **Lucide React** icons, **React Router 7** for routing
- **Axios** HTTP client, **localStorage** for watchlist + recent searches

### Backend
- **FastAPI** (Python 3.12) — read-only REST API, no auth
- **SQLite** (WAL mode) — 7+ years of S&P 500 daily OHLCV data
- **pandas/numpy** for indicator computation
- **yfinance** + **STOOQ** + **Finnhub** + **FMP** for data ingestion

### Infrastructure
- Frontend deployed on **Railway** (Docker, Node 22 Alpine)
- Backend runs on **R730 server** via **Tailscale** mesh network
- Database stored at `/mnt/win11/Fedora/stock-data-pipeline/data/market.db`
- Production URL: `https://profound-intuition-production-cce9.up.railway.app`

---

## Frontend — 7 Pages

### 1. Dashboard (`/`)
Market overview homepage. Live ticker search (debounced 200ms, recent searches saved), market stats (total tickers/prices/indicators), sector heatmap (colored blocks sized by ticker count), top 10 gainers & losers with sparklines.

### 2. Signals (`/signals`)
Gap-up pattern scanner. Filters: lookback days (1–365), minimum signal strength (0–100), status (active/confirmed/failed), catalyst type (earnings beat, upgrade, etc.), sector. Shows each signal with gap-up %, selloff %, recovery %, 1d/5d/10d outcomes. Stats cards at top with win rates and catalyst breakdown.

### 3. Earnings (`/earnings`)
Educational "explain it like I'm 5" page. Single scrolling layout with 5 sections:
- **Hero**: 3-step visual (JUMP → DIP → RECOVERY?) explaining the core pattern
- **Price Journey Chart**: Time-indexed area chart showing average stock behavior from Day -1 Close through Day 10. Toggle between "Full Timeline" (8 data points) and "Day 0 Detail" (zoomed intraday view with trading hours). Filter by move size (Minor/Medium/Large/Major).
- **Impact Cards**: 4 traffic-light verdict cards grouped by move size (green = usually bounces, amber = coin flip, red = often fades), showing next-day win rate
- **This Week Timeline**: Top 8 recent big moves with plain-English explanations and verdict badges (Bounced Back / Stayed Flat / Kept Falling / Still Playing Out)
- **Sector Rankings**: Simple ranked list of which sectors have the most gap-ups and best bounce-back rates

### 4. Ticker Detail (`/ticker/:symbol`)
Full stock analysis page. Company info card (name, sector, industry, market cap), candlestick chart with optional SMA/EMA/Bollinger Band overlays, technical indicator snapshot + history, signal backtest ("what if you bought when RSI < 30?"), and gap-up signal history for that ticker.

### 5. Screener (`/screener`)
Technical indicator filter. 6 presets (Oversold RSI, Overbought, Above SMA 50/200, Golden Cross, Death Cross) plus custom filters (RSI range, SMA positions, sector, market cap). Results table with sortable columns, 7-day sparklines, and watchlist star icons.

### 6. Compare (`/compare`)
Multi-ticker performance comparison. Add up to 8 tickers, select period (1M–5Y), view normalized % change chart where all tickers start at 0%. Performance summary shows final return per ticker.

### 7. Watchlist (`/watchlist`)
Browser-persisted stock list (localStorage). Cross-tab sync via StorageEvent. Shows price, sector, 7-day sparkline, RSI, and signal status (Oversold/Overbought/Neutral) per stock.

---

## Backend — 40+ API Endpoints (All GET, No Auth)

### Tickers (`/api/tickers`)
- `GET /tickers` — Search/filter ticker list (name, sector, limit)
- `GET /tickers/{ticker}` — Full ticker detail with latest price + indicators

### Prices (`/api/prices`)
- `GET /prices/{ticker}` — OHLCV history (date range, limit up to 5000)
- `GET /prices/{ticker}/chart` — OHLCV + all SMA/EMA/Bollinger overlay data
- `GET /prices/{ticker}/sparkline` — Last N days closing prices (for mini charts)
- `GET /prices/compare` — Multi-ticker normalized % change (2–10 tickers)

### Indicators (`/api/indicators`)
- `GET /indicators/{ticker}` — Latest snapshot of all 15+ indicators
- `GET /indicators/{ticker}/history` — Time series for any single indicator

### Market (`/api/market`)
- `GET /market/overview` — Total counts, date range, sector performance, top movers
- `GET /market/sectors` — Sector-level avg % change + ticker counts

### Signals (`/api/signals`)
- `GET /signals/patterns` — Filtered gap-up signals (days, strength, status, catalyst, sector, sort)
- `GET /signals/patterns/stats` — Aggregate stats: total signals, avg strength, win rates, catalyst breakdown
- `GET /signals/patterns/{ticker}` — Signals for one ticker
- `GET /signals/{ticker}/backtest` — Historical backtest: buy when indicator crosses threshold, hold N days

### Earnings (`/api/earnings`)
- `GET /earnings/impact-summary` — Stats by move size (Minor/Medium/Large/Major): avg gap, selloff, 1d/5d/10d returns, win rates
- `GET /earnings/price-journey` — Time-indexed stages (Day -1 Close → Day 0 Open/Peak/Close → Day 1–10) with hour offsets and explanations
- `GET /earnings/this-week` — This week's big moves with beginner explanations and verdicts
- `GET /earnings/sector-breakdown` — Which sectors have most gap-ups + best bounce rates

### Screener (`/api/screener`)
- `GET /screener` — Filter stocks by RSI range, SMA positions, golden/death cross, sector, market cap

### Status (`/api/status`, `/api/health`)
- Pipeline health, DB size, last update time

---

## Database Schema (SQLite)

| Table | Rows (approx) | Purpose |
|-------|---------------|---------|
| `tickers` | ~500 | S&P 500 companies (name, sector, industry, market cap) |
| `daily_prices` | ~900K+ | 7+ years of daily OHLCV per ticker |
| `indicators` | ~6M+ | 15+ technical indicators per ticker per day |
| `pattern_signals` | ~554+ | Detected gap-up events with 40+ columns (scores, outcomes, catalysts) |
| `news_events` | varies | Finnhub/FMP news headlines tied to signals |
| `download_log` | ~500 | Ingestion tracking per ticker per source |

### Key Columns in `pattern_signals`
- **Signal**: ticker, signal_date, prev_close, day0_open/high/close, day0_volume
- **Metrics**: gap_up_pct, selloff_pct, volume_ratio, recovery_pct
- **Scoring**: signal_strength (0–100), gap_score, selloff_score, volume_score, catalyst_score
- **Catalyst**: catalyst_type, catalyst_headline
- **Outcomes**: day1_close, day2_close, day5_close, day10_close, outcome_1d/5d/10d (% return)
- **Status**: active → confirmed (bounced) or failed (kept falling)

---

## Data Pipeline

```
Yahoo Finance / STOOQ / Finnhub / FMP
        ↓
   pipeline.py CLI
        ↓
   daily_prices table (OHLCV)
        ↓
   indicators.py (RSI, SMA, EMA, MACD, Bollinger, ATR, OBV, ROC)
        ↓
   indicators table
        ↓
   scanner.py (detect gap-ups ≥1.5%, selloffs ≥1.0%, score 0-100)
        ↓
   pattern_signals table (with 1d/5d/10d outcome tracking)
```

### CLI Commands
- `python pipeline.py full` — Bulk download 7+ years of S&P 500 data
- `python pipeline.py update` — Incremental daily update
- `python pipeline.py indicators` — Compute all technical indicators
- `python pipeline.py scan` — Run gap-up pattern detector + scorer

---

## Design System

- **Dark theme** throughout — dark navy/charcoal backgrounds, white/gray text hierarchy
- **Semantic Tailwind classes**: `text-primary`, `text-secondary`, `text-muted`, `bg-card`, `bg-hover`, `accent`
- **Traffic light system**: Green (#22c55e) = bullish/good, Red (#ef4444) = bearish/bad, Amber = neutral
- **Shared components**: Card, Badge, Skeleton, Tooltip
- **Charts**: Teal (#14b8a6) for area charts, green/red for candlesticks, multi-color for comparisons
- **Responsive**: Mobile hamburger sidebar, grid collapse (4→2→1 columns), horizontal scroll tables
- **Loading**: Skeleton pulse animations, spinner for charts
- **Empty states**: Descriptive messages with CTA links

---

## Architecture Highlights

1. **Read-only API** — No POST/PUT/DELETE endpoints, no authentication, purely analytical
2. **Zod validation on every API response** — Frontend validates all data shapes at runtime
3. **TanStack Query caching** — 1–5 minute stale times per endpoint type
4. **SQLite WAL mode** — Allows concurrent reads during pipeline writes
5. **Beginner-first UX on Earnings page** — Plain English explanations, traffic-light verdicts, no jargon
6. **Time-indexed Price Journey** — Maps daily close data to approximate trading hours for intuitive visualization
7. **Signal scoring** — Composite 0–100 strength score from gap size, selloff depth, volume spike, and catalyst quality
8. **Cross-tab watchlist sync** — StorageEvent listener keeps multiple browser tabs in sync

---

## Known Constraints

1. **Production data empty** — Backend API is on Tailscale (private mesh), unreachable from Railway's public network. Data only works on local dev.
2. **S&P 500 only** — No other indexes, ETFs, or international markets
3. **Daily data only** — No intraday/hourly candles (the "hourly" view approximates from known daily data points)
4. **No auth** — Public endpoints, no user accounts
5. **Manual pipeline** — Data ingestion via CLI, not automated/scheduled
6. **SQLite single-file** — No distributed scaling or concurrent writes
