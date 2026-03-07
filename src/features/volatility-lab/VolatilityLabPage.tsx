import { useState, useMemo, useEffect } from "react";
import { useQueries } from "@tanstack/react-query";
import { Gauge, Info, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/api/client";
import { IndicatorHistoryRowSchema } from "@/api/types/indicator";
import { useScreener } from "@/api/hooks/useScreener";
import { useWatchlist } from "@/hooks/useWatchlist";
import { STALE_STABLE } from "@/api/queryConfig";
import { Skeleton } from "@/components/ui/Skeleton";
import { z } from "zod";
import {
  analyzeWidthHistory,
  volRegime,
  squeezeColor,
} from "./lib/squeeze-engine";
import type { SqueezeStock, WidthAnalysis } from "./lib/squeeze-engine";
import { SqueezeTable } from "./components/SqueezeTable";
import { SqueezeDetail } from "./components/SqueezeDetail";

type FilterMode = "all" | "watchlist" | "squeeze" | "fired";

export function VolatilityLabPage() {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [guideOpen, setGuideOpen] = useState(false);
  const { watchlist } = useWatchlist();

  // Fetch all indicator-populated stocks (same pattern as Trade Ideas / RS Rankings)
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

  // Fetch BB Width history (120 days) for each stock
  const bbWidthQueries = useQueries({
    queries: tickers.map((ticker) => ({
      queryKey: ["indicator-history", ticker, "BBANDS_WIDTH", { limit: 120 }],
      queryFn: async () => {
        const { data } = await api.get(`/indicators/${ticker}/history`, {
          params: { indicator: "BBANDS_WIDTH", limit: 120 },
        });
        return { ticker, rows: z.array(IndicatorHistoryRowSchema).parse(data) };
      },
      staleTime: STALE_STABLE,
      enabled: tickers.length > 0,
    })),
  });

  const allLoaded = bbWidthQueries.every((q) => q.isSuccess);
  const isLoading = loadA || loadB || bbWidthQueries.some((q) => q.isLoading);

  // Build analysis map
  const analysisMap = useMemo(() => {
    if (!allLoaded) return new Map<string, WidthAnalysis>();
    const map = new Map<string, WidthAnalysis>();
    for (const q of bbWidthQueries) {
      if (q.data) {
        map.set(q.data.ticker, analyzeWidthHistory(q.data.rows));
      }
    }
    return map;
  }, [allLoaded, bbWidthQueries]);

  // Build SqueezeStock[]
  const squeezeStocks: SqueezeStock[] = useMemo(() => {
    if (analysisMap.size === 0) return [];
    return screenerStocks
      .map((s) => {
        const analysis = analysisMap.get(s.ticker);
        if (!analysis || analysis.history.length === 0) return null;
        return {
          ticker: s.ticker,
          name: s.name,
          sector: s.sector,
          close: s.close,
          changePct: s.change_pct,
          rsi: s.rsi_14 ?? 50,
          bbPctb: s.bb_pctb ?? 0.5,
          bbWidth: analysis.currentWidth,
          bbWidthAvg: analysis.avgWidth,
          bbWidthPercentile: analysis.percentile,
          inSqueeze: analysis.inSqueeze,
          squeezeDays: analysis.squeezeDays,
          fired: analysis.fired,
        } as SqueezeStock;
      })
      .filter(Boolean) as SqueezeStock[];
  }, [analysisMap, screenerStocks]);

  // Filter
  const filteredStocks = useMemo(() => {
    switch (filter) {
      case "watchlist":
        return squeezeStocks.filter((s) => watchlist.includes(s.ticker));
      case "squeeze":
        return squeezeStocks.filter((s) => s.inSqueeze);
      case "fired":
        return squeezeStocks.filter((s) => s.fired);
      default:
        return squeezeStocks;
    }
  }, [squeezeStocks, filter, watchlist]);

  // Auto-select tightest squeeze when data loads or filter changes
  useEffect(() => {
    if (filteredStocks.length === 0) return;
    const current = filteredStocks.find((s) => s.ticker === selectedTicker);
    if (!current) {
      const sorted = [...filteredStocks].sort(
        (a, b) => a.bbWidthPercentile - b.bbWidthPercentile,
      );
      setSelectedTicker(sorted[0].ticker);
    }
  }, [filteredStocks, selectedTicker]);

  // Selected stock + analysis
  const selectedStock = squeezeStocks.find((s) => s.ticker === selectedTicker) ?? null;
  const selectedAnalysis = selectedTicker ? analysisMap.get(selectedTicker) ?? null : null;

  // Summary stats
  const regime = useMemo(() => volRegime(squeezeStocks), [squeezeStocks]);
  const inSqueezeCount = squeezeStocks.filter((s) => s.inSqueeze).length;
  const firedCount = squeezeStocks.filter((s) => s.fired).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <Gauge className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Volatility Lab</h1>
            <p className="text-sm text-text-muted">
              Find the next big move before it happens
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
          <h3 className="mb-2 font-semibold text-text-primary">How the Squeeze Scanner Works</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 font-medium text-text-primary">Bollinger Band Squeeze</p>
              <p>
                When BB width contracts to historical lows, volatility is compressed like a coiled
                spring. A big move is imminent &mdash; we just don&rsquo;t know which direction yet.
              </p>
            </div>
            <div>
              <p className="mb-1 font-medium text-text-primary">Squeeze Percentile</p>
              <p>
                Ranks current BB width against the last 6 months. Lower = tighter squeeze. Stocks
                below the 20th percentile are &ldquo;in squeeze.&rdquo;
              </p>
            </div>
            <div>
              <p className="mb-1 font-medium text-text-primary">Squeeze Fired!</p>
              <p>
                When a stock exits a squeeze (BB width starts expanding), it signals the move has
                begun. Watch the direction of the first candle after firing.
              </p>
            </div>
            <div>
              <p className="mb-1 font-medium text-text-primary">Track Record</p>
              <p>
                Click any stock to see its squeeze history &mdash; how many squeezes occurred, what
                % resolved upward, and the average move size after each squeeze.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-bg-secondary p-3">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Stocks Scanned</p>
          <p className="mt-1 text-xl font-bold text-text-primary">
            {isLoading ? "\u2014" : squeezeStocks.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-3">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">In Squeeze</p>
          <p className="mt-1 text-xl font-bold text-green">
            {isLoading ? "\u2014" : inSqueezeCount}
          </p>
          {!isLoading && squeezeStocks.length > 0 && (
            <p className="text-[10px] text-text-muted">
              {Math.round((inSqueezeCount / squeezeStocks.length) * 100)}% of universe
            </p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-3">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Fired Today</p>
          <p className="mt-1 text-xl font-bold text-orange-400">
            {isLoading ? "\u2014" : firedCount}
          </p>
        </div>
        <div
          className="rounded-xl border p-3"
          style={{ borderColor: regime.color + "40", backgroundColor: regime.color + "08" }}
        >
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Vol Regime</p>
          <p className="mt-1 text-xl font-bold" style={{ color: regime.color }}>
            {isLoading ? "\u2014" : regime.label}
          </p>
          {!isLoading && <p className="text-[10px] text-text-muted">{regime.desc}</p>}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: "all" as FilterMode, label: "All Stocks" },
            { key: "watchlist" as FilterMode, label: "My Watchlist" },
            { key: "squeeze" as FilterMode, label: "In Squeeze" },
            { key: "fired" as FilterMode, label: "Fired!" },
          ] as const
        ).map((tab) => {
          const count =
            tab.key === "all"
              ? squeezeStocks.length
              : tab.key === "watchlist"
                ? squeezeStocks.filter((s) => watchlist.includes(s.ticker)).length
                : tab.key === "squeeze"
                  ? inSqueezeCount
                  : firedCount;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === tab.key
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-text-muted hover:text-text-primary hover:bg-bg-hover"
              }`}
            >
              {tab.label}
              <span className={`ml-1 ${filter === tab.key ? "opacity-80" : "opacity-50"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Scanner Table */}
          <div className="lg:col-span-2 lg:sticky lg:top-6 lg:self-start">
            <SqueezeTable
              stocks={filteredStocks}
              selected={selectedTicker}
              onSelect={setSelectedTicker}
            />
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-3">
            {selectedStock && selectedAnalysis ? (
              <SqueezeDetail
                key={selectedStock.ticker}
                stock={selectedStock}
                history={selectedAnalysis.history}
                threshold={selectedAnalysis.threshold}
              />
            ) : (
              <div className="flex h-[400px] items-center justify-center rounded-2xl border border-dashed border-border bg-bg-secondary/50">
                <div className="text-center">
                  <Gauge className="mx-auto mb-3 h-10 w-10 text-text-muted/30" />
                  <p className="text-sm font-medium text-text-primary">Select a stock</p>
                  <p className="mt-1 text-xs text-text-muted">
                    Click any stock to see squeeze analysis
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      {squeezeStocks.length > 0 && (
        <p className="text-center text-[10px] text-text-muted">
          Squeeze detection is based on Bollinger Band width percentile and is not financial advice.
          Squeezes can resolve in either direction. Always manage risk appropriately.
        </p>
      )}
    </div>
  );
}
