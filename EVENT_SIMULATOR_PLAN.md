# Event Simulator — Architecture Plan

## Overview
Upgrade the basic replay simulator into an advanced trading simulator with:
- Investment parameters (stop-loss, take-profit, trailing stop, position sizing)
- Three-phase tracking (Pre-Event → During Event → Post-Event)
- AI decision engine referencing 554 historical events
- Enhanced dashboard with equity curve, P&L tracker, AI reasoning panel
- Simulation persistence and CSV export

## Implementation Chunks

### Chunk 1: Investment Parameters System
**Files**: SimulatorPage.tsx
- Add parameter panel: position size ($), stop-loss %, take-profit % (up to 3 levels), trailing stop %
- Replace all-or-nothing buy with configurable position sizing
- Auto-trigger stop-loss and take-profit during playback
- Persist parameters in localStorage

### Chunk 2: Three-Phase Tracking
**Files**: SimulatorPage.tsx
- Phase 1: Pre-Event (Day -1 bars) — amber indicator
- Phase 2: During Event (Day 0 open through close) — red indicator
- Phase 3: Post-Event (Day 1+ through end) — green indicator
- Visual phase markers on chart with colored backgrounds
- Phase summary stats (return per phase)

### Chunk 3: AI Decision Engine (Backend)
**Files**: stock-data-pipeline/api/routers/earnings.py
- New endpoint: `GET /earnings/simulate/{ticker}/{date}/ai-decisions`
- For each bar, compute AI recommendation based on:
  - Current price vs entry (gap size category)
  - Historical pattern matching (554 events, same catalyst type, similar gap size)
  - Phase-aware logic (different strategies per phase)
  - Technical signals (RSI proxy from price action, volume)
- Return: `{ bar_index, action, confidence, reasoning, references[] }`
- References include specific past events: "MSFT had similar +5.2% gap on earnings_beat, bounced 63% of the time"

### Chunk 4: AI Decision Engine (Frontend)
**Files**: SimulatorPage.tsx, new hook useAIDecisions
- Fetch AI decisions for the event
- Show decisions in real-time as bars advance
- AI Reasoning Panel: scrolling log with colored action badges
- Auto-execute toggle: let AI trade for you or just advise

### Chunk 5: Enhanced Dashboard
**Files**: SimulatorPage.tsx
- Equity curve (mini chart showing portfolio value over time)
- Live P&L with unrealized gains
- Phase indicator bar at top
- Trade markers with P&L annotation on chart
- Speed controls: add 8x and 16x options

### Chunk 6: Persistence & Export
**Files**: SimulatorPage.tsx, localStorage
- Save simulation results to localStorage (last 20 simulations)
- Simulation history panel (past results with ticker, date, P&L)
- CSV export: full timeline with price, portfolio value, trades, AI decisions
- Share simulation link (URL params)

## Database Changes
- New table: `ai_decisions` (cached AI recommendations per event)
  - ticker, signal_date, interval, bar_index, action, confidence, reasoning, references_json

## API Changes
- New endpoint: `GET /earnings/simulate/{ticker}/{date}/ai-decisions?interval=60m`
- Computes decisions based on historical pattern analysis

## UI Component Layout (Replay Mode)
```
┌─────────────────────────────────────────────────┐
│ [Back] Event Header: AAPL +5.2% Earnings Beat   │
│ Phase: ● Pre-Event → ● During Event → ● Post    │
├─────────────────────────────────────────────────┤
│ Parameters  │ Portfolio    │ AI Decision          │
│ Stop: -3%   │ Cash: $3,200 │ 🟢 BUY @ $152      │
│ TP1: +2%    │ Shares: 12   │ "Similar to MSFT    │
│ TP2: +5%    │ Value: $5,024│  Jan 15 event..."   │
│ Trail: 1.5% │ P&L: +$24    │                     │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │          Price Chart with Phases            │ │
│ │  [Phase 1 bg] [Phase 2 bg] [Phase 3 bg]   │ │
│ │  ▲Buy markers  ▼Sell markers               │ │
│ │  --- AI entry/exit lines                    │ │
│ └─────────────────────────────────────────────┘ │
│ ┌──────────────┐ ┌──────────────────────────┐   │
│ │ Equity Curve │ │ AI Reasoning Log          │   │
│ │  ───────     │ │ 10:30 BUY: Gap matches.. │   │
│ │       ───    │ │ 11:00 HOLD: Dip phase..  │   │
│ └──────────────┘ │ 14:00 SELL: TP1 hit...   │   │
│                  └──────────────────────────┘   │
├─────────────────────────────────────────────────┤
│ ◀ Step  ▶ Play  Speed: [1x][2x][4x][8x]       │
│ ████████████░░░░░░░░░ Bar 45/156                │
└─────────────────────────────────────────────────┘
```
