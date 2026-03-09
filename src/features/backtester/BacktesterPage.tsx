import { useState, useCallback, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  FlaskConical,
  Play,
  Loader2,
  Info,
  X,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { api } from "@/api/client";
import { ChartRowSchema } from "@/api/types/price";
import { z } from "zod";
import { useWatchlist } from "@/hooks/useWatchlist";
import {
  runBacktest,
  STRATEGY_PRESETS,
  type BacktestConfig,
  type BacktestResult,
  type EntrySignal,
  type StrategyPreset,
} from "./lib/backtest-engine";
import { ResultsStats } from "./components/ResultsStats";
import { EquityCurve } from "./components/EquityCurve";
import { TradeLog } from "./components/TradeLog";
import { TickerBreakdown } from "./components/TickerBreakdown";

const ENTRY_LABELS: Record<EntrySignal, string> = {
  rsi_oversold: "RSI Oversold",
  rsi_overbought: "RSI Overbought (short)",
  golden_cross: "Golden Cross",
  death_cross: "Death Cross (short)",
  bb_lower_touch: "Bollinger Band Bounce",
  consecutive_down: "Consecutive Down Days",
};

const ENTRY_PARAM_LABELS: Partial<Record<EntrySignal, string>> = {
  rsi_oversold: "RSI Threshold",
  rsi_overbought: "RSI Threshold",
  consecutive_down: "Down Days",
};

const POPULAR_TICKERS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "JPM",
  "V", "JNJ", "WMT", "PG", "UNH", "HD", "MA", "BAC",
  "XOM", "COST", "ABBV", "KO", "PEP", "MRK", "AVGO", "LLY",
  "TMO", "CSCO", "MCD", "ABT", "DHR", "ACN", "TXN", "NEE",
  "PM", "INTC", "AMD", "QCOM", "AMGN", "HON", "UPS", "LOW",
  "RTX", "GS", "BLK", "CAT", "DE", "MS", "AXP", "SCHW",
  "SYK", "ISRG",
];

