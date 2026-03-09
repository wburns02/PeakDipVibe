import { useState } from "react";
import { Link } from "react-router-dom";
import { Filter, ChevronDown, ChevronLeft, ChevronRight, Download, Play, SlidersHorizontal, CalendarDays } from "lucide-react";
import { ErrorState } from "@/components/ui/ErrorState";
import { usePatternSignals, useSignalStats } from "@/api/hooks/useSignals";
import { useSectors } from "@/api/hooks/useMarket";
import { Card } from "@/components/ui/Card";
import { MiniLesson } from "@/components/education/MiniLesson";
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

const PAGE_SIZE = 50;

export function SignalsPage() {
  usePageTitle("News Catalyst Scanner");
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<SignalFilters>({
    days: 30,
    min_strength: 0,
    sort_by: "signal_date",
    limit: PAGE_SIZE,
  });
  const [showFilters, setShowFilters] = useState(false);

  const actualFilters = { ...filters, offset: page * PAGE_SIZE };
  const { data: signals, isLoading, isFetching, isError, refetch } = usePatternSignals(actualFilters);
  const isRefetching = isFetching && !isLoading;
  const { data: stats, isLoading: statsLoading } = useSignalStats(filters.days);
  const { data: sectors } = useSectors();

  const totalSignals = stats?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalSignals / PAGE_SIZE));
  const hasMore = signals?.length === PAGE_SIZE;

  const setFilter = (key: keyof SignalFilters, value: unknown) => {
    setPage(0);
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
            className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-card px-3 py-3 text-sm font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
            title={`Export ${signals.length} signals to CSV`}
            aria-label={`Export ${signals.length} signals to CSV`}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV ({signals.length})</span>
          </button>
        )}
      </div>

      {/* Stats cards */}
      <SignalStatsCards stats={stats} isLoading={statsLoading} />

      {/* Educational mini-lesson */}
      <MiniLesson
        icon="🛡"
        title="Understanding Risk: Why Some Signals Fail"
        points={[
          "Not every gap-up leads to more gains. About half the time, the stock gives back some or all of the initial jump — that's normal.",
          "Signals with higher strength scores (60+) and strong catalysts like earnings beats tend to have better odds, but nothing is guaranteed.",
          "Use the 'Bounce' column to see which events recovered and which faded. Over time, you'll start spotting patterns.",
          "The best risk management rule: never bet more than you can afford to lose. Diversification (spreading bets across many stocks) is your friend.",
        ]}
      />

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
              <label className="mb-1 block text-sm text-text-muted">
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
                className="w-full rounded-lg border border-border bg-bg-primary px-2 py-3 text-sm text-text-primary"
              />
            </div>

            {/* Min strength */}
            <div>
              <label className="mb-1 block text-sm text-text-muted">
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
                aria-describedby="strength-hint"
                className="w-full accent-accent"
              />
              <span id="strength-hint" className="sr-only">0 = weak signal, 100 = strongest signal</span>
            </div>

            {/* Status */}
            <div>
              <label className="mb-1 block text-sm text-text-muted">
                Status
              </label>
              <select
                value={filters.status ?? ""}
                onChange={(e) => setFilter("status", e.target.value)}
                aria-label="Filter by signal status"
                className="w-full rounded-lg border border-border bg-bg-primary px-2 py-3 text-sm text-text-primary"
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
              <label className="mb-1 block text-sm text-text-muted">
                Catalyst Type
              </label>
              <select
                value={filters.catalyst_type ?? ""}
                onChange={(e) => setFilter("catalyst_type", e.target.value)}
                aria-label="Filter by catalyst type"
                className="w-full rounded-lg border border-border bg-bg-primary px-2 py-3 text-sm text-text-primary"
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
              <label className="mb-1 block text-sm text-text-muted">
                Sector
              </label>
              <select
                value={filters.sector ?? ""}
                onChange={(e) => setFilter("sector", e.target.value)}
                aria-label="Filter by sector"
                className="w-full rounded-lg border border-border bg-bg-primary px-2 py-3 text-sm text-text-primary"
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

      {/* Pagination */}
      {!isLoading && totalSignals > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 rounded-lg border border-border bg-bg-card px-3 py-3 text-sm font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </button>
          <span className="text-sm text-text-muted">
            Page {page + 1} of {totalPages} ({totalSignals} signals)
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="flex items-center gap-1 rounded-lg border border-border bg-bg-card px-3 py-3 text-sm font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Next steps */}
      {!isLoading && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            to="/simulator"
            className="group flex items-center gap-3 rounded-xl border border-border bg-bg-card p-4 transition-colors hover:border-accent/30"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Play className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary group-hover:text-accent">Practice Trading</p>
              <p className="text-sm text-text-muted">Replay events with virtual money</p>
            </div>
          </Link>
          <Link
            to="/screener"
            className="group flex items-center gap-3 rounded-xl border border-border bg-bg-card p-4 transition-colors hover:border-accent/30"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary group-hover:text-accent">Screen Stocks</p>
              <p className="text-sm text-text-muted">Filter by RSI, price & sector</p>
            </div>
          </Link>
          <Link
            to="/earnings"
            className="group flex items-center gap-3 rounded-xl border border-border bg-bg-card p-4 transition-colors hover:border-accent/30"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary group-hover:text-accent">Earnings Calendar</p>
              <p className="text-sm text-text-muted">Upcoming reports & analysis</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
