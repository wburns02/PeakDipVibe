import { useState, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { Shapes, Info, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/api/client";
import { ChartRowSchema } from "@/api/types/price";
import { useScreener } from "@/api/hooks/useScreener";
import { useWatchlist } from "@/hooks/useWatchlist";
import { STALE_STABLE } from "@/api/queryConfig";
import { Skeleton } from "@/components/ui/Skeleton";
import { z } from "zod";
import { detectPatterns, PATTERN_LABELS } from "./lib/pattern-engine";
import type { DetectedPattern, PatternType } from "./lib/pattern-engine";
import { PatternCard } from "./components/PatternCard";

type FilterMode = "all" | "bullish" | "bearish" | "watchlist";
type SortMode = "conviction" | "potential" | "rr";

const PAGE_SIZE = 12;

const PATTERN_TYPES = Object.keys(PATTERN_LABELS) as PatternType[];

export function PatternScannerPage() {
  const [filter, setFilter] = useState<FilterMode>("all");
  const [patternFilter, setPatternFilter] = useState<PatternType | "all">("all");
  const [sortBy, setSortBy] = useState<SortMode>("conviction");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [guideOpen, setGuideOpen] = useState(false);
  const { watchlist } = useWatchlist();

  // Screener: 2 calls to get all ~50 indicator stocks
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

  // Fetch 80-day chart data per stock
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

  // Run detection
  const allPatterns: DetectedPattern[] = useMemo(() => {
    if (!allLoaded) return [];
    const stockMap = new Map(screenerStocks.map((s) => [s.ticker, s]));
    const results: DetectedPattern[] = [];
    for (const q of chartQueries) {
      if (!q.data) continue;
      const stock = stockMap.get(q.data.ticker);
      if (!stock) continue;
      results.push(
        ...detectPatterns(q.data.rows, stock.ticker, stock.name ?? "", stock.sector ?? ""),
      );
    }
    return results;
  }, [allLoaded, chartQueries, screenerStocks]);

  // Filter & sort
  const filtered = useMemo(() => {
    let list = allPatterns;

    if (filter === "bullish") list = list.filter((p) => p.type === "bullish");
    else if (filter === "bearish") list = list.filter((p) => p.type === "bearish");
    else if (filter === "watchlist") list = list.filter((p) => watchlist.includes(p.ticker));

    if (patternFilter !== "all") list = list.filter((p) => p.pattern === patternFilter);

    list = [...list].sort((a, b) => {
      if (sortBy === "potential") return b.potentialPct - a.potentialPct;
      if (sortBy === "rr") return b.riskReward - a.riskReward;
      return b.conviction - a.conviction || a.recencyDays - b.recencyDays;
    });

    return list;
  }, [allPatterns, filter, patternFilter, sortBy, watchlist]);

  // Reset page when filters change
  const filterKey = `${filter}-${patternFilter}-${sortBy}`;
  const [prevKey, setPrevKey] = useState(filterKey);
  if (filterKey !== prevKey) {
    setPrevKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const bullishCount = allPatterns.filter((p) => p.type === "bullish").length;
  const bearishCount = allPatterns.filter((p) => p.type === "bearish").length;

  // Count by pattern type
  const patternCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of allPatterns) counts[p.pattern] = (counts[p.pattern] || 0) + 1;
    return counts;
  }, [allPatterns]);

  const topPattern = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <Shapes className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary sm:text-2xl">
              Pattern Scanner
            </h1>
            <p className="text-sm text-text-muted">
              Classical chart patterns detected automatically
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
            How Pattern Detection Works
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 font-medium text-text-primary">Swing Detection</p>
              <p>
                Identifies local highs and lows using a 5-bar window across 80 days
                of OHLCV data for each stock, then matches swing point sequences
                against 8 classical chart pattern templates.
              </p>
            </div>
            <div>
              <p className="mb-1 font-medium text-text-primary">8 Patterns</p>
              <p>
                Double Bottom/Top, Bull/Bear Flag, Head &amp; Shoulders (and inverse),
                Ascending/Descending Triangle. Each pattern has specific geometric
                rules for swing relationships and price levels.
              </p>
            </div>
            <div>
              <p className="mb-1 font-medium text-text-primary">Trade Levels</p>
              <p>
                Each pattern calculates a measured-move target based on the pattern's
                geometry, plus a stop-loss below/above the key support/resistance level.
                Risk:Reward ratio is shown per trade.
              </p>
            </div>
            <div>
              <p className="mb-1 font-medium text-text-primary">Conviction (1&ndash;5)</p>
              <p>
                Scored by pattern clarity (how symmetrical/clean), recency (recent
                patterns score higher), and confirmation signals like neckline
                breaks or proximity to key levels.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-bg-secondary p-3">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Patterns</p>
          <p className="mt-1 text-xl font-bold text-text-primary">
            {isLoading ? "\u2014" : allPatterns.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-3">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Bullish</p>
          <p className="mt-1 text-xl font-bold text-green">
            {isLoading ? "\u2014" : bullishCount}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-3">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Bearish</p>
          <p className="mt-1 text-xl font-bold text-red">
            {isLoading ? "\u2014" : bearishCount}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-3">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Most Common</p>
          <p className="mt-1 text-lg font-bold text-accent truncate">
            {isLoading
              ? "\u2014"
              : topPattern
                ? PATTERN_LABELS[topPattern[0] as PatternType]
                : "None"}
          </p>
          {!isLoading && topPattern && (
            <p className="text-[10px] text-text-muted">{topPattern[1]} detected</p>
          )}
        </div>
      </div>

      {/* Filter row */}
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
              ? allPatterns.length
              : tab.key === "bullish"
                ? bullishCount
                : tab.key === "bearish"
                  ? bearishCount
                  : allPatterns.filter((p) => watchlist.includes(p.ticker)).length;
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

        <span className="mx-1 h-4 w-px bg-border" />

        {/* Pattern type filter */}
        <select
          value={patternFilter}
          onChange={(e) => setPatternFilter(e.target.value as PatternType | "all")}
          className="rounded-lg border border-border bg-bg-secondary px-2 py-1.5 text-xs text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="all">All Patterns</option>
          {PATTERN_TYPES.map((pt) => (
            <option key={pt} value={pt}>
              {PATTERN_LABELS[pt]} {patternCounts[pt] ? `(${patternCounts[pt]})` : ""}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortMode)}
          className="rounded-lg border border-border bg-bg-secondary px-2 py-1.5 text-xs text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="conviction">Sort: Conviction</option>
          <option value="potential">Sort: Potential %</option>
          <option value="rr">Sort: Risk:Reward</option>
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {visible.map((p) => (
              <PatternCard key={`${p.ticker}-${p.pattern}`} pattern={p} />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                className="rounded-lg border border-border px-6 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
              >
                Show More ({filtered.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-bg-secondary/50 p-12 text-center">
          <Shapes className="mx-auto mb-3 h-10 w-10 text-text-muted/30" />
          <p className="text-sm font-medium text-text-primary">
            No {filter === "all" ? "" : filter + " "}patterns found
            {patternFilter !== "all" ? ` matching "${PATTERN_LABELS[patternFilter]}"` : ""}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {filter === "watchlist"
              ? "No patterns detected in your watchlist stocks"
              : "Try changing the filter or pattern type. Patterns form over 20-60 days and aren't always present."}
          </p>
        </div>
      )}

      {/* Disclaimer */}
      {filtered.length > 0 && (
        <p className="text-center text-[10px] text-text-muted">
          Chart patterns are probabilistic, not predictive. They represent historical tendencies,
          not guarantees. Always combine with other analysis and manage risk appropriately.
        </p>
      )}
    </div>
  );
}
