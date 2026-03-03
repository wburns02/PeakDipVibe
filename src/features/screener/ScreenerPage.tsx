import { useState, useEffect, memo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Filter,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Star,
  ChevronDown,
  SearchX,
  X,
} from "lucide-react";
import { ErrorState } from "@/components/ui/ErrorState";
import { useScreener } from "@/api/hooks/useScreener";
import { useSectors } from "@/api/hooks/useMarket";
import { useWatchlist } from "@/hooks/useWatchlist";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { MiniSparkline } from "@/components/charts/MiniSparkline";
import { useSparkline } from "@/api/hooks/useCompare";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { GlossaryTerm } from "@/components/education/GlossaryTerm";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ScrollableTable } from "@/components/ui/ScrollableTable";
import type { ScreenerFilters } from "@/api/types/screener";

const PRESETS = [
  { label: "Oversold (RSI < 30)", filters: { rsi_max: 30, sort_by: "rsi", sort_dir: "asc" } },
  { label: "Overbought (RSI > 70)", filters: { rsi_min: 70, sort_by: "rsi", sort_dir: "desc" } },
  { label: "Above 200-day SMA", filters: { above_sma200: true, sort_by: "change", sort_dir: "desc" } },
  { label: "Below 50-day SMA", filters: { above_sma50: false, sort_by: "change", sort_dir: "asc" } },
  { label: "Golden Cross", filters: { golden_cross: true, sort_by: "change", sort_dir: "desc" } },
  { label: "Death Cross", filters: { death_cross: true, sort_by: "change", sort_dir: "asc" } },
];

const SparklineCell = memo(function SparklineCell({ ticker }: { ticker: string }) {
  const { data } = useSparkline(ticker, 7);
  if (!data) return <div className="h-[24px] w-16" />;
  const color = data.closes[data.closes.length - 1] >= data.closes[0] ? "#22c55e" : "#ef4444";
  return (
    <div className="w-16">
      <MiniSparkline data={data.closes.map((v) => ({ value: v }))} color={color} height={24} />
    </div>
  );
});

