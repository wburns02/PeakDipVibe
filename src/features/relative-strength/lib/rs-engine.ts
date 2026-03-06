import type { ScreenerResult } from "@/api/types/screener";
import type { ChartRow } from "@/api/types/price";

// --- Types ---

export interface RsStock {
  ticker: string;
  name: string;
  sector: string;
  close: number;
  changePct: number;
  rsScore: number;
  ratio50: number;
  ratio200: number;
  rsi: number;
  trend: "improving" | "declining" | "neutral";
  aboveSma50: boolean;
  aboveSma200: boolean;
}

export interface RsLinePoint {
  date: string;
  ratio: number;
}

export interface SectorRs {
  sector: string;
  avgScore: number;
  count: number;
}

// --- RS Score Computation ---

export function computeRsScores(stocks: ScreenerResult[]): RsStock[] {
  const valid = stocks.filter(
    (s) => s.close != null && s.sma_200 != null && s.sma_200! > 0,
  );

  // Raw composite score per stock
  const withRaw = valid.map((s) => {
    const ratio200 = (s.close! - s.sma_200!) / s.sma_200!;
    const ratio50 = s.sma_50 && s.sma_50 > 0 ? (s.close! - s.sma_50!) / s.sma_50! : 0;
    const rsiNorm = ((s.rsi_14 ?? 50) / 100) - 0.5;
    const raw = 0.45 * ratio200 + 0.35 * ratio50 + 0.20 * rsiNorm;
    return { stock: s, raw, ratio200, ratio50 };
  });

  // Sort ascending → index 0 = weakest
  withRaw.sort((a, b) => a.raw - b.raw);

  const avgChange = valid.reduce((sum, s) => sum + (s.change_pct ?? 0), 0) / (valid.length || 1);
  const n = withRaw.length;

  return withRaw.map((item, i) => {
    const rsScore = Math.max(1, Math.min(99, Math.round(((i + 1) / n) * 99)));
    const changePct = item.stock.change_pct ?? 0;

    let trend: "improving" | "declining" | "neutral";
    if (item.ratio50 > 0.02 && changePct > avgChange) trend = "improving";
    else if (item.ratio50 < -0.02 && changePct < avgChange) trend = "declining";
    else trend = "neutral";

    return {
      ticker: item.stock.ticker,
      name: item.stock.name ?? "",
      sector: item.stock.sector ?? "Unknown",
      close: item.stock.close ?? 0,
      changePct,
      rsScore,
      ratio50: item.ratio50,
      ratio200: item.ratio200,
      rsi: item.stock.rsi_14 ?? 50,
      trend,
      aboveSma50: item.stock.above_sma50 ?? false,
      aboveSma200: item.stock.above_sma200 ?? false,
    };
  });
}

// --- RS Line from chart data ---

export function computeRsLine(chartData: ChartRow[]): RsLinePoint[] {
  return chartData
    .filter((r) => r.close != null && r.sma_200 != null && r.sma_200! > 0)
    .map((r) => ({
      date: r.date,
      ratio: +(r.close! / r.sma_200!).toFixed(4),
    }));
}

// --- Sector RS aggregation ---

export function computeSectorRs(stocks: RsStock[]): SectorRs[] {
  const map = new Map<string, { sum: number; count: number }>();
  for (const s of stocks) {
    const existing = map.get(s.sector);
    if (existing) { existing.sum += s.rsScore; existing.count++; }
    else map.set(s.sector, { sum: s.rsScore, count: 1 });
  }
  return [...map.entries()]
    .map(([sector, { sum, count }]) => ({ sector, avgScore: Math.round(sum / count), count }))
    .sort((a, b) => b.avgScore - a.avgScore);
}

// --- Helpers ---

export function rsScoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#84cc16";
  if (score >= 40) return "#eab308";
  if (score >= 20) return "#f97316";
  return "#ef4444";
}

export function rsScoreLabel(score: number): string {
  if (score >= 80) return "Leader";
  if (score >= 60) return "Strong";
  if (score >= 40) return "Neutral";
  if (score >= 20) return "Weak";
  return "Laggard";
}
