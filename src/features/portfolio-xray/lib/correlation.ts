/**
 * Portfolio X-Ray — Correlation & Risk Engine
 *
 * Computes pairwise correlations, diversification metrics,
 * sector concentration, and pair trade insights from price data.
 */

import type { CompareResponse } from "@/api/types/compare";

export interface CorrelationMatrix {
  tickers: string[];
  matrix: number[][]; // NxN correlation coefficients
  avgCorrelation: number;
  diversificationScore: number; // 0-100
  grade: string; // A-F
}

export interface SectorExposure {
  sector: string;
  count: number;
  pct: number;
  tickers: string[];
}

export interface PairInsight {
  tickerA: string;
  tickerB: string;
  correlation: number;
  divergence: number; // recent return spread
  type: "high-corr-diverged" | "low-corr" | "negative-corr";
  label: string;
}

export interface RiskCluster {
  id: number;
  tickers: string[];
  avgCorrelation: number;
  label: string;
}

/** Compute daily returns from cumulative percentage values. */
function dailyReturns(cumPcts: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < cumPcts.length; i++) {
    // Convert cumulative % back to daily change
    const prev = 1 + cumPcts[i - 1] / 100;
    const curr = 1 + cumPcts[i] / 100;
    returns.push(prev !== 0 ? (curr - prev) / prev : 0);
  }
  return returns;
}

/** Pearson correlation coefficient between two arrays. */
function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 5) return 0;

  let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
    sumAB += a[i] * b[i];
    sumA2 += a[i] * a[i];
    sumB2 += b[i] * b[i];
  }

  const num = n * sumAB - sumA * sumB;
  const den = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
  if (den === 0) return 0;
  return Math.max(-1, Math.min(1, num / den));
}

/** Build NxN correlation matrix from compare API response. */
export function computeCorrelationMatrix(data: CompareResponse): CorrelationMatrix {
  const { tickers, rows } = data;
  const n = tickers.length;

  // Extract time series for each ticker
  const series: Record<string, number[]> = {};
  for (const t of tickers) series[t] = [];
  for (const row of rows) {
    for (const t of tickers) {
      series[t].push(row.values[t] ?? 0);
    }
  }

  // Convert to daily returns
  const returns: Record<string, number[]> = {};
  for (const t of tickers) {
    returns[t] = dailyReturns(series[t]);
  }

  // Compute NxN correlation matrix
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  let corrSum = 0;
  let corrCount = 0;

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1; // Self-correlation
    for (let j = i + 1; j < n; j++) {
      const corr = pearson(returns[tickers[i]], returns[tickers[j]]);
      const rounded = Math.round(corr * 100) / 100;
      matrix[i][j] = rounded;
      matrix[j][i] = rounded;
      corrSum += Math.abs(rounded);
      corrCount++;
    }
  }

  const avgCorrelation = corrCount > 0 ? corrSum / corrCount : 0;

  // Diversification score: lower avg correlation = better diversified
  // 0 avg corr = 100 score, 1 avg corr = 0 score
  const diversificationScore = Math.round(Math.max(0, Math.min(100, (1 - avgCorrelation) * 100)));

  let grade: string;
  if (diversificationScore >= 80) grade = "A";
  else if (diversificationScore >= 65) grade = "B";
  else if (diversificationScore >= 50) grade = "C";
  else if (diversificationScore >= 35) grade = "D";
  else grade = "F";

  return { tickers, matrix, avgCorrelation, diversificationScore, grade };
}

/** Compute sector exposure from ticker metadata. */
export function computeSectorExposure(
  tickerSectors: Record<string, string>,
): SectorExposure[] {
  const sectorMap: Record<string, string[]> = {};
  const total = Object.keys(tickerSectors).length;

  for (const [ticker, sector] of Object.entries(tickerSectors)) {
    const s = sector || "Unknown";
    if (!sectorMap[s]) sectorMap[s] = [];
    sectorMap[s].push(ticker);
  }

  return Object.entries(sectorMap)
    .map(([sector, tickers]) => ({
      sector,
      count: tickers.length,
      pct: total > 0 ? (tickers.length / total) * 100 : 0,
      tickers,
    }))
    .sort((a, b) => b.count - a.count);
}

/** Find pair trade insights from correlation matrix. */
export function findPairInsights(
  corrMatrix: CorrelationMatrix,
  recentReturns: Record<string, number>,
): PairInsight[] {
  const { tickers, matrix } = corrMatrix;
  const insights: PairInsight[] = [];

  for (let i = 0; i < tickers.length; i++) {
    for (let j = i + 1; j < tickers.length; j++) {
      const corr = matrix[i][j];
      const retA = recentReturns[tickers[i]] ?? 0;
      const retB = recentReturns[tickers[j]] ?? 0;
      const divergence = Math.abs(retA - retB);

      if (corr >= 0.7 && divergence > 3) {
        insights.push({
          tickerA: tickers[i],
          tickerB: tickers[j],
          correlation: corr,
          divergence,
          type: "high-corr-diverged",
          label: "Correlated pair diverging — potential mean reversion",
        });
      } else if (corr <= -0.2) {
        insights.push({
          tickerA: tickers[i],
          tickerB: tickers[j],
          correlation: corr,
          divergence,
          type: "negative-corr",
          label: "Natural hedge — these move in opposite directions",
        });
      }
    }
  }

  // Sort: high-corr-diverged first, then by divergence
  return insights.sort((a, b) => {
    if (a.type !== b.type) return a.type === "high-corr-diverged" ? -1 : 1;
    return b.divergence - a.divergence;
  }).slice(0, 6);
}

/** Detect clusters of highly correlated stocks. */
export function detectClusters(corrMatrix: CorrelationMatrix): RiskCluster[] {
  const { tickers, matrix } = corrMatrix;
  const threshold = 0.6;
  const assigned = new Set<number>();
  const clusters: RiskCluster[] = [];
  let clusterId = 0;

  for (let i = 0; i < tickers.length; i++) {
    if (assigned.has(i)) continue;

    const cluster = [i];
    assigned.add(i);

    for (let j = i + 1; j < tickers.length; j++) {
      if (assigned.has(j)) continue;
      // Check if j is correlated with all members of cluster
      const allCorr = cluster.every((k) => matrix[k][j] >= threshold);
      if (allCorr) {
        cluster.push(j);
        assigned.add(j);
      }
    }

    const clusterTickers = cluster.map((idx) => tickers[idx]);

    // Compute average intra-cluster correlation
    let sum = 0, count = 0;
    for (let a = 0; a < cluster.length; a++) {
      for (let b = a + 1; b < cluster.length; b++) {
        sum += matrix[cluster[a]][cluster[b]];
        count++;
      }
    }

    clusters.push({
      id: clusterId++,
      tickers: clusterTickers,
      avgCorrelation: count > 0 ? Math.round((sum / count) * 100) / 100 : 1,
      label: cluster.length > 1 ? "Risk cluster — these move together" : "Independent",
    });
  }

  return clusters.sort((a, b) => b.tickers.length - a.tickers.length);
}
