# PeakDipVibe Core Redesign — Peak/Dip Tracker + AI Learning System

## Overview

PeakDipVibe's core value proposition: detect earnings-driven gap-ups (peaks), track the inevitable sell-off, and catch the dip for the recovery trade. The app currently has signal detection buried under generic "Signals" branding. This redesign makes the Peak → Dip → Pounce cycle the hero feature and adds an AI learning system that improves over time.

## The Pattern

1. **Earnings Beat** — Company reports strong results
2. **Gap Up (Peak)** — Stock opens significantly higher
3. **Sell-Off (Dip)** — Profit-taking drives the price down from the peak
4. **Pounce** — Buy the dip, ride the recovery

## 4-System Architecture (Build in Order)

### System 1: Historical Intelligence Engine

The statistical foundation. Backfills 5 years of earnings gap-up → sell-off → recovery events across S&P 500 + full NASDAQ (~3,500 tickers). Classifies patterns and generates AI case studies.

### System 2: Peak/Dip Tracker (UI)

The hero feature. Dedicated route at `/tracker`, #1 in sidebar with live active-dip count badge. Feed layout with stage filter tabs. Near-real-time polling for active events.

### System 3: Prediction Engine

Scores upcoming earnings for dip probability using historical win rates. Pre-Earnings Watch list of likely dip candidates.

### System 4: Enhanced Simulator + Readiness Score

Graduates the existing Simulator into campaign mode with AI coaching, autonomous auto-pilot, and dual readiness scores (user + AI) that must both reach 85+ before connecting a real broker.

---

## System 1: Historical Intelligence Engine

### Stock Universe

- **S&P 500** (~503 tickers) — gold-standard case studies written by Sonnet
- **Full NASDAQ** (~3,000 additional tickers) — bulk processed by Qwen 2.5 72B on R730
- Total: ~3,500 tickers, ~70,000 earnings events over 5 years, ~8,000-12,000 qualifying gap-up events

### Detection Criteria

- Earnings date known (from Finnhub/yfinance earnings calendar)
- Gap-up >= 2% on earnings day (day0_open vs prev_close)
- Intraday sell-off >= 1% from day high
- Track outcomes at 1d, 3d, 5d, 10d, 20d from dip

### Classification Fields

- **Gap bucket**: small (2-5%), medium (5-10%), large (10-20%), massive (20%+)
- **Sell-off bucket**: shallow (<2%), moderate (2-5%), deep (>5%)
- **Market regime**: bull (>60% above SMA-50, RSI >55), bear (<35% above SMA-50, RSI <42), neutral (between)
- **Catalyst type**: earnings_beat, guidance_raise, revenue_beat, analyst_upgrade, product_launch, etc.
- **Outcome**: win (positive return at timeframe) or loss

### Database Schema

New table: `peak_dip_events`

```sql
CREATE TABLE peak_dip_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker          TEXT NOT NULL,
    name            TEXT,
    sector          TEXT,
    market_cap_tier TEXT,  -- large/mid/small/micro
    earnings_date   TEXT,  -- YYYY-MM-DD
    signal_date     TEXT,  -- gap-up day
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
    win_1d          BOOLEAN,
    win_5d          BOOLEAN,
    win_10d         BOOLEAN,

    pounce_score    INTEGER,  -- 0-100, computed
    stage           TEXT DEFAULT 'resolved',  -- peaked/selling_off/dip_zone/recovering/resolved

    summary_auto    TEXT,     -- Tier 1: template-generated
    summary_ai      TEXT,     -- Tier 2/3: AI case study (nullable)
    ai_provider     TEXT,     -- qwen/claude/null
    ai_generated_at TEXT,

    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_pde_ticker_date ON peak_dip_events(ticker, signal_date);
CREATE INDEX idx_pde_stage ON peak_dip_events(stage);
CREATE INDEX idx_pde_earnings ON peak_dip_events(earnings_date);
CREATE INDEX idx_pde_score ON peak_dip_events(pounce_score DESC);
CREATE INDEX idx_pde_sector ON peak_dip_events(sector);
CREATE INDEX idx_pde_catalyst ON peak_dip_events(catalyst_type);
```

### Pounce Score Formula (0-100)

