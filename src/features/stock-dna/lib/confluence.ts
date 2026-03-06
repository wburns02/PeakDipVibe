/**
 * Confluence Scoring Engine
 *
 * Synthesizes 20+ indicators into a single 0-100 score plus
 * human-readable verdicts across three timeframes.
 */

export type Bias = "bullish" | "bearish" | "neutral";
export type Verdict = "Strong Buy" | "Buy Dip" | "Lean Bullish" | "Neutral" | "Lean Bearish" | "Take Profits" | "Avoid";

export interface TimeframeBias {
  label: string;
  bias: Bias;
  score: number; // -100 to +100
  drivers: string[];
}

export interface RiskProfile {
  atr: number;
  atrPct: number;
  bbWidth: number;
  volatilityLabel: string;
  suggestedStop: number;
  suggestedTarget: number;
  riskRewardRatio: number;
  support: number;
  resistance: number;
}

export interface ConfluenceResult {
  score: number; // 0-100 (50 = neutral, 100 = max bullish)
  verdict: Verdict;
  verdictColor: string;
  reasoning: string[];
  shortTerm: TimeframeBias;
  mediumTerm: TimeframeBias;
  longTerm: TimeframeBias;
  risk: RiskProfile;
  signals: SignalDetail[];
}

export interface SignalDetail {
  name: string;
  value: string;
  bias: Bias;
  weight: number;
}

type Ind = Record<string, number | null>;

function v(indicators: Ind, key: string): number | null {
  return indicators[key] ?? null;
}

function scoreBand(val: number, bearishBelow: number, bullishAbove: number): number {
  if (val <= bearishBelow) return -1;
  if (val >= bullishAbove) return 1;
  const mid = (bearishBelow + bullishAbove) / 2;
  const range = (bullishAbove - bearishBelow) / 2;
  return (val - mid) / range;
}

