import { useState, useEffect, useCallback, memo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Filter,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Star,
  ChevronDown,
  SearchX,
  X,
  Save,
  Download,
  GitCompareArrows,
  Info,
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
import type { ScreenerFilters, ScreenerResult } from "@/api/types/screener";

const PRESETS = [
  { label: "Oversold (RSI < 30)", filters: { rsi_max: 30, sort_by: "rsi", sort_dir: "asc" } },
  { label: "Overbought (RSI > 70)", filters: { rsi_min: 70, sort_by: "rsi", sort_dir: "desc" } },
  { label: "Above 200-day SMA", filters: { above_sma200: true, sort_by: "change", sort_dir: "desc" } },
  { label: "Below 50-day SMA", filters: { above_sma50: false, sort_by: "change", sort_dir: "asc" } },
  { label: "Golden Cross", filters: { golden_cross: true, sort_by: "change", sort_dir: "desc" } },
  { label: "Death Cross", filters: { death_cross: true, sort_by: "change", sort_dir: "asc" } },
];

const SAVED_KEY = "peakdipvibe-screener-presets";

interface SavedPreset {
  name: string;
  filters: Partial<ScreenerFilters>;
  createdAt: number;
}

function loadSavedPresets(): SavedPreset[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveSavedPresets(presets: SavedPreset[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(presets));
  } catch {
    // quota exceeded
  }
}

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

function getMatchReasons(r: ScreenerResult, f: ScreenerFilters): string[] {
  const reasons: string[] = [];
  if (f.rsi_min != null && r.rsi_14 != null)
    reasons.push(`RSI ${r.rsi_14.toFixed(1)} ≥ ${f.rsi_min}`);
  if (f.rsi_max != null && r.rsi_14 != null)
    reasons.push(`RSI ${r.rsi_14.toFixed(1)} ≤ ${f.rsi_max}`);
  if (f.price_min != null && r.close != null)
    reasons.push(`Price $${r.close.toFixed(2)} ≥ $${f.price_min}`);
  if (f.price_max != null && r.close != null)
    reasons.push(`Price $${r.close.toFixed(2)} ≤ $${f.price_max}`);
  if (f.sector && r.sector)
    reasons.push(`Sector: ${r.sector}`);
  if (f.above_sma200 === true && r.above_sma200)
    reasons.push("Above SMA 200");
  if (f.above_sma200 === false && r.above_sma200 === false)
    reasons.push("Below SMA 200");
  if (f.above_sma50 === true && r.above_sma50)
    reasons.push("Above SMA 50");
  if (f.above_sma50 === false && r.above_sma50 === false)
    reasons.push("Below SMA 50");
  if (f.golden_cross)
    reasons.push("Golden Cross");
  if (f.death_cross)
    reasons.push("Death Cross");
  return reasons;
}

function FilterMatchTooltip({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return null;
  return (
    <div className="group relative">
      <Info className="h-3.5 w-3.5 text-accent/60" />
      <div className="pointer-events-none absolute bottom-full right-0 z-30 mb-1.5 hidden w-48 rounded-lg border border-border bg-bg-card p-2 shadow-xl group-hover:block">
        <p className="mb-1 text-[10px] font-semibold text-text-primary">Filter Match</p>
        {reasons.map((r) => (
          <p key={r} className="text-[10px] text-text-secondary">
            {r}
          </p>
        ))}
      </div>
    </div>
  );
}

export function ScreenerPage() {
  usePageTitle("Stock Screener");
  const navigate = useNavigate();
  const { toggle, isWatched } = useWatchlist();
  const [searchParams] = useSearchParams();
  const sectorParam = searchParams.get("sector");
  const [filters, setFilters] = useState<ScreenerFilters>(() => {
    // URL params take precedence, then sessionStorage, then defaults
    const savedSort = (() => { try { return JSON.parse(sessionStorage.getItem("screener-sort") || "{}"); } catch { return {}; } })();
    const initial: ScreenerFilters = {
      sort_by: searchParams.get("sort_by") || savedSort.sort_by || "rsi",
      sort_dir: (searchParams.get("sort_dir") as "asc" | "desc") || savedSort.sort_dir || "asc",
      limit: 50,
    };
    if (sectorParam) initial.sector = sectorParam;
    const rsiMin = searchParams.get("rsi_min");
    const rsiMax = searchParams.get("rsi_max");
    if (rsiMin) initial.rsi_min = +rsiMin;
    if (rsiMax) initial.rsi_max = +rsiMax;
    return initial;
  });
  const hasUrlFilters = !!(sectorParam || searchParams.get("rsi_min") || searchParams.get("rsi_max"));
  const [showFilters, setShowFilters] = useState(hasUrlFilters);

  // Apply sector from URL when navigating from heatmap
  useEffect(() => {
    if (sectorParam && filters.sector !== sectorParam) {
      setFilters((prev) => ({ ...prev, sector: sectorParam }));
      setShowFilters(true);
    }
  }, [sectorParam]);

  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>(loadSavedPresets);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  const { data: results, isLoading, isFetching, isError, refetch } = useScreener(filters);
  const isRefetching = isFetching && !isLoading;
  const { data: sectors } = useSectors();

  // "F" key toggles filter panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        setShowFilters((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const setFilter = (key: keyof ScreenerFilters, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setFilters({ ...preset.filters, limit: 50 });
  };

  // Persist sort state to sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem("screener-sort", JSON.stringify({ sort_by: filters.sort_by, sort_dir: filters.sort_dir })); } catch { /* ignore */ }
  }, [filters.sort_by, filters.sort_dir]);

  const toggleSort = (field: string) => {
    setFilters((prev) => ({
      ...prev,
      sort_by: field,
      sort_dir: prev.sort_by === field && prev.sort_dir === "asc" ? "desc" : "asc",
    }));
  };

  const isDuplicateName = saveName.trim() !== "" && savedPresets.some(
    (p) => p.name.toLowerCase() === saveName.trim().toLowerCase(),
  );

  const saveCurrentFilters = useCallback(() => {
    if (!saveName.trim() || isDuplicateName) return;
    const { sort_by, sort_dir, limit, ...filterParts } = filters;
    const preset: SavedPreset = {
      name: saveName.trim(),
      filters: { ...filterParts, sort_by, sort_dir },
      createdAt: Date.now(),
    };
    const updated = [...savedPresets, preset];
    setSavedPresets(updated);
    saveSavedPresets(updated);
    setSaveName("");
    setShowSaveInput(false);
  }, [saveName, filters, savedPresets]);

  const deleteSavedPreset = useCallback((idx: number) => {
    const updated = savedPresets.filter((_, i) => i !== idx);
    setSavedPresets(updated);
    saveSavedPresets(updated);
  }, [savedPresets]);

  const hasActiveFilters = !!(
    filters.rsi_min != null ||
    filters.rsi_max != null ||
    filters.price_min != null ||
    filters.price_max != null ||
    filters.sector ||
    filters.exchange ||
    filters.above_sma200 != null ||
    filters.above_sma50 != null ||
    filters.golden_cross ||
    filters.death_cross
  );

  const exportCSV = useCallback(() => {
    if (!results || results.length === 0) return;
    const headers = ["Ticker", "Name", "Sector", "Price", "Change %", "RSI 14", "Above SMA 50", "Above SMA 200"];
    const rows = results.map((r) => [
      r.ticker,
      `"${(r.name ?? "").replace(/"/g, '""')}"`,
      r.sector ?? "",
      r.close?.toFixed(2) ?? "",
      r.change_pct?.toFixed(2) ?? "",
      r.rsi_14?.toFixed(1) ?? "",
      r.above_sma50 != null ? (r.above_sma50 ? "Yes" : "No") : "",
      r.above_sma200 != null ? (r.above_sma200 ? "Yes" : "No") : "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `screener-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

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
          Filter stocks by technical indicators
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
        {savedPresets.map((p, i) => (
          <div key={p.createdAt} className="group relative">
            <button
              type="button"
              onClick={() => setFilters({ ...p.filters, limit: 50 })}
              className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              {p.name}
            </button>
            <button
              type="button"
              onClick={() => deleteSavedPreset(i)}
              className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-red/90 text-white group-hover:flex"
              aria-label={`Delete ${p.name} preset`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
        {hasActiveFilters && !showSaveInput && (
          <button
            type="button"
            onClick={() => setShowSaveInput(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <Save className="h-3 w-3" />
            Save filters
          </button>
        )}
        {showSaveInput && (
          <div className="inline-flex items-center gap-1.5">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveCurrentFilters();
                if (e.key === "Escape") { setShowSaveInput(false); setSaveName(""); }
              }}
              placeholder="Preset name..."
              autoFocus
              className="w-32 rounded-lg border border-accent bg-bg-primary px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
            />
            <button
              type="button"
              onClick={saveCurrentFilters}
              disabled={!saveName.trim() || isDuplicateName}
              className="rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save
            </button>
            {isDuplicateName && (
              <span className="text-[10px] text-red">Name taken</span>
            )}
            <button
              type="button"
              onClick={() => { setShowSaveInput(false); setSaveName(""); }}
              className="rounded-lg px-1.5 py-1 text-xs text-text-muted hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        )}
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
              if (filters.price_min != null) count++;
              if (filters.price_max != null) count++;
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
          <span className="flex items-center gap-2">
            <kbd className="hidden rounded border border-border bg-bg-hover px-1.5 py-0.5 text-[10px] font-medium text-text-muted sm:inline">F</kbd>
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </span>
        </button>
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {(() => {
            let count = 0;
            if (filters.rsi_min != null) count++;
            if (filters.rsi_max != null) count++;
            if (filters.price_min != null) count++;
            if (filters.price_max != null) count++;
            if (filters.sector) count++;
            if (filters.above_sma200 != null) count++;
            if (filters.above_sma50 != null) count++;
            if (filters.golden_cross) count++;
            if (filters.death_cross) count++;
            return count > 0 ? `${count} active filter${count > 1 ? "s" : ""}` : "No active filters";
          })()}
        </div>

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
                  onBlur={(e) => { const v = +e.target.value; if (e.target.value && (v < 0 || v > 100)) setFilter("rsi_min", Math.max(0, Math.min(100, v))); }}
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
                  onBlur={(e) => { const v = +e.target.value; if (e.target.value && (v < 0 || v > 100)) setFilter("rsi_max", Math.max(0, Math.min(100, v))); }}
                  min={0}
                  max={100}
                  aria-label="Maximum RSI value"
                  className="w-full rounded-lg border border-border bg-bg-primary px-2 py-1.5 text-xs text-text-primary"
                />
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="mb-1 block text-xs text-text-muted">Price Range ($)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.price_min ?? ""}
                  onChange={(e) => setFilter("price_min", e.target.value ? +e.target.value : undefined)}
                  onBlur={(e) => { const v = +e.target.value; if (e.target.value && v < 0) setFilter("price_min", 0); }}
                  min={0}
                  step={1}
                  aria-label="Minimum price"
                  className="w-full rounded-lg border border-border bg-bg-primary px-2 py-1.5 text-xs text-text-primary"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.price_max ?? ""}
                  onChange={(e) => setFilter("price_max", e.target.value ? +e.target.value : undefined)}
                  onBlur={(e) => { const v = +e.target.value; if (e.target.value && v < 0) setFilter("price_max", 0); }}
                  min={0}
                  step={1}
                  aria-label="Maximum price"
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

            {/* Exchange */}
            <div>
              <label className="mb-1 block text-xs text-text-muted">Exchange</label>
              <select
                value={filters.exchange ?? ""}
                onChange={(e) => setFilter("exchange", e.target.value)}
                aria-label="Filter by exchange"
                className="w-full rounded-lg border border-border bg-bg-primary px-2 py-1.5 text-xs text-text-primary"
              >
                <option value="">All Exchanges</option>
                <option value="NMS">NASDAQ</option>
                <option value="NYQ">NYSE</option>
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
        if (filters.price_min != null) chips.push({ label: `Price ≥ $${filters.price_min}`, clear: () => setFilter("price_min", undefined) });
        if (filters.price_max != null) chips.push({ label: `Price ≤ $${filters.price_max}`, clear: () => setFilter("price_max", undefined) });
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
        action={
          results && results.length > 0 ? (
            <div className="flex items-center gap-2">
              {results.length >= 2 && (
                <button
                  type="button"
                  onClick={() => {
                    const tickers = results.slice(0, 3).map((r) => r.ticker).join(",");
                    navigate(`/compare?tickers=${tickers}`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent hover:text-accent"
                >
                  <GitCompareArrows className="h-3.5 w-3.5" />
                  Compare top {Math.min(3, results.length)}
                </button>
              )}
              <button
                type="button"
                onClick={exportCSV}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent hover:text-accent"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
            </div>
          ) : undefined
        }
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
                  <th scope="col" className="pb-2" aria-sort={filters.sort_by === "price" ? (filters.sort_dir === "asc" ? "ascending" : "descending") : "none"}>
                    <button type="button" onClick={() => toggleSort("price")} className="flex items-center gap-1">
                      Price {sortIcon("price")}
                    </button>
                  </th>
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
                  <th scope="col" className="pb-2" aria-sort={filters.sort_by === "sector" ? (filters.sort_dir === "asc" ? "ascending" : "descending") : "none"}>
                    <button type="button" onClick={() => toggleSort("sector")} className="flex items-center gap-1">
                      Sector {sortIcon("sector")}
                    </button>
                  </th>
                  <th scope="col" className="w-8 pb-2" />
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
                    <td className="py-2">
                      <div className="flex items-center gap-1">
                        {hasActiveFilters && (
                          <FilterMatchTooltip reasons={getMatchReasons(r, filters)} />
                        )}
                        <Link
                          to={`/compare?tickers=${r.ticker}`}
                          className="rounded-md p-1 text-text-muted hover:bg-bg-hover hover:text-accent transition-colors"
                          title={`Compare ${r.ticker}`}
                          aria-label={`Compare ${r.ticker} with other stocks`}
                        >
                          <GitCompareArrows className="h-3.5 w-3.5" />
                        </Link>
                      </div>
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