| Factor | Weight | How It's Computed |
|--------|--------|-------------------|
| Historical win rate | 30 pts | Win rate of similar setups (same gap bucket + catalyst type + market regime). More similar events = higher confidence. |
| Catalyst strength | 20 pts | Earnings beats with guidance raises score highest. Routine beats lower. Analyst upgrades moderate. |
| Sell-off depth | 20 pts | Moderate sell-offs (2-5%) score highest — deep enough to be a real dip, not so deep it signals trouble. |
| Volume profile | 15 pts | Sell-off on declining volume = weak selling pressure = higher score. Sell-off on high volume = distribution = lower score. |
| Market regime | 15 pts | Bull market = full points. Neutral = 10. Bear = 5. Recovery is harder when the tide is going out. |

**Score labels:**
- 80-100: "Strong Pounce" — historically recovered 75%+ of the time
- 65-79: "Good Setup" — 65-75% historical win rate
- 50-64: "Moderate" — 55-65% win rate
- 35-49: "Risky" — below average win rate
- 0-34: "Avoid" — poor historical outcomes

Each label displays: "Historically, setups like this recovered X% of the time within 5 days (N=Y similar events)"

### 3-Tier AI Analysis

**Tier 1: Auto-Generated (All Events, Free)**
Template-based narrative filled programmatically. Every event gets this immediately:
"[TICKER] gapped [X]% on [CATALYST]. Sold off [Y]% from peak. [OUTCOME]. Similar setups historically recovered [Z]% of the time within 5 days."

**Tier 2: On-Demand AI Case Study**
User clicks "Generate Analysis" on any event. Chooses provider:
- **Qwen 2.5 72B** (R730, free) — good quality, no cost
- **Claude Sonnet** (API, ~$0.008/study) — highest quality

Generates: why the dip worked or failed, risk factors, key lesson learned, historical parallel comparison.

**Tier 3: One-Time Backfill**
- S&P 500 (~2,000 events): Sonnet via Claude Code sessions (~40 sessions over 1-2 weeks)
- NASDAQ remainder (~8,000 events): Qwen 2.5 72B on R730 (batch, ~80-100 hours unattended)
- Sonnet reviews a sample of Qwen's work and improves the prompt templates

### AI Model Stack

| Role | Model | When | Cost |
|------|-------|------|------|
| Build gold-standard case studies + prompt templates | Sonnet (Claude Code) | One-time: S&P 500 backfill | Normal subscription |
| Bulk processing (backfill + daily) | Qwen 2.5 72B (R730) | Ongoing: 8K backfill + 3-10 new daily events | $0 (electricity) |
| Quality review of Qwen's work | Sonnet (Claude Code) | Weekly: review sample batch | Normal subscription |
| On-demand deep analysis | User's choice: Qwen or Sonnet | Ad-hoc when user clicks | Free or ~$0.008 |
| Monthly "what I learned" review | Sonnet (Claude Code) | Monthly | Normal subscription |

### Self-Learning Loop

The system improves over time like self-learning OCR:

1. **Naive phase**: Simple rules (gap >= 2%, sell-off >= 1%). Catches everything, lots of false positives. Win rate ~55%.
2. **Statistical phase**: Learns from 10K+ outcomes. Weights by gap size, catalyst type, sector, volume, market regime. Win rate ~65%.
3. **Pattern matching phase**: AI identifies non-obvious patterns ("Tech earnings beats in Q1 during rate-cut cycles recover 82%"). Win rate ~72%.
4. **Refined phase**: Simulator feedback loop. Learns from its own paper trades. Adjusts entry timing, position sizing, stop placement. Win rate 80%+.

**Learning mechanism:**
- After every resolved event: was prediction correct? Update factor weights.
- Weekly: recompute win rates by factor combination.
- Monthly: Sonnet reviews worst misses, writes "what I learned", improves prompt templates.
- Quarterly: full factor weight recalibration across all historical data.

---

## System 2: Peak/Dip Tracker (UI)

### Route and Navigation

- **Route**: `/tracker`
- **Sidebar position**: #1, above Home
- **Icon**: 🎯 with live badge showing active dip count
- **Subtitle**: "Catch the dip after the peak"

### Page Layout

