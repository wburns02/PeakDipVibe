/**
 * Market Alerts Engine
 *
 * Detects significant technical events across all stocks by running
 * multiple parallel screener scans and merging results into a unified
 * alert feed. Zero configuration — it just works.
 */

import type { ScreenerResult } from "@/api/types/screener";

export type AlertType =
  | "oversold"
  | "overbought"
  | "golden_cross"
  | "death_cross"
  | "bb_squeeze_low"
  | "bb_breakout_high"
  | "big_mover_up"
  | "big_mover_down"
  | "below_sma200"
  | "above_sma200_breakout";

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertBias = "bullish" | "bearish" | "neutral";

export interface MarketAlert {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  type: AlertType;
  severity: AlertSeverity;
  bias: AlertBias;
  title: string;
  description: string;
  price: number;
  changePct: number;
  rsi: number;
  bbPctb: number | null;
  sma50: number | null;
  sma200: number | null;
  isWatchlisted: boolean;
}

interface AlertTypeMeta {
  severity: AlertSeverity;
  bias: AlertBias;
  icon: string;
  color: string;
  bgColor: string;
}

export const ALERT_TYPE_META: Record<AlertType, AlertTypeMeta> = {
  golden_cross:         { severity: "critical", bias: "bullish",  icon: "cross-green",  color: "#22c55e", bgColor: "rgba(34,197,94,0.12)" },
  death_cross:          { severity: "critical", bias: "bearish",  icon: "cross-red",    color: "#ef4444", bgColor: "rgba(239,68,68,0.12)" },
  oversold:             { severity: "warning",  bias: "bullish",  icon: "arrow-down",   color: "#3b82f6", bgColor: "rgba(59,130,246,0.12)" },
  overbought:           { severity: "warning",  bias: "bearish",  icon: "arrow-up",     color: "#f59e0b", bgColor: "rgba(245,158,11,0.12)" },
  bb_squeeze_low:       { severity: "warning",  bias: "bullish",  icon: "squeeze",      color: "#8b5cf6", bgColor: "rgba(139,92,246,0.12)" },
  bb_breakout_high:     { severity: "warning",  bias: "neutral",  icon: "breakout",     color: "#ec4899", bgColor: "rgba(236,72,153,0.12)" },
  big_mover_up:         { severity: "info",     bias: "bullish",  icon: "rocket",       color: "#22c55e", bgColor: "rgba(34,197,94,0.08)" },
  big_mover_down:       { severity: "info",     bias: "bearish",  icon: "crash",        color: "#ef4444", bgColor: "rgba(239,68,68,0.08)" },
  below_sma200:         { severity: "info",     bias: "bearish",  icon: "trend-down",   color: "#f97316", bgColor: "rgba(249,115,22,0.08)" },
  above_sma200_breakout:{ severity: "info",     bias: "bullish",  icon: "trend-up",     color: "#06b6d4", bgColor: "rgba(6,182,212,0.08)" },
};

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  oversold: "Oversold",
  overbought: "Overbought",
  golden_cross: "Golden Cross",
  death_cross: "Death Cross",
  bb_squeeze_low: "Bollinger Squeeze",
  bb_breakout_high: "Bollinger Breakout",
  big_mover_up: "Big Mover Up",
  big_mover_down: "Big Mover Down",
  below_sma200: "Below 200-SMA",
  above_sma200_breakout: "200-SMA Breakout",
};

const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };

function makeAlert(
  stock: ScreenerResult,
  type: AlertType,
  title: string,
  description: string,
  watchlist: string[],
): MarketAlert {
  return {
    id: `${stock.ticker}-${type}`,
    ticker: stock.ticker,
    name: stock.name ?? stock.ticker,
    sector: stock.sector ?? "Unknown",
    type,
    severity: ALERT_TYPE_META[type].severity,
    bias: ALERT_TYPE_META[type].bias,
    title,
    description,
    price: stock.close ?? 0,
    changePct: stock.change_pct ?? 0,
    rsi: stock.rsi_14 ?? 50,
    bbPctb: stock.bb_pctb,
    sma50: stock.sma_50,
    sma200: stock.sma_200,
    isWatchlisted: watchlist.includes(stock.ticker),
  };
}

