import { useState, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { ArrowDownUp, Info, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/api/client";
import { ChartRowSchema } from "@/api/types/price";
import { useScreener } from "@/api/hooks/useScreener";
import { useWatchlist } from "@/hooks/useWatchlist";
import { STALE_STABLE } from "@/api/queryConfig";
import { Skeleton } from "@/components/ui/Skeleton";
import { z } from "zod";
import { detectDivergences } from "./lib/divergence-engine";
import type { Divergence } from "./lib/divergence-engine";
import { DivergenceCard } from "./components/DivergenceCard";

type FilterMode = "all" | "bullish" | "bearish" | "watchlist";

export function DivergenceScannerPage() {
  const [filter, setFilter] = useState<FilterMode>("all");
  const [guideOpen, setGuideOpen] = useState(false);
  const { watchlist } = useWatchlist();

  // Screener: 2 calls → all 50 indicator stocks
  const { data: dataAbove, isLoading: loadA } = useScreener({
    limit: 200,
    above_sma200: true,
    sort_by: "ticker",
  });
  const { data: dataBelow, isLoading: loadB } = useScreener({
    limit: 200,
    above_sma200: false,
    sort_by: "ticker",
  });

  const screenerStocks = useMemo(() => {
    if (!dataAbove || !dataBelow) return [];
    const map = new Map<string, (typeof dataAbove)[number]>();
    for (const s of [...dataAbove, ...dataBelow]) map.set(s.ticker, s);
    return [...map.values()];
  }, [dataAbove, dataBelow]);

  const tickers = useMemo(() => screenerStocks.map((s) => s.ticker), [screenerStocks]);

  // Chart data (80 days) for each stock — needed for RSI computation + swing detection
  const chartQueries = useQueries({
    queries: tickers.map((ticker) => ({
      queryKey: ["chart", ticker, { limit: 80 }],
      queryFn: async () => {
        const { data } = await api.get(`/prices/${ticker}/chart`, {
          params: { limit: 80 },
        });
        return { ticker, rows: z.array(ChartRowSchema).parse(data) };
      },
      staleTime: STALE_STABLE,
      enabled: tickers.length > 0,
    })),
  });

  const allLoaded = chartQueries.every((q) => q.isSuccess);
  const isLoading = loadA || loadB || chartQueries.some((q) => q.isLoading);

  // Run detection across all stocks
  const allDivergences: Divergence[] = useMemo(() => {
    if (!allLoaded) return [];
    const stockMap = new Map(screenerStocks.map((s) => [s.ticker, s]));
    const results: Divergence[] = [];
    for (const q of chartQueries) {
      if (!q.data) continue;
      const stock = stockMap.get(q.data.ticker);
      if (!stock) continue;
      results.push(
        ...detectDivergences(q.data.rows, stock.ticker, stock.name ?? "", stock.sector ?? ""),
      );
    }
    return results.sort((a, b) => b.conviction - a.conviction || a.recencyDays - b.recencyDays);
  }, [allLoaded, chartQueries, screenerStocks]);

  // Filter
  const filtered = useMemo(() => {
    switch (filter) {
      case "bullish":
        return allDivergences.filter((d) => d.type === "bullish");
      case "bearish":
        return allDivergences.filter((d) => d.type === "bearish");
      case "watchlist":
        return allDivergences.filter((d) => watchlist.includes(d.ticker));
      default:
        return allDivergences;
    }
  }, [allDivergences, filter, watchlist]);

  const bullishCount = allDivergences.filter((d) => d.type === "bullish").length;
  const bearishCount = allDivergences.filter((d) => d.type === "bearish").length;
  const strongest = allDivergences[0] ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <ArrowDownUp className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary sm:text-2xl">
              Divergence Scanner
            </h1>
            <p className="text-sm text-text-muted">
              Spot reversals before they happen
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setGuideOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-hover"
        >
          <Info className="h-3.5 w-3.5" />
          How It Works
          {guideOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Guide */}
      {guideOpen && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm text-text-secondary">
          <h3 className="mb-2 font-semibold text-text-primary">
            How Divergence Detection Works
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 font-medium text-text-primary">Bullish Divergence</p>
              <p>
                Price makes a lower low, but RSI makes a higher low. This signals
                selling pressure is weakening &mdash; a potential upward reversal.
              </p>
            </div>
            <div>
              <p className="mb-1 font-medium text-text-primary">Bearish Divergence</p>
              <p>
                Price makes a higher high, but RSI makes a lower high. This signals
                buying momentum is fading &mdash; a potential downward reversal.
              </p>
            </div>
            <div>
              <p className="mb-1 font-medium text-text-primary">Swing Detection</p>
              <p>
                Scans the last 80 days of price data using a 5-bar window to identify
                local swing highs and lows, then compares RSI at each swing point.
              </p>
            </div>
            <div>
              <p className="mb-1 font-medium text-text-primary">Conviction (1&ndash;5)</p>
              <p>
                Higher for: recent divergences, RSI in extreme zones
                (oversold/overbought), and larger RSI divergence magnitude.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-bg-secondary p-3">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Divergences</p>
          <p className="mt-1 text-xl font-bold text-text-primary">
            {isLoading ? "\u2014" : allDivergences.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-3">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Bullish</p>
          <p className="mt-1 text-xl font-bold text-green">
            {isLoading ? "\u2014" : bullishCount}
          </p>
          {!isLoading && bullishCount > 0 && (
            <p className="text-[10px] text-text-muted">potential reversals up</p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-3">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Bearish</p>
          <p className="mt-1 text-xl font-bold text-red">
            {isLoading ? "\u2014" : bearishCount}
          </p>
          {!isLoading && bearishCount > 0 && (
            <p className="text-[10px] text-text-muted">potential reversals down</p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-3">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Strongest</p>
          <p className="mt-1 text-xl font-bold text-accent">
            {isLoading ? "\u2014" : strongest?.ticker ?? "None"}
          </p>
          {!isLoading && strongest && (
            <p className="text-[10px] text-text-muted">
              {strongest.type} &middot; {strongest.conviction}/5
            </p>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: "all" as FilterMode, label: "All", color: undefined },
            { key: "bullish" as FilterMode, label: "Bullish", color: "#22c55e" },
            { key: "bearish" as FilterMode, label: "Bearish", color: "#ef4444" },
            { key: "watchlist" as FilterMode, label: "Watchlist", color: undefined },
          ] as const
        ).map((tab) => {
          const count =
            tab.key === "all"
              ? allDivergences.length
              : tab.key === "bullish"
                ? bullishCount
                : tab.key === "bearish"
                  ? bearishCount
                  : allDivergences.filter((d) => watchlist.includes(d.ticker)).length;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === tab.key
                  ? "text-white"
                  : "border-border text-text-muted hover:text-text-primary hover:bg-bg-hover"
              }`}
              style={
                filter === tab.key
                  ? {
                      backgroundColor: tab.color ?? "var(--color-accent)",
                      borderColor: tab.color ?? "var(--color-accent)",
                    }
                  : undefined
              }
            >
              {tab.label}
              <span className={`ml-1 ${filter === tab.key ? "opacity-80" : "opacity-50"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((d) => (
            <DivergenceCard key={`${d.ticker}-${d.type}`} divergence={d} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-bg-secondary/50 p-12 text-center">
          <ArrowDownUp className="mx-auto mb-3 h-10 w-10 text-text-muted/30" />
          <p className="text-sm font-medium text-text-primary">
            No {filter === "all" ? "" : filter + " "}divergences found
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {filter === "watchlist"
              ? "No divergences detected in your watchlist stocks"
              : filter !== "all"
                ? 'Try switching to "All" to see all divergence types'
                : "No RSI divergences detected in the current market. Check back tomorrow."}
          </p>
        </div>
      )}

      {/* Disclaimer */}
      {filtered.length > 0 && (
        <p className="text-center text-[10px] text-text-muted">
          Divergences are technical patterns, not guarantees. They can fail, especially in
          strong trends. Always combine with other analysis and manage risk appropriately.
        </p>
      )}
    </div>
  );
}
