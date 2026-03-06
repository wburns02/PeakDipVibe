import type { ChartRow } from "@/api/types/price";

export interface MonthlyReturnCell {
  year: number;
  month: number;
  returnPct: number;
}

export interface YearlyGrid {
  years: number[];
  months: string[];
  cells: MonthlyReturnCell[];
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Compute year-by-year monthly returns from daily price data. */
export function computeYearlyGrid(prices: ChartRow[]): YearlyGrid {
  if (!prices.length) return { years: [], months: MONTH_LABELS, cells: [] };

  // Sort ascending by date
  const sorted = [...prices].sort((a, b) => a.date.localeCompare(b.date));

  // Group by year-month, keep first and last close
  const groups = new Map<string, { first: number; last: number; year: number; month: number }>();
  for (const row of sorted) {
    if (row.close == null) continue;
    const [y, m] = row.date.split("-").map(Number);
    const key = `${y}-${m}`;
    const existing = groups.get(key);
    if (existing) {
      existing.last = row.close;
    } else {
      groups.set(key, { first: row.close, last: row.close, year: y, month: m });
    }
  }

  const cells: MonthlyReturnCell[] = [];
  const yearSet = new Set<number>();

  for (const { first, last, year, month } of groups.values()) {
    if (first === 0) continue;
    cells.push({ year, month, returnPct: ((last - first) / first) * 100 });
    yearSet.add(year);
  }

  const years = Array.from(yearSet).sort((a, b) => a - b);
  return { years, months: MONTH_LABELS, cells };
}

/** Get the current month (1-12) and its label. */
export function getCurrentMonth(): { month: number; label: string } {
  const now = new Date();
  const month = now.getMonth() + 1;
  return { month, label: MONTH_LABELS[month - 1] };
}
