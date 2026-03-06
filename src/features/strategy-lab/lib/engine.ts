import type { ScreenerResult } from "@/api/types/screener";

// ── Condition types ────────────────────────────────────────

export type ConditionField =
  | "rsi_14"
  | "change_pct"
  | "close"
  | "sma_50"
  | "sma_200"
  | "above_sma50"
  | "above_sma200"
  | "bb_pctb"
  | "sector";

export type NumericOp = ">" | ">=" | "<" | "<=" | "between";
export type BooleanOp = "is";
export type SectorOp = "in" | "not_in";

export interface NumericCondition {
  field: Exclude<ConditionField, "above_sma50" | "above_sma200" | "sector">;
  op: NumericOp;
  value: number;
  value2?: number; // for "between"
}

export interface BooleanCondition {
  field: "above_sma50" | "above_sma200";
  op: BooleanOp;
  value: boolean;
}

export interface SectorCondition {
  field: "sector";
  op: SectorOp;
  value: string[];
}

export type Condition = NumericCondition | BooleanCondition | SectorCondition;

export interface Strategy {
  id: string;
  name: string;
  description: string;
  conditions: Condition[];
  createdAt: string;
  color: string;
}

// ── Field metadata ─────────────────────────────────────────

export const FIELD_META: Record<
  ConditionField,
  { label: string; type: "number" | "boolean" | "sector"; unit?: string; min?: number; max?: number; step?: number }
> = {
  rsi_14: { label: "RSI (14)", type: "number", min: 0, max: 100, step: 1 },
  change_pct: { label: "Daily Change %", type: "number", unit: "%", min: -30, max: 30, step: 0.5 },
  close: { label: "Price", type: "number", unit: "$", min: 0, max: 2000, step: 1 },
  sma_50: { label: "50-day SMA", type: "number", unit: "$", min: 0, max: 2000, step: 1 },
  sma_200: { label: "200-day SMA", type: "number", unit: "$", min: 0, max: 2000, step: 1 },
  above_sma50: { label: "Above 50-SMA", type: "boolean" },
  above_sma200: { label: "Above 200-SMA", type: "boolean" },
  bb_pctb: { label: "Bollinger %B", type: "number", min: -0.5, max: 1.5, step: 0.05 },
  sector: { label: "Sector", type: "sector" },
};

export const SECTORS = [
  "Communication Services",
  "Consumer Discretionary",
  "Consumer Staples",
  "Energy",
  "Financials",
  "Health Care",
  "Industrials",
  "Information Technology",
  "Materials",
  "Real Estate",
  "Utilities",
];

export const STRATEGY_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6",
];

// ── Preset strategies ──────────────────────────────────────

export const PRESET_STRATEGIES: Omit<Strategy, "id" | "createdAt">[] = [
  {
    name: "Oversold Bounce",
    description: "RSI below 30 with price above 200-SMA — classic mean-reversion setup",
    color: "#22c55e",
    conditions: [
      { field: "rsi_14", op: "<", value: 30 },
      { field: "above_sma200", op: "is", value: true },
    ],
  },
  {
    name: "Momentum Breakout",
    description: "RSI above 60 with price above both moving averages — riding the trend",
    color: "#3b82f6",
    conditions: [
      { field: "rsi_14", op: ">", value: 60 },
      { field: "above_sma50", op: "is", value: true },
      { field: "above_sma200", op: "is", value: true },
    ],
  },
  {
    name: "Deep Value",
    description: "Price below both SMAs with RSI under 35 — contrarian play",
    color: "#f97316",
    conditions: [
      { field: "rsi_14", op: "<", value: 35 },
      { field: "above_sma50", op: "is", value: false },
      { field: "above_sma200", op: "is", value: false },
    ],
  },
  {
    name: "Tech Dip Buyers",
    description: "Technology stocks with RSI below 40 — buy the dip in tech",
    color: "#8b5cf6",
    conditions: [
      { field: "sector", op: "in", value: ["Information Technology"] },
      { field: "rsi_14", op: "<", value: 40 },
    ],
  },
  {
    name: "Overbought Warning",
    description: "RSI above 75 — potential reversal candidates to watch or short",
    color: "#f43f5e",
    conditions: [
      { field: "rsi_14", op: ">", value: 75 },
    ],
  },
];

// ── Evaluation engine ──────────────────────────────────────

function getFieldValue(stock: ScreenerResult, field: ConditionField): number | boolean | string | null {
  switch (field) {
    case "rsi_14": return stock.rsi_14;
    case "change_pct": return stock.change_pct;
    case "close": return stock.close;
    case "sma_50": return stock.sma_50;
    case "sma_200": return stock.sma_200;
    case "above_sma50": return stock.above_sma50;
    case "above_sma200": return stock.above_sma200;
    case "bb_pctb": return stock.bb_pctb;
    case "sector": return stock.sector;
  }
}

function evalCondition(stock: ScreenerResult, cond: Condition): boolean {
  const val = getFieldValue(stock, cond.field);
  if (val === null || val === undefined) return false;

  if (cond.field === "sector") {
    const sc = cond as SectorCondition;
    if (sc.op === "in") return sc.value.includes(val as string);
    return !sc.value.includes(val as string);
  }

  if (cond.field === "above_sma50" || cond.field === "above_sma200") {
    return val === (cond as BooleanCondition).value;
  }

  const nc = cond as NumericCondition;
  const numVal = val as number;
  switch (nc.op) {
    case ">": return numVal > nc.value;
    case ">=": return numVal >= nc.value;
    case "<": return numVal < nc.value;
    case "<=": return numVal <= nc.value;
    case "between": return numVal >= nc.value && numVal <= (nc.value2 ?? nc.value);
  }
}

export function runStrategy(stocks: ScreenerResult[], conditions: Condition[]): ScreenerResult[] {
  if (conditions.length === 0) return [];
  return stocks.filter((s) => conditions.every((c) => evalCondition(s, c)));
}

// ── LocalStorage persistence ───────────────────────────────

const STORAGE_KEY = "peakdipvibe-strategies";

export function loadStrategies(): Strategy[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStrategies(strategies: Strategy[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(strategies));
}

export function makeId(): string {
  return `strat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Human-readable condition description ───────────────────

export function describeCondition(c: Condition): string {
  const meta = FIELD_META[c.field];
  if (c.field === "sector") {
    const sc = c as SectorCondition;
    return `${meta.label} ${sc.op === "in" ? "is" : "is not"} ${sc.value.join(", ")}`;
  }
  if (c.field === "above_sma50" || c.field === "above_sma200") {
    const bc = c as BooleanCondition;
    return bc.value ? `${meta.label}` : `Below ${meta.label.replace("Above ", "")}`;
  }
  const nc = c as NumericCondition;
  const u = meta.unit ?? "";
  if (nc.op === "between") return `${meta.label} between ${u}${nc.value} and ${u}${nc.value2}`;
  return `${meta.label} ${nc.op} ${u}${nc.value}`;
}