**Stage filter tabs** across the top:
- 🔥 **Active Dips** — stocks currently in peaked/selling_off/dip_zone stage (default view)
- 📈 **Recovering** — stocks that entered dip zone and are now recovering
- 👀 **Pre-Earnings Watch** — upcoming earnings scored for dip probability (System 3)
- 📊 **All History** — complete archive of all events with search/filter
- 🤖 **Bot Performance** — AI's autonomous trading metrics

**Summary bar** below tabs:
- Active dip count
- Average pounce score of active dips
- Best current opportunity (highest score ticker)
- Overall historical win rate
- Last data update timestamp

### Event Cards

Each event displayed as a card with:

**Scorecard view (default, collapsed):**
- Pounce score circle (0-100 with color)
- Ticker, company name, stage badge (color-coded)
- Key stats: gap %, peak price, sell-off %, current price, volume ratio, catalyst
- Historical stats: "N=47 similar setups, 76% win rate, avg +5.8% recovery, median 3.2 days"
- Action buttons: Simulate, Chart, Expand

**Case study view (expanded, toggle):**
- Full AI-generated narrative (Tier 2/3)
- Risk factors section
- Key lesson
- Historical parallel comparison
- AI provider badge + "Regenerate with [other provider]" option

### Real-Time Polling

- For stocks in active stages (peaked, selling_off, dip_zone): poll Yahoo Finance quotes every 15 minutes during market hours
- Update current price, recalculate sell-off depth, check for stage transitions
- Stage transitions: peaked → selling_off (sell-off >= 1%) → dip_zone (sell-off stabilizing, volume declining) → recovering (price rising from dip) → resolved (5d+ elapsed)

### API Endpoints (server.mjs)

- `GET /api/tracker/events?stage=active&limit=20` — filtered event list
- `GET /api/tracker/events/:id` — single event with full detail
- `GET /api/tracker/summary` — summary bar stats
- `GET /api/tracker/history?page=1&sort=date&catalyst=earnings_beat` — paginated history with filters

---

## System 3: Prediction Engine

### Pre-Earnings Scoring

For each stock with upcoming earnings (from earnings calendar):

1. Look up historical gap-up frequency for this ticker (how often does it gap up on earnings?)
2. Check current market regime
3. Check sector momentum
4. Check analyst estimate revisions (positive revisions = higher surprise probability)
5. Compute a "Dip Probability" score (0-100): likelihood this earnings event produces a tradeable peak/dip

### Pre-Earnings Watch List

Displayed in the "👀 Pre-Earnings Watch" tab of the Tracker. Shows:
- Ticker, earnings date, days until earnings
- Dip probability score
- Historical pattern: "This stock has gapped up on 7 of last 10 earnings"
- Suggested strategy: "Watch for gap-up > 5%, enter if sell-off reaches 2%+"

### Data Sources

- Earnings calendar: Finnhub + yfinance
- Analyst estimates: Finnhub (free tier)
- Historical gap-up frequency: computed from peak_dip_events table

---

## System 4: Enhanced Simulator + Readiness Score

### Campaign Mode

The existing Simulator (replay one event) is enhanced with:
- **Campaign mode**: sequential events, cumulative portfolio balance across all trades
- **Starting balance**: $100,000 paper money
- **Events sourced from**: peak_dip_events table, filtered by pounce score and user preferences

### Two Modes

**Manual Mode**: User sees each event, decides to enter or skip, sets stops and targets. AI provides post-trade feedback. Builds the user's readiness score.

**Auto-Pilot Mode**: AI trades every event autonomously using its learned strategy (factor weights, entry/exit rules). User watches and reviews. Builds the AI's readiness score.

### What the AI Tracks

**Entry decisions:**
- Did the user/AI enter at the dip or chase?
- Wait time after sell-off started
- Position size relative to conviction (pounce score)
- Entry price vs. optimal entry (computed in hindsight)
- Did it follow the pounce score or override?

**Exit decisions:**
- Held through recovery or panic sold?
- Hit stop-loss vs. manual exit?
- Left money on the table (sold too early)?
- Overstayed (gave back gains)?
- Exit price vs. optimal exit

**Pattern recognition:**
- Which setup types trade best? (by catalyst, sector, gap size)
- Sector blind spots
- Bull vs. bear market performance
- Emotional patterns (revenge trades after losses, FOMO entries)