/** Detect alerts from a batch of screener results. */
function detectAlerts(stocks: ScreenerResult[], watchlist: string[]): MarketAlert[] {
  const alerts: MarketAlert[] = [];

  for (const s of stocks) {
    const rsi = s.rsi_14;
    const bb = s.bb_pctb;
    const chg = s.change_pct ?? 0;
    const price = s.close ?? 0;
    const sma200 = s.sma_200;

    // RSI extremes
    if (rsi != null && rsi <= 30) {
      alerts.push(makeAlert(s, "oversold",
        `${s.ticker} is oversold`,
        `RSI dropped to ${rsi.toFixed(1)} — below 30 suggests the selling may be overdone. Historically a potential bounce zone.`,
        watchlist));
    }
    if (rsi != null && rsi >= 70) {
      alerts.push(makeAlert(s, "overbought",
        `${s.ticker} is overbought`,
        `RSI hit ${rsi.toFixed(1)} — above 70 indicates strong buying that may be exhausted. Watch for reversal signs.`,
        watchlist));
    }

    // Bollinger Band extremes
    if (bb != null && bb <= 0.05) {
      alerts.push(makeAlert(s, "bb_squeeze_low",
        `${s.ticker} at lower Bollinger Band`,
        `BB %B is ${bb.toFixed(2)} — price is hugging the lower band. Mean reversion or breakdown incoming.`,
        watchlist));
    }
    if (bb != null && bb >= 0.95) {
      alerts.push(makeAlert(s, "bb_breakout_high",
        `${s.ticker} at upper Bollinger Band`,
        `BB %B is ${bb.toFixed(2)} — price is pushing the upper band. Strong momentum or topping signal.`,
        watchlist));
    }

    // Big movers
    if (chg >= 4) {
      alerts.push(makeAlert(s, "big_mover_up",
        `${s.ticker} surging +${chg.toFixed(1)}%`,
        `${s.name ?? s.ticker} is up ${chg.toFixed(2)}% today — one of the biggest moves in the market.`,
        watchlist));
    }
    if (chg <= -4) {
      alerts.push(makeAlert(s, "big_mover_down",
        `${s.ticker} dropping ${chg.toFixed(1)}%`,
        `${s.name ?? s.ticker} is down ${Math.abs(chg).toFixed(2)}% today — significant selling pressure.`,
        watchlist));
    }

    // SMA200 relationship (only if we have the data)
    if (price > 0 && sma200 != null && sma200 > 0) {
      const pctFromSma200 = ((price - sma200) / sma200) * 100;
      // Just broke below SMA200 (within 1%)
      if (s.above_sma200 === false && pctFromSma200 > -2 && pctFromSma200 < 0) {
        alerts.push(makeAlert(s, "below_sma200",
          `${s.ticker} just broke below 200-SMA`,
          `Price is ${Math.abs(pctFromSma200).toFixed(1)}% below the 200-day SMA ($${sma200.toFixed(0)}) — a key long-term support level just gave way.`,
          watchlist));
      }
      // Just broke above SMA200
      if (s.above_sma200 === true && pctFromSma200 > 0 && pctFromSma200 < 2) {
        alerts.push(makeAlert(s, "above_sma200_breakout",
          `${s.ticker} reclaimed the 200-SMA`,
          `Price just crossed above the 200-day SMA ($${sma200.toFixed(0)}) — potential trend reversal.`,
          watchlist));
      }
    }
  }

  return alerts;
}

/** Merge golden/death cross results into alerts. */
function detectCrossAlerts(stocks: ScreenerResult[], type: "golden_cross" | "death_cross", watchlist: string[]): MarketAlert[] {
  return stocks.map((s) => {
    if (type === "golden_cross") {
      return makeAlert(s, "golden_cross",
        `${s.ticker} Golden Cross`,
        `The 50-day SMA just crossed above the 200-day SMA — one of the strongest bullish signals in technical analysis.`,
        watchlist);
    }
    return makeAlert(s, "death_cross",
      `${s.ticker} Death Cross`,
      `The 50-day SMA just crossed below the 200-day SMA — a major bearish signal that often precedes extended downtrends.`,
      watchlist);
  });
}

/** Merge all scan results into a unified, deduplicated, sorted alert feed. */
export function buildAlertFeed(
  scans: {
    oversold: ScreenerResult[];
    overbought: ScreenerResult[];
    goldenCross: ScreenerResult[];
    deathCross: ScreenerResult[];
    topGainers: ScreenerResult[];
    topLosers: ScreenerResult[];
  },
  watchlist: string[],
): MarketAlert[] {
  const alertMap = new Map<string, MarketAlert>();

  // Golden/death crosses — highest priority
  for (const a of detectCrossAlerts(scans.goldenCross, "golden_cross", watchlist)) {
    alertMap.set(a.id, a);
  }
  for (const a of detectCrossAlerts(scans.deathCross, "death_cross", watchlist)) {
    alertMap.set(a.id, a);
  }

  // Run detection on all other scan batches
  const allStocks = [
    ...scans.oversold,
    ...scans.overbought,
    ...scans.topGainers,
    ...scans.topLosers,
  ];
  // Deduplicate input stocks by ticker
  const seen = new Set<string>();
  const unique: ScreenerResult[] = [];
  for (const s of allStocks) {
    if (!seen.has(s.ticker)) {
      seen.add(s.ticker);
      unique.push(s);
    }
  }

  for (const a of detectAlerts(unique, watchlist)) {
    if (!alertMap.has(a.id)) alertMap.set(a.id, a);
  }

  // Sort: watchlist first, then by severity, then by absolute change
  return Array.from(alertMap.values()).sort((a, b) => {
    // Watchlisted items first
    if (a.isWatchlisted !== b.isWatchlisted) return a.isWatchlisted ? -1 : 1;
    // Then by severity
    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sevDiff !== 0) return sevDiff;
    // Then by absolute change (bigger moves first)
    return Math.abs(b.changePct) - Math.abs(a.changePct);
  });
}

/** Get summary counts by alert type. */
export function getAlertSummary(alerts: MarketAlert[]) {
  const counts: Partial<Record<AlertType, number>> = {};
  for (const a of alerts) {
    counts[a.type] = (counts[a.type] ?? 0) + 1;
  }
  return counts;
}
