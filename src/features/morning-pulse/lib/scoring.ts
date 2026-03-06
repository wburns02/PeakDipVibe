import type { MarketBreadth, SectorPerformance } from "@/api/types/market";
import type { PatternSignal } from "@/api/types/signals";

export interface MarketMood {
  score: number;
  label: string;
  color: string;
  summary: string;
  factors: { label: string; value: string; positive: boolean }[];
}

export interface SetupScore {
  score: number;
  stars: number;
  label: string;
  labelColor: string;
  reasons: string[];
}

export function computeMarketMood(
  breadth: MarketBreadth | undefined,
  sectors: SectorPerformance[] | undefined,
): MarketMood {
  if (!breadth) {
    return {
      score: 50,
      label: "Loading...",
      color: "#f59e0b",
      summary: "",
      factors: [],
    };
  }

  let score = 50;
  const factors: MarketMood["factors"] = [];

  const adRatio = breadth.advance_decline_ratio;
  score += Math.min(20, Math.max(-20, (adRatio - 1) * 15));
  factors.push({
    label: "A/D Ratio",
    value: adRatio.toFixed(2),
    positive: adRatio >= 1,
  });

  score += (breadth.pct_above_sma50 - 50) * 0.3;
  factors.push({
    label: "Above 50-SMA",
    value: `${breadth.pct_above_sma50.toFixed(0)}%`,
    positive: breadth.pct_above_sma50 >= 50,
  });

  score += (breadth.pct_above_sma200 - 50) * 0.2;
  factors.push({
    label: "Above 200-SMA",
    value: `${breadth.pct_above_sma200.toFixed(0)}%`,
    positive: breadth.pct_above_sma200 >= 50,
  });

  const rsi = breadth.avg_rsi ?? 50;
  score += (rsi - 50) * 0.2;
  factors.push({
    label: "Avg RSI",
    value: rsi.toFixed(1),
    positive: rsi >= 45 && rsi <= 70,
  });

  score = Math.max(0, Math.min(100, Math.round(score)));

  let label: string, color: string;
  if (score >= 75) {
    label = "Bullish";
    color = "#22c55e";
  } else if (score >= 60) {
    label = "Cautiously Bullish";
    color = "#4ade80";
  } else if (score >= 45) {
    label = "Neutral";
    color = "#f59e0b";
  } else if (score >= 30) {
    label = "Cautiously Bearish";
    color = "#fb923c";
  } else {
    label = "Bearish";
    color = "#ef4444";
  }

  const advPct = Math.round(
    (breadth.advancers / breadth.total_stocks) * 100,
  );
  const sorted = sectors
    ? [...sectors].sort((a, b) => b.avg_change_pct - a.avg_change_pct)
    : [];
  const topSectors = sorted
    .filter((s) => s.avg_change_pct > 0)
    .slice(0, 2)
    .map((s) => s.sector);
  const weakSectors = sorted
    .filter((s) => s.avg_change_pct < 0)
    .slice(-2)
    .map((s) => s.sector);

  let summary = `${advPct}% of stocks advancing. `;
  if (breadth.pct_above_sma50 > 60)
    summary += `Breadth is strong with ${breadth.pct_above_sma50.toFixed(0)}% above their 50-day moving average. `;
  else if (breadth.pct_above_sma50 < 40)
    summary += `Breadth is weak with only ${breadth.pct_above_sma50.toFixed(0)}% above their 50-day moving average. `;
  if (topSectors.length > 0)
    summary += `Strength in ${topSectors.join(" and ")}. `;
  if (weakSectors.length > 0)
    summary += `Weakness in ${weakSectors.join(" and ")}.`;

  return { score, label, color, summary: summary.trim(), factors };
}

