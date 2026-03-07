import type { ChartRow } from "@/api/types/price";
import type { IndicatorHistoryRow } from "@/api/types/indicator";

// ── Types ──────────────────────────────────────────────────────

export interface SqueezeStock {
  ticker: string;
  name: string;
  sector: string;
  close: number;
  changePct: number;
  rsi: number;
  bbPctb: number;
  bbWidth: number;
  bbWidthAvg: number;
  bbWidthPercentile: number;
  inSqueeze: boolean;
  squeezeDays: number;
  fired: boolean;
}

export interface SqueezeHistory {
  date: string;
  bbWidth: number;
  inSqueeze: boolean;
}

export interface SqueezeEvent {
  startDate: string;
  fireDate: string;
  durationDays: number;
  direction: "up" | "down";
  movePercent: number;
}

export interface BollingerPoint {
  date: string;
  close: number;
  bbUpper: number;
  bbLower: number;
  bbMiddle: number;
  bbWidth: number;
  inSqueeze: boolean;
}

// ── Analysis from indicator history ────────────────────────────

const SQUEEZE_PCT = 20;

export interface WidthAnalysis {
  history: SqueezeHistory[];
  currentWidth: number;
  avgWidth: number;
  percentile: number;
  inSqueeze: boolean;
  squeezeDays: number;
  fired: boolean;
  threshold: number;
}

export function analyzeWidthHistory(rows: IndicatorHistoryRow[]): WidthAnalysis {
  const valid = rows
    .filter((r) => r.value != null)
    .map((r) => ({ date: r.date, value: r.value! }))
    .reverse(); // chronological

  if (valid.length < 10) {
    return {
      history: [],
      currentWidth: 0,
      avgWidth: 0,
      percentile: 50,
      inSqueeze: false,
      squeezeDays: 0,
      fired: false,
      threshold: 0,
    };
  }

  const widths = valid.map((r) => r.value);
  const sorted = [...widths].sort((a, b) => a - b);
  const threshold = sorted[Math.floor(sorted.length * SQUEEZE_PCT / 100)];
  const avgWidth = widths.reduce((s, w) => s + w, 0) / widths.length;
  const currentWidth = widths[widths.length - 1];
  const belowCount = sorted.filter((w) => w < currentWidth).length;
  const percentile = Math.round((belowCount / sorted.length) * 100);

  const history: SqueezeHistory[] = valid.map((r) => ({
    date: r.date,
    bbWidth: r.value,
    inSqueeze: r.value <= threshold,
  }));

  let squeezeDays = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].inSqueeze) squeezeDays++;
    else break;
  }

  const inSqueeze = history[history.length - 1].inSqueeze;

  let fired = false;
  if (!inSqueeze && history.length >= 5) {
    const rec = history.slice(-5);
    const wasSqueeze = rec.slice(0, 3).some((h) => h.inSqueeze);
    const expanding = rec[rec.length - 1].bbWidth > rec[rec.length - 3].bbWidth;
    fired = wasSqueeze && expanding;
  }

  return { history, currentWidth, avgWidth, percentile, inSqueeze, squeezeDays, fired, threshold };
}

// ── Past squeeze events from chart data ────────────────────────

function chartBbWidth(row: ChartRow): number | null {
  if (!row.bb_upper || !row.bb_lower || !row.bb_middle || row.bb_middle === 0) return null;
  return (row.bb_upper - row.bb_lower) / row.bb_middle;
}

export function findPastSqueezes(chartRows: ChartRow[], threshold: number): SqueezeEvent[] {
  const rows = [...chartRows].reverse(); // chronological
  const events: SqueezeEvent[] = [];
  let start = -1;

  for (let i = 0; i < rows.length; i++) {
    const w = chartBbWidth(rows[i]);
    if (w == null) continue;
    if (w <= threshold && start === -1) {
      start = i;
    } else if (w > threshold && start !== -1) {
      const dur = i - start;
      if (dur >= 3) {
        const priceAtFire = rows[i].close ?? 0;
        const lookAhead = Math.min(i + 20, rows.length - 1);
        const endPrice = rows[lookAhead].close ?? priceAtFire;
        const move = priceAtFire > 0 ? ((endPrice - priceAtFire) / priceAtFire) * 100 : 0;
        events.push({
          startDate: rows[start].date,
          fireDate: rows[i].date,
          durationDays: dur,
          direction: move >= 0 ? "up" : "down",
          movePercent: move,
        });
      }
      start = -1;
    }
  }

  return events;
}

// ── Bollinger chart data ───────────────────────────────────────

export function buildBollingerChart(chartRows: ChartRow[], threshold: number): BollingerPoint[] {
  return [...chartRows]
    .reverse()
    .map((r) => {
      const w = chartBbWidth(r);
      return {
        date: r.date,
        close: r.close ?? 0,
        bbUpper: r.bb_upper ?? 0,
        bbLower: r.bb_lower ?? 0,
        bbMiddle: r.bb_middle ?? 0,
        bbWidth: w ?? 0,
        inSqueeze: w != null && w <= threshold,
      };
    })
    .filter((p) => p.close > 0);
}

// ── Helpers ────────────────────────────────────────────────────

export function squeezeColor(percentile: number): string {
  if (percentile <= 10) return "#22c55e";
  if (percentile <= 25) return "#4ade80";
  if (percentile <= 40) return "#a3e635";
  if (percentile <= 60) return "#facc15";
  if (percentile <= 80) return "#f97316";
  return "#ef4444";
}

export function squeezeLabel(percentile: number): string {
  if (percentile <= 10) return "Extreme";
  if (percentile <= 25) return "Tight";
  if (percentile <= 40) return "Contracting";
  if (percentile <= 60) return "Normal";
  if (percentile <= 80) return "Expanding";
  return "Wide";
}

export function volRegime(stocks: SqueezeStock[]): {
  label: string;
  color: string;
  desc: string;
} {
  if (stocks.length === 0) return { label: "\u2014", color: "#6b7280", desc: "" };
  const avgPct = stocks.reduce((s, st) => s + st.bbWidthPercentile, 0) / stocks.length;
  const squeezeCount = stocks.filter((s) => s.inSqueeze).length;
  const squeezePct = (squeezeCount / stocks.length) * 100;

  if (avgPct <= 30 || squeezePct >= 40) {
    return {
      label: "Compressed",
      color: "#22c55e",
      desc: `${squeezeCount} stocks in squeeze — big moves brewing`,
    };
  }
  if (avgPct <= 60) {
    return {
      label: "Normal",
      color: "#facc15",
      desc: "Typical volatility — selective squeezes forming",
    };
  }
  return {
    label: "Elevated",
    color: "#ef4444",
    desc: "High volatility — wide ranges, wait for contraction",
  };
}
