import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import {
  Heart,
  ChevronRight,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useTickerList } from "@/api/hooks/useTickers";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/api/client";
import { IndicatorSnapshotSchema } from "@/api/types/indicator";

function QuickAddSearch({ watchlist, onAdd }: { watchlist: string[]; onAdd: (t: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 200);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const searchTerm = debouncedQuery.trim().length >= 1 ? debouncedQuery.trim() : undefined;
  const { data: results } = useTickerList(searchTerm);

  const filtered = useMemo(() => {
    if (!results) return [];
    const q = debouncedQuery.trim().toUpperCase();
    return results
      .filter((t) => !watchlist.includes(t.ticker))
      .filter((t) => !q || t.ticker.includes(q) || (t.name?.toUpperCase().includes(q) ?? false))
      .slice(0, 5);
  }, [results, watchlist, debouncedQuery]);

  useEffect(() => { setSelectedIdx(0); }, [filtered]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (ticker: string) => {
    onAdd(ticker);
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) {
      if (e.key === "Enter" && query.trim()) {
        const upper = query.trim().toUpperCase();
        if (!watchlist.includes(upper)) { onAdd(upper); setQuery(""); }
      }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); handleSelect(filtered[selectedIdx].ticker); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  return (
    <div ref={containerRef} className="relative mt-3">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-primary px-2.5 py-2 focus-within:border-accent">
        <Search className="h-3.5 w-3.5 shrink-0 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (query.trim()) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Add stock..."
          className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none"
          aria-label="Search stocks to add to watchlist"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(""); setOpen(false); }} className="text-text-muted hover:text-text-primary">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-lg border border-border bg-bg-card shadow-xl">
          {filtered.map((t, i) => (
            <button
              key={t.ticker}
              type="button"
              onClick={() => handleSelect(t.ticker)}
              className={`flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm transition-colors ${i === selectedIdx ? "bg-accent/10" : "hover:bg-bg-hover"}`}
            >
              <Plus className="h-3 w-3 text-accent" />
              <span className="font-medium text-accent">{t.ticker}</span>
              <span className="truncate text-xs text-text-muted">{t.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function WatchlistHealth() {
  const { watchlist, add } = useWatchlist();
  const { show: showToast } = useToast();

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
          <QuickAddSearch
            watchlist={watchlist}
            onAdd={(t) => { add(t); showToast(`${t} added to watchlist`); }}
          />
          <Link
            to="/screener"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-xs text-text-secondary transition-colors hover:border-accent hover:text-accent"
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
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
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
          <QuickAddSearch
            watchlist={watchlist}
            onAdd={(t) => { add(t); showToast(`${t} added to watchlist`); }}
          />
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
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${assessment.bg} ${assessment.color}`}
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
                    <p className="text-xs text-text-muted">RSI</p>
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
