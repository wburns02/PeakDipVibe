/**
 * Trade Journal Engine
 *
 * CRUD for trades, P&L calculations, and performance analytics.
 * All data persisted in localStorage.
 */

export type TradeStatus = "open" | "closed";
export type TradeSide = "long" | "short";

export interface Trade {
  id: string;
  ticker: string;
  side: TradeSide;
  status: TradeStatus;
  entryPrice: number;
  entryDate: string; // ISO date
  shares: number;
  stopLoss: number | null;
  targetPrice: number | null;
  exitPrice: number | null;
  exitDate: string | null;
  notes: string;
  tags: string[];
  createdAt: string; // ISO datetime
}

export interface TradeWithPnl extends Trade {
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  realizedPnl: number;
  realizedPnlPct: number;
  holdingDays: number;
}

export interface PerformanceStats {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  totalPnl: number;
  bestTrade: { ticker: string; pnl: number } | null;
  worstTrade: { ticker: string; pnl: number } | null;
  avgHoldDays: number;
  winStreak: number;
  currentStreak: number;
}

export interface DailyPnl {
  date: string;
  pnl: number;
  trades: number;
}

const STORAGE_KEY = "peakdipvibe-journal";

export function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function loadTrades(): Trade[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTrades(trades: Trade[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  } catch { /* noop */ }
}

export function addTrade(trade: Omit<Trade, "id" | "createdAt" | "status">): Trade {
  const trades = loadTrades();
  const newTrade: Trade = {
    ...trade,
    id: makeId(),
    status: "open",
    createdAt: new Date().toISOString(),
  };
  trades.unshift(newTrade);
  saveTrades(trades);
  return newTrade;
}

export function closeTrade(id: string, exitPrice: number, exitDate: string, notes?: string): Trade | null {
  const trades = loadTrades();
  const idx = trades.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  trades[idx] = {
    ...trades[idx],
    status: "closed",
    exitPrice,
    exitDate,
    notes: notes ?? trades[idx].notes,
  };
  saveTrades(trades);
  return trades[idx];
}

export function deleteTrade(id: string) {
  const trades = loadTrades().filter((t) => t.id !== id);
  saveTrades(trades);
}

export function updateTrade(id: string, updates: Partial<Trade>) {
  const trades = loadTrades();
  const idx = trades.findIndex((t) => t.id === id);
  if (idx === -1) return;
  trades[idx] = { ...trades[idx], ...updates };
  saveTrades(trades);
}

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return Math.max(1, Math.round(Math.abs(d2.getTime() - d1.getTime()) / 86400000));
}

export function enrichTrade(trade: Trade, currentPrice: number): TradeWithPnl {
  const dir = trade.side === "long" ? 1 : -1;
  const isClosed = trade.status === "closed" && trade.exitPrice != null;
  const exit = isClosed ? trade.exitPrice! : currentPrice;

  const pnlPerShare = (exit - trade.entryPrice) * dir;
  const pnl = pnlPerShare * trade.shares;
  const pnlPct = trade.entryPrice > 0 ? (pnlPerShare / trade.entryPrice) * 100 : 0;

  const holdEnd = trade.exitDate ?? new Date().toISOString().slice(0, 10);
  const holdingDays = daysBetween(trade.entryDate, holdEnd);

  return {
    ...trade,
    currentPrice,
    unrealizedPnl: isClosed ? 0 : pnl,
    unrealizedPnlPct: isClosed ? 0 : pnlPct,
    realizedPnl: isClosed ? pnl : 0,
    realizedPnlPct: isClosed ? pnlPct : 0,
    holdingDays,
  };
}

export function computePerformance(trades: TradeWithPnl[]): PerformanceStats {
  const closed = trades.filter((t) => t.status === "closed");
  const open = trades.filter((t) => t.status === "open");

  const wins = closed.filter((t) => t.realizedPnl > 0);
  const losses = closed.filter((t) => t.realizedPnl <= 0);

  const totalWins = wins.reduce((s, t) => s + t.realizedPnl, 0);
  const totalLosses = Math.abs(losses.reduce((s, t) => s + t.realizedPnl, 0));
  const totalPnl = closed.reduce((s, t) => s + t.realizedPnl, 0);

  let bestTrade: { ticker: string; pnl: number } | null = null;
  let worstTrade: { ticker: string; pnl: number } | null = null;
  for (const t of closed) {
    if (!bestTrade || t.realizedPnl > bestTrade.pnl) bestTrade = { ticker: t.ticker, pnl: t.realizedPnl };
    if (!worstTrade || t.realizedPnl < worstTrade.pnl) worstTrade = { ticker: t.ticker, pnl: t.realizedPnl };
  }

  // Streaks
  let winStreak = 0;
  let currentStreak = 0;
  let tempStreak = 0;
  const sorted = [...closed].sort((a, b) => a.exitDate!.localeCompare(b.exitDate!));
  for (const t of sorted) {
    if (t.realizedPnl > 0) {
      tempStreak++;
      winStreak = Math.max(winStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }
  // Current streak (from most recent)
  for (let i = sorted.length - 1; i >= 0; i--) {
    const isWin = sorted[i].realizedPnl > 0;
    if (i === sorted.length - 1) {
      currentStreak = isWin ? 1 : -1;
    } else {
      if ((isWin && currentStreak > 0) || (!isWin && currentStreak < 0)) {
        currentStreak += isWin ? 1 : -1;
      } else {
        break;
      }
    }
  }

  return {
    totalTrades: trades.length,
    openTrades: open.length,
    closedTrades: closed.length,
    winRate: closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
    avgWin: wins.length > 0 ? totalWins / wins.length : 0,
    avgLoss: losses.length > 0 ? totalLosses / losses.length : 0,
    profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
    totalPnl,
    bestTrade,
    worstTrade,
    avgHoldDays: closed.length > 0
      ? closed.reduce((s, t) => s + t.holdingDays, 0) / closed.length
      : 0,
    winStreak,
    currentStreak,
  };
}

export function computeDailyPnl(trades: TradeWithPnl[]): DailyPnl[] {
  const closed = trades.filter((t) => t.status === "closed" && t.exitDate);
  const dateMap: Record<string, { pnl: number; trades: number }> = {};

  for (const t of closed) {
    const d = t.exitDate!;
    if (!dateMap[d]) dateMap[d] = { pnl: 0, trades: 0 };
    dateMap[d].pnl += t.realizedPnl;
    dateMap[d].trades++;
  }

  return Object.entries(dateMap)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const TRADE_TAGS = [
  "Momentum", "Mean Reversion", "Breakout", "Breakdown",
  "Earnings Play", "Oversold Bounce", "Golden Cross", "Gap Fill",
  "Sector Rotation", "News Catalyst",
];
