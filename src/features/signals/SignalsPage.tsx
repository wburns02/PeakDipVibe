import { useState } from "react";
import { Filter, ChevronDown, Download } from "lucide-react";
import { ErrorState } from "@/components/ui/ErrorState";
import { usePatternSignals, useSignalStats } from "@/api/hooks/useSignals";
import { useSectors } from "@/api/hooks/useMarket";
import { Card } from "@/components/ui/Card";
import { SignalStatsCards } from "./components/SignalStatsCards";
import { SignalTable } from "./components/SignalTable";
import { usePageTitle } from "@/hooks/usePageTitle";
import type { SignalFilters } from "@/api/types/signals";
import type { PatternSignal } from "@/api/types/signals";

const CATALYST_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "earnings_beat", label: "Earnings Beat" },
  { value: "upgrade", label: "Analyst Upgrade" },
  { value: "guidance", label: "Positive Guidance" },
  { value: "positive_news", label: "Positive News" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "confirmed", label: "Confirmed" },
  { value: "failed", label: "Failed" },
];

function downloadCSV(signals: PatternSignal[]) {
  const headers = ["Ticker", "Name", "Date", "Gap %", "Selloff %", "Catalyst", "Strength", "1d Return", "5d Return", "10d Return", "Status", "Sector"];
  const rows = signals.map((s) => [
    s.ticker,
    s.name ?? "",
    s.signal_date,
    s.gap_up_pct?.toFixed(2) ?? "",
    s.selloff_pct?.toFixed(2) ?? "",
    s.catalyst_type ?? "",
    s.signal_strength?.toString() ?? "",
    s.outcome_1d?.toFixed(2) ?? "",
    s.outcome_5d?.toFixed(2) ?? "",
    s.outcome_10d?.toFixed(2) ?? "",
    s.status ?? "",
    s.sector ?? "",
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `signals-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function SignalsPage() {
  usePageTitle("News Catalyst Scanner");
  const [filters, setFilters] = useState<SignalFilters>({
    days: 30,
    min_strength: 0,
    sort_by: "signal_date",
    limit: 50,
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data: signals, isLoading, isFetching, isError, refetch } = usePatternSignals(filters);
  const isRefetching = isFetching && !isLoading;
  const { data: stats, isLoading: statsLoading } = useSignalStats(filters.days);
  const { data: sectors } = useSectors();

  const setFilter = (key: keyof SignalFilters, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const handleSort = (field: string) => {
    setFilters((prev) => ({ ...prev, sort_by: field }));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            News Catalyst Scanner
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Detect gap-up + sell-off patterns driven by earnings, upgrades, and
            positive news
          </p>
        </div>
        {signals && signals.length > 0 && (
          <button
            type="button"
            onClick={() => downloadCSV(signals)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-card px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
            title="Export signals to CSV"
            aria-label="Export signals to CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        )}
      </div>

      {/* Stats cards */}
      <SignalStatsCards stats={stats} isLoading={statsLoading} />

      {/* Filters */}
      <Card>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
          aria-controls="signal-filters"
          className="flex w-full items-center justify-between text-sm font-medium text-text-primary"
        >
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
          />
        </button>

        {showFilters && (
          <div id="signal-filters" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Lookback days */}
            <div>
              <label className="mb-1 block text-xs text-text-muted">
                Lookback (days)
              </label>
              <input
                type="number"
                value={filters.days ?? 30}
                onChange={(e) =>
                  setFilter("days", e.target.value ? +e.target.value : 30)
                }
                min={1}
                max={365}
                aria-label="Lookback period in days"
                className="w-full rounded-lg border border-border bg-bg-primary px-2 py-1.5 text-xs text-text-primary"
              />
            </div>

            {/* Min strength */}
            <div>
              <label className="mb-1 block text-xs text-text-muted">
                Min Strength ({filters.min_strength ?? 0})
              </label>
              <input
                type="range"
                value={filters.min_strength ?? 0}
                onChange={(e) => setFilter("min_strength", +e.target.value)}
                min={0}
                max={100}
                step={5}
                aria-label="Minimum signal strength"
                aria-valuenow={filters.min_strength ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
                className="w-full accent-accent"
              />
            </div>

            {/* Status */}
            <div>
              <label className="mb-1 block text-xs text-text-muted">
                Status
              </label>
              <select
                value={filters.status ?? ""}
                onChange={(e) => setFilter("status", e.target.value)}
                aria-label="Filter by signal status"
                className="w-full rounded-lg border border-border bg-bg-primary px-2 py-1.5 text-xs text-text-primary"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Catalyst type */}
            <div>
              <label className="mb-1 block text-xs text-text-muted">
                Catalyst Type
              </label>
              <select
                value={filters.catalyst_type ?? ""}
                onChange={(e) => setFilter("catalyst_type", e.target.value)}
                aria-label="Filter by catalyst type"
                className="w-full rounded-lg border border-border bg-bg-primary px-2 py-1.5 text-xs text-text-primary"
              >
                {CATALYST_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sector */}
            <div>
              <label className="mb-1 block text-xs text-text-muted">
                Sector
              </label>
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
          </div>
        )}
      </Card>

      {/* Signal table */}
      {isError ? (
        <ErrorState message="Could not load signals. The API may be offline." onRetry={refetch} />
      ) : (
        <div className={`transition-opacity duration-300 ${isRefetching ? "opacity-50" : ""}`}>
          <SignalTable
            signals={signals}
            isLoading={isLoading}
            sortBy={filters.sort_by ?? "signal_date"}
            onSort={handleSort}
          />
        </div>
      )}
    </div>
  );
}
