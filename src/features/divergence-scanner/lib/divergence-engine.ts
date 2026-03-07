import type { ChartRow } from "@/api/types/price";

// ── Types ──────────────────────────────────────────────────────

export type DivergenceType = "bullish" | "bearish";

export interface SwingPoint {
  index: number;
  date: string;
  close: number;
  rsi: number;
}

export interface Divergence {
  ticker: string;
  name: string;
  sector: string;
  type: DivergenceType;
  conviction: number; // 1–5
  swingA: SwingPoint;
  swingB: SwingPoint;
  priceDelta: number;
  rsiDelta: number;
  recencyDays: number;
  currentClose: number;
  currentRsi: number;
  chartSlice: { date: string; close: number; rsi: number }[];
}

// ── RSI Computation (Wilder's smoothing) ───────────────────────

export function computeRSI(closes: number[], period = 14): number[] {
  const rsi: number[] = new Array(closes.length).fill(50);
  if (closes.length < period + 1) return rsi;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d;
    else avgLoss += Math.abs(d);
  }
  avgGain /= period;
  avgLoss /= period;

  const rs0 = avgLoss === 0 ? 999 : avgGain / avgLoss;
  rsi[period] = 100 - 100 / (1 + rs0);

  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? Math.abs(d) : 0)) / period;
    const rs = avgLoss === 0 ? 999 : avgGain / avgLoss;
    rsi[i] = 100 - 100 / (1 + rs);
  }
  return rsi;
}

// ── Swing Point Detection ──────────────────────────────────────

const SWING_W = 5;

export function findSwingLows(
  data: { close: number; rsi: number; date: string }[],
): SwingPoint[] {
  const pts: SwingPoint[] = [];
  for (let i = SWING_W; i < data.length - SWING_W; i++) {
    let ok = true;
    for (let j = i - SWING_W; j <= i + SWING_W; j++) {
      if (j !== i && data[j].close <= data[i].close) { ok = false; break; }
    }
    if (ok) pts.push({ index: i, date: data[i].date, close: data[i].close, rsi: data[i].rsi });
  }
  return pts;
}

export function findSwingHighs(
  data: { close: number; rsi: number; date: string }[],
): SwingPoint[] {
  const pts: SwingPoint[] = [];
  for (let i = SWING_W; i < data.length - SWING_W; i++) {
    let ok = true;
    for (let j = i - SWING_W; j <= i + SWING_W; j++) {
      if (j !== i && data[j].close >= data[i].close) { ok = false; break; }
    }
    if (ok) pts.push({ index: i, date: data[i].date, close: data[i].close, rsi: data[i].rsi });
  }
  return pts;
}

// ── Conviction Scoring ─────────────────────────────────────────

function conviction(
  type: DivergenceType,
  rsiB: number,
  recency: number,
  rsiMag: number,
): number {
  let s = 2;
  if (recency <= 5) s++;
  if (type === "bullish" && rsiB < 35) s++;
  if (type === "bearish" && rsiB > 65) s++;
  if (rsiMag > 5) s++;
  return Math.min(s, 5);
}

// ── Main Detection ─────────────────────────────────────────────

export function detectDivergences(
  chartRows: ChartRow[],
  ticker: string,
  name: string,
  sector: string,
): Divergence[] {
  const rows = [...chartRows].reverse(); // chronological
  const validRows = rows.filter((r) => r.close != null && r.close > 0);
  if (validRows.length < 30) return [];

  const closes = validRows.map((r) => r.close!);
  const rsi = computeRSI(closes);

  const data = validRows.map((r, i) => ({
    date: r.date,
    close: r.close!,
    rsi: rsi[i],
  }));

  const swingLows = findSwingLows(data);
  const swingHighs = findSwingHighs(data);
  const results: Divergence[] = [];

  const currentClose = data[data.length - 1].close;
  const currentRsi = data[data.length - 1].rsi;

  // Bullish: price lower low + RSI higher low
  for (let i = 1; i < swingLows.length; i++) {
    const a = swingLows[i - 1];
    const b = swingLows[i];
    if (data.length - b.index > 20) continue;
    if (b.close >= a.close) continue;
    if (b.rsi <= a.rsi) continue;
    if (b.rsi - a.rsi < 2) continue;

    const pd = ((b.close - a.close) / a.close) * 100;
    const rd = b.rsi - a.rsi;
    const rec = data.length - b.index;
    const s0 = Math.max(0, a.index - 3);
    const s1 = Math.min(data.length, b.index + 5);

    results.push({
      ticker, name, sector, type: "bullish",
      conviction: conviction("bullish", b.rsi, rec, Math.abs(rd)),
      swingA: a, swingB: b,
      priceDelta: pd, rsiDelta: rd, recencyDays: rec,
      currentClose, currentRsi,
      chartSlice: data.slice(s0, Math.max(s1, s0 + 10)),
    });
  }

  // Bearish: price higher high + RSI lower high
  for (let i = 1; i < swingHighs.length; i++) {
    const a = swingHighs[i - 1];
    const b = swingHighs[i];
    if (data.length - b.index > 20) continue;
    if (b.close <= a.close) continue;
    if (b.rsi >= a.rsi) continue;
    if (a.rsi - b.rsi < 2) continue;

    const pd = ((b.close - a.close) / a.close) * 100;
    const rd = b.rsi - a.rsi;
    const rec = data.length - b.index;
    const s0 = Math.max(0, a.index - 3);
    const s1 = Math.min(data.length, b.index + 5);

    results.push({
      ticker, name, sector, type: "bearish",
      conviction: conviction("bearish", b.rsi, rec, Math.abs(rd)),
      swingA: a, swingB: b,
      priceDelta: pd, rsiDelta: rd, recencyDays: rec,
      currentClose, currentRsi,
      chartSlice: data.slice(s0, Math.max(s1, s0 + 10)),
    });
  }

  results.sort((a, b) => b.conviction - a.conviction || a.recencyDays - b.recencyDays);

  // Keep best divergence per ticker per type
  const seen = new Set<string>();
  return results.filter((d) => {
    const k = `${d.ticker}-${d.type}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ── Helpers ────────────────────────────────────────────────────

export function divColor(type: DivergenceType): string {
  return type === "bullish" ? "#22c55e" : "#ef4444";
}