export function computeSetupScore(
  signal: PatternSignal,
  sectorPerf: number,
): SetupScore {
  let score = 0;
  const reasons: string[] = [];

  const strength = signal.signal_strength ?? 0;
  score += strength * 0.4;
  if (strength >= 70) reasons.push("High signal strength");
  else if (strength >= 50) reasons.push("Moderate signal strength");

  const vol = signal.volume_ratio ?? 1;
  if (vol >= 2) {
    score += 15;
    reasons.push(`Volume ${vol.toFixed(1)}x average`);
  } else if (vol >= 1.5) {
    score += 10;
    reasons.push("Above-average volume");
  } else {
    score += 5;
  }

  const recovery = signal.recovery_pct ?? 0;
  if (recovery > 2) {
    score += 15;
    reasons.push("Strong recovery underway");
  } else if (recovery > 0) {
    score += 10;
    reasons.push("Positive recovery");
  } else {
    score += 3;
  }

  const catalyst = signal.catalyst_type ?? "";
  if (["earnings_beat", "upgrade", "guidance_raise"].includes(catalyst)) {
    score += 15;
    reasons.push("Strong catalyst");
  } else if (
    ["revenue_beat", "contract_win", "product_launch"].includes(catalyst)
  ) {
    score += 12;
    reasons.push("Solid catalyst");
  } else if (catalyst) {
    score += 8;
  }

  if (sectorPerf > 1) {
    score += 15;
    reasons.push("Sector tailwind");
  } else if (sectorPerf > 0) {
    score += 10;
  } else if (sectorPerf > -1) {
    score += 5;
  } else {
    reasons.push("Sector headwind");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const stars =
    score >= 80 ? 5 : score >= 65 ? 4 : score >= 50 ? 3 : score >= 35 ? 2 : 1;

  let label: string, labelColor: string;
  if (score >= 80) {
    label = "Strong Setup";
    labelColor = "#22c55e";
  } else if (score >= 65) {
    label = "Good Setup";
    labelColor = "#4ade80";
  } else if (score >= 50) {
    label = "Moderate";
    labelColor = "#f59e0b";
  } else if (score >= 35) {
    label = "Watch";
    labelColor = "#fb923c";
  } else {
    label = "Weak";
    labelColor = "#ef4444";
  }

  return { score, stars, label, labelColor, reasons: reasons.slice(0, 3) };
}

export function getMarketStatus(): {
  status: "pre-market" | "open" | "after-hours" | "closed";
  label: string;
  countdown: string;
} {
  const now = new Date();
  const et = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  const h = et.getHours();
  const m = et.getMinutes();
  const day = et.getDay();
  const mins = h * 60 + m;

  const isWeekend = day === 0 || day === 6;
  const preOpen = 4 * 60; // 4:00 AM
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 16 * 60; // 4:00 PM
  const afterClose = 20 * 60; // 8:00 PM

  if (isWeekend) {
    const daysToMon = day === 0 ? 1 : 2;
    return {
      status: "closed",
      label: "Market Closed",
      countdown: `Opens Monday ${daysToMon === 1 ? "tomorrow" : "in 2 days"}`,
    };
  }

  if (mins < preOpen) {
    return { status: "closed", label: "Market Closed", countdown: formatCountdown(marketOpen - mins) };
  }
  if (mins < marketOpen) {
    return { status: "pre-market", label: "Pre-Market", countdown: formatCountdown(marketOpen - mins) };
  }
  if (mins < marketClose) {
    return { status: "open", label: "Market Open", countdown: formatCountdown(marketClose - mins) };
  }
  if (mins < afterClose) {
    return { status: "after-hours", label: "After Hours", countdown: formatCountdown(afterClose - mins) };
  }
  return { status: "closed", label: "Market Closed", countdown: "Opens tomorrow at 9:30 AM ET" };
}

function formatCountdown(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}m remaining`;
  return `${h}h ${m}m remaining`;
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function catalystLabel(type: string | null | undefined): string {
  if (!type) return "Unknown";
  const map: Record<string, string> = {
    earnings_beat: "Earnings Beat",
    earnings_miss: "Earnings Miss",
    upgrade: "Analyst Upgrade",
    downgrade: "Analyst Downgrade",
    guidance_raise: "Guidance Raised",
    guidance_lower: "Guidance Lowered",
    revenue_beat: "Revenue Beat",
    contract_win: "Contract Win",
    product_launch: "Product Launch",
    fda_approval: "FDA Approval",
    merger: "M&A Activity",
    buyback: "Buyback Announced",
    dividend: "Dividend News",
    sector_rotation: "Sector Rotation",
    macro: "Macro Event",
    other: "News Catalyst",
  };
  return map[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
