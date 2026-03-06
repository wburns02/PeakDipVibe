import type { ChartRow } from "@/api/types/price";

// ── Types ──────────────────────────────────────────────────────────────────

export type EntrySignal =
  | "rsi_oversold"
  | "rsi_overbought"
  | "golden_cross"
  | "death_cross"
  | "bb_lower_touch"
  | "consecutive_down";

export interface BacktestConfig {
  name: string;
  entry: EntrySignal;
  entryParam: number; // RSI threshold, consecutive days, etc.
  trendFilter: "above_sma200" | "below_sma200" | "none";
  takeProfit: number; // %, e.g. 8
  stopLoss: number; // %, e.g. 4
  maxHoldDays: number;
  startYear: number;
}

export interface Trade {
  ticker: string;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
  holdDays: number;
  exitReason: "take_profit" | "stop_loss" | "max_hold" | "signal_exit";
}

export interface BacktestResult {
  config: BacktestConfig;
  trades: Trade[];
  totalReturn: number;
  cagr: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  avgReturn: number;
  avgHoldDays: number;
  maxDrawdown: number;
  profitFactor: number;
  sharpeRatio: number;
  equityCurve: { date: string; equity: number }[];
  tickerBreakdown: { ticker: string; trades: number; winRate: number; avgReturn: number }[];
}

// ── RSI Computation ────────────────────────────────────────────────────────

function computeRSI(closes: number[], period = 14): number[] {
  const result: number[] = new Array(closes.length).fill(NaN);
  if (closes.length < period + 1) return result;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return result;
}

// ── Signal Detection ───────────────────────────────────────────────────────

interface DayData {
  date: string;
  close: number;
  sma50: number | null;
  sma200: number | null;
  bbLower: number | null;
  bbWidth: number | null;
  rsi: number;
}

function prepareData(rows: ChartRow[]): DayData[] {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const closes = sorted.map((r) => r.close ?? 0);
  const rsiArr = computeRSI(closes);

  return sorted.map((r, i) => ({
    date: r.date,
    close: r.close ?? 0,
    sma50: r.sma_50,
    sma200: r.sma_200,
    bbLower: r.bb_lower,
    bbWidth: r.bb_upper && r.bb_lower && r.bb_middle
      ? (r.bb_upper - r.bb_lower) / r.bb_middle
      : null,
    rsi: rsiArr[i],
  }));
}

function checkEntry(
  data: DayData[],
  idx: number,
  config: BacktestConfig,
): boolean {
  const day = data[idx];
  if (!day || isNaN(day.rsi)) return false;

  // Trend filter
  if (config.trendFilter === "above_sma200" && day.sma200 !== null && day.close < day.sma200) return false;
  if (config.trendFilter === "below_sma200" && day.sma200 !== null && day.close > day.sma200) return false;

  switch (config.entry) {
    case "rsi_oversold":
      return day.rsi <= config.entryParam;

    case "rsi_overbought":
      return day.rsi >= config.entryParam;

    case "golden_cross": {
      if (!day.sma50 || !day.sma200) return false;
      const prev = data[idx - 1];
      if (!prev?.sma50 || !prev?.sma200) return false;
      return prev.sma50 <= prev.sma200 && day.sma50 > day.sma200;
    }

    case "death_cross": {
      if (!day.sma50 || !day.sma200) return false;
      const prev = data[idx - 1];
      if (!prev?.sma50 || !prev?.sma200) return false;
      return prev.sma50 >= prev.sma200 && day.sma50 < day.sma200;
    }

    case "bb_lower_touch":
      return day.bbLower !== null && day.close <= day.bbLower * 1.005;

    case "consecutive_down": {
      const n = config.entryParam;
      if (idx < n) return false;
      for (let i = 0; i < n; i++) {
        if (data[idx - i].close >= data[idx - i - 1]?.close) return false;
      }
      return true;
    }

    default:
      return false;
  }
}

// ── Core Engine ────────────────────────────────────────────────────────────

function runForTicker(
  ticker: string,
  rows: ChartRow[],
  config: BacktestConfig,
): Trade[] {
  const data = prepareData(rows);
  const trades: Trade[] = [];
  let inPosition = false;
  let entryPrice = 0;
  let entryDate = "";
  let entryIdx = 0;

  const startDate = `${config.startYear}-01-01`;

  for (let i = 1; i < data.length; i++) {
    const day = data[i];
    if (day.date < startDate) continue;

    if (!inPosition) {
      if (checkEntry(data, i, config)) {
        inPosition = true;
        entryPrice = day.close;
        entryDate = day.date;
        entryIdx = i;
      }
    } else {
      const pnl = ((day.close - entryPrice) / entryPrice) * 100;
      const holdDays = i - entryIdx;
      let exitReason: Trade["exitReason"] | null = null;

      // For short signals (overbought/death cross), invert PnL logic
      const isShort = config.entry === "rsi_overbought" || config.entry === "death_cross";
      const effectivePnl = isShort ? -pnl : pnl;

      if (effectivePnl >= config.takeProfit) exitReason = "take_profit";
      else if (effectivePnl <= -config.stopLoss) exitReason = "stop_loss";
      else if (holdDays >= config.maxHoldDays) exitReason = "max_hold";

      if (exitReason) {
        trades.push({
          ticker,
          entryDate,
          exitDate: day.date,
          entryPrice,
          exitPrice: day.close,
          returnPct: effectivePnl,
          holdDays,
          exitReason,
        });
        inPosition = false;
      }
    }
  }

  return trades;
}

