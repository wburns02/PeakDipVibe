/**
 * Sector Rotation Engine
 *
 * Computes relative strength and momentum for each sector
 * to power the Relative Rotation Graph (RRG) and sector rankings.
 */

import type { ScreenerResult } from "@/api/types/screener";

export interface SectorMetrics {
  sector: string;
  stockCount: number;
  avgChangePct: number;
  avgRsi: number;
  pctAboveSma50: number;
  pctAboveSma200: number;
  relativeStrength: number; // -100 to +100, vs market avg
  momentum: number;         // -100 to +100, rate of change of RS
  quadrant: Quadrant;
  score: number;            // 0-100 composite
  topStocks: StockInSector[];
  bottomStocks: StockInSector[];
}

export interface StockInSector {
  ticker: string;
  name: string;
  changePct: number;
  rsi: number;
  aboveSma50: boolean;
}

export type Quadrant = "leading" | "weakening" | "lagging" | "improving";

const QUADRANT_META: Record<Quadrant, { label: string; color: string; desc: string }> = {
  leading:    { label: "Leading",    color: "#22c55e", desc: "Strong & getting stronger" },
  weakening:  { label: "Weakening",  color: "#eab308", desc: "Strong but losing momentum" },
  lagging:    { label: "Lagging",    color: "#ef4444", desc: "Weak & getting weaker" },
  improving:  { label: "Improving",  color: "#3b82f6", desc: "Weak but gaining momentum" },
};

export function getQuadrantMeta(q: Quadrant) {
  return QUADRANT_META[q];
}

function mean(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function computeSectorMetrics(stocks: ScreenerResult[]): SectorMetrics[] {
  // Group by sector
  const sectorMap: Record<string, ScreenerResult[]> = {};
  for (const s of stocks) {
    const sec = s.sector || "Unknown";
    if (!sectorMap[sec]) sectorMap[sec] = [];
    sectorMap[sec].push(s);
  }

  // Compute market-wide averages
  const allChanges = stocks.map((s) => s.change_pct ?? 0);
  const allRsi = stocks.filter((s) => s.rsi_14 != null).map((s) => s.rsi_14!);
  const marketAvgChange = mean(allChanges);
  const marketAvgRsi = mean(allRsi);
  const marketPctAbove50 = stocks.filter((s) => s.above_sma50).length / Math.max(stocks.length, 1) * 100;

  // Compute per-sector metrics
  const sectors: SectorMetrics[] = [];

  for (const [sector, sectorStocks] of Object.entries(sectorMap)) {
    if (sectorStocks.length < 3) continue; // Skip tiny sectors

    const changes = sectorStocks.map((s) => s.change_pct ?? 0);
    const rsis = sectorStocks.filter((s) => s.rsi_14 != null).map((s) => s.rsi_14!);
    const above50 = sectorStocks.filter((s) => s.above_sma50).length;
    const above200 = sectorStocks.filter((s) => s.above_sma200).length;

    const avgChangePct = mean(changes);
    const avgRsi = rsis.length > 0 ? mean(rsis) : 50;
    const pctAboveSma50 = (above50 / sectorStocks.length) * 100;
    const pctAboveSma200 = (above200 / sectorStocks.length) * 100;

    // Relative Strength: how sector performs vs market
    // Combine change% vs market + RSI vs market + breadth vs market
    const changeRS = (avgChangePct - marketAvgChange) * 15; // amplify small differences
    const rsiRS = (avgRsi - marketAvgRsi) * 1.5;
    const breadthRS = (pctAboveSma50 - marketPctAbove50) * 0.5;
    const relativeStrength = clamp(changeRS + rsiRS * 0.3 + breadthRS * 0.3, -100, 100);

    // Momentum: rate of change proxy — RSI distance from 50 + breadth strength
    // Higher RSI & breadth = positive momentum
    const rsiMomentum = (avgRsi - 50) * 2;
    const breadthMomentum = (pctAboveSma50 - 50) * 1.2;
    const changeMomentum = avgChangePct * 10;
    const momentum = clamp(rsiMomentum * 0.4 + breadthMomentum * 0.3 + changeMomentum * 0.3, -100, 100);

    // Quadrant
    let quadrant: Quadrant;
    if (relativeStrength >= 0 && momentum >= 0) quadrant = "leading";
    else if (relativeStrength >= 0 && momentum < 0) quadrant = "weakening";
    else if (relativeStrength < 0 && momentum < 0) quadrant = "lagging";
    else quadrant = "improving";

    // Composite score: 0-100
    const score = clamp(Math.round(50 + relativeStrength * 0.3 + momentum * 0.2), 0, 100);

    // Top/bottom stocks
    const sorted = [...sectorStocks].sort((a, b) => (b.change_pct ?? 0) - (a.change_pct ?? 0));
    const toStock = (s: ScreenerResult): StockInSector => ({
      ticker: s.ticker,
      name: s.name ?? s.ticker,
      changePct: s.change_pct ?? 0,
      rsi: s.rsi_14 ?? 50,
      aboveSma50: s.above_sma50 ?? false,
    });

    sectors.push({
      sector,
      stockCount: sectorStocks.length,
      avgChangePct,
      avgRsi,
      pctAboveSma50,
      pctAboveSma200,
      relativeStrength: Math.round(relativeStrength * 10) / 10,
      momentum: Math.round(momentum * 10) / 10,
      quadrant,
      score,
      topStocks: sorted.slice(0, 3).map(toStock),
      bottomStocks: sorted.slice(-3).reverse().map(toStock),
    });
  }

  return sectors.sort((a, b) => b.score - a.score);
}
