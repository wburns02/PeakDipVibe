import { Link } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import {
  Heart,
  ChevronRight,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useWatchlist } from "@/hooks/useWatchlist";
import { api } from "@/api/client";
import { IndicatorSnapshotSchema } from "@/api/types/indicator";

export function WatchlistHealth() {
  const { watchlist } = useWatchlist();

  const queries = useQueries({
    queries: watchlist.slice(0, 8).map((ticker) => ({
      queryKey: ["indicators", ticker],
      queryFn: async () => {
        const { data } = await api.get(`/indicators/${ticker}`);
        return IndicatorSnapshotSchema.parse(data);
      },
      staleTime: 5 * 60 * 1000,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);

  if (watchlist.length === 0) {
    return (
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Heart className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold text-text-primary">
            Watchlist Health
          </h2>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-bg-card p-8 text-center">
          <Heart className="mx-auto mb-3 h-10 w-10 text-text-muted" />
          <h3 className="mb-1 text-sm font-semibold text-text-primary">
            Your watchlist is empty
          </h3>
          <p className="mb-4 text-xs text-text-muted">
            Add stocks to see personalized health checks every morning.
          </p>
          <Link
            to="/screener"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <Plus className="h-3.5 w-3.5" />
            Browse Stocks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold text-text-primary">
            Watchlist Health
          </h2>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
            {watchlist.length} stocks
          </span>
        </div>
        <Link
          to="/watchlist"
          className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
        >
          Full list <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: Math.min(watchlist.length, 5) }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {queries.map((q, i) => {
            const ticker = watchlist[i];
            if (!ticker) return null;
            const ind = q.data?.indicators;
            const rsi = ind?.rsi_14 ?? null;
            const sma50 = ind?.sma_50 ?? null;
            const sma200 = ind?.sma_200 ?? null;
            const close = ind?.close ?? null;

            const assessment = getAssessment(rsi, close, sma50, sma200);

            return (
              <Link
                key={ticker}
                to={`/ticker/${ticker}`}
                className="group flex items-center gap-3 rounded-xl border border-border bg-bg-card p-3 transition-all duration-200 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5"
              >
                {/* Status dot */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${assessment.bg}`}
                >
                  <assessment.icon className={`h-4 w-4 ${assessment.color}`} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-accent">{ticker}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${assessment.bg} ${assessment.color}`}
                    >
                      {assessment.label}
                    </span>
                  </div>
                  <p className="truncate text-xs text-text-muted">
                    {assessment.text}
                  </p>
                </div>

                {/* RSI badge */}
                {rsi != null && (
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] text-text-muted">RSI</p>
                    <p
                      className={`text-sm font-bold ${rsi > 70 ? "text-red" : rsi < 30 ? "text-green" : "text-text-primary"}`}
                    >
                      {rsi.toFixed(0)}
                    </p>
                  </div>
                )}

                <ChevronRight className="h-4 w-4 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getAssessment(
  rsi: number | null,
  close: number | null,
  sma50: number | null,
  sma200: number | null,
) {
  // Bullish signals
  const aboveSma50 = close != null && sma50 != null && close > sma50;
  const aboveSma200 = close != null && sma200 != null && close > sma200;
  const oversold = rsi != null && rsi < 30;
  const overbought = rsi != null && rsi > 70;
  const nearSma200 =
    close != null &&
    sma200 != null &&
    Math.abs(close - sma200) / sma200 < 0.02;

  if (oversold && aboveSma200) {
    return {
      label: "Oversold",
      text: "RSI oversold near support — potential bounce setup",
      color: "text-green",
      bg: "bg-green/10",
      icon: TrendingUp,
    };
  }

  if (overbought) {
    return {
      label: "Overbought",
      text: "RSI overbought — consider taking partial profits",
      color: "text-red",
      bg: "bg-red/10",
      icon: TrendingDown,
    };
  }

  if (!aboveSma200 && !aboveSma50) {
    return {
      label: "Bearish",
      text: "Below both 50 and 200-day moving averages — caution",
      color: "text-red",
      bg: "bg-red/10",
      icon: TrendingDown,
    };
  }

  if (nearSma200) {
    return {
      label: "At Support",
      text: "Testing 200-day moving average — key support level",
      color: "text-amber",
      bg: "bg-amber/10",
      icon: Minus,
    };
  }

  if (aboveSma50 && aboveSma200) {
    return {
      label: "Healthy",
      text: "Above key moving averages — trend intact",
      color: "text-green",
      bg: "bg-green/10",
      icon: TrendingUp,
    };
  }

  if (aboveSma200 && !aboveSma50) {
    return {
      label: "Pulling Back",
      text: "Below 50-SMA but above 200-SMA — watching for support",
      color: "text-amber",
      bg: "bg-amber/10",
      icon: Minus,
    };
  }

  return {
    label: "Neutral",
    text: "No strong signals — monitoring",
    color: "text-text-secondary",
    bg: "bg-bg-hover",
    icon: Minus,
  };
}
