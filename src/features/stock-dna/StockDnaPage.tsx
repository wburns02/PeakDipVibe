import { useState, useMemo, useCallback, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useLatestIndicators, useIndicatorHistory } from "@/api/hooks/useIndicators";
import { useTicker, useTickerList } from "@/api/hooks/useTickers";
import { usePriceHistory } from "@/api/hooks/usePrices";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useDebounce } from "@/hooks/useDebounce";
import { computeConfluence } from "./lib/confluence";
import { ConfluenceGauge } from "./components/ConfluenceGauge";
import { TimeframeMatrix } from "./components/TimeframeMatrix";
import { SignalBreakdown } from "./components/SignalBreakdown";
import { RiskCard } from "./components/RiskCard";
import { ScoreHistory } from "./components/ScoreHistory";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Dna,
  Search,
  Star,
  BarChart3,
  PlayCircle,
  ExternalLink,
  Lightbulb,
  ArrowRight,
  X,
} from "lucide-react";

const POPULAR_TICKERS = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "JPM"];

export function StockDnaPage() {
  usePageTitle("Stock DNA");

  const { symbol } = useParams<{ symbol?: string }>();
  const [ticker, setTicker] = useState(symbol?.toUpperCase() || "AAPL");

  useEffect(() => {
    if (symbol) setTicker(symbol.toUpperCase());
  }, [symbol]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 200);
  const { data: searchResults } = useTickerList(debouncedSearch.length >= 1 ? debouncedSearch : undefined);
  const { toggle, isWatched } = useWatchlist();

  // Fetch data
  const { data: tickerInfo } = useTicker(ticker);
  const { data: indicators, isLoading: indLoading } = useLatestIndicators(ticker);
  const { data: priceData } = usePriceHistory(ticker, { limit: 60 });

  // Historical data for score trend
  const { data: rsiHistory } = useIndicatorHistory(ticker, "RSI_14", { limit: 60 });
  const { data: macdHistory } = useIndicatorHistory(ticker, "MACD", { limit: 60 });
  const { data: sma50History } = useIndicatorHistory(ticker, "SMA_50", { limit: 60 });

  const actualPrice = priceData?.[0]?.close ?? tickerInfo?.latest_close ?? 0;

  const confluence = useMemo(() => {
    if (!indicators?.indicators || !actualPrice) return null;
    return computeConfluence(indicators.indicators, actualPrice);
  }, [indicators, actualPrice]);

  const priceHistoryForChart = useMemo(() => {
    if (!priceData) return [];
    return priceData
      .filter((p) => p.close != null)
      .map((p) => ({ date: p.date, close: p.close as number }))
      .reverse();
  }, [priceData]);

  const selectTicker = useCallback((t: string) => {
    setTicker(t.toUpperCase());
    setSearchQuery("");
    setShowSearch(false);
  }, []);

  const loading = indLoading || !confluence;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <Dna className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Stock DNA</h1>
            <p className="text-sm text-text-muted">
              Multi-indicator confluence analysis &mdash; one score, clear verdict
            </p>
          </div>
        </div>
      </div>

      {/* Ticker search */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={showSearch ? searchQuery : ticker}
              onChange={(e) => {
                setSearchQuery(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ""));
                setShowSearch(true);
              }}
              onFocus={() => {
                setShowSearch(true);
                setSearchQuery("");
              }}
              placeholder="Search ticker or company..."
              className="w-full rounded-xl border border-border bg-bg-secondary py-2.5 pl-10 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
            {showSearch && (
              <button
                type="button"
                onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search dropdown */}
        {showSearch && (
          <div className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-bg-secondary shadow-xl">
            {!searchQuery && (
              <div className="p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Popular</p>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_TICKERS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => selectTicker(t)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        t === ticker
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-bg-primary text-text-secondary hover:border-accent/30 hover:text-accent"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {searchQuery && searchResults && searchResults.length > 0 && (
              <div className="py-1">
                {searchResults.slice(0, 8).map((r) => (
                  <button
                    key={r.ticker}
                    type="button"
                    onClick={() => selectTicker(r.ticker)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-bg-hover"
                  >
                    <span className="font-semibold text-sm text-accent">{r.ticker}</span>
                    <span className="truncate text-xs text-text-muted">{r.name}</span>
                    <span className="ml-auto text-[10px] text-text-muted">{r.sector}</span>
                  </button>
                ))}
              </div>
            )}
            {searchQuery && searchResults && searchResults.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-text-muted">
                No results for &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stock info bar */}
      {tickerInfo && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-text-primary">{ticker}</span>
            {tickerInfo.name && (
              <span className="text-sm text-text-muted">{tickerInfo.name}</span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {actualPrice > 0 && (
              <span className="font-mono text-lg font-bold text-text-primary">
                ${actualPrice.toFixed(2)}
              </span>
            )}
            <button
              type="button"
              onClick={() => toggle(ticker)}
              className={`rounded-lg p-2 transition-colors ${
                isWatched(ticker)
                  ? "bg-amber/10 text-amber"
                  : "bg-bg-secondary text-text-muted hover:bg-bg-hover hover:text-text-primary"
              }`}
              title={isWatched(ticker) ? "Remove from watchlist" : "Add to watchlist"}
            >
              <Star className={`h-4 w-4 ${isWatched(ticker) ? "fill-current" : ""}`} />
            </button>
            <Link
              to={`/ticker/${ticker}`}
              className="rounded-lg bg-bg-secondary p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-accent"
              title="Full detail page"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          <div className="flex justify-center"><Skeleton className="h-56 w-56 rounded-full" /></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" />
          </div>
          <Skeleton className="h-48" />
        </div>
      )}

      {/* Analysis results */}
      {!loading && confluence && (
        <>
          {/* Gauge + Reasoning */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-bg-card p-6">
              <ConfluenceGauge
                score={confluence.score}
                verdict={confluence.verdict}
                verdictColor={confluence.verdictColor}
              />
            </div>

            {/* What's the Play? */}
            <div className="rounded-2xl border border-border bg-bg-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber" />
                <h3 className="text-sm font-semibold text-text-primary">What&apos;s the Play?</h3>
              </div>
              <p
                className="text-2xl font-bold"
                style={{ color: confluence.verdictColor }}
              >
                {confluence.verdict}
              </p>
              <div className="space-y-2">
                {confluence.reasoning.map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    <p className="text-sm leading-relaxed text-text-secondary">{r}</p>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                <Link
                  to={`/compare?tickers=${ticker}`}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent/30 hover:text-accent"
                >
                  <BarChart3 className="h-3 w-3" />
                  Compare
                </Link>
                <Link
                  to={`/simulator`}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent/30 hover:text-accent"
                >
                  <PlayCircle className="h-3 w-3" />
                  Simulate
                </Link>
                <button
                  type="button"
                  onClick={() => toggle(ticker)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isWatched(ticker)
                      ? "border-amber/30 bg-amber/5 text-amber"
                      : "border-border bg-bg-secondary text-text-secondary hover:border-amber/30 hover:text-amber"
                  }`}
                >
                  <Star className={`h-4 w-4 ${isWatched(ticker) ? "fill-current" : ""}`} />
                  {isWatched(ticker) ? "Watched" : "Watch"}
                </button>
              </div>
            </div>
          </div>

          {/* Timeframe Matrix */}
          <TimeframeMatrix
            shortTerm={confluence.shortTerm}
            mediumTerm={confluence.mediumTerm}
            longTerm={confluence.longTerm}
          />

          {/* Risk + Score History */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RiskCard risk={confluence.risk} price={actualPrice} />
            {rsiHistory && macdHistory && sma50History && priceHistoryForChart.length > 0 && (
              <ScoreHistory
                rsiHistory={rsiHistory}
                macdHistory={macdHistory}
                sma50History={sma50History}
                priceHistory={priceHistoryForChart}
              />
            )}
          </div>

          {/* Signal Breakdown */}
          <SignalBreakdown signals={confluence.signals} />
        </>
      )}
    </div>
  );
}
