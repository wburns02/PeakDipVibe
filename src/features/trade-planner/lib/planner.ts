/**
 * Trade Plan Generator
 *
 * Takes confluence analysis results and generates actionable trade plans
 * with entry, stop, target levels and position sizing.
 */

import { computeConfluence, type ConfluenceResult, type Verdict } from "@/features/stock-dna/lib/confluence";

export interface TradePlan {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  changePct: number;
  confluence: ConfluenceResult;
  action: TradeAction;
  entry: number;
  stop: number;
  targets: [number, number, number]; // 1R, 2R, 3R
  riskPerShare: number;
  rewardPerShare: number;
  riskReward: number;
  positionShares: number;
  positionDollars: number;
  riskDollars: number;
  opportunityScore: number; // 0-100 composite of confluence + R/R
  reasoning: string;
}

export type TradeAction = "Strong Buy" | "Buy Dip" | "Watch Long" | "Neutral" | "Watch Short" | "Reduce" | "Avoid";

const RISK_PER_TRADE_PCT = 1; // 1% of account per trade default
const DEFAULT_ACCOUNT = 25_000;

const ACCOUNT_KEY = "peakdipvibe-planner-account";
const RISK_KEY = "peakdipvibe-planner-risk";

export function loadAccountSize(): number {
  try {
    const v = localStorage.getItem(ACCOUNT_KEY);
    return v ? Number(v) : DEFAULT_ACCOUNT;
  } catch {
    return DEFAULT_ACCOUNT;
  }
}

export function saveAccountSize(val: number) {
  try { localStorage.setItem(ACCOUNT_KEY, String(val)); } catch { /* noop */ }
}

export function loadRiskPct(): number {
  try {
    const v = localStorage.getItem(RISK_KEY);
    return v ? Number(v) : RISK_PER_TRADE_PCT;
  } catch {
    return RISK_PER_TRADE_PCT;
  }
}

export function saveRiskPct(val: number) {
  try { localStorage.setItem(RISK_KEY, String(val)); } catch { /* noop */ }
}

function verdictToAction(verdict: Verdict, score: number): TradeAction {
  if (score >= 75) return "Strong Buy";
  if (score >= 62) return "Buy Dip";
  if (score >= 55) return "Watch Long";
  if (score >= 45) return "Neutral";
  if (score >= 38) return "Watch Short";
  if (score >= 25) return "Reduce";
  return "Avoid";
}

function actionReasoning(action: TradeAction, confluence: ConfluenceResult): string {
  const drivers = confluence.reasoning.slice(0, 2).join(". ");
  switch (action) {
    case "Strong Buy":
      return `Multiple bullish signals aligned across timeframes. ${drivers}`;
    case "Buy Dip":
      return `Favorable setup — consider entering on weakness. ${drivers}`;
    case "Watch Long":
      return `Leaning bullish but wait for confirmation. ${drivers}`;
    case "Neutral":
      return `Mixed signals — no clear edge. ${drivers}`;
    case "Watch Short":
      return `Bearish pressure building. ${drivers}`;
    case "Reduce":
      return `Unfavorable setup — consider trimming. ${drivers}`;
    case "Avoid":
      return `Strong bearish signals — stay away. ${drivers}`;
  }
}

export function generatePlan(
  ticker: string,
  name: string,
  sector: string,
  price: number,
  changePct: number,
  indicators: Record<string, number | null>,
  accountSize: number,
  riskPct: number,
): TradePlan {
  const confluence = computeConfluence(indicators, price);
  const { risk, score } = confluence;

  const action = verdictToAction(confluence.verdict, score);

  // Entry: for bullish setups, use current price or slight dip
  // For bearish, we note avoidance levels
  const isBullish = score >= 55;
  const entry = isBullish
    ? price // market entry
    : price; // reference price for tracking

  // Stop: ATR-based, with Bollinger lower as minimum support
  const atrStop = price - risk.atr * 1.5;
  const stop = Math.max(atrStop, risk.support * 0.99);

  // Targets: 1R, 2R, 3R multiples of risk
  const riskPerShare = Math.max(entry - stop, 0.01);
  const t1 = entry + riskPerShare * 1.5;
  const t2 = entry + riskPerShare * 2.5;
  const t3 = entry + riskPerShare * 4;

  const rewardPerShare = t2 - entry; // middle target
  const riskReward = riskPerShare > 0 ? rewardPerShare / riskPerShare : 0;

  // Position sizing: risk X% of account per trade
  const riskBudget = accountSize * (riskPct / 100);
  const positionShares = riskPerShare > 0 ? Math.floor(riskBudget / riskPerShare) : 0;
  const positionDollars = positionShares * entry;
  const riskDollars = positionShares * riskPerShare;

  // Opportunity score: blend confluence (70%) + R/R quality (30%)
  const rrScore = Math.min(riskReward / 4, 1) * 100; // 4:1 R/R = max
  const opportunityScore = Math.round(score * 0.7 + rrScore * 0.3);

  return {
    ticker,
    name,
    sector,
    price,
    changePct,
    confluence,
    action,
    entry,
    stop: Math.round(stop * 100) / 100,
    targets: [
      Math.round(t1 * 100) / 100,
      Math.round(t2 * 100) / 100,
      Math.round(t3 * 100) / 100,
    ],
    riskPerShare: Math.round(riskPerShare * 100) / 100,
    rewardPerShare: Math.round(rewardPerShare * 100) / 100,
    riskReward: Math.round(riskReward * 100) / 100,
    positionShares,
    positionDollars: Math.round(positionDollars),
    riskDollars: Math.round(riskDollars * 100) / 100,
    opportunityScore,
    reasoning: actionReasoning(action, confluence),
  };
}

export function rankPlans(plans: TradePlan[]): TradePlan[] {
  return [...plans].sort((a, b) => b.opportunityScore - a.opportunityScore);
}
