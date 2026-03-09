import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Info,
  ChevronDown,
  ChevronUp,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Dna,
  ClipboardList,
  Star,
  X,
} from "lucide-react";
import { useScreener } from "@/api/hooks/useScreener";
import { useChartData } from "@/api/hooks/usePrices";
import { useWatchlist } from "@/hooks/useWatchlist";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  computeRsScores,
  computeRsLine,
  computeSectorRs,
  rsScoreColor,
  rsScoreLabel,
} from "./lib/rs-engine";
import { RsLeaderboard } from "./components/RsLeaderboard";
import { RsLineChart } from "./components/RsLineChart";
import { SectorRsBar } from "./components/SectorRsBar";

type FilterTab = "all" | "leaders" | "rising" | "laggards";

export function RelativeStrengthPage() {
  const [guideOpen, setGuideOpen] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const { watchlist, add: addToWatchlist, remove: removeFromWatchlist } = useWatchlist();

  // Fetch stocks with indicator data: above SMA-200 + below SMA-200 = all with computed indicators
  const { data: dataAbove, isLoading: loadA } = useScreener({ limit: 200, above_sma200: true, sort_by: "ticker" });
  const { data: dataBelow, isLoading: loadB } = useScreener({ limit: 200, above_sma200: false, sort_by: "ticker" });
  const isLoading = loadA || loadB;
  const screenerData = useMemo(() => {
    if (!dataAbove || !dataBelow) return undefined;
    const map = new Map<string, (typeof dataAbove)[number]>();
    for (const s of [...dataAbove, ...dataBelow]) map.set(s.ticker, s);
    return [...map.values()];
  }, [dataAbove, dataBelow]);

  // Fetch chart data for selected stock
  const { data: chartData, isLoading: chartLoading } = useChartData(
    selectedTicker ?? "",
    { limit: 130 },
  );

  // Compute RS scores
  const allRsStocks = useMemo(
    () => (screenerData ? computeRsScores(screenerData) : []),
    [screenerData],
  );

  const sectors = useMemo(
    () => [...new Set(allRsStocks.map((s) => s.sector))].sort(),
    [allRsStocks],
  );

  const sectorRs = useMemo(() => computeSectorRs(allRsStocks), [allRsStocks]);

  // Filter and search
  const filtered = useMemo(() => {
    let stocks = allRsStocks;

    if (filter === "leaders") stocks = stocks.filter((s) => s.rsScore >= 80);
    else if (filter === "rising") stocks = stocks.filter((s) => s.rsScore >= 50);
    else if (filter === "laggards") stocks = stocks.filter((s) => s.rsScore <= 20);

    if (sectorFilter) stocks = stocks.filter((s) => s.sector === sectorFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      stocks = stocks.filter(
        (s) =>
          s.ticker.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q),
      );
    }

    return stocks;
  }, [allRsStocks, filter, sectorFilter, search]);

  // Summary stats
  const leaders = allRsStocks.filter((s) => s.rsScore >= 80).length;
  const improving = allRsStocks.filter((s) => s.trend === "improving").length;
  const declining = allRsStocks.filter((s) => s.trend === "declining").length;

  // RS line for selected stock
  const rsLine = useMemo(
    () => (chartData ? computeRsLine(chartData) : []),
    [chartData],
  );

  const selectedStock = allRsStocks.find((s) => s.ticker === selectedTicker);
  const isInWatchlist = selectedTicker ? watchlist.includes(selectedTicker) : false;

  const handleSelect = useCallback((ticker: string) => {
    setSelectedTicker((prev) => (prev === ticker ? null : ticker));
  }, []);

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: allRsStocks.length },
    { key: "leaders", label: "Leaders", count: leaders },
    { key: "rising", label: "Rising", count: allRsStocks.filter((s) => s.rsScore >= 50).length },
    { key: "laggards", label: "Laggards", count: allRsStocks.filter((s) => s.rsScore <= 20).length },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <Trophy className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary sm:text-2xl">
              Relative Strength Rankings
            </h1>
            <p className="text-sm text-text-muted">
              S&P 500 stocks ranked 1-99 by momentum vs. the market
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setGuideOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-xs text-text-secondary transition-colors hover:bg-bg-hover"
        >
          <Info className="h-3.5 w-3.5" />
          How It Works
          {guideOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Guide */}
      {guideOpen && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm text-text-secondary">
          <h3 className="mb-2 font-semibold text-text-primary">How RS Rankings Work</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 font-medium text-text-primary">RS Score (1-99)</p>
              <p>
                Composite ranking based on price distance from SMA-200 (45%), SMA-50 (35%), and RSI momentum (20%).
                A score of 90 means the stock is outperforming 90% of stocks in the sample.
              </p>
            </div>
            <div>
              <p className="mb-1 font-medium text-text-primary">RS Line</p>
              <p>
                Price divided by its 200-day moving average over time. Above 1.0 = outperforming long-term trend.
                A rising RS Line confirms improving relative strength.
              </p>
            </div>
            <div>
              <p className="mb-1 font-medium text-text-primary">Trend Classification</p>
              <p>
                Improving = above SMA-50 and outperforming today. Declining = below SMA-50 and underperforming.
                Focus on leaders with improving trends for momentum entries.
              </p>
            </div>
            <div>
              <p className="mb-1 font-medium text-text-primary">Pro Tip</p>
              <p>
                Buy stocks with RS &gt; 80 pulling back to their SMA-50. Avoid stocks with RS &lt; 20 — weakness breeds more weakness.
                This is how O&rsquo;Neil, Minervini, and IBD find winners.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-bg-secondary p-3 text-center">
            <p className="text-2xl font-bold text-green">{leaders}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Leaders (RS &gt; 80)
            </p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-3 text-center">
            <p className="text-2xl font-bold text-green">{improving}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Improving
            </p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-3 text-center">
            <p className="text-2xl font-bold text-red">{declining}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Declining
            </p>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Tabs */}
        <div className="flex rounded-lg border border-border bg-bg-secondary">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                filter === tab.key
                  ? "bg-accent text-white"
                  : "text-text-muted hover:text-text-primary"
              } ${tab.key === "all" ? "rounded-l-lg" : ""} ${tab.key === "laggards" ? "rounded-r-lg" : ""}`}
            >
              {tab.label}
              <span className="ml-1 opacity-60">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Sector dropdown */}
        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          className="rounded-lg border border-border bg-bg-secondary px-2 py-2 text-xs text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">All Sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-[200px]">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border border-border bg-bg-secondary py-1.5 pl-7 pr-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <span className="ml-auto text-[11px] text-text-muted">
          {filtered.length} of {allRsStocks.length} stocks
        </span>
      </div>

      {/* Main content: Leaderboard + Detail */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Leaderboard */}
        <div className="overflow-hidden rounded-2xl border border-border bg-bg-secondary">
          {isLoading ? (
            <div className="space-y-1 p-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <RsLeaderboard
              stocks={filtered}
              selectedTicker={selectedTicker}
              onSelect={handleSelect}
            />
          ) : (
            <div className="py-12 text-center text-sm text-text-muted">
              No stocks match your filters
            </div>
          )}
        </div>

        {/* Detail / Sector Panel */}
        <div className="space-y-4">
          {/* Stock detail */}
          {selectedStock ? (
            <div className="rounded-2xl border border-border bg-bg-secondary p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Link to={`/ticker/${selectedStock.ticker}`} className="text-lg font-bold text-accent hover:underline">
                      {selectedStock.ticker}
                    </Link>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor: rsScoreColor(selectedStock.rsScore) + "20",
                        color: rsScoreColor(selectedStock.rsScore),
                      }}
                    >
                      RS {selectedStock.rsScore} — {rsScoreLabel(selectedStock.rsScore)}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">{selectedStock.name}</p>
                </div>
                <button type="button" onClick={() => setSelectedTicker(null)} className="rounded p-1 hover:bg-bg-hover">
                  <X className="h-4 w-4 text-text-muted" />
                </button>
              </div>

              {/* RS Line Chart */}
              <div className="mb-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  RS Line (Price / SMA-200)
                </p>
                {chartLoading ? (
                  <Skeleton className="h-[200px]" />
                ) : rsLine.length > 0 ? (
                  <RsLineChart data={rsLine} ticker={selectedStock.ticker} />
                ) : (
                  <div className="flex h-[200px] items-center justify-center text-xs text-text-muted">
                    No chart data
                  </div>
                )}
              </div>

              {/* Key stats */}
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-bg-primary p-2">
                  <p className="text-[10px] text-text-muted">Price/SMA-50</p>
                  <p className={`text-sm font-bold ${selectedStock.ratio50 >= 0 ? "text-green" : "text-red"}`}>
                    {selectedStock.ratio50 >= 0 ? "+" : ""}{(selectedStock.ratio50 * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-lg bg-bg-primary p-2">
                  <p className="text-[10px] text-text-muted">Price/SMA-200</p>
                  <p className={`text-sm font-bold ${selectedStock.ratio200 >= 0 ? "text-green" : "text-red"}`}>
                    {selectedStock.ratio200 >= 0 ? "+" : ""}{(selectedStock.ratio200 * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-lg bg-bg-primary p-2">
                  <p className="text-[10px] text-text-muted">RSI</p>
                  <p className={`text-sm font-bold ${selectedStock.rsi < 30 ? "text-green" : selectedStock.rsi > 70 ? "text-red" : "text-text-primary"}`}>
                    {selectedStock.rsi.toFixed(0)}
                  </p>
                </div>
                <div className="rounded-lg bg-bg-primary p-2">
                  <p className="text-[10px] text-text-muted">Trend</p>
                  <p className="flex items-center gap-1 text-sm font-bold">
                    {selectedStock.trend === "improving" ? (
                      <><TrendingUp className="h-3.5 w-3.5 text-green" /><span className="text-green">Up</span></>
                    ) : selectedStock.trend === "declining" ? (
                      <><TrendingDown className="h-3.5 w-3.5 text-red" /><span className="text-red">Down</span></>
                    ) : (
                      <><Minus className="h-3.5 w-3.5 text-text-muted" /><span className="text-text-muted">Flat</span></>
                    )}
                  </p>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/dna/${selectedStock.ticker}`}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                >
                  <Dna className="h-3 w-3" />
                  Stock DNA
                </Link>
                <Link
                  to={`/planner?ticker=${selectedStock.ticker}`}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                >
                  <ClipboardList className="h-3 w-3" />
                  Plan Trade
                </Link>
                <button
                  type="button"
                  onClick={() => isInWatchlist ? removeFromWatchlist(selectedStock.ticker) : addToWatchlist(selectedStock.ticker)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs transition-colors ${
                    isInWatchlist
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  }`}
                >
                  <Star className={`h-4 w-4 ${isInWatchlist ? "fill-accent" : ""}`} />
                  {isInWatchlist ? "Watching" : "Watch"}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-bg-secondary/50 p-6 text-center">
              <Trophy className="mx-auto mb-2 h-8 w-8 text-text-muted/40" />
              <p className="text-sm text-text-muted">
                Click a stock to see its RS Line chart and detailed analysis
              </p>
            </div>
          )}

          {/* Sector RS Rankings */}
          <div className="rounded-2xl border border-border bg-bg-secondary p-4">
            <h3 className="mb-3 text-sm font-semibold text-text-primary">Sector RS Rankings</h3>
            <p className="mb-3 text-[10px] text-text-muted">Average RS score by sector</p>
            {sectorRs.length > 0 ? (
              <SectorRsBar sectors={sectorRs} />
            ) : (
              <Skeleton className="h-40" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
