import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  useIntradaySimulation,
  useEventLibrary,
  useRandomEvent,
  useEventAnalysis,
} from "@/api/hooks/useEarnings";
import { useSectors } from "@/api/hooks/useMarket";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card } from "@/components/ui/Card";
import type { LibraryEvent, IntradayBar } from "@/api/types/earnings";
import { getCatalystConfig } from "@/lib/catalystTypes";
import {
  Shuffle,
  Search,
  Play,
  Pause,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  DollarSign,
  ShoppingCart,
  BarChart3,
  Trophy,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Auto-play advances one bar every 1.5s — fast enough to feel dynamic, slow enough to read */
const AUTO_PLAY_INTERVAL_MS = 1500;

// ─── Types ──────────────────────────────────────────────────────────────────

interface Trade {
  type: "buy" | "sell";
  price: number;
  shares: number;
  barIndex: number;
  datetime: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(dt: string): string {
  // "2026-02-25T10:30:00" → "10:30 AM"
  const match = dt.match(/T(\d{2}):(\d{2})/);
  if (!match) return dt;
  const h = parseInt(match[1]);
  const m = match[2];
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
}

function formatDate(dt: string): string {
  // "2026-02-25T10:30:00" → "Feb 25"
  const d = dt.split("T")[0];
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

function formatDayLabel(dt: string, signalDate: string): string {
  const barDate = dt.split("T")[0];
  if (barDate < signalDate) return "Day -1";
  if (barDate === signalDate) return "Day 0";
  // Count trading days (approximate)
  const sig = new Date(signalDate + "T12:00:00");
  const bar = new Date(barDate + "T12:00:00");
  const diff = Math.round((bar.getTime() - sig.getTime()) / (1000 * 60 * 60 * 24));
  return `Day ${diff}`;
}

function fmtCurrency(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function SimulatorPage() {
  usePageTitle("Trading Simulator");
  const [searchParams, setSearchParams] = useSearchParams();
  const ticker = searchParams.get("ticker") || "";
  const signalDate = searchParams.get("date") || "";

  const [mode, setMode] = useState<"browse" | "replay">(
    ticker && signalDate ? "replay" : "browse",
  );

  // Event browser state
  const [filters, setFilters] = useState<{
    gap_size?: string;
    sector?: string;
    outcome?: string;
    ticker?: string;
    page: number;
  }>({ page: 1 });
  const [searchInput, setSearchInput] = useState("");

  const { data: library, isLoading: libraryLoading } = useEventLibrary({
    ...filters,
    per_page: 12,
  });

  const { refetch: fetchRandom, isFetching: randomLoading } = useRandomEvent();
  const { data: sectors } = useSectors();

  // Replay state
  const [activeTicker, setActiveTicker] = useState(ticker);
  const [activeDate, setActiveDate] = useState(signalDate);
  const [barInterval, setBarInterval] = useState<"15m" | "30m" | "60m">("60m");
  const [simDays] = useState(5);

  // Portfolio state
  const [startingCash, setStartingCash] = useState(5000);
  const [cash, setCash] = useState(5000);
  const [shares, setShares] = useState(0);
  const [avgCost, setAvgCost] = useState(0);
  const [trades, setTrades] = useState<Trade[]>([]);

  // Playback state
  const [currentBarIndex, setCurrentBarIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [finished, setFinished] = useState(false);
  const autoPlayRef = useRef(false);

  const { data: intradaySim, isLoading: simLoading } = useIntradaySimulation(
    activeTicker,
    activeDate,
    barInterval,
    simDays,
  );

  const { data: analysis } = useEventAnalysis(activeTicker, activeDate);

  const [analysisExpanded, setAnalysisExpanded] = useState(false);

  const bars = intradaySim?.bars ?? [];
  const totalBars = bars.length;

  // Auto-play timer
  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);

  useEffect(() => {
    if (!autoPlay || totalBars === 0) return;
    const timer = setInterval(() => {
      if (!autoPlayRef.current) return;
      setCurrentBarIndex((prev) => {
        if (prev >= totalBars - 1) {
          setAutoPlay(false);
          setFinished(true);
          return prev;
        }
        return prev + 1;
      });
    }, AUTO_PLAY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [autoPlay, totalBars]);

  // Keyboard shortcuts (only active in replay mode)
  useEffect(() => {
    if (mode !== "replay" || totalBars === 0) return;
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          setAutoPlay((prev) => !prev);
          break;
        case "ArrowRight":
          e.preventDefault();
          if (currentBarIndex < totalBars - 1) {
            setCurrentBarIndex((i) => Math.min(totalBars - 1, i + 1));
          } else {
            setFinished(true);
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          setCurrentBarIndex((i) => Math.max(0, i - 1));
          setFinished(false);
          break;
        case "b":
        case "B":
          handleBuy();
          break;
        case "s":
        case "S":
          handleSell();
          break;
        case "r":
        case "R":
          resetSim();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, totalBars, currentBarIndex]);

  const selectEvent = useCallback(
    (t: string, d: string) => {
      setActiveTicker(t);
      setActiveDate(d);
      setCurrentBarIndex(0);
      setAutoPlay(false);
      setFinished(false);
      setCash(startingCash);
      setShares(0);
      setAvgCost(0);
      setTrades([]);
      setMode("replay");
      setSearchParams({ ticker: t, date: d });
    },
    [setSearchParams, startingCash],
  );

  const handleSurpriseMe = useCallback(async () => {
    const result = await fetchRandom();
    if (result.data) {
      selectEvent(result.data.ticker, result.data.signal_date);
    }
  }, [fetchRandom, selectEvent]);

  const handleSearch = () => {
    if (searchInput.trim()) {
      setFilters((f) => ({ ...f, ticker: searchInput.trim(), page: 1 }));
    } else {
      setFilters((f) => {
        const { ticker: _, ...rest } = f;
        return { ...rest, page: 1 };
      });
    }
  };

  const goBack = () => {
    setMode("browse");
    setActiveTicker("");
    setActiveDate("");
    setAutoPlay(false);
    setFinished(false);
    setSearchParams({});
  };

  const resetSim = () => {
    setCurrentBarIndex(0);
    setAutoPlay(false);
    setFinished(false);
    setCash(startingCash);
    setShares(0);
    setAvgCost(0);
    setTrades([]);
  };

  const changeStartingCash = (amount: number) => {
    setStartingCash(amount);
    setCash(amount);
    setShares(0);
    setAvgCost(0);
    setTrades([]);
    setCurrentBarIndex(0);
    setAutoPlay(false);
    setFinished(false);
  };

  // Current bar
  const currentBar: IntradayBar | null = bars[currentBarIndex] ?? null;
  const currentPrice = currentBar?.close ?? 0;

  // Portfolio value
  const portfolioValue = cash + shares * currentPrice;
  const pnl = portfolioValue - startingCash;
  const pnlPct = startingCash > 0 ? (pnl / startingCash) * 100 : 0;

  // Buy handler
  const handleBuy = () => {
    if (cash <= 0 || currentPrice <= 0) return;
    const sharesToBuy = Math.floor(cash / currentPrice);
    if (sharesToBuy <= 0) return;
    const cost = sharesToBuy * currentPrice;
    const newTotalShares = shares + sharesToBuy;
    const newAvgCost =
      shares > 0
        ? (avgCost * shares + cost) / newTotalShares
        : currentPrice;
    setCash((c) => c - cost);
    setShares(newTotalShares);
    setAvgCost(newAvgCost);
    setTrades((t) => [
      ...t,
      {
        type: "buy",
        price: currentPrice,
        shares: sharesToBuy,
        barIndex: currentBarIndex,
        datetime: currentBar?.datetime ?? "",
      },
    ]);
  };

  // Sell handler
  const handleSell = () => {
    if (shares <= 0 || currentPrice <= 0) return;
    const proceeds = shares * currentPrice;
    setCash((c) => c + proceeds);
    setTrades((t) => [
      ...t,
      {
        type: "sell",
        price: currentPrice,
        shares,
        barIndex: currentBarIndex,
        datetime: currentBar?.datetime ?? "",
      },
    ]);
    setShares(0);
    setAvgCost(0);
  };

  // Step handlers
  const stepBack = () => {
    setCurrentBarIndex((i) => Math.max(0, i - 1));
    setFinished(false);
  };

  const stepForward = () => {
    if (currentBarIndex >= totalBars - 1) {
      setFinished(true);
      return;
    }
    setCurrentBarIndex((i) => Math.min(totalBars - 1, i + 1));
  };

  // Detect day boundaries for reference lines
  const dayBoundaries: number[] = [];
  if (bars.length > 0) {
    let prevDate = bars[0].datetime.split("T")[0];
    for (let i = 1; i < bars.length; i++) {
      const d = bars[i].datetime.split("T")[0];
      if (d !== prevDate) {
        dayBoundaries.push(i);
        prevDate = d;
      }
    }
  }

  // Build chart data (only visible bars up to currentBarIndex)
  const visibleBars = bars.slice(0, currentBarIndex + 1);
  const chartData = visibleBars.map((bar, i) => ({
    idx: i,
    price: bar.close,
    label: formatTime(bar.datetime),
    datetime: bar.datetime,
  }));

  // Trade markers on chart
  const buyMarkers = trades
    .filter((t) => t.type === "buy" && t.barIndex <= currentBarIndex)
    .map((t) => t.barIndex);
  const sellMarkers = trades
    .filter((t) => t.type === "sell" && t.barIndex <= currentBarIndex)
    .map((t) => t.barIndex);

  // Summary stats
  const totalBuys = trades.filter((t) => t.type === "buy").length;
  const totalSells = trades.filter((t) => t.type === "sell").length;
  const bestTrade = trades.reduce(
    (best, t, i) => {
      if (t.type !== "sell") return best;
      // Find matching buy
      const buys = trades.slice(0, i).filter((b) => b.type === "buy");
      if (buys.length === 0) return best;
      const lastBuy = buys[buys.length - 1];
      const profit = (t.price - lastBuy.price) * t.shares;
      if (profit > best.profit) {
        return {
          profit,
          buyPrice: lastBuy.price,
          sellPrice: t.price,
        };
      }
      return best;
    },
    { profit: 0, buyPrice: 0, sellPrice: 0 },
  );

  // ─── BROWSE MODE ──────────────────────────────────────────────────────────

  if (mode === "browse") {
    return (
      <div className="mx-auto max-w-5xl space-y-8 pb-12">
        {/* Hero */}
        <section className="text-center">
          <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">
            Trading Simulator
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-text-muted">
            Pick a real stock event, step through it in 15/30/60-minute
            intervals, and practice buying and selling with virtual money.
          </p>

          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={handleSurpriseMe}
              disabled={randomLoading}
              aria-label="Pick a random stock event to simulate"
              className="flex items-center gap-2 rounded-xl bg-accent px-8 py-4 text-lg font-bold text-white shadow-lg shadow-accent/20 transition-all hover:scale-105 hover:bg-accent/90 disabled:opacity-50"
            >
              <Shuffle className="h-5 w-5" />
              {randomLoading ? "Picking..." : "Surprise Me!"}
            </button>
          </div>

          <p className="mt-2 text-xs text-text-muted">
            Picks a random big stock jump for you to trade
          </p>
        </section>

        {/* Search + Filters */}
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Search by ticker
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) =>
                      setSearchInput(e.target.value.toUpperCase())
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="AAPL, TSLA, NVDA..."
                    className="w-full rounded-lg border border-border bg-bg-secondary py-2 pl-9 pr-3 text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="rounded-lg bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20"
                >
                  Search
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {["Small", "Medium", "Big", "Huge"].map((s) => (
              <button
                key={s}
                aria-pressed={filters.gap_size === s}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    gap_size: f.gap_size === s ? undefined : s,
                    page: 1,
                  }))
                }
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filters.gap_size === s
                    ? "bg-accent text-white"
                    : "bg-bg-hover text-text-secondary hover:bg-bg-hover/80"
                }`}
              >
                {s === "Small"
                  ? "Small (1-3%)"
                  : s === "Medium"
                    ? "Medium (3-5%)"
                    : s === "Big"
                      ? "Big (5-10%)"
                      : "Huge (10%+)"}
              </button>
            ))}

            <span className="mx-1 self-center text-border">|</span>

            {["Bounced", "Faded", "Kept Falling"].map((o) => (
              <button
                key={o}
                aria-pressed={filters.outcome === o}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    outcome: f.outcome === o ? undefined : o,
                    page: 1,
                  }))
                }
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filters.outcome === o
                    ? o === "Bounced"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : o === "Kept Falling"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-amber-500/20 text-amber-400"
                    : "bg-bg-hover text-text-secondary hover:bg-bg-hover/80"
                }`}
              >
                {o}
              </button>
            ))}

            <span className="mx-1 self-center text-border">|</span>

            <select
              value={filters.sector ?? ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  sector: e.target.value || undefined,
                  page: 1,
                }))
              }
              className="rounded-full border border-border bg-bg-hover px-3 py-1 text-xs font-medium text-text-secondary focus:border-accent focus:outline-none"
            >
              <option value="">All Sectors</option>
              {sectors?.map((s) => (
                <option key={s.sector} value={s.sector}>
                  {s.sector}
                </option>
              ))}
            </select>
          </div>

          {/* Enrichment progress */}
          {library && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="h-1.5 rounded-full bg-bg-hover">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{
                      width: `${Math.round(
                        ((library.events.filter((e) => e.has_analysis).length +
                          (filters.page && filters.page > 1 ? (filters.page - 1) * 12 : 0)) /
                          Math.max(library.total, 1)) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <span className="shrink-0 text-[10px] text-text-muted">
                {library.events.filter((e) => e.has_analysis).length > 0
                  ? `${library.events.filter((e) => e.has_analysis).length}/${library.events.length} on this page analyzed`
                  : "Analysis in progress..."}
              </span>
            </div>
          )}
        </Card>

        {/* Event Grid */}
        {libraryLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <div className="h-28 animate-pulse rounded-lg bg-bg-hover" />
              </Card>
            ))}
          </div>
        ) : library && library.events.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">
                {library.total} events found
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {library.events.map((ev) => (
                <EventBrowserCard
                  key={`${ev.ticker}-${ev.signal_date}`}
                  event={ev}
                  onSelect={() => selectEvent(ev.ticker, ev.signal_date)}
                />
              ))}
            </div>

            {library.total_pages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      page: Math.max(1, f.page - 1),
                    }))
                  }
                  disabled={library.page <= 1}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover disabled:opacity-30"
                >
                  Previous
                </button>
                <span className="text-xs text-text-muted">
                  Page {library.page} of {library.total_pages}
                </span>
                <button
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      page: Math.min(library.total_pages, f.page + 1),
                    }))
                  }
                  disabled={library.page >= library.total_pages}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <Card className="text-center">
            <p className="text-sm text-text-muted">
              No events match your filters. Try adjusting them.
            </p>
          </Card>
        )}
      </div>
    );
  }

  // ─── REPLAY / TRADING MODE ────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-12">
      {/* Back button */}
      <button
        onClick={goBack}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        Browse Events
      </button>

      {simLoading && (
        <Card>
          <div className="flex h-60 items-center justify-center" role="status" aria-label="Loading intraday data">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden="true" />
              <p className="mt-3 text-sm text-text-muted">
                Loading intraday data...
              </p>
            </div>
          </div>
        </Card>
      )}

      {intradaySim && !("error" in intradaySim) && (
        <>
          {/* Event Header (compact) */}
          <Card className="border-accent/20 bg-accent/5">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
              <div className="text-center sm:text-left">
                <h2 className="text-lg font-bold text-text-primary">
                  {intradaySim.name || intradaySim.ticker}
                </h2>
                <p className="text-xs text-text-muted">
                  {intradaySim.sector} ·{" "}
                  {new Date(
                    intradaySim.signal_date + "T12:00:00",
                  ).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-emerald-400">
                    +{(intradaySim.gap_up_pct ?? 0).toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-text-muted">Gap Up</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-red-400">
                    -{(intradaySim.selloff_pct ?? 0).toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-text-muted">Selloff</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Analysis Panel (if enriched) */}
          {analysis?.found && (
            <Card className="border-indigo-500/20">
              <button
                onClick={() => setAnalysisExpanded(!analysisExpanded)}
                className="flex w-full items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15">
                    <FileText className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-text-primary">
                        Why It Moved
                      </h3>
                      {analysis.catalyst_type && (() => {
                        const cc = getCatalystConfig(analysis.catalyst_type);
                        const colorMap: Record<string, string> = {
                          green: "bg-green/15 text-green",
                          accent: "bg-accent/15 text-accent",
                          amber: "bg-amber/15 text-amber",
                          red: "bg-red/15 text-red",
                          default: "bg-bg-hover text-text-secondary",
                        };
                        return (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colorMap[cc.variant] ?? colorMap.default}`}>
                            {cc.label}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-text-muted">
                      {analysis.catalyst_headline}
                    </p>
                  </div>
                </div>
                {analysisExpanded ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-text-muted" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" />
                )}
              </button>

              {analysisExpanded && (
                <div className="mt-4 space-y-4">
                  {/* Catalyst Detail */}
                  {analysis.catalyst_detail && (
                    <div>
                      <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
                        <Zap className="h-3 w-3" />
                        What Happened
                      </h4>
                      <p className="text-xs leading-relaxed text-text-secondary">
                        {analysis.catalyst_detail}
                      </p>
                    </div>
                  )}

                  {/* Post-Mortem */}
                  {analysis.post_mortem && (
                    <div>
                      <h4 className="mb-1.5 text-xs font-semibold text-amber-400">
                        Post-Mortem Analysis
                      </h4>
                      <p className="text-xs leading-relaxed text-text-secondary">
                        {analysis.post_mortem}
                      </p>
                    </div>
                  )}

                  {/* Sources */}
                  {analysis.sources && analysis.sources.length > 0 && (
                    <div>
                      <h4 className="mb-1.5 text-xs font-semibold text-text-muted">
                        Sources
                      </h4>
                      <div className="space-y-1">
                        {analysis.sources.map((src, i) => (
                          <a
                            key={i}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[11px] text-accent hover:underline"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            {src.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Portfolio + Controls */}
          <Card>
            {/* Starting Cash Selector */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-text-muted">
                Starting Cash:
              </span>
              {[1000, 5000, 10000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => changeStartingCash(amt)}
                  aria-pressed={startingCash === amt}
                  aria-label={`Set starting cash to ${fmtCurrency(amt)}`}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                    startingCash === amt
                      ? "bg-accent text-white"
                      : "bg-bg-hover text-text-secondary hover:bg-bg-hover/80"
                  }`}
                >
                  {fmtCurrency(amt)}
                </button>
              ))}
            </div>

            {/* Portfolio Display */}
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-bg-hover/50 p-2.5">
                <p className="text-[10px] font-medium text-text-muted">Cash</p>
                <p className="text-sm font-bold text-text-primary">
                  {fmtCurrency(cash)}
                </p>
              </div>
              <div className="rounded-lg bg-bg-hover/50 p-2.5">
                <p className="text-[10px] font-medium text-text-muted">
                  Shares
                </p>
                <p className="text-sm font-bold text-text-primary">{shares}</p>
              </div>
              <div className="rounded-lg bg-bg-hover/50 p-2.5">
                <p className="text-[10px] font-medium text-text-muted">
                  Portfolio
                </p>
                <p className="text-sm font-bold text-text-primary">
                  {fmtCurrency(portfolioValue)}
                </p>
              </div>
              <div className="rounded-lg bg-bg-hover/50 p-2.5">
                <p className="text-[10px] font-medium text-text-muted">P&L</p>
                <p
                  className={`text-sm font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {pnl >= 0 ? "+" : ""}
                  {fmtCurrency(pnl)} ({pnlPct >= 0 ? "+" : ""}
                  {pnlPct.toFixed(1)}%)
                </p>
              </div>
            </div>

            {/* Buy / Sell Buttons */}
            {!finished && (
              <div className="mb-3 flex gap-2">
                <button
                  onClick={handleBuy}
                  disabled={cash < currentPrice || currentPrice <= 0}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600"
                >
                  <ShoppingCart className="h-4 w-4" />
                  BUY at {fmtCurrency(currentPrice)}
                </button>
                <button
                  onClick={handleSell}
                  disabled={shares <= 0}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-500 disabled:opacity-30 disabled:hover:bg-red-600"
                >
                  <DollarSign className="h-4 w-4" />
                  SELL ALL
                </button>
              </div>
            )}

            {/* Interval + Playback Controls */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {/* Interval selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-muted">Interval:</span>
                {(["15m", "30m", "60m"] as const).map((iv) => (
                  <button
                    key={iv}
                    onClick={() => {
                      setBarInterval(iv);
                      resetSim();
                    }}
                    aria-pressed={barInterval === iv}
                    aria-label={`Set interval to ${iv === "15m" ? "15 minutes" : iv === "30m" ? "30 minutes" : "60 minutes"}`}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      barInterval === iv
                        ? "bg-accent text-white"
                        : "bg-bg-hover text-text-secondary hover:bg-bg-hover/80"
                    }`}
                  >
                    {iv === "15m"
                      ? "15 min"
                      : iv === "30m"
                        ? "30 min"
                        : "60 min"}
                  </button>
                ))}
              </div>

              {/* Playback controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={stepBack}
                  disabled={currentBarIndex <= 0}
                  className="rounded-md bg-bg-hover p-1.5 text-text-secondary hover:text-text-primary disabled:opacity-30"
                  title="Back"
                  aria-label="Step back (← key)"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (finished) {
                      resetSim();
                      return;
                    }
                    setAutoPlay(!autoPlay);
                  }}
                  aria-label={autoPlay ? "Pause auto-play (Space key)" : finished ? "Restart simulation" : "Start auto-play (Space key)"}
                  className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    autoPlay
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-accent text-white hover:bg-accent/80"
                  }`}
                >
                  {autoPlay ? (
                    <>
                      <Pause className="h-3 w-3" /> Pause
                    </>
                  ) : finished ? (
                    <>
                      <RotateCcw className="h-3 w-3" /> Restart
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3" /> Auto-play
                    </>
                  )}
                </button>
                <button
                  onClick={stepForward}
                  disabled={currentBarIndex >= totalBars - 1}
                  className="rounded-md bg-bg-hover p-1.5 text-text-secondary hover:text-text-primary disabled:opacity-30"
                  title="Forward"
                  aria-label="Step forward (→ key)"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <span className="ml-2 text-[10px] tabular-nums text-text-muted">
                  {currentBarIndex + 1} / {totalBars}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-bg-hover">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{
                  width: `${totalBars > 0 ? ((currentBarIndex + 1) / totalBars) * 100 : 0}%`,
                }}
              />
            </div>

            {/* Current time display */}
            {currentBar && (
              <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
                <span>
                  {formatDayLabel(currentBar.datetime, activeDate)} ·{" "}
                  {formatDate(currentBar.datetime)} ·{" "}
                  {formatTime(currentBar.datetime)}
                </span>
                <span className="tabular-nums">
                  O:{fmtCurrency(currentBar.open ?? 0)} H:
                  {fmtCurrency(currentBar.high ?? 0)} L:
                  {fmtCurrency(currentBar.low ?? 0)} C:
                  {fmtCurrency(currentBar.close ?? 0)}
                </span>
              </div>
            )}

            {/* Keyboard shortcuts hint */}
            <div className="mt-2 hidden items-center gap-3 text-[10px] text-text-muted md:flex">
              <span>Shortcuts:</span>
              <kbd className="rounded bg-bg-hover px-1.5 py-0.5 font-mono">Space</kbd><span>Play/Pause</span>
              <kbd className="rounded bg-bg-hover px-1.5 py-0.5 font-mono">&larr;&rarr;</kbd><span>Step</span>
              <kbd className="rounded bg-bg-hover px-1.5 py-0.5 font-mono">B</kbd><span>Buy</span>
              <kbd className="rounded bg-bg-hover px-1.5 py-0.5 font-mono">S</kbd><span>Sell</span>
              <kbd className="rounded bg-bg-hover px-1.5 py-0.5 font-mono">R</kbd><span>Reset</span>
            </div>
          </Card>

          {/* Chart */}
          <Card>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 5, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                  />
                  <XAxis
                    dataKey="idx"
                    tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }}
                    tickFormatter={(idx: number) => {
                      const bar = visibleBars[idx];
                      if (!bar) return "";
                      // Show day boundary labels
                      if (idx === 0 || dayBoundaries.includes(idx)) {
                        return formatDate(bar.datetime);
                      }
                      // Show time for every Nth bar
                      const step = barInterval === "15m" ? 4 : barInterval === "30m" ? 2 : 1;
                      if (idx % step === 0) return formatTime(bar.datetime);
                      return "";
                    }}
                    interval={0}
                    height={30}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
                    tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                    domain={["dataMin - 0.5", "dataMax + 0.5"]}
                  />
                  <ReTooltip
                    contentStyle={{
                      background: "#1a1e2e",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelFormatter={(idx) => {
                      const bar = visibleBars[Number(idx)];
                      if (!bar) return "";
                      return `${formatDate(bar.datetime)} ${formatTime(bar.datetime)}`;
                    }}
                    formatter={(v: number | undefined) =>
                      v != null ? [fmtCurrency(v), "Price"] : ["—", "Price"]
                    }
                  />
                  {/* Day separator lines */}
                  {dayBoundaries
                    .filter((i) => i <= currentBarIndex)
                    .map((i) => (
                      <ReferenceLine
                        key={`day-${i}`}
                        x={i}
                        stroke="rgba(255,255,255,0.15)"
                        strokeDasharray="4 4"
                      />
                    ))}
                  {/* Buy markers as reference areas (small green zones) */}
                  {buyMarkers.map((idx) => (
                    <ReferenceLine
                      key={`buy-${idx}`}
                      x={idx}
                      stroke="#10b981"
                      strokeWidth={2}
                      label={{
                        value: "B",
                        position: "top",
                        fill: "#10b981",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    />
                  ))}
                  {/* Sell markers */}
                  {sellMarkers.map((idx) => (
                    <ReferenceLine
                      key={`sell-${idx}`}
                      x={idx}
                      stroke="#ef4444"
                      strokeWidth={2}
                      label={{
                        value: "S",
                        position: "top",
                        fill: "#ef4444",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    />
                  ))}
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#14b8a6"
                    strokeWidth={2}
                    dot={false}
                    animationDuration={0}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Trade History */}
          {trades.length > 0 && (
            <Card>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                <BarChart3 className="h-4 w-4" />
                Trade History
              </h3>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {trades.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md bg-bg-hover/30 px-3 py-1.5 text-xs"
                  >
                    <span
                      className={`font-bold ${t.type === "buy" ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {t.type === "buy" ? "BOUGHT" : "SOLD"} {t.shares} shares @{" "}
                      {fmtCurrency(t.price)}
                    </span>
                    <span className="text-text-muted">
                      {formatDate(t.datetime)} {formatTime(t.datetime)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Results Summary (shown when finished) */}
          {finished && (
            <Card className="border-accent/30 bg-gradient-to-r from-accent/5 to-transparent">
              <div className="text-center">
                <Trophy className="mx-auto h-8 w-8 text-amber-400" />
                <h3 className="mt-2 text-lg font-bold text-text-primary">
                  Your Results
                </h3>

                <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-3">
                  <div className="rounded-lg bg-bg-hover/50 p-3">
                    <p className="text-[10px] text-text-muted">Started With</p>
                    <p className="text-sm font-bold text-text-primary">
                      {fmtCurrency(startingCash)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-bg-hover/50 p-3">
                    <p className="text-[10px] text-text-muted">Final Value</p>
                    <p
                      className={`text-sm font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {fmtCurrency(portfolioValue)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-bg-hover/50 p-3">
                    <p className="text-[10px] text-text-muted">P&L</p>
                    <p
                      className={`text-sm font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {pnl >= 0 ? "+" : ""}
                      {fmtCurrency(pnl)} ({pnlPct >= 0 ? "+" : ""}
                      {pnlPct.toFixed(1)}%)
                    </p>
                  </div>
                  <div className="rounded-lg bg-bg-hover/50 p-3">
                    <p className="text-[10px] text-text-muted">Trades</p>
                    <p className="text-sm font-bold text-text-primary">
                      {totalBuys} buy{totalBuys !== 1 && "s"}, {totalSells} sell
                      {totalSells !== 1 && "s"}
                    </p>
                  </div>
                </div>

                {bestTrade.profit > 0 && (
                  <p className="mt-3 text-xs text-text-muted">
                    Best trade: Bought at {fmtCurrency(bestTrade.buyPrice)},
                    sold at {fmtCurrency(bestTrade.sellPrice)} (+
                    {fmtCurrency(bestTrade.profit)})
                  </p>
                )}

                {trades.length === 0 && (
                  <p className="mt-3 text-xs text-amber-400">
                    You didn't make any trades! Try again and buy/sell during the
                    simulation.
                  </p>
                )}

                <div className="mt-4 flex justify-center gap-3">
                  <button
                    onClick={resetSim}
                    className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent/80"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Try Again
                  </button>
                  <button
                    onClick={goBack}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Pick Another
                  </button>
                </div>

                {/* What Did We Learn? */}
                <WhatWeLearnedCard
                  intradaySim={intradaySim}
                  analysis={analysis}
                  bars={bars}
                />
              </div>
            </Card>
          )}
        </>
      )}

      {intradaySim && "error" in intradaySim && (
        <Card>
          <p className="text-sm text-red-400">
            Event not found. Try browsing the event library instead.
          </p>
          <button
            onClick={goBack}
            className="mt-2 text-sm text-accent hover:underline"
          >
            Back to Event Browser
          </button>
        </Card>
      )}
    </div>
  );
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function EventBrowserCard({
  event: ev,
  onSelect,
}: {
  event: LibraryEvent;
  onSelect: () => void;
}) {
  const gap = ev.gap_up_pct ?? 0;
  const outcome = ev.outcome_label;

  // Difficulty: small gaps with clear outcomes = easier
  const difficulty =
    gap < 3 && (outcome === "Bounced" || outcome === "Kept Falling")
      ? "Easy"
      : gap >= 10 || outcome === "Faded"
        ? "Hard"
        : "Medium";
  const difficultyColor =
    difficulty === "Easy"
      ? "text-emerald-400"
      : difficulty === "Hard"
        ? "text-red-400"
        : "text-amber-400";

  const outcomeBg =
    outcome === "Bounced"
      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
      : outcome === "Kept Falling"
        ? "bg-red-500/10 border-red-500/20 text-red-400"
        : outcome === "Faded"
          ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
          : "bg-bg-hover border-border text-text-muted";

  const OutcomeIcon =
    outcome === "Bounced"
      ? TrendingUp
      : outcome === "Kept Falling"
        ? TrendingDown
        : outcome === "Faded"
          ? Minus
          : Clock;

  return (
    <button
      onClick={onSelect}
      className="group flex flex-col rounded-xl border border-border bg-bg-card p-4 text-left transition-all hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5"
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-lg font-bold text-accent">
            +{gap.toFixed(1)}%
          </span>
          <span className="ml-1.5 rounded bg-bg-hover px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
            {ev.gap_size}
          </span>
        </div>
        <div
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${outcomeBg}`}
        >
          <OutcomeIcon className="h-3 w-3" />
          {outcome}
        </div>
      </div>

      <div className="mt-2">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-text-primary group-hover:text-accent">
            {ev.ticker}
          </p>
          {ev.has_analysis && (
            <span className="flex items-center gap-0.5 rounded bg-indigo-500/15 px-1.5 py-0.5 text-[9px] font-bold text-indigo-400">
              <FileText className="h-2.5 w-2.5" />
              ANALYZED
            </span>
          )}
        </div>
        <p className="truncate text-xs text-text-muted">
          {ev.name ?? ev.ticker}
          {ev.sector && (
            <span className="text-text-muted/50"> · {ev.sector}</span>
          )}
        </p>
      </div>

      <p className={`mt-2 flex-1 text-[11px] leading-relaxed ${ev.has_analysis ? "line-clamp-3 text-text-secondary" : "line-clamp-2 text-text-muted/80"}`}>
        {ev.summary}
      </p>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-[10px] text-text-muted/50">
          {new Date(ev.signal_date + "T12:00:00").toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <span className={`text-[10px] font-bold ${difficultyColor}`}>
          {difficulty}
        </span>
      </div>
    </button>
  );
}

function WhatWeLearnedCard({
  intradaySim,
  analysis,
  bars,
}: {
  intradaySim: { ticker: string; gap_up_pct: number | null; selloff_pct: number | null } | undefined;
  analysis: { catalyst_type?: string | null; catalyst_headline?: string | null; post_mortem?: string | null } | undefined;
  bars: IntradayBar[];
}) {
  if (!intradaySim || bars.length < 2) return null;

  const gap = intradaySim.gap_up_pct ?? 0;
  const selloff = Math.abs(intradaySim.selloff_pct ?? 0);
  const firstPrice = bars[0]?.close ?? 0;
  const lastPrice = bars[bars.length - 1]?.close ?? 0;
  const totalReturn = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
  const bounced = totalReturn > 1;
  const faded = totalReturn < -1;

  const lessons: string[] = [];

  if (gap >= 10) {
    lessons.push("Huge gap-ups (10%+) often see big sell-offs during the day as early buyers take profits. Patience matters.");
  } else if (gap >= 5) {
    lessons.push("Big gap-ups (5-10%) can go either way — some keep climbing, others give back most of the gain.");
  } else {
    lessons.push("Small gap-ups (under 5%) tend to be less volatile, making them easier to trade for beginners.");
  }

  if (selloff > 3) {
    lessons.push(`This stock dropped ${selloff.toFixed(1)}% from its peak during the day — a reminder that even good news can trigger sell-offs.`);
  }

  if (bounced) {
    lessons.push("The stock recovered after the initial sell-off. 'Buying the dip' would have worked here.");
  } else if (faded) {
    lessons.push("The stock kept falling after the gap. Sometimes the smart move is to wait and watch, not buy immediately.");
  }

  if (analysis?.catalyst_type === "earnings_beat") {
    lessons.push("Earnings beats cause excitement, but the stock's reaction depends on whether the good news was already expected.");
  }

  return (
    <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-left">
      <h4 className="flex items-center gap-2 text-sm font-bold text-amber-400">
        <Zap className="h-4 w-4" />
        What Did We Learn?
      </h4>
      <ul className="mt-2 space-y-1.5">
        {lessons.map((lesson, i) => (
          <li key={i} className="text-xs leading-relaxed text-text-secondary">
            {lesson}
          </li>
        ))}
      </ul>
    </div>
  );
}
