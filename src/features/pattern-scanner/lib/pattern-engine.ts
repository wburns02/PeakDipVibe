import type { ChartRow } from "@/api/types/price";

// ── Types ──────────────────────────────────────────────────────

export type PatternType =
  | "double-bottom"
  | "double-top"
  | "bull-flag"
  | "bear-flag"
  | "ascending-triangle"
  | "descending-triangle"
  | "head-and-shoulders"
  | "inverse-head-and-shoulders";

export interface KeyPoint {
  date: string;
  price: number;
  label: string;
}

export interface DetectedPattern {
  ticker: string;
  name: string;
  sector: string;
  pattern: PatternType;
  type: "bullish" | "bearish";
  label: string;
  keyPoints: KeyPoint[];
  neckline?: number;
  entryPrice: number;
  targetPrice: number;
  stopPrice: number;
  potentialPct: number;
  riskReward: number;
  conviction: number; // 1–5
  recencyDays: number;
  chartSlice: { date: string; close: number; high: number; low: number }[];
}

// ── Swing Detection (5-bar window) ─────────────────────────────

interface Swing {
  index: number;
  date: string;
  price: number;
}

function findSwingHighs(data: { high: number; date: string }[]): Swing[] {
  const out: Swing[] = [];
  for (let i = 2; i < data.length - 2; i++) {
    const h = data[i].high;
    if (
      h > data[i - 1].high &&
      h > data[i - 2].high &&
      h > data[i + 1].high &&
      h > data[i + 2].high
    ) {
      out.push({ index: i, date: data[i].date, price: h });
    }
  }
  return out;
}

function findSwingLows(data: { low: number; date: string }[]): Swing[] {
  const out: Swing[] = [];
  for (let i = 2; i < data.length - 2; i++) {
    const l = data[i].low;
    if (
      l < data[i - 1].low &&
      l < data[i - 2].low &&
      l < data[i + 1].low &&
      l < data[i + 2].low
    ) {
      out.push({ index: i, date: data[i].date, price: l });
    }
  }
  return out;
}

// ── Helpers ────────────────────────────────────────────────────

type Bar = { date: string; close: number; high: number; low: number };

function pctDiff(a: number, b: number): number {
  return Math.abs(a - b) / Math.max(a, b);
}

function slice(data: Bar[], from: number, to: number): Bar[] {
  return data.slice(Math.max(0, from - 3), Math.min(data.length, to + 5));
}