export function BacktesterPage() {
  const { watchlist } = useWatchlist();
  const [showGuide, setShowGuide] = useState(false);
  const [activePreset, setActivePreset] = useState<string>("oversold_bounce");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Config state
  const [entry, setEntry] = useState<EntrySignal>("rsi_oversold");
  const [entryParam, setEntryParam] = useState(30);
  const [trendFilter, setTrendFilter] = useState<BacktestConfig["trendFilter"]>("above_sma200");
  const [takeProfit, setTakeProfit] = useState(8);
  const [stopLoss, setStopLoss] = useState(4);
  const [maxHold, setMaxHold] = useState(20);
  const [startYear, setStartYear] = useState(2021);
  const [universe, setUniverse] = useState<"watchlist" | "top50">("watchlist");

  // Backtest state
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const tickers = useMemo(
    () => (universe === "watchlist" ? watchlist : POPULAR_TICKERS),
    [universe, watchlist],
  );

  // Fetch chart data for all tickers
  const chartQueries = useQueries({
    queries: running
      ? tickers.map((ticker) => ({
          queryKey: ["chart-bt", ticker],
          queryFn: async () => {
            const { data } = await api.get(`/prices/${ticker}/chart`, {
              params: { limit: 2000 },
            });
            return {
              ticker,
              rows: z.array(ChartRowSchema).parse(data),
            };
          },
          staleTime: 30 * 60 * 1000,
          enabled: running,
        }))
      : [],
  });

  const allLoaded = running && chartQueries.length > 0 && chartQueries.every((q) => !q.isLoading);
  const loadedCount = chartQueries.filter((q) => q.data).length;
  const errorCount = chartQueries.filter((q) => q.error).length;

  // Run backtest when all data loads
  const prevAllLoaded = useMemo(() => allLoaded, [allLoaded]);
  if (prevAllLoaded && running) {
    const tickerData = chartQueries
      .filter((q) => q.data)
      .map((q) => q.data!);

    if (tickerData.length > 0) {
      const config: BacktestConfig = {
        name: STRATEGY_PRESETS.find((p) => p.id === activePreset)?.name ?? "Custom",
        entry,
        entryParam,
        trendFilter,
        takeProfit,
        stopLoss,
        maxHoldDays: maxHold,
        startYear,
      };
      const r = runBacktest(tickerData, config);
      setResult(r);
      setRunning(false);
    }
  }

  function applyPreset(preset: StrategyPreset) {
    setActivePreset(preset.id);
    setEntry(preset.config.entry);
    setEntryParam(preset.config.entryParam);
    setTrendFilter(preset.config.trendFilter);
    setTakeProfit(preset.config.takeProfit);
    setStopLoss(preset.config.stopLoss);
    setMaxHold(preset.config.maxHoldDays);
    setResult(null);
  }

  const handleRun = useCallback(() => {
    setResult(null);
    setRunning(true);
  }, []);

  const handleReset = useCallback(() => {
    setResult(null);
    setRunning(false);
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <FlaskConical className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Strategy Backtester
            </h1>
            <p className="text-sm text-text-muted">
              Test trading strategies against 7 years of real market data
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowGuide((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm text-text-muted transition-colors hover:bg-bg-hover"
        >
          <Info className="h-3.5 w-3.5" />
          How It Works
        </button>
      </div>

      {/* Guide */}
      {showGuide && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm text-text-secondary">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-accent">How Backtesting Works</h3>
            <button type="button" onClick={() => setShowGuide(false)} className="text-text-muted hover:text-text-primary">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-1 text-xs">
            <li><strong>Entry Signal:</strong> When conditions are met, the engine opens a position at the closing price.</li>
            <li><strong>Position Sizing:</strong> Each trade uses 10% of current equity (compounding).</li>
            <li><strong>Exit Rules:</strong> Trades close when take-profit, stop-loss, or max-hold is hit.</li>
            <li><strong>No look-ahead bias:</strong> Signals use only data available on each day.</li>
            <li><strong>Limitations:</strong> Simulates daily closes only. No slippage/commissions. Past performance does not guarantee future results.</li>
          </ul>
        </div>
      )}

      {/* Strategy Presets */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Strategy Presets
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STRATEGY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className={`rounded-xl border p-4 text-left transition-all ${
                activePreset === preset.id
                  ? "border-accent bg-accent/5 shadow-lg shadow-accent/10"
                  : "border-border bg-bg-card hover:border-accent/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: preset.color }}
                />
                <span className="text-sm font-semibold text-text-primary">
                  {preset.name}
                </span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                {preset.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Configuration */}
      <div className="rounded-xl border border-border bg-bg-card p-4">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <h2 className="text-sm font-semibold text-text-primary">Configuration</h2>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="ml-auto flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"
          >
            Advanced
            <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Universe */}
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Stock Universe
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUniverse("watchlist")}
                className={`flex-1 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                  universe === "watchlist"
                    ? "bg-accent text-white"
                    : "bg-bg-hover text-text-secondary hover:text-text-primary"
                }`}
              >
                Watchlist ({watchlist.length})
              </button>
              <button
                type="button"
                onClick={() => setUniverse("top50")}
                className={`flex-1 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                  universe === "top50"
                    ? "bg-accent text-white"
                    : "bg-bg-hover text-text-secondary hover:text-text-primary"
                }`}
              >
                Top 50 S&P
              </button>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Start Year
            </label>
            <div className="flex gap-1">
              {[2019, 2020, 2021, 2022, 2023].map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setStartYear(y)}
                  className={`flex-1 rounded-lg py-3 text-sm font-medium transition-colors ${
                    startYear === y
                      ? "bg-accent text-white"
                      : "bg-bg-hover text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Take Profit */}
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Take Profit
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={2}
                max={30}
                value={takeProfit}
                onChange={(e) => setTakeProfit(Number(e.target.value))}
                className="flex-1 accent-green"
              />
              <span className="w-10 text-right text-sm font-bold text-green">
                +{takeProfit}%
              </span>
            </div>
          </div>

          {/* Stop Loss */}
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Stop Loss
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={15}
                value={stopLoss}
                onChange={(e) => setStopLoss(Number(e.target.value))}
                className="flex-1 accent-red"
              />
              <span className="w-10 text-right text-sm font-bold text-red">
                -{stopLoss}%
              </span>
            </div>
          </div>
        </div>

        {/* Advanced settings */}
        {showAdvanced && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-border pt-4">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-muted">
                Entry Signal
              </label>
              <select
                value={entry}
                onChange={(e) => { setEntry(e.target.value as EntrySignal); setActivePreset(""); }}
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
              >
                {Object.entries(ENTRY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {ENTRY_PARAM_LABELS[entry] && (
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  {ENTRY_PARAM_LABELS[entry]}
                </label>
                <input
                  type="number"
                  value={entryParam}
                  onChange={(e) => setEntryParam(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-muted">
                Trend Filter
              </label>
              <select
                value={trendFilter}
                onChange={(e) => setTrendFilter(e.target.value as BacktestConfig["trendFilter"])}
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
              >
                <option value="none">None</option>
                <option value="above_sma200">Above 200-SMA only</option>
                <option value="below_sma200">Below 200-SMA only</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-muted">
                Max Hold Days
              </label>
              <input
                type="number"
                value={maxHold}
                onChange={(e) => setMaxHold(Number(e.target.value))}
                min={1}
                max={252}
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
              />
            </div>
          </div>
        )}

        {/* Run button */}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleRun}
            disabled={running}
            className="flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent/90 disabled:opacity-50"
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading {loadedCount}/{tickers.length} stocks...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Backtest
              </>
            )}
          </button>

          {result && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-3 text-sm text-text-muted transition-colors hover:bg-bg-hover"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}

          {running && errorCount > 0 && (
            <span className="text-xs text-red">
              {errorCount} failed to load
            </span>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Verdict banner */}
          <div
            className={`rounded-xl border-2 p-4 ${
              result.totalReturn >= 0
                ? "border-green/30 bg-green/5"
                : "border-red/30 bg-red/5"
            }`}
          >
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-xs text-text-muted">Strategy Result</p>
                <p
                  className={`text-2xl font-bold ${
                    result.totalReturn >= 0 ? "text-green" : "text-red"
                  }`}
                >
                  {result.totalReturn >= 0 ? "+" : ""}
                  {result.totalReturn}% total return
                </p>
              </div>
              <div className="ml-auto flex gap-6 text-center">
                <div>
                  <p className="text-xs text-text-muted">Trades</p>
                  <p className="text-lg font-bold text-text-primary">
                    {result.trades.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Win Rate</p>
                  <p
                    className={`text-lg font-bold ${
                      result.winRate >= 50 ? "text-green" : "text-red"
                    }`}
                  >
                    {result.winRate}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Period</p>
                  <p className="text-lg font-bold text-text-primary">
                    {2026 - result.config.startYear}yr
                  </p>
                </div>
              </div>
            </div>
          </div>

          <ResultsStats result={result} />
          <EquityCurve result={result} />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <TradeLog result={result} />
            </div>
            <TickerBreakdown result={result} />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !running && (
        <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
          <FlaskConical className="mx-auto h-8 w-8 text-text-muted mb-2" />
          <p className="text-sm text-text-muted">
            Select a strategy preset above, configure your parameters, and click
            Run Backtest to see how it would have performed.
          </p>
        </div>
      )}
    </div>
  );
}