export function ScreenerPage() {
  usePageTitle("Stock Screener");
  const { toggle, isWatched } = useWatchlist();
  const [searchParams] = useSearchParams();
  const sectorParam = searchParams.get("sector");
  const [filters, setFilters] = useState<ScreenerFilters>({
    sort_by: "rsi",
    sort_dir: "asc",
    limit: 50,
    ...(sectorParam ? { sector: sectorParam } : {}),
  });
  const [showFilters, setShowFilters] = useState(!!sectorParam);

  // Apply sector from URL when navigating from heatmap
  useEffect(() => {
    if (sectorParam && filters.sector !== sectorParam) {
      setFilters((prev) => ({ ...prev, sector: sectorParam }));
      setShowFilters(true);
    }
  }, [sectorParam]);

  const { data: results, isLoading, isFetching, isError, refetch } = useScreener(filters);
  const isRefetching = isFetching && !isLoading;
  const { data: sectors } = useSectors();

  const setFilter = (key: keyof ScreenerFilters, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setFilters({ ...preset.filters, limit: 50 });
  };

  const toggleSort = (field: string) => {
    setFilters((prev) => ({
      ...prev,
      sort_by: field,
      sort_dir: prev.sort_by === field && prev.sort_dir === "asc" ? "desc" : "asc",
    }));
  };

  const sortIcon = (field: string) =>
    filters.sort_by === field ? (
      <ArrowUpDown className="h-3 w-3 text-accent" />
    ) : (
      <ArrowUpDown className="h-3 w-3 text-text-muted opacity-40" />
    );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Stock Screener</h1>
        <p className="mt-1 text-sm text-text-muted">
          Filter S&P 500 stocks by technical indicators
        </p>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            type="button"
            key={p.label}
            onClick={() => applyPreset(p)}
            className="rounded-lg border border-border bg-bg-card px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Expandable filters */}
      <Card>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
          aria-controls="screener-filters"
          className="flex w-full items-center justify-between text-sm font-medium text-text-primary"
        >
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Custom Filters
            {(() => {
              let count = 0;
              if (filters.rsi_min != null) count++;
              if (filters.rsi_max != null) count++;
              if (filters.sector) count++;
              if (filters.above_sma200 != null) count++;
              if (filters.above_sma50 != null) count++;
              if (filters.golden_cross) count++;
              if (filters.death_cross) count++;
              if (count === 0) return null;
              return (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">
                  {count}
                </span>
              );
            })()}
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>

        {showFilters && (
          <div id="screener-filters" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* RSI Range */}
            <div>
              <label className="mb-1 block text-xs text-text-muted">RSI Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.rsi_min ?? ""}
                  onChange={(e) => setFilter("rsi_min", e.target.value ? +e.target.value : undefined)}
                  min={0}
                  max={100}
                  aria-label="Minimum RSI value"
                  className="w-full rounded-lg border border-border bg-bg-primary px-2 py-1.5 text-xs text-text-primary"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.rsi_max ?? ""}
                  onChange={(e) => setFilter("rsi_max", e.target.value ? +e.target.value : undefined)}
                  min={0}
                  max={100}
                  aria-label="Maximum RSI value"
                  className="w-full rounded-lg border border-border bg-bg-primary px-2 py-1.5 text-xs text-text-primary"
                />
              </div>
            </div>

            {/* Sector */}
            <div>
              <label className="mb-1 block text-xs text-text-muted">Sector</label>
              <select
                value={filters.sector ?? ""}
                onChange={(e) => setFilter("sector", e.target.value)}
                aria-label="Filter by sector"
                className="w-full rounded-lg border border-border bg-bg-primary px-2 py-1.5 text-xs text-text-primary"
              >
                <option value="">All Sectors</option>
                {sectors?.map((s) => (
                  <option key={s.sector} value={s.sector}>
                    {s.sector} ({s.ticker_count})
                  </option>
                ))}
              </select>
            </div>

            {/* SMA Position */}
            <div>
              <label className="mb-1 block text-xs text-text-muted">SMA Position</label>
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-2 text-xs text-text-secondary">
                  <input
                    type="checkbox"
                    checked={filters.above_sma200 === true}
                    onChange={(e) => setFilter("above_sma200", e.target.checked ? true : undefined)}
                    className="rounded border-border"
                  />
                  Above 200-day SMA
                </label>
                <label className="flex items-center gap-2 text-xs text-text-secondary">
                  <input
                    type="checkbox"
                    checked={filters.above_sma50 === true}
                    onChange={(e) => setFilter("above_sma50", e.target.checked ? true : undefined)}
                    className="rounded border-border"
                  />
                  Above 50-day SMA
                </label>
              </div>
            </div>

            {/* Crosses */}
            <div>
              <label className="mb-1 block text-xs text-text-muted">Moving Average Cross</label>
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-2 text-xs text-text-secondary">
                  <input
                    type="checkbox"
                    checked={filters.golden_cross === true}
                    onChange={(e) => setFilter("golden_cross", e.target.checked ? true : undefined)}
                    className="rounded border-border"
                  />
                  Golden Cross (50 &gt; 200)<GlossaryTerm term="golden_cross" />
                </label>
                <label className="flex items-center gap-2 text-xs text-text-secondary">
                  <input
                    type="checkbox"
                    checked={filters.death_cross === true}
                    onChange={(e) => setFilter("death_cross", e.target.checked ? true : undefined)}
                    className="rounded border-border"
                  />
                  Death Cross (50 &lt; 200)<GlossaryTerm term="death_cross" />
                </label>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Active filter chips */}
      {(() => {
        const chips: { label: string; clear: () => void }[] = [];
        if (filters.rsi_min != null) chips.push({ label: `RSI ≥ ${filters.rsi_min}`, clear: () => setFilter("rsi_min", undefined) });
        if (filters.rsi_max != null) chips.push({ label: `RSI ≤ ${filters.rsi_max}`, clear: () => setFilter("rsi_max", undefined) });
        if (filters.sector) chips.push({ label: filters.sector, clear: () => setFilter("sector", undefined) });
        if (filters.above_sma200 === true) chips.push({ label: "Above SMA 200", clear: () => setFilter("above_sma200", undefined) });
        if (filters.above_sma50 === true) chips.push({ label: "Above SMA 50", clear: () => setFilter("above_sma50", undefined) });
        if (filters.above_sma200 === false) chips.push({ label: "Below SMA 200", clear: () => setFilter("above_sma200", undefined) });
        if (filters.above_sma50 === false) chips.push({ label: "Below SMA 50", clear: () => setFilter("above_sma50", undefined) });
        if (filters.golden_cross) chips.push({ label: "Golden Cross", clear: () => setFilter("golden_cross", undefined) });
        if (filters.death_cross) chips.push({ label: "Death Cross", clear: () => setFilter("death_cross", undefined) });
        if (chips.length === 0) return null;
        return (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-text-muted">Active filters:</span>
            {chips.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={c.clear}
                className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
              >
                {c.label}
                <X className="h-3 w-3" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFilters({ sort_by: "rsi", sort_dir: "asc", limit: 50 })}
              className="text-xs text-text-muted underline hover:text-text-secondary"
            >
              Clear all
            </button>
          </div>
        );
      })()}

      {/* Results table */}
      <Card
        title={`Results${results ? ` (${results.length})` : ""}`}
        subtitle="Click any row to view full analysis"
      >
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState message="Could not load screener results. The API may be offline." onRetry={refetch} />
        ) : !results || results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <SearchX className="mb-3 h-8 w-8 opacity-40" />
            <p className="text-sm">No stocks match your filters</p>
            <p className="mt-1 text-xs">Try widening the criteria or resetting filters</p>
          </div>
        ) : (
          <ScrollableTable className={`transition-opacity duration-300 ${isRefetching ? "opacity-50" : ""}`}>
            <table className="w-full text-sm">
              <caption className="sr-only">S&amp;P 500 stock screener results sorted by technical indicators</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-muted">
                  <th scope="col" className="w-8 pb-2" />
                  <th scope="col" className="pb-2" aria-sort={filters.sort_by === "ticker" ? (filters.sort_dir === "asc" ? "ascending" : "descending") : "none"}>
                    <button type="button" onClick={() => toggleSort("ticker")} className="flex items-center gap-1">
                      Ticker {sortIcon("ticker")}
                    </button>
                  </th>
                  <th scope="col" className="pb-2">7d</th>
                  <th scope="col" className="pb-2">Price</th>
                  <th scope="col" className="pb-2" aria-sort={filters.sort_by === "change" ? (filters.sort_dir === "asc" ? "ascending" : "descending") : "none"}>
                    <button type="button" onClick={() => toggleSort("change")} className="flex items-center gap-1">
                      Change {sortIcon("change")}
                    </button>
                  </th>
                  <th scope="col" className="pb-2" aria-sort={filters.sort_by === "rsi" ? (filters.sort_dir === "asc" ? "ascending" : "descending") : "none"}>
                    <button type="button" onClick={() => toggleSort("rsi")} className="flex items-center gap-1">
                      RSI<GlossaryTerm term="rsi" /> {sortIcon("rsi")}
                    </button>
                  </th>
                  <th scope="col" className="pb-2">
                    <span className="flex items-center">SMA 50<GlossaryTerm term="sma" /></span>
                  </th>
                  <th scope="col" className="pb-2">SMA 200</th>
                  <th scope="col" className="pb-2">Sector</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.ticker} className="border-b border-border/50 transition-colors hover:bg-bg-hover">
                    <td className="py-2">
                      <button type="button" onClick={() => toggle(r.ticker)} aria-label={isWatched(r.ticker) ? `Remove ${r.ticker} from watchlist` : `Add ${r.ticker} to watchlist`} className="text-text-muted hover:text-amber">
                        <Star className={`h-3.5 w-3.5 ${isWatched(r.ticker) ? "fill-amber text-amber" : ""}`} />
                      </button>
                    </td>
                    <td className="py-2">
                      <Link to={`/ticker/${r.ticker}`} className="font-medium text-accent hover:underline">
                        {r.ticker}
                      </Link>
                      <span className="ml-1.5 hidden text-xs text-text-muted lg:inline">
                        {r.name}
                      </span>
                    </td>
                    <td className="py-2">
                      <SparklineCell ticker={r.ticker} />
                    </td>
                    <td className="py-2 text-text-primary">
                      {r.close ? formatCurrency(r.close) : "—"}
                    </td>
                    <td className="py-2">
                      {r.change_pct != null ? (
                        <Badge variant={r.change_pct >= 0 ? "green" : "red"}>
                          {formatPercent(r.change_pct)}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2">
                      {r.rsi_14 != null ? (
                        <span
                          className={
                            r.rsi_14 < 30
                              ? "text-green"
                              : r.rsi_14 > 70
                                ? "text-red"
                                : "text-text-primary"
                          }
                        >
                          {r.rsi_14.toFixed(1)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2">
                      {r.above_sma50 != null ? (
                        r.above_sma50 ? (
                          <TrendingUp className="h-3.5 w-3.5 text-green" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 text-red" />
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2">
                      {r.above_sma200 != null ? (
                        r.above_sma200 ? (
                          <TrendingUp className="h-3.5 w-3.5 text-green" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 text-red" />
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 text-xs text-text-muted">
                      {r.sector ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTable>
        )}
      </Card>
    </div>
  );
}
