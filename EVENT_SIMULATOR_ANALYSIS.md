# Event Simulator — Full Codebase Analysis

## Current State

### SimulatorPage.tsx (1799 lines)
- **Location**: `src/features/simulator/SimulatorPage.tsx`
- **Two modes**: Browse (event library) and Replay (trading)
- **20+ state variables** — all local React state, no persistence
- **Chart**: Recharts `ComposedChart` with `Line` (close price only, not OHLC candles)
- **Monte Carlo cone**: Client-side GBM with 500 paths, Box-Muller transform
- **Trading**: All-or-nothing buy/sell, no partial trades, no stop-loss, no take-profit
- **Intervals**: 15m / 30m / 60m bars
- **Speed**: 0.5x / 1x / 2x / 4x auto-play
- **Keyboard**: Space (play), B (buy), S (sell), R (reset), Arrow keys (step)

### Backend (earnings.py)
- **Endpoint**: `GET /earnings/simulate/{ticker}/{signal_date}/intraday`
- **Data**: yfinance fetch → cache in `intraday_prices` table → fallback to daily synthesis
- **Returns**: bars[], strategies[] (3 preset), analogs[] (top 3 similar events)
- **Analysis**: `GET /earnings/events/{ticker}/{date}/analysis` — catalyst detail + post-mortem

### Database (market.db)
- **554 events** in `pattern_signals` (259 tickers, Jan 15 - Feb 27 2026)
- **523 events** have AI analysis in `event_analysis`
- **904,897 daily price records** across 503 tickers
- **244 cached intraday bars** (only 6 tickers)
- **No simulation results table** — user trades lost on navigation

### Key Limitations
1. No investment parameters (stop-loss, take-profit, position sizing)
2. No phase tracking (pre-event vs during vs post-event)
3. No AI decision engine — no automated trading recommendations
4. No simulation persistence — results lost on refresh
5. No equity curve or detailed P&L tracking
6. No export functionality
7. Simple line chart instead of OHLC candles
8. All-or-nothing trading only

### Existing Infrastructure to Leverage
- CandlestickChart.tsx (lightweight-charts v5) — exists but unused in simulator
- 523 event analyses with catalyst types, headlines, post-mortems
- Pattern signals with outcome data (1d, 5d, 10d returns)
- Analog event matching (top 3 by gap_up_pct similarity)
- Sector data, signal strength scores, volume ratios
