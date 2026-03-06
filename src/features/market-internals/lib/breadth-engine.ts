import type { ChartRow } from "@/api/types/price";
import type { ScreenerResult } from "@/api/types/screener";
import type { MarketBreadth, SectorPerformance } from "@/api/types/market";

// --- Types ---

export interface HistoricalBreadth {
  date: string;
  pctAboveSma50: number;
  pctAboveSma200: number;
  advancePct: number;
}

export interface MarketRegime {
  label: string;
  color: string;
  description: string;
  actions: string[];
}

export interface RsiBucket {
  range: string;
  count: number;
  color: string;
}

export interface SectorHealth {
  sector: string;
  avgChange: number;
  tickerCount: number;
}

// --- Representative sample: 2 large-caps per GICS sector ---

export const SAMPLE_TICKERS = [
  "AAPL", "MSFT",   // Information Technology
  "JNJ", "UNH",     // Health Care
  "JPM", "GS",      // Financials
  "AMZN", "HD",     // Consumer Discretionary
  "GOOGL", "META",  // Communication Services
  "CAT", "HON",     // Industrials
  "PG", "KO",       // Consumer Staples
  "XOM", "CVX",     // Energy
  "NEE", "SO",      // Utilities
  "LIN", "APD",     // Materials
  "PLD", "AMT",     // Real Estate
];

// --- Health Score ---

export function computeHealthScore(b: MarketBreadth): number {
  const sma50 = b.pct_above_sma50;
  const sma200 = b.pct_above_sma200;
  const rsiNorm = Math.min(100, Math.max(0, ((b.avg_rsi ?? 50) / 70) * 100));
  const adNorm = Math.min(100, Math.max(0, b.advance_decline_ratio * 50));
  const oversoldPenalty = Math.min(50, b.pct_oversold * 3);

  return Math.round(
    sma50 * 0.30 +
    sma200 * 0.20 +
    rsiNorm * 0.20 +
    adNorm * 0.20 +
    (100 - oversoldPenalty) * 0.10
  );
}

// --- Regime Classification ---

export function classifyRegime(b: MarketBreadth): MarketRegime {
  if (b.pct_above_sma50 > 65 && b.pct_above_sma200 > 60 && (b.avg_rsi ?? 50) > 55) {
    return {
      label: "Risk On",
      color: "#22c55e",
      description: "Broad market strength. Most stocks trending above key moving averages with healthy momentum.",
      actions: [
        "Look for trend-following entries on pullbacks",
        "Consider adding to winning positions",
        "Use wider stops to let trends run",
      ],
    };
  }

  if (b.pct_above_sma50 < 30 && (b.avg_rsi ?? 50) < 40) {
    if (b.pct_oversold > 8) {
      return {
        label: "Oversold Bounce",
        color: "#f59e0b",
        description: "Extreme oversold readings across the market. Historical mean-reversion setups are emerging.",
        actions: [
          "Screen for RSI < 30 stocks above SMA-200",
          "Scale in gradually — don't catch falling knives",
          "Set tight stops below recent swing lows",
        ],
      };
    }
    return {
      label: "Risk Off",
      color: "#ef4444",
      description: "Broad market weakness. Most stocks below key moving averages with deteriorating momentum.",
      actions: [
        "Reduce exposure and raise cash levels",
        "Focus on defensive sectors (Utilities, Staples)",
        "Tighten stops on all existing positions",
      ],
    };
  }

  if (b.pct_above_sma50 >= 30 && b.pct_above_sma50 <= 55 && b.advance_decline_ratio < 0.8) {
    return {
      label: "Caution",
      color: "#f97316",
      description: "Mixed signals. Market breadth is narrowing — fewer stocks carrying the weight.",
      actions: [
        "Reduce position sizes by 30-50%",
        "Focus only on highest-conviction setups",
        "Watch for breadth divergences from indices",
      ],
    };
  }

  return {
    label: "Rotation",
    color: "#3b82f6",
    description: "Sector leadership is shifting. Money rotating between sectors rather than broad risk-on or risk-off.",
    actions: [
      "Rotate into leading sectors (check Sector Rotation page)",
      "Trim lagging sector positions",
      "Watch for new trend leaders emerging from oversold sectors",
    ],
  };
}

// --- Color helpers ---

export function scoreToColor(score: number): string {
  const hue = Math.round(Math.min(score, 100) * 1.2);
  return `hsl(${hue}, 75%, 50%)`;
}

export function scoreToLabel(score: number): string {
  if (score >= 75) return "Strong";
  if (score >= 55) return "Healthy";
  if (score >= 40) return "Mixed";
  if (score >= 25) return "Weak";
  return "Critical";
}

// --- Historical Breadth from chart data ---

export function computeHistoricalBreadth(
  tickerData: Record<string, ChartRow[]>,
): HistoricalBreadth[] {
  interface Acc {
    aboveSma50: number; totalSma50: number;
    aboveSma200: number; totalSma200: number;
    advances: number; total: number;
  }

  const dateMap = new Map<string, Acc>();

  for (const rows of Object.values(tickerData)) {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.close == null) continue;

      let acc = dateMap.get(row.date);
      if (!acc) {
        acc = { aboveSma50: 0, totalSma50: 0, aboveSma200: 0, totalSma200: 0, advances: 0, total: 0 };
        dateMap.set(row.date, acc);
      }

      if (row.sma_50 != null) {
        acc.totalSma50++;
        if (row.close > row.sma_50) acc.aboveSma50++;
      }
      if (row.sma_200 != null) {
        acc.totalSma200++;
        if (row.close > row.sma_200) acc.aboveSma200++;
      }
      if (i > 0 && rows[i - 1].close != null) {
        acc.total++;
        if (row.close > rows[i - 1].close!) acc.advances++;
      }
    }
  }

  return [...dateMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      pctAboveSma50: d.totalSma50 > 0 ? Math.round((d.aboveSma50 / d.totalSma50) * 100) : 0,
      pctAboveSma200: d.totalSma200 > 0 ? Math.round((d.aboveSma200 / d.totalSma200) * 100) : 0,
      advancePct: d.total > 0 ? Math.round((d.advances / d.total) * 100) : 50,
    }));
}

// --- RSI Distribution ---

const BUCKET_COLORS: Record<string, string> = {
  "0-10": "#ef4444", "10-20": "#ef4444",
  "20-30": "#22c55e", "30-40": "#22c55e",
  "40-50": "#6b7280", "50-60": "#6b7280",
  "60-70": "#f59e0b", "70-80": "#ef4444",
  "80-90": "#ef4444", "90-100": "#ef4444",
};

export function computeRsiBuckets(stocks: ScreenerResult[]): RsiBucket[] {
  const buckets: RsiBucket[] = [];
  for (let lo = 0; lo < 100; lo += 10) {
    const hi = lo + 10;
    const range = `${lo}-${hi}`;
    const count = stocks.filter(
      (s) => s.rsi_14 != null && s.rsi_14 >= lo && (hi < 100 ? s.rsi_14 < hi : s.rsi_14 <= hi),
    ).length;
    buckets.push({ range, count, color: BUCKET_COLORS[range] || "#6b7280" });
  }
  return buckets;
}

// --- Sector health from overview ---

export function buildSectorHealth(sectors: SectorPerformance[]): SectorHealth[] {
  return sectors
    .filter((s) => s.sector && s.sector !== "")
    .map((s) => ({
      sector: s.sector,
      avgChange: s.avg_change_pct,
      tickerCount: s.ticker_count,
    }))
    .sort((a, b) => b.avgChange - a.avgChange);
}
