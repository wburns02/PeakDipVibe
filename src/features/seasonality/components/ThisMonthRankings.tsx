import { useQueries } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { api } from "@/api/client";
import { SeasonalResponseSchema } from "@/api/types/price";
import type { SeasonalResponse, MonthlyReturn } from "@/api/types/price";
import { useWatchlist } from "@/hooks/useWatchlist";
import { getCurrentMonth } from "../lib/seasonality";
import { Skeleton } from "@/components/ui/Skeleton";

interface RankedStock {
  ticker: string;
  seasonal: SeasonalResponse;
  monthData: MonthlyReturn;
  score: number;
}

export function ThisMonthRankings({
  onSelect,
}: {
  onSelect: (ticker: string) => void;
}) {
  const { watchlist } = useWatchlist();
  const { month, label } = getCurrentMonth();

  const queries = useQueries({
    queries: watchlist.map((ticker) => ({
      queryKey: ["seasonal-ranking", ticker],
      queryFn: async () => {
        const { data } = await api.get(`/prices/${ticker}/seasonal`);
        return { ticker, seasonal: SeasonalResponseSchema.parse(data) };
      },
      staleTime: 10 * 60 * 1000,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);

  const ranked: RankedStock[] = queries
    .filter((q) => q.data)
    .map((q) => {
      const { ticker, seasonal } = q.data!;
      const monthData = seasonal.months.find((m) => m.month === month);
      if (!monthData) return null;
      return {
        ticker,
        seasonal,
        monthData,
        score: monthData.avg_return * (monthData.win_rate / 100),
      };
    })
    .filter((x): x is RankedStock => x !== null)
    .sort((a, b) => b.score - a.score);

  if (watchlist.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-6 text-center">
        <Calendar className="mx-auto h-8 w-8 text-text-muted mb-2" />
        <p className="text-sm text-text-muted">
          Add stocks to your watchlist to see seasonal rankings
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Your Watchlist in {label}
        </h2>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ranked.map((stock, i) => {
            const m = stock.monthData;
            const positive = m.avg_return >= 0;
            return (
              <button
                key={stock.ticker}
                type="button"
                onClick={() => onSelect(stock.ticker)}
                className="group rounded-xl border border-border bg-bg-card p-4 text-left transition-all hover:border-accent/50 hover:shadow-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-bg-hover text-[10px] font-bold text-text-muted">
                      {i + 1}
                    </span>
                    <span className="font-bold text-accent">
                      {stock.ticker}
                    </span>
                  </div>
                  {positive ? (
                    <TrendingUp className="h-4 w-4 text-green" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red" />
                  )}
                </div>

                <p
                  className={`text-2xl font-bold ${positive ? "text-green" : "text-red"}`}
                >
                  {positive ? "+" : ""}
                  {m.avg_return.toFixed(1)}%
                </p>
                <p className="text-xs text-text-muted mt-1">
                  avg return in {label}
                </p>

                <div className="mt-2 flex gap-3 text-[11px] text-text-muted">
                  <span>{m.win_rate}% win rate</span>
                  <span>{m.years} yrs</span>
                </div>

                {/* Mini 12-month sparkline */}
                <div className="mt-2 flex gap-0.5 items-end h-4">
                  {stock.seasonal.months.map((mo) => {
                    const h = Math.min(Math.abs(mo.avg_return) * 2, 16);
                    return (
                      <div
                        key={mo.month}
                        className={`flex-1 rounded-sm ${
                          mo.month === month ? "opacity-100" : "opacity-40"
                        } ${mo.avg_return >= 0 ? "bg-green" : "bg-red"}`}
                        style={{ height: Math.max(h, 2) }}
                      />
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