### Post-Trade AI Review

After every trade, Qwen 2.5 72B generates specific feedback:
"You entered CRM 45 minutes into the sell-off at -2.1% from peak — good patience. But you exited at +3.2% when the median recovery for this setup type is +5.8%. You've now left money on the table in 6 of your last 8 trades. Consider setting a trailing stop instead of a fixed target."

### Readiness Score (0-100)

**6 components:**

| Component | Weight | What It Measures |
|-----------|--------|------------------|
| Win rate | 20 pts | % of trades that were profitable |
| Risk management | 20 pts | Average loss size vs. average win. Reward/risk ratio. |
| Entry timing | 15 pts | How close to optimal entry price. Patience measurement. |
| Exit timing | 15 pts | How close to optimal exit. Captures "left money on table" and "overstayed" patterns. |
| Selectivity | 15 pts | Quality of trade selection. Did you skip low-score setups? |
| Consistency | 15 pts | Stability of performance across different sectors, market regimes, and time periods. |

**Graduation levels:**
- 0-39: Beginner — "Learning the pattern"
- 40-69: Getting There — "Building consistency"
- 70-84: Ready — "Paper trading profitable"
- 85-100: Graduate — "Connect real broker"

**Minimum requirements for graduation (85+):**
- Win rate >= 65%
- At least 50 completed trades
- No single component below 60
- Profitable over last 20 consecutive trades
- Consistent across at least 3 different sectors

### Dual Readiness Scores

- **User's score**: Tracks manual mode performance. "Are YOU ready?"
- **AI's score**: Tracks auto-pilot performance. "Is the BOT ready?"
- Both must reach 85+ before the system recommends connecting a real broker.

### Database Schema

```sql
CREATE TABLE sim_trades (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id        INTEGER REFERENCES peak_dip_events(id),
    mode            TEXT NOT NULL,  -- manual/autopilot
    actor           TEXT NOT NULL,  -- user/ai

    entry_price     REAL,
    entry_time      TEXT,
    exit_price      REAL,
    exit_time       TEXT,
    position_size   REAL,  -- % of portfolio
    stop_loss       REAL,
    take_profit     REAL,

    pnl_pct         REAL,
    pnl_dollars     REAL,
    optimal_entry   REAL,  -- computed in hindsight
    optimal_exit    REAL,
    entry_quality   REAL,  -- 0-100
    exit_quality    REAL,
    was_win         BOOLEAN,

    ai_review       TEXT,  -- post-trade Qwen analysis
    ai_review_at    TEXT,

    created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE readiness_scores (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    actor           TEXT NOT NULL,  -- user/ai
    computed_at     TEXT NOT NULL,
    total_trades    INTEGER,
    overall_score   INTEGER,
    win_rate_score  INTEGER,
    risk_mgmt_score INTEGER,
    entry_score     INTEGER,
    exit_score      INTEGER,
    selectivity_score INTEGER,
    consistency_score INTEGER,
    graduation_level TEXT,  -- beginner/getting_there/ready/graduate
    notes           TEXT    -- AI-generated summary of strengths/weaknesses
);
```

---

## Build Order

1. **System 1: Historical Intelligence Engine** — backfill pipeline, database schema, Sonnet gold-standard sessions, Qwen bulk processing
2. **System 2: Peak/Dip Tracker UI** — `/tracker` route, sidebar placement, event cards, stage tabs, real-time polling
3. **System 3: Prediction Engine** — pre-earnings scoring, watch list
4. **System 4: Enhanced Simulator** — campaign mode, AI tracking, post-trade reviews, readiness scores

Each system gets its own implementation plan. System 1 is the foundation — nothing else works without the historical data and scoring model.

---

## Success Criteria

- Score 49 is gone forever — live data flows from Yahoo Finance + R730
- Peak/Dip Tracker is the #1 feature in the sidebar, the first thing you see
- Historical database has 8,000+ classified events with AI case studies
- Pounce Score accurately reflects historical win rates (back-tested)
- Simulator tracks every decision and provides specific, useful feedback
- Readiness scores demonstrably improve with practice
- Self-learning loop measurably improves pounce score accuracy over time
