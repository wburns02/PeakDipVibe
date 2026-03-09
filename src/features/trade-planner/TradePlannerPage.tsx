import { useState, useMemo, useCallback } from "react";
import { useQueries } from "@tanstack/react-query";
import { api } from "@/api/client";
import { TickerDetailSchema } from "@/api/types/ticker";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useTickerList } from "@/api/hooks/useTickers";
import { useDebounce } from "@/hooks/useDebounce";
import { PlanCard } from "./components/PlanCard";
import { PlanSummary } from "./components/PlanSummary";
import {
  generatePlan,
  rankPlans,
  loadAccountSize,
  saveAccountSize,
  loadRiskPct,
  saveRiskPct,
  type TradePlan,
} from "./lib/planner";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  ClipboardList,
  Settings2,
  Search,
  Plus,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Filter,
} from "lucide-react";

type SortBy = "score" | "rr" | "ticker" | "change";
type FilterAction = "all" | "bullish" | "bearish";

export function TradePlannerPage() {
  usePageTitle("Trade Planner");

  const { watchlist, add, remove } = useWatchlist();
  const [accountSize, setAccountSize] = useState(loadAccountSize);
  const [riskPct, setRiskPct] = useState(loadRiskPct);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddTicker, setShowAddTicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("score");
  const [filterAction, setFilterAction] = useState<FilterAction>("all");

  const debouncedSearch = useDebounce(searchQuery, 200);
  const { data: searchResults } = useTickerList(debouncedSearch.length >= 1 ? debouncedSearch : undefined);

  // Fetch ticker detail (includes indicators + price + name/sector) for each watchlist ticker
  const tickerQueries = useQueries({
    queries: watchlist.map((ticker) => ({
      queryKey: ["ticker", ticker],
      queryFn: async () => {
        const { data } = await api.get(`/tickers/${ticker}`);
        return TickerDetailSchema.parse(data);
      },
      staleTime: 2 * 60 * 1000,
    })),
  });

  const allLoaded = tickerQueries.every((q) => !q.isLoading);
  const anyLoading = tickerQueries.some((q) => q.isLoading);

  // Generate trade plans from loaded data
  const plans = useMemo(() => {
    const results: TradePlan[] = [];
    for (const q of tickerQueries) {
      if (!q.data) continue;
      const detail = q.data;
      const indicators = detail.indicators ?? {};
      const price = detail.latest_close ?? 0;
      if (price <= 0 || Object.keys(indicators).length === 0) continue;

      // Use ROC_10 as approximate change indicator (no daily change in this API)
      const changePct = indicators.ROC_10 ?? 0;

      results.push(
        generatePlan(
          detail.ticker,
          detail.name ?? detail.ticker,
          detail.sector ?? "",
          price,
          changePct,
          indicators,
          accountSize,
          riskPct,
        )
      );
    }
    return results;
  }, [tickerQueries, accountSize, riskPct]);

  // Sort and filter
  const sortedPlans = useMemo(() => {
    let filtered = plans;
    if (filterAction === "bullish") filtered = plans.filter((p) => p.confluence.score >= 55);
    if (filterAction === "bearish") filtered = plans.filter((p) => p.confluence.score < 45);

    const sorted = [...filtered];
    switch (sortBy) {
      case "score":
        return rankPlans(sorted);
      case "rr":
        return sorted.sort((a, b) => b.riskReward - a.riskReward);
      case "ticker":
        return sorted.sort((a, b) => a.ticker.localeCompare(b.ticker));
      case "change":
        return sorted.sort((a, b) => b.changePct - a.changePct);
      default:
        return rankPlans(sorted);
    }
  }, [plans, sortBy, filterAction]);

  const handleAccountChange = useCallback((val: string) => {
    const n = Number(val.replace(/[^0-9]/g, ""));
    if (!isNaN(n)) {
      setAccountSize(n);
      saveAccountSize(n);
    }
  }, []);

  const handleRiskChange = useCallback((val: string) => {
    const n = Number(val);
    if (!isNaN(n) && n >= 0.1 && n <= 10) {
      setRiskPct(n);
      saveRiskPct(n);
    }
  }, []);

  const addTicker = useCallback(
    (ticker: string) => {
      add(ticker);
      setSearchQuery("");
      setShowAddTicker(false);
    },
    [add],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <ClipboardList className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Trade Planner</h1>
            <p className="text-sm text-text-muted">
              Your morning game plan &mdash; ranked setups with entry, stop &amp; targets
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddTicker((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-secondary px-3 py-3 text-sm font-medium text-text-secondary transition-colors hover:border-accent/30 hover:text-accent"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-secondary px-3 py-3 text-sm font-medium text-text-secondary transition-colors hover:border-accent/30 hover:text-text-primary"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Settings
          </button>
        </div>
      </div>

      {/* Add ticker search */}
      {showAddTicker && (
        <div className="rounded-xl border border-border bg-bg-card p-4 space-y-3 animate-slideDown">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Add to Plan</h3>
            <button
              type="button"
              onClick={() => { setShowAddTicker(false); setSearchQuery(""); }}
              className="text-text-muted hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ""))}
              placeholder="Search ticker or company..."
              className="w-full rounded-lg border border-border bg-bg-secondary py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              autoFocus
            />
          </div>
          {searchQuery && searchResults && searchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-bg-secondary">
              {searchResults.slice(0, 8).map((r) => {
                const alreadyAdded = watchlist.includes(r.ticker);
                return (
                  <button
                    key={r.ticker}
                    type="button"
                    onClick={() => !alreadyAdded && addTicker(r.ticker)}
                    disabled={alreadyAdded}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                      alreadyAdded ? "opacity-40 cursor-not-allowed" : "hover:bg-bg-hover"
                    }`}
                  >
                    <span className="font-semibold text-sm text-accent">{r.ticker}</span>
                    <span className="truncate text-xs text-text-muted">{r.name}</span>
                    <span className="ml-auto text-xs text-text-muted">
                      {alreadyAdded ? "Added" : r.sector}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="rounded-xl border border-border bg-bg-card p-4 space-y-4 animate-slideDown">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Position Sizing Settings</h3>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="text-text-muted hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">Account Size ($)</label>
              <input
                type="text"
                value={accountSize.toLocaleString()}
                onChange={(e) => handleAccountChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm font-mono text-text-primary focus:border-accent focus:outline-none"
              />
              <p className="text-xs text-text-muted">Total portfolio value for position sizing</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">Risk Per Trade (%)</label>
              <input
                type="number"
                value={riskPct}
                onChange={(e) => handleRiskChange(e.target.value)}
                min={0.1}
                max={10}
                step={0.25}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm font-mono text-text-primary focus:border-accent focus:outline-none"
              />
              <p className="text-xs text-text-muted">Max risk per trade as % of account (typically 0.5-2%)</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {watchlist.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-bg-card p-12 text-center space-y-3">
          <ClipboardList className="mx-auto h-10 w-10 text-text-muted" />
          <h3 className="text-lg font-semibold text-text-primary">No stocks in your plan</h3>
          <p className="text-sm text-text-muted">
            Add stocks from the watchlist or search above to generate your morning game plan.
          </p>
          <button
            type="button"
            onClick={() => setShowAddTicker(true)}
            className="mx-auto flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" />
            Add Stocks
          </button>
        </div>
      )}

      {/* Loading */}
      {watchlist.length > 0 && anyLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Skeleton className="h-20" /><Skeleton className="h-20" />
            <Skeleton className="h-20" /><Skeleton className="h-20" />
          </div>
          {watchlist.map((t) => (
            <Skeleton key={t} className="h-20 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Results */}
      {allLoaded && plans.length > 0 && (
        <>
          {/* Summary */}
          <PlanSummary plans={rankPlans(plans)} accountSize={accountSize} />

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Sort */}
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-secondary px-2 py-1">
              <ArrowUpDown className="h-3 w-3 text-text-muted" />
              {(["score", "rr", "change", "ticker"] as SortBy[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSortBy(s)}
                  className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                    sortBy === s
                      ? "bg-accent/10 text-accent"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {s === "score" ? "Score" : s === "rr" ? "R/R" : s === "change" ? "Change" : "A-Z"}
                </button>
              ))}
            </div>

            {/* Filter */}
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-secondary px-2 py-1">
              <Filter className="h-3 w-3 text-text-muted" />
              {(["all", "bullish", "bearish"] as FilterAction[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterAction(f)}
                  className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                    filterAction === f
                      ? "bg-accent/10 text-accent"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {f === "all" ? "All" : f === "bullish" ? "Bullish" : "Bearish"}
                </button>
              ))}
            </div>

            <span className="ml-auto text-xs text-text-muted">
              {sortedPlans.length} of {plans.length} setups
            </span>
          </div>

          {/* Plan cards */}
          <div className="space-y-3">
            {sortedPlans.map((plan, i) => (
              <PlanCard key={plan.ticker} plan={plan} rank={i + 1} />
            ))}
          </div>

          {/* Watchlist management */}
          <div className="rounded-xl border border-border bg-bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal className="h-3.5 w-3.5 text-text-muted" />
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Tracked Stocks
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {watchlist.map((t) => (
                <span
                  key={t}
                  className="group flex items-center gap-1 rounded-lg border border-border bg-bg-secondary px-2 py-1 text-xs font-medium text-text-secondary"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => remove(t)}
                    className="text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-red"
                    title={`Remove ${t}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setShowAddTicker(true)}
                className="rounded-lg border border-dashed border-border px-2 py-1 text-xs text-text-muted transition-colors hover:border-accent/30 hover:text-accent"
              >
                <Plus className="inline h-3 w-3" /> add
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
