import type { ScreenerResult } from "@/api/types/screener";
import type { MarketBreadth } from "@/api/types/market";
import type { ChartRow } from "@/api/types/price";

// --- Types ---

export type SetupType =
  | "Oversold Bounce"
  | "SMA-50 Pullback"
  | "Momentum Breakout"
  | "Mean Reversion"
  | "Trend Continuation";

export interface TradeIdea {
  ticker: string;
  name: string;
  sector: string;
  setup: SetupType;
  direction: "Long" | "Short";
  timeframe: "Swing (2-10 days)" | "Position (2-8 weeks)";
  entry: number;
  stopLoss: number;
  target: number;
  riskPct: number;
  rewardPct: number;
  riskReward: number;
  conviction: number;
  evidence: string[];
  close: number;
  rsi: number;
}

const SETUP_COLORS: Record<SetupType, string> = {
  "Oversold Bounce": "#22c55e",
  "SMA-50 Pullback": "#3b82f6",
  "Momentum Breakout": "#8b5cf6",
  "Mean Reversion": "#f59e0b",
  "Trend Continuation": "#06b6d4",
};

export function setupColor(setup: SetupType): string {
  return SETUP_COLORS[setup];
}

// --- Idea Generation ---

export function generateIdeas(
  stocks: ScreenerResult[],
  breadth: MarketBreadth,
): TradeIdea[] {
  const ideas: TradeIdea[] = [];
  const regime = classifyRegime(breadth);

  for (const s of stocks) {
    if (s.close == null || s.sma_200 == null || s.rsi_14 == null) continue;

    // 1. Oversold Bounce
    if (s.rsi_14 < 35 && s.above_sma200 && s.sma_200! > 0) {
      const entry = s.close;
      const stopLoss = s.sma_200! * 0.97;
      const target = s.sma_50 ?? s.close * 1.08;
      const idea = buildIdea(s, "Oversold Bounce", "Long", "Swing (2-10 days)", entry, stopLoss, target);
      if (idea) {
        idea.evidence.push(`RSI ${s.rsi_14.toFixed(1)} — deeply oversold`);
        idea.evidence.push(`Holding above 200-day MA ($${s.sma_200!.toFixed(0)}) — long-term trend intact`);
        if (s.sma_50) idea.evidence.push(`Target: 50-day MA at $${s.sma_50.toFixed(0)}`);
        idea.conviction += regime === "risk-on" ? 1 : 0;
        idea.conviction += s.rsi_14 < 30 ? 1 : 0;
        ideas.push(idea);
      }
    }

    // 2. SMA-50 Pullback (price near SMA-50, in uptrend)
    if (
      s.sma_50 &&
      s.sma_50 > 0 &&
      s.above_sma200 &&
      Math.abs((s.close - s.sma_50) / s.sma_50) < 0.03 &&
      s.rsi_14 >= 35 &&
      s.rsi_14 <= 60
    ) {
      const entry = s.sma_50;
      const risk = s.sma_50 * 0.04;
      const stopLoss = s.sma_50 - risk;
      const target = s.close + risk * 2.5;
      const idea = buildIdea(s, "SMA-50 Pullback", "Long", "Swing (2-10 days)", entry, stopLoss, target);
      if (idea) {
        const distPct = ((s.close - s.sma_50) / s.sma_50 * 100).toFixed(1);
        idea.evidence.push(`Price ${+distPct >= 0 ? "+" : ""}${distPct}% from 50-day MA — classic pullback entry`);
        idea.evidence.push(`RSI ${s.rsi_14.toFixed(1)} — momentum digesting, not exhausted`);
        idea.evidence.push(`Above 200-day MA — confirmed uptrend`);
        idea.conviction += s.sma_50 > s.sma_200! ? 1 : 0;
        idea.conviction += regime === "risk-on" ? 1 : 0;
        ideas.push(idea);
      }
    }

    // 3. Momentum Breakout (strong RSI, above both SMAs)
    if (
      s.rsi_14 > 55 &&
      s.rsi_14 < 75 &&
      s.above_sma50 &&
      s.above_sma200 &&
      s.sma_50 &&
      s.sma_50 > s.sma_200!
    ) {
      const entry = s.close;
      const stopLoss = s.sma_50! * 0.97;
      const target = s.close * 1.12;
      const idea = buildIdea(s, "Momentum Breakout", "Long", "Position (2-8 weeks)", entry, stopLoss, target);
      if (idea) {
        idea.evidence.push(`RSI ${s.rsi_14.toFixed(1)} — strong momentum without being overbought`);
        idea.evidence.push(`SMA-50 ($${s.sma_50!.toFixed(0)}) > SMA-200 ($${s.sma_200!.toFixed(0)}) — bullish structure`);
        idea.evidence.push(`Price above both key moving averages`);
        idea.conviction += s.rsi_14 > 60 ? 1 : 0;
        idea.conviction += regime === "risk-on" ? 1 : 0;
        ideas.push(idea);
      }
    }

    // 4. Mean Reversion (extended from moving average)
    if (
      s.sma_50 &&
      s.sma_50 > 0 &&
      s.above_sma200 &&
      (s.close - s.sma_50) / s.sma_50 < -0.05 &&
      s.rsi_14 < 40
    ) {
      const entry = s.close;
      const stopLoss = s.close * 0.96;
      const target = s.sma_50;
      const idea = buildIdea(s, "Mean Reversion", "Long", "Swing (2-10 days)", entry, stopLoss, target);
      if (idea) {
        const dist = ((s.close - s.sma_50) / s.sma_50 * 100).toFixed(1);
        idea.evidence.push(`${dist}% below 50-day MA — stretched for snapback`);
        idea.evidence.push(`RSI ${s.rsi_14.toFixed(1)} — approaching oversold`);
        idea.evidence.push(`Target: mean reversion to 50-day MA at $${s.sma_50.toFixed(0)}`);
        idea.conviction += s.rsi_14 < 35 ? 1 : 0;
        ideas.push(idea);
      }
    }

    // 5. Trend Continuation (steady uptrend, orderly)
    if (
      s.above_sma50 &&
      s.above_sma200 &&
      s.sma_50 &&
      s.sma_50 > s.sma_200! &&
      s.rsi_14 >= 45 &&
      s.rsi_14 <= 65 &&
      (s.change_pct ?? 0) > -2
    ) {
      const entry = s.close;
      const stopLoss = s.sma_50! * 0.96;
      const target = s.close * 1.15;
      const idea = buildIdea(s, "Trend Continuation", "Long", "Position (2-8 weeks)", entry, stopLoss, target);
      if (idea) {
        idea.evidence.push(`Orderly uptrend: Price > SMA-50 > SMA-200`);
        idea.evidence.push(`RSI ${s.rsi_14.toFixed(1)} — steady momentum, room to run`);
        idea.evidence.push(`Stop below 50-day MA support at $${s.sma_50!.toFixed(0)}`);
        idea.conviction += regime === "risk-on" ? 1 : 0;
        idea.conviction += (s.change_pct ?? 0) > 0 ? 1 : 0;
        ideas.push(idea);
      }
    }
  }

  // Deduplicate: keep highest conviction idea per ticker
  const bestByTicker = new Map<string, TradeIdea>();
  for (const idea of ideas) {
    const existing = bestByTicker.get(idea.ticker);
    if (!existing || idea.conviction > existing.conviction) {
      bestByTicker.set(idea.ticker, idea);
    }
  }

  return [...bestByTicker.values()]
    .sort((a, b) => b.conviction - a.conviction || b.riskReward - a.riskReward);
}

