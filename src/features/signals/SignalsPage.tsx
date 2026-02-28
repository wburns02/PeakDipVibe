import { useState } from "react";
import { Filter, ChevronDown } from "lucide-react";
import { usePatternSignals, useSignalStats } from "@/api/hooks/useSignals";
import { useSectors } from "@/api/hooks/useMarket";
import { Card } from "@/components/ui/Card";
import { SignalStatsCards } from "./components/SignalStatsCards";
import { SignalTable } from "./components/SignalTable";
import type { SignalFilters } from "@/api/types/signals";

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

export function SignalsPage() {
  const [filters, setFilters] = useState<SignalFilters>({
    days: 30,
    min_strength: 0,
    sort_by: "signal_date",
    limit: 50,
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data: signals, isLoading } = usePatternSignals(filters);
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
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          News Catalyst Scanner
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Detect gap-up + sell-off patterns driven by earnings, upgrades, and
          positive news
        </p>
      </div>

      {/* Stats cards */}
      <SignalStatsCards stats={stats} isLoading={statsLoading} />

      {/* Filters */}
      <Card>
        <button
          onClick={() => setShowFilters(!showFilters)}
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
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      <SignalTable
        signals={signals}
        isLoading={isLoading}
        sortBy={filters.sort_by ?? "signal_date"}
        onSort={handleSort}
      />
    </div>
  );
}