// ── Aggregate Results ──────────────────────────────────────────────────────

export function runBacktest(
  tickerData: { ticker: string; rows: ChartRow[] }[],
  config: BacktestConfig,
): BacktestResult {
  const allTrades: Trade[] = [];

  for (const { ticker, rows } of tickerData) {
    const trades = runForTicker(ticker, rows, config);
    allTrades.push(...trades);
  }

  // Sort trades by entry date
  allTrades.sort((a, b) => a.entryDate.localeCompare(b.entryDate));

  // Build equity curve
  let equity = 10000;
  const equityCurve: BacktestResult["equityCurve"] = [
    { date: `${config.startYear}-01-01`, equity: 10000 },
  ];
  let peak = equity;
  let maxDrawdown = 0;

  for (const trade of allTrades) {
    // Position size: 10% of equity per trade
    const positionSize = equity * 0.1;
    const tradePnl = positionSize * (trade.returnPct / 100);
    equity += tradePnl;
    equityCurve.push({ date: trade.exitDate, equity: Math.round(equity * 100) / 100 });

    if (equity > peak) peak = equity;
    const dd = ((peak - equity) / peak) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Stats
  const wins = allTrades.filter((t) => t.returnPct > 0);
  const losses = allTrades.filter((t) => t.returnPct <= 0);
  const totalReturn = ((equity - 10000) / 10000) * 100;
  const years = Math.max(1, (2026 - config.startYear));
  const cagr = (Math.pow(equity / 10000, 1 / years) - 1) * 100;

  // Sharpe approximation from trade returns
  const returns = allTrades.map((t) => t.returnPct);
  const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdDev = returns.length > 1
    ? Math.sqrt(returns.reduce((sum, r) => sum + (r - meanReturn) ** 2, 0) / (returns.length - 1))
    : 1;
  const sharpe = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(returns.length / years) : 0;

  const grossWins = wins.reduce((s, t) => s + t.returnPct, 0);
  const grossLosses = Math.abs(losses.reduce((s, t) => s + t.returnPct, 0));
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;

  // Per-ticker breakdown
  const byTicker = new Map<string, Trade[]>();
  for (const t of allTrades) {
    if (!byTicker.has(t.ticker)) byTicker.set(t.ticker, []);
    byTicker.get(t.ticker)!.push(t);
  }
  const tickerBreakdown = Array.from(byTicker.entries())
    .map(([ticker, trades]) => ({
      ticker,
      trades: trades.length,
      winRate: (trades.filter((t) => t.returnPct > 0).length / trades.length) * 100,
      avgReturn: trades.reduce((s, t) => s + t.returnPct, 0) / trades.length,
    }))
    .sort((a, b) => b.avgReturn - a.avgReturn);

  return {
    config,
    trades: allTrades,
    totalReturn: Math.round(totalReturn * 100) / 100,
    cagr: Math.round(cagr * 100) / 100,
    winRate: allTrades.length > 0 ? Math.round((wins.length / allTrades.length) * 10000) / 100 : 0,
    avgWin: wins.length > 0 ? Math.round((grossWins / wins.length) * 100) / 100 : 0,
    avgLoss: losses.length > 0 ? Math.round((grossLosses / losses.length) * 100) / 100 : 0,
    avgReturn: Math.round(meanReturn * 100) / 100,
    avgHoldDays: allTrades.length > 0
      ? Math.round(allTrades.reduce((s, t) => s + t.holdDays, 0) / allTrades.length)
      : 0,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    sharpeRatio: Math.round(sharpe * 100) / 100,
    equityCurve,
    tickerBreakdown,
  };
}

// ── Presets ─────────────────────────────────────────────────────────────────

export interface StrategyPreset {
  id: string;
  name: string;
  description: string;
  color: string;
  config: Omit<BacktestConfig, "name" | "startYear">;
}

export const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    id: "oversold_bounce",
    name: "Oversold Bounce",
    description: "Buy when RSI drops below 30 with price above 200-SMA. Classic mean-reversion.",
    color: "#22c55e",
    config: {
      entry: "rsi_oversold",
      entryParam: 30,
      trendFilter: "above_sma200",
      takeProfit: 8,
      stopLoss: 4,
      maxHoldDays: 20,
    },
  },
  {
    id: "golden_cross",
    name: "Golden Cross Momentum",
    description: "Buy when 50-day SMA crosses above 200-day SMA. Ride the trend.",
    color: "#3b82f6",
    config: {
      entry: "golden_cross",
      entryParam: 0,
      trendFilter: "none",
      takeProfit: 15,
      stopLoss: 7,
      maxHoldDays: 60,
    },
  },
  {
    id: "mean_reversion",
    name: "Mean Reversion",
    description: "Buy after 3+ consecutive down days. Bet on the bounce.",
    color: "#f97316",
    config: {
      entry: "consecutive_down",
      entryParam: 3,
      trendFilter: "above_sma200",
      takeProfit: 5,
      stopLoss: 3,
      maxHoldDays: 10,
    },
  },
  {
    id: "bb_squeeze",
    name: "Bollinger Bounce",
    description: "Buy on lower Bollinger Band touch. Volatility mean-reversion play.",
    color: "#8b5cf6",
    config: {
      entry: "bb_lower_touch",
      entryParam: 0,
      trendFilter: "none",
      takeProfit: 6,
      stopLoss: 3,
      maxHoldDays: 15,
    },
  },
];