// --- Helpers ---

function buildIdea(
  s: ScreenerResult,
  setup: SetupType,
  direction: "Long" | "Short",
  timeframe: TradeIdea["timeframe"],
  entry: number,
  stopLoss: number,
  target: number,
): TradeIdea | null {
  if (entry <= 0 || stopLoss <= 0 || target <= 0) return null;

  const riskPct = Math.abs((entry - stopLoss) / entry) * 100;
  const rewardPct = Math.abs((target - entry) / entry) * 100;
  const riskReward = riskPct > 0 ? rewardPct / riskPct : 0;

  if (riskReward < 1.2 || riskPct > 10 || riskPct < 0.5) return null;

  return {
    ticker: s.ticker,
    name: s.name ?? "",
    sector: s.sector ?? "Unknown",
    setup,
    direction,
    timeframe,
    entry: +entry.toFixed(2),
    stopLoss: +stopLoss.toFixed(2),
    target: +target.toFixed(2),
    riskPct: +riskPct.toFixed(1),
    rewardPct: +rewardPct.toFixed(1),
    riskReward: +riskReward.toFixed(1),
    conviction: 2,
    evidence: [],
    close: s.close ?? 0,
    rsi: s.rsi_14 ?? 50,
  };
}

function classifyRegime(b: MarketBreadth): "risk-on" | "caution" | "risk-off" {
  if (b.pct_above_sma50 > 60 && (b.avg_rsi ?? 50) > 55) return "risk-on";
  if (b.pct_above_sma50 < 35 && (b.avg_rsi ?? 50) < 42) return "risk-off";
  return "caution";
}

export function regimeLabel(b: MarketBreadth): { label: string; color: string; advice: string } {
  const r = classifyRegime(b);
  if (r === "risk-on") return { label: "Risk On", color: "#22c55e", advice: "Full position sizes. Favor momentum and trend continuation setups." };
  if (r === "risk-off") return { label: "Risk Off", color: "#ef4444", advice: "Reduce exposure. Focus only on highest-conviction oversold bounces." };
  return { label: "Caution", color: "#f59e0b", advice: "Half position sizes. Favor pullback entries with tight stops." };
}

// --- Chart levels for visualization ---

export interface ChartLevels {
  data: { date: string; close: number }[];
  entry: number;
  stopLoss: number;
  target: number;
}

export function buildChartLevels(chartData: ChartRow[], idea: TradeIdea): ChartLevels {
  const data = chartData
    .filter((r) => r.close != null)
    .slice(-40)
    .map((r) => ({ date: r.date, close: r.close! }));
  return { data, entry: idea.entry, stopLoss: idea.stopLoss, target: idea.target };
}
