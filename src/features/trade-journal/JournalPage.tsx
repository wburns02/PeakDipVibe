import { useState, useMemo, useCallback } from "react";
import { useQueries } from "@tanstack/react-query";
import { api } from "@/api/client";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  loadTrades,
  enrichTrade,
  computePerformance,
  computeDailyPnl,
  type TradeWithPnl,
} from "./lib/journal";
import { TradeForm } from "./components/TradeForm";
import { OpenPositions } from "./components/OpenPositions";
import { PerformanceStats } from "./components/PerformanceStats";
import { EquityCurve } from "./components/EquityCurve";
import { TradeHistory } from "./components/TradeHistory";
import {
  BookOpen,
  Plus,
  DollarSign,
  TrendingUp,
  BarChart3,
} from "lucide-react";

export function JournalPage() {
  usePageTitle("Trade Journal");

  const [showForm, setShowForm] = useState(false);
  const [version, setVersion] = useState(0); // trigger re-render on data changes

  const rawTrades = useMemo(() => loadTrades(), [version]);

  // Fetch current prices for open trades
  const openTickers = useMemo(() => {
    const unique = new Set(rawTrades.filter((t) => t.status === "open").map((t) => t.ticker));
    return Array.from(unique);
  }, [rawTrades]);

  const priceQueries = useQueries({
    queries: openTickers.map((ticker) => ({
      queryKey: ["ticker", ticker],
      queryFn: async () => {
        const { data } = await api.get(`/tickers/${ticker}`);
        return { ticker, price: data.latest_close as number ?? 0 };
      },
      staleTime: 60 * 1000,
    })),
  });

  const priceMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const q of priceQueries) {
      if (q.data) map[q.data.ticker] = q.data.price;
    }
    return map;
  }, [priceQueries]);

  // Enrich trades with P&L
  const enrichedTrades: TradeWithPnl[] = useMemo(() => {
    return rawTrades.map((t) => {
      const currentPrice = priceMap[t.ticker] ?? t.entryPrice;
      return enrichTrade(t, currentPrice);
    });
  }, [rawTrades, priceMap]);

  const stats = useMemo(() => computePerformance(enrichedTrades), [enrichedTrades]);
  const dailyPnl = useMemo(() => computeDailyPnl(enrichedTrades), [enrichedTrades]);

  const handleUpdate = useCallback(() => setVersion((v) => v + 1), []);

  const totalUnrealized = enrichedTrades
    .filter((t) => t.status === "open")
    .reduce((s, t) => s + t.unrealizedPnl, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <BookOpen className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Trade Journal</h1>
            <p className="text-sm text-text-muted">
              Track trades, measure performance &mdash; learn what works
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          Log Trade
        </button>
      </div>

      {/* Quick stats banner */}
      {enrichedTrades.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickStat
            icon={<BookOpen className="h-3.5 w-3.5" />}
            label="Total Trades"
            value={String(stats.totalTrades)}
          />
          <QuickStat
            icon={<DollarSign className="h-3.5 w-3.5" />}
            label="Realized P&L"
            value={`${stats.totalPnl >= 0 ? "+" : ""}$${stats.totalPnl.toFixed(2)}`}
            color={stats.totalPnl >= 0 ? "text-green" : "text-red"}
          />
          <QuickStat
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Unrealized"
            value={`${totalUnrealized >= 0 ? "+" : ""}$${totalUnrealized.toFixed(2)}`}
            color={totalUnrealized >= 0 ? "text-green" : "text-red"}
          />
          <QuickStat
            icon={<BarChart3 className="h-3.5 w-3.5" />}
            label="Win Rate"
            value={stats.closedTrades > 0 ? `${stats.winRate.toFixed(0)}%` : "--"}
            color={stats.winRate >= 50 ? "text-green" : stats.closedTrades > 0 ? "text-red" : undefined}
          />
        </div>
      )}

      {/* Empty state */}
      {enrichedTrades.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-bg-card p-12 text-center space-y-4">
          <BookOpen className="mx-auto h-12 w-12 text-text-muted" />
          <h3 className="text-lg font-semibold text-text-primary">Start your trading journal</h3>
          <p className="mx-auto max-w-md text-sm text-text-muted">
            Log your first trade to begin tracking your performance.
            Over time, you'll see your win rate, P&L curve, best setups, and patterns in your trading behavior.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mx-auto flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" />
            Log Your First Trade
          </button>
        </div>
      )}

      {/* Open Positions */}
      <OpenPositions trades={enrichedTrades} onUpdate={handleUpdate} />

      {/* Performance + Equity Curve */}
      {stats.closedTrades > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PerformanceStats stats={stats} />
          <EquityCurve dailyPnl={dailyPnl} />
        </div>
      )}

      {/* Trade History */}
      <TradeHistory trades={enrichedTrades} onUpdate={handleUpdate} />

      {/* Trade Form Modal */}
      {showForm && (
        <TradeForm
          onClose={() => setShowForm(false)}
          onSaved={handleUpdate}
        />
      )}
    </div>
  );
}

function QuickStat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-text-muted">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-lg font-bold ${color ?? "text-text-primary"}`}>{value}</p>
    </div>
  );
}