function rnd(v: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

// ── Pattern Detectors ──────────────────────────────────────────

function detectDoubleBottom(data: Bar[], swingLows: Swing[]): Omit<DetectedPattern, "ticker" | "name" | "sector">[] {
  const n = data.length;
  const results: Omit<DetectedPattern, "ticker" | "name" | "sector">[] = [];

  for (let i = 0; i < swingLows.length - 1; i++) {
    const A = swingLows[i];
    const B = swingLows[i + 1];
    if (B.index - A.index < 10 || A.index < n - 60) continue;
    if (pctDiff(A.price, B.price) > 0.035) continue;

    let neckline = 0;
    let neckDate = data[A.index].date;
    for (let j = A.index; j <= B.index; j++) {
      if (data[j].high > neckline) {
        neckline = data[j].high;
        neckDate = data[j].date;
      }
    }
    const avgLow = (A.price + B.price) / 2;
    if ((neckline - avgLow) / avgLow < 0.03) continue;

    const cur = data[n - 1].close;
    if (cur < B.price) continue;

    const target = neckline + (neckline - avgLow);
    const stop = avgLow * 0.98;
    const pot = ((target - cur) / cur) * 100;
    const risk = cur - stop;
    const rr = risk > 0 ? (target - cur) / risk : 0;

    let conv = 2;
    if (B.index >= n - 10) conv++;
    if (pctDiff(A.price, B.price) < 0.015) conv++;
    if (cur > avgLow * 1.02) conv++;

    results.push({
      pattern: "double-bottom",
      type: "bullish",
      label: "Double Bottom",
      keyPoints: [
        { date: A.date, price: A.price, label: "Low 1" },
        { date: neckDate, price: neckline, label: "Neckline" },
        { date: B.date, price: B.price, label: "Low 2" },
      ],
      neckline,
      entryPrice: cur,
      targetPrice: rnd(target),
      stopPrice: rnd(stop),
      potentialPct: rnd(pot, 1),
      riskReward: rnd(rr, 1),
      conviction: Math.min(conv, 5),
      recencyDays: n - 1 - B.index,
      chartSlice: slice(data, A.index, n - 1),
    });
  }
  return results;
}

function detectDoubleTop(data: Bar[], swingHighs: Swing[]): Omit<DetectedPattern, "ticker" | "name" | "sector">[] {
  const n = data.length;
  const results: Omit<DetectedPattern, "ticker" | "name" | "sector">[] = [];

  for (let i = 0; i < swingHighs.length - 1; i++) {
    const A = swingHighs[i];
    const B = swingHighs[i + 1];
    if (B.index - A.index < 10 || A.index < n - 60) continue;
    if (pctDiff(A.price, B.price) > 0.035) continue;

    let neckline = Infinity;
    let neckDate = data[A.index].date;
    for (let j = A.index; j <= B.index; j++) {
      if (data[j].low < neckline) {
        neckline = data[j].low;
        neckDate = data[j].date;
      }
    }
    const avgHigh = (A.price + B.price) / 2;
    if ((avgHigh - neckline) / avgHigh < 0.03) continue;

    const cur = data[n - 1].close;
    if (cur > B.price) continue;

    const target = neckline - (avgHigh - neckline);
    const stop = avgHigh * 1.02;
    const pot = ((cur - target) / cur) * 100;
    const risk = stop - cur;
    const rr = risk > 0 ? (cur - target) / risk : 0;

    let conv = 2;
    if (B.index >= n - 10) conv++;
    if (pctDiff(A.price, B.price) < 0.015) conv++;
    if (cur < avgHigh * 0.98) conv++;

    results.push({
      pattern: "double-top",
      type: "bearish",
      label: "Double Top",
      keyPoints: [
        { date: A.date, price: A.price, label: "High 1" },
        { date: neckDate, price: neckline, label: "Neckline" },
        { date: B.date, price: B.price, label: "High 2" },
      ],
      neckline,
      entryPrice: cur,
      targetPrice: rnd(Math.max(target, 0.01)),
      stopPrice: rnd(stop),
      potentialPct: rnd(pot, 1),
      riskReward: rnd(rr, 1),
      conviction: Math.min(conv, 5),
      recencyDays: n - 1 - B.index,
      chartSlice: slice(data, A.index, n - 1),
    });
  }
  return results;
}

function detectBullFlag(data: Bar[]): Omit<DetectedPattern, "ticker" | "name" | "sector">[] {
  const n = data.length;
  const results: Omit<DetectedPattern, "ticker" | "name" | "sector">[] = [];

  for (let poleEnd = n - 8; poleEnd >= n - 35 && poleEnd >= 0; poleEnd--) {
    for (let poleLen = 5; poleLen <= 15 && poleEnd - poleLen >= 0; poleLen++) {
      const ps = poleEnd - poleLen;
      const gain = (data[poleEnd].close - data[ps].close) / data[ps].close;
      if (gain < 0.08) continue;

      const flag = data.slice(poleEnd, n);
      if (flag.length < 5) continue;

      const fHi = Math.max(...flag.map((d) => d.high));
      const fLo = Math.min(...flag.map((d) => d.low));
      if ((fHi - fLo) / fHi > 0.06) continue;

      const poleH = data[poleEnd].close - data[ps].close;
      if (data[poleEnd].close - fLo > poleH * 0.5) continue;

      const cur = data[n - 1].close;
      const target = cur + poleH;
      const stop = fLo * 0.98;
      const pot = ((target - cur) / cur) * 100;
      const risk = cur - stop;
      const rr = risk > 0 ? (target - cur) / risk : 0;

      let conv = 2;
      if (flag.length <= 15) conv++;
      if ((fHi - fLo) / fHi < 0.03) conv++;
      if (gain > 0.12) conv++;

      results.push({
        pattern: "bull-flag",
        type: "bullish",
        label: "Bull Flag",
        keyPoints: [
          { date: data[ps].date, price: data[ps].close, label: "Pole Start" },
          { date: data[poleEnd].date, price: data[poleEnd].close, label: "Pole Top" },
          { date: data[n - 1].date, price: cur, label: "Flag" },
        ],
        entryPrice: cur,
        targetPrice: rnd(target),
        stopPrice: rnd(stop),
        potentialPct: rnd(pot, 1),
        riskReward: rnd(rr, 1),
        conviction: Math.min(conv, 5),
        recencyDays: 0,
        chartSlice: slice(data, ps, n - 1),
      });
      return results; // One flag per stock
    }
  }
  return results;
}

function detectBearFlag(data: Bar[]): Omit<DetectedPattern, "ticker" | "name" | "sector">[] {
  const n = data.length;
  const results: Omit<DetectedPattern, "ticker" | "name" | "sector">[] = [];

  for (let poleEnd = n - 8; poleEnd >= n - 35 && poleEnd >= 0; poleEnd--) {
    for (let poleLen = 5; poleLen <= 15 && poleEnd - poleLen >= 0; poleLen++) {
      const ps = poleEnd - poleLen;
      const drop = (data[ps].close - data[poleEnd].close) / data[ps].close;
      if (drop < 0.08) continue;

      const flag = data.slice(poleEnd, n);
      if (flag.length < 5) continue;

      const fHi = Math.max(...flag.map((d) => d.high));
      const fLo = Math.min(...flag.map((d) => d.low));
      if ((fHi - fLo) / fHi > 0.06) continue;

      const poleH = data[ps].close - data[poleEnd].close;
      if (fHi - data[poleEnd].close > poleH * 0.5) continue;

      const cur = data[n - 1].close;
      const target = Math.max(cur - poleH, 0.01);
      const stop = fHi * 1.02;
      const pot = ((cur - target) / cur) * 100;
      const risk = stop - cur;
      const rr = risk > 0 ? (cur - target) / risk : 0;

      let conv = 2;
      if (flag.length <= 15) conv++;
      if ((fHi - fLo) / fHi < 0.03) conv++;
      if (drop > 0.12) conv++;

      results.push({
        pattern: "bear-flag",
        type: "bearish",
        label: "Bear Flag",
        keyPoints: [
          { date: data[ps].date, price: data[ps].close, label: "Pole Start" },
          { date: data[poleEnd].date, price: data[poleEnd].close, label: "Pole Low" },
          { date: data[n - 1].date, price: cur, label: "Flag" },
        ],
        entryPrice: cur,
        targetPrice: rnd(target),
        stopPrice: rnd(stop),
        potentialPct: rnd(pot, 1),
        riskReward: rnd(rr, 1),
        conviction: Math.min(conv, 5),
        recencyDays: 0,
        chartSlice: slice(data, ps, n - 1),
      });
      return results;
    }
  }
  return results;
}

function detectHeadAndShoulders(
  data: Bar[],
  swingHighs: Swing[],
  swingLows: Swing[],
): Omit<DetectedPattern, "ticker" | "name" | "sector">[] {
  const n = data.length;
  const results: Omit<DetectedPattern, "ticker" | "name" | "sector">[] = [];

  for (let i = 0; i < swingHighs.length - 2; i++) {
    const L = swingHighs[i];
    const H = swingHighs[i + 1];
    const R = swingHighs[i + 2];

    if (L.index < n - 60) continue;
    if (H.price <= L.price || H.price <= R.price) continue;

    const avgSh = (L.price + R.price) / 2;
    if ((H.price - avgSh) / avgSh < 0.03) continue;
    if (pctDiff(L.price, R.price) > 0.06) continue;

    const t1 = swingLows.find((s) => s.index > L.index && s.index < H.index);
    const t2 = swingLows.find((s) => s.index > H.index && s.index < R.index);
    if (!t1 || !t2) continue;

    const neck = (t1.price + t2.price) / 2;
    const cur = data[n - 1].close;
    if (cur > R.price) continue;

    const target = Math.max(neck - (H.price - neck), 0.01);
    const stop = R.price * 1.02;
    const pot = ((cur - target) / cur) * 100;
    const risk = stop - cur;
    const rr = risk > 0 ? (cur - target) / risk : 0;

    let conv = 2;
    if (R.index >= n - 15) conv++;
    if (pctDiff(L.price, R.price) < 0.025) conv++;
    if (cur < neck) conv++;

    results.push({
      pattern: "head-and-shoulders",
      type: "bearish",
      label: "Head & Shoulders",
      keyPoints: [
        { date: L.date, price: L.price, label: "L Shoulder" },
        { date: H.date, price: H.price, label: "Head" },
        { date: R.date, price: R.price, label: "R Shoulder" },
      ],
      neckline: neck,
      entryPrice: cur,
      targetPrice: rnd(target),
      stopPrice: rnd(stop),
      potentialPct: rnd(pot, 1),
      riskReward: rnd(rr, 1),
      conviction: Math.min(conv, 5),
      recencyDays: n - 1 - R.index,
      chartSlice: slice(data, L.index, n - 1),
    });
  }
  return results;
}

function detectInverseHS(
  data: Bar[],
  swingHighs: Swing[],
  swingLows: Swing[],
): Omit<DetectedPattern, "ticker" | "name" | "sector">[] {
  const n = data.length;
  const results: Omit<DetectedPattern, "ticker" | "name" | "sector">[] = [];

  for (let i = 0; i < swingLows.length - 2; i++) {
    const L = swingLows[i];
    const H = swingLows[i + 1];
    const R = swingLows[i + 2];

    if (L.index < n - 60) continue;
    if (H.price >= L.price || H.price >= R.price) continue;

    const avgSh = (L.price + R.price) / 2;
    if ((avgSh - H.price) / avgSh < 0.03) continue;
    if (pctDiff(L.price, R.price) > 0.06) continue;

    const p1 = swingHighs.find((s) => s.index > L.index && s.index < H.index);
    const p2 = swingHighs.find((s) => s.index > H.index && s.index < R.index);
    if (!p1 || !p2) continue;

    const neck = (p1.price + p2.price) / 2;
    const cur = data[n - 1].close;
    if (cur < R.price) continue;

    const target = neck + (neck - H.price);
    const stop = R.price * 0.98;
    const pot = ((target - cur) / cur) * 100;
    const risk = cur - stop;
    const rr = risk > 0 ? (target - cur) / risk : 0;

    let conv = 2;
    if (R.index >= n - 15) conv++;
    if (pctDiff(L.price, R.price) < 0.025) conv++;
    if (cur > neck) conv++;

    results.push({
      pattern: "inverse-head-and-shoulders",
      type: "bullish",
      label: "Inv. Head & Shoulders",
      keyPoints: [
        { date: L.date, price: L.price, label: "L Shoulder" },
        { date: H.date, price: H.price, label: "Head" },
        { date: R.date, price: R.price, label: "R Shoulder" },
      ],
      neckline: neck,
      entryPrice: cur,
      targetPrice: rnd(target),
      stopPrice: rnd(stop),
      potentialPct: rnd(pot, 1),
      riskReward: rnd(rr, 1),
      conviction: Math.min(conv, 5),
      recencyDays: n - 1 - R.index,
      chartSlice: slice(data, L.index, n - 1),
    });
  }
  return results;
}

function detectAscendingTriangle(
  data: Bar[],
  swingHighs: Swing[],
  swingLows: Swing[],
): Omit<DetectedPattern, "ticker" | "name" | "sector">[] {
  const n = data.length;
  const rH = swingHighs.filter((s) => s.index >= n - 50);
  const rL = swingLows.filter((s) => s.index >= n - 50);
  if (rH.length < 2 || rL.length < 2) return [];

  for (let i = 0; i < rH.length - 1; i++) {
    const h1 = rH[i];
    const h2 = rH[i + 1];
    if (pctDiff(h1.price, h2.price) > 0.025) continue;

    const lows = rL.filter((s) => s.index >= h1.index - 5 && s.index <= h2.index + 5);
    if (lows.length < 2) continue;

    let rising = true;
    for (let j = 1; j < lows.length; j++) {
      if (lows[j].price <= lows[j - 1].price) { rising = false; break; }
    }
    if (!rising) continue;

    const resist = (h1.price + h2.price) / 2;
    const lowestLow = Math.min(...lows.map((l) => l.price));
    const cur = data[n - 1].close;
    const target = resist + (resist - lowestLow);
    const stop = lows[lows.length - 1].price * 0.98;
    const pot = ((target - cur) / cur) * 100;
    const risk = cur - stop;
    const rr = risk > 0 ? (target - cur) / risk : 0;

    let conv = 2;
    if (h2.index >= n - 15) conv++;
    if (lows.length >= 3) conv++;
    if (cur >= resist * 0.98) conv++;

    const kp: KeyPoint[] = [
      { date: h1.date, price: h1.price, label: "Resist" },
      { date: h2.date, price: h2.price, label: "Resist" },
      ...lows.map((l) => ({ date: l.date, price: l.price, label: "Support" })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    return [
      {
        pattern: "ascending-triangle" as const,
        type: "bullish" as const,
        label: "Ascending Triangle",
        keyPoints: kp,
        neckline: resist,
        entryPrice: cur,
        targetPrice: rnd(target),
        stopPrice: rnd(stop),
        potentialPct: rnd(pot, 1),
        riskReward: rnd(rr, 1),
        conviction: Math.min(conv, 5),
        recencyDays: n - 1 - h2.index,
        chartSlice: slice(data, Math.min(h1.index, lows[0].index), n - 1),
      },
    ];
  }
  return [];
}

function detectDescendingTriangle(
  data: Bar[],
  swingHighs: Swing[],
  swingLows: Swing[],
): Omit<DetectedPattern, "ticker" | "name" | "sector">[] {
  const n = data.length;
  const rH = swingHighs.filter((s) => s.index >= n - 50);
  const rL = swingLows.filter((s) => s.index >= n - 50);
  if (rH.length < 2 || rL.length < 2) return [];

  for (let i = 0; i < rL.length - 1; i++) {
    const l1 = rL[i];
    const l2 = rL[i + 1];
    if (pctDiff(l1.price, l2.price) > 0.025) continue;

    const highs = rH.filter((s) => s.index >= l1.index - 5 && s.index <= l2.index + 5);
    if (highs.length < 2) continue;

    let falling = true;
    for (let j = 1; j < highs.length; j++) {
      if (highs[j].price >= highs[j - 1].price) { falling = false; break; }
    }
    if (!falling) continue;

    const support = (l1.price + l2.price) / 2;
    const highestHigh = Math.max(...highs.map((h) => h.price));
    const cur = data[n - 1].close;
    const target = Math.max(support - (highestHigh - support), 0.01);
    const stop = highs[highs.length - 1].price * 1.02;
    const pot = ((cur - target) / cur) * 100;
    const risk = stop - cur;
    const rr = risk > 0 ? (cur - target) / risk : 0;

    let conv = 2;
    if (l2.index >= n - 15) conv++;
    if (highs.length >= 3) conv++;
    if (cur <= support * 1.02) conv++;

    const kp: KeyPoint[] = [
      { date: l1.date, price: l1.price, label: "Support" },
      { date: l2.date, price: l2.price, label: "Support" },
      ...highs.map((h) => ({ date: h.date, price: h.price, label: "Resist" })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    return [
      {
        pattern: "descending-triangle" as const,
        type: "bearish" as const,
        label: "Descending Triangle",
        keyPoints: kp,
        neckline: support,
        entryPrice: cur,
        targetPrice: rnd(target),
        stopPrice: rnd(stop),
        potentialPct: rnd(pot, 1),
        riskReward: rnd(rr, 1),
        conviction: Math.min(conv, 5),
        recencyDays: n - 1 - l2.index,
        chartSlice: slice(data, Math.min(l1.index, highs[0].index), n - 1),
      },
    ];
  }
  return [];
}

// ── Main Detection ─────────────────────────────────────────────

export function detectPatterns(
  chartRows: ChartRow[],
  ticker: string,
  name: string,
  sector: string,
): DetectedPattern[] {
  const rows = [...chartRows].reverse(); // chronological
  const valid = rows.filter((r) => r.close != null && r.high != null && r.low != null);
  if (valid.length < 30) return [];

  const data: Bar[] = valid.map((r) => ({
    date: r.date,
    close: r.close!,
    high: r.high!,
    low: r.low!,
  }));

  const highs = findSwingHighs(data);
  const lows = findSwingLows(data);

  const raw = [
    ...detectDoubleBottom(data, lows),
    ...detectDoubleTop(data, highs),
    ...detectBullFlag(data),
    ...detectBearFlag(data),
    ...detectHeadAndShoulders(data, highs, lows),
    ...detectInverseHS(data, highs, lows),
    ...detectAscendingTriangle(data, highs, lows),
    ...detectDescendingTriangle(data, highs, lows),
  ];

  // Deduplicate: keep best per pattern type per ticker
  const best = new Map<string, DetectedPattern>();
  for (const p of raw) {
    const full: DetectedPattern = { ...p, ticker, name, sector };
    const key = `${ticker}-${p.pattern}`;
    const ex = best.get(key);
    if (!ex || full.conviction > ex.conviction) {
      best.set(key, full);
    }
  }

  return [...best.values()];
}

// ── Labels & Colors ────────────────────────────────────────────

export const PATTERN_LABELS: Record<PatternType, string> = {
  "double-bottom": "Double Bottom",
  "double-top": "Double Top",
  "bull-flag": "Bull Flag",
  "bear-flag": "Bear Flag",
  "ascending-triangle": "Ascending Triangle",
  "descending-triangle": "Descending Triangle",
  "head-and-shoulders": "Head & Shoulders",
  "inverse-head-and-shoulders": "Inv. Head & Shoulders",
};

export function patternColor(type: "bullish" | "bearish"): string {
  return type === "bullish" ? "#22c55e" : "#ef4444";
}