export function computeConfluence(
  indicators: Ind,
  price: number,
): ConfluenceResult {
  const signals: SignalDetail[] = [];
  const reasoning: string[] = [];

  // ── Short-term signals (momentum) ───────────────────────
  const rsi = v(indicators, "RSI_14");
  const macd = v(indicators, "MACD");
  const macdSignal = v(indicators, "MACD_SIGNAL");
  const macdHist = v(indicators, "MACD_HIST");
  const roc10 = v(indicators, "ROC_10");
  const bbPctb = v(indicators, "BBANDS_PCTB");

  let shortScore = 0;
  const shortDrivers: string[] = [];

  if (rsi != null) {
    const s = scoreBand(rsi, 30, 70);
    // For RSI, oversold is actually bullish (mean reversion), overbought is bearish
    const revS = -s * 0.6 + (rsi < 30 ? 0.4 : rsi > 70 ? -0.4 : 0);
    shortScore += revS * 25;
    const label = rsi < 30 ? "Oversold" : rsi > 70 ? "Overbought" : rsi < 45 ? "Weak" : rsi > 55 ? "Strong" : "Neutral";
    signals.push({ name: "RSI (14)", value: rsi.toFixed(1), bias: rsi < 35 ? "bullish" : rsi > 65 ? "bearish" : "neutral", weight: 25 });
    shortDrivers.push(`RSI ${rsi.toFixed(1)} (${label})`);
    if (rsi < 30) reasoning.push("RSI is oversold below 30 — potential bounce setup");
    if (rsi > 70) reasoning.push("RSI is overbought above 70 — momentum may be exhausting");
  }

  if (macd != null && macdSignal != null) {
    const cross = macd > macdSignal;
    const strength = Math.min(Math.abs(macd - macdSignal) / 2, 1);
    shortScore += (cross ? 1 : -1) * strength * 20;
    signals.push({ name: "MACD", value: macd.toFixed(2), bias: cross ? "bullish" : "bearish", weight: 20 });
    shortDrivers.push(`MACD ${cross ? "above" : "below"} signal`);
    if (cross && macdHist != null && macdHist > 0) reasoning.push("MACD crossed above signal with rising histogram — bullish momentum");
    if (!cross && macdHist != null && macdHist < 0) reasoning.push("MACD below signal with falling histogram — bearish momentum");
  }

  if (roc10 != null) {
    const s = Math.max(-1, Math.min(1, roc10 / 5));
    shortScore += s * 15;
    signals.push({ name: "10-Day Momentum", value: `${roc10 >= 0 ? "+" : ""}${roc10.toFixed(2)}%`, bias: roc10 > 1 ? "bullish" : roc10 < -1 ? "bearish" : "neutral", weight: 15 });
    shortDrivers.push(`10d ROC ${roc10 >= 0 ? "+" : ""}${roc10.toFixed(1)}%`);
  }

  if (bbPctb != null) {
    // %B near 0 = near lower band (bullish dip), near 1 = near upper band
    const s = scoreBand(bbPctb, 0.2, 0.8);
    const revS = -s * 0.3 + (bbPctb < 0 ? 0.5 : bbPctb > 1 ? -0.5 : 0);
    shortScore += revS * 15;
    const label = bbPctb < 0 ? "Below lower band" : bbPctb > 1 ? "Above upper band" : bbPctb < 0.3 ? "Near support" : bbPctb > 0.7 ? "Near resistance" : "Mid-range";
    signals.push({ name: "Bollinger %B", value: bbPctb.toFixed(2), bias: bbPctb < 0.2 ? "bullish" : bbPctb > 0.8 ? "bearish" : "neutral", weight: 15 });
    shortDrivers.push(`BB %B ${bbPctb.toFixed(2)} (${label})`);
  }

  // ── Medium-term signals (trend) ─────────────────────────
  const sma50 = v(indicators, "SMA_50");
  const sma200 = v(indicators, "SMA_200");
  const ema12 = v(indicators, "EMA_12");
  const ema26 = v(indicators, "EMA_26");
  const roc20 = v(indicators, "ROC_20");
  const priceRatio50 = v(indicators, "PRICE_RATIO_SMA50");

  let medScore = 0;
  const medDrivers: string[] = [];

  if (sma50 != null) {
    const above = price > sma50;
    const dist = priceRatio50 != null ? priceRatio50 : (price - sma50) / sma50;
    medScore += (above ? 1 : -1) * Math.min(Math.abs(dist) * 5, 1) * 25;
    signals.push({ name: "Price vs 50-SMA", value: `${above ? "Above" : "Below"} (${(dist * 100).toFixed(1)}%)`, bias: above ? "bullish" : "bearish", weight: 25 });
    medDrivers.push(`${above ? "Above" : "Below"} 50-SMA by ${(Math.abs(dist) * 100).toFixed(1)}%`);
    if (above) reasoning.push(`Price is ${(dist * 100).toFixed(1)}% above the 50-day moving average — uptrend intact`);
    else reasoning.push(`Price is ${(Math.abs(dist) * 100).toFixed(1)}% below the 50-day moving average — trend is down`);
  }

  if (ema12 != null && ema26 != null) {
    const above = ema12 > ema26;
    medScore += (above ? 1 : -1) * 15;
    signals.push({ name: "EMA 12/26", value: above ? "Bullish cross" : "Bearish cross", bias: above ? "bullish" : "bearish", weight: 15 });
    medDrivers.push(`EMA 12 ${above ? ">" : "<"} EMA 26`);
  }

  if (roc20 != null) {
    const s = Math.max(-1, Math.min(1, roc20 / 8));
    medScore += s * 15;
    signals.push({ name: "20-Day Momentum", value: `${roc20 >= 0 ? "+" : ""}${roc20.toFixed(2)}%`, bias: roc20 > 2 ? "bullish" : roc20 < -2 ? "bearish" : "neutral", weight: 15 });
    medDrivers.push(`20d ROC ${roc20 >= 0 ? "+" : ""}${roc20.toFixed(1)}%`);
  }

  // ── Long-term signals (structure) ───────────────────────
  const priceRatio200 = v(indicators, "PRICE_RATIO_SMA200");
  let longScore = 0;
  const longDrivers: string[] = [];

  if (sma200 != null) {
    const above = price > sma200;
    const dist = priceRatio200 != null ? priceRatio200 : (price - sma200) / sma200;
    longScore += (above ? 1 : -1) * Math.min(Math.abs(dist) * 3, 1) * 30;
    signals.push({ name: "Price vs 200-SMA", value: `${above ? "Above" : "Below"} (${(dist * 100).toFixed(1)}%)`, bias: above ? "bullish" : "bearish", weight: 30 });
    longDrivers.push(`${above ? "Above" : "Below"} 200-SMA by ${(Math.abs(dist) * 100).toFixed(1)}%`);
  }

  if (sma50 != null && sma200 != null) {
    const golden = sma50 > sma200;
    longScore += (golden ? 1 : -1) * 25;
    signals.push({ name: "SMA Cross", value: golden ? "Golden Cross" : "Death Cross", bias: golden ? "bullish" : "bearish", weight: 25 });
    longDrivers.push(golden ? "Golden Cross (50 > 200 SMA)" : "Death Cross (50 < 200 SMA)");
    if (golden) reasoning.push("Golden Cross pattern — 50-day SMA is above 200-day, a classic bullish signal");
    else reasoning.push("Death Cross pattern — 50-day SMA below 200-day, bearish structural setup");
  }

  // ── Risk Assessment ─────────────────────────────────────
  const atr = v(indicators, "ATR_14") ?? 0;
  const bbLower = v(indicators, "BBANDS_LOWER") ?? price * 0.95;
  const bbUpper = v(indicators, "BBANDS_UPPER") ?? price * 1.05;
  const bbWidth = v(indicators, "BBANDS_WIDTH") ?? 0;

  const atrPct = price > 0 ? (atr / price) * 100 : 0;
  const suggestedStop = price - atr * 1.5;
  const suggestedTarget = price + atr * 2.5;
  const riskRewardRatio = atr > 0 ? (suggestedTarget - price) / (price - suggestedStop) : 0;

  const risk: RiskProfile = {
    atr,
    atrPct,
    bbWidth,
    volatilityLabel: atrPct > 3 ? "High" : atrPct > 1.5 ? "Moderate" : "Low",
    suggestedStop,
    suggestedTarget,
    riskRewardRatio,
    support: bbLower,
    resistance: bbUpper,
  };

  // ── Composite score ─────────────────────────────────────
  // Normalize each timeframe to -50..+50, then combine
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
  const normShort = clamp(shortScore, -50, 50);
  const normMed = clamp(medScore, -50, 50);
  const normLong = clamp(longScore, -50, 50);

  // Weighted: short 30%, med 35%, long 35%
  const composite = normShort * 0.3 + normMed * 0.35 + normLong * 0.35;
  const score = clamp(Math.round(composite + 50), 0, 100);

  // Determine verdict
  let verdict: Verdict;
  let verdictColor: string;
  if (score >= 75) { verdict = "Strong Buy"; verdictColor = "#22c55e"; }
  else if (score >= 62) { verdict = "Buy Dip"; verdictColor = "#4ade80"; }
  else if (score >= 55) { verdict = "Lean Bullish"; verdictColor = "#86efac"; }
  else if (score >= 45) { verdict = "Neutral"; verdictColor = "#94a3b8"; }
  else if (score >= 38) { verdict = "Lean Bearish"; verdictColor = "#fca5a5"; }
  else if (score >= 25) { verdict = "Take Profits"; verdictColor = "#f87171"; }
  else { verdict = "Avoid"; verdictColor = "#ef4444"; }

  const toBias = (s: number): Bias => s > 10 ? "bullish" : s < -10 ? "bearish" : "neutral";

  return {
    score,
    verdict,
    verdictColor,
    reasoning: reasoning.slice(0, 4),
    shortTerm: { label: "Short-term", bias: toBias(normShort), score: Math.round(normShort), drivers: shortDrivers },
    mediumTerm: { label: "Medium-term", bias: toBias(normMed), score: Math.round(normMed), drivers: medDrivers },
    longTerm: { label: "Long-term", bias: toBias(normLong), score: Math.round(normLong), drivers: longDrivers },
    risk,
    signals: signals.sort((a, b) => b.weight - a.weight),
  };
}
