import { useState, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { api } from "@/api/client";
import { z } from "zod";
import { ScreenerResultSchema, type ScreenerResult } from "@/api/types/screener";
import { useWatchlist } from "@/hooks/useWatchlist";
import { usePageTitle } from "@/hooks/usePageTitle";
import { normalizeSector } from "@/lib/formatters";
import { stripEmptyParams } from "@/lib/params";
import { Skeleton } from "@/components/ui/Skeleton";
import { AlertSummary } from "./components/AlertSummary";
import { AlertCard } from "./components/AlertCard";
import { AlertFilters } from "./components/AlertFilters";
import { buildAlertFeed, type AlertType, type AlertBias } from "./lib/alerts";
import { Bell, Radar } from "lucide-react";

/** Run a screener scan with given filters. */
async function scanScreener(filters: Record<string, unknown>): Promise<ScreenerResult[]> {
  const params = stripEmptyParams(filters);
  const { data } = await api.get("/screener", { params });
  const results = z.array(ScreenerResultSchema).parse(data);
  return results.map((r) => ({ ...r, sector: r.sector ? normalizeSector(r.sector) : r.sector }));
}

// Define the 6 parallel scans
const SCANS = [
  { key: "oversold",     filters: { rsi_max: 30, limit: 100, sort_by: "rsi_14", sort_dir: "asc" } },
  { key: "overbought",   filters: { rsi_min: 70, limit: 100, sort_by: "rsi_14", sort_dir: "desc" } },
  { key: "goldenCross",  filters: { golden_cross: true, limit: 50, sort_by: "change_pct", sort_dir: "desc" } },
  { key: "deathCross",   filters: { death_cross: true, limit: 50, sort_by: "change_pct", sort_dir: "asc" } },
  { key: "topGainers",   filters: { limit: 50, sort_by: "change_pct", sort_dir: "desc" } },
  { key: "topLosers",    filters: { limit: 50, sort_by: "change_pct", sort_dir: "asc" } },
] as const;

export function MarketAlertsPage() {
  usePageTitle("Market Alerts");

  const { watchlist } = useWatchlist();
  const [typeFilter, setTypeFilter] = useState<AlertType | null>(null);
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [biasFilter, setBiasFilter] = useState<AlertBias | null>(null);
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);

  // Fire all 6 scans in parallel
  const scanQueries = useQueries({
    queries: SCANS.map((scan) => ({
      queryKey: ["alert-scan", scan.key, scan.filters],
      queryFn: () => scanScreener(scan.filters),
      staleTime: 3 * 60 * 1000,
    })),
  });

  const isLoading = scanQueries.some((q) => q.isLoading);

  // Build unified alert feed
  const allAlerts = useMemo(() => {
    const results = {
      oversold: scanQueries[0].data ?? [],
      overbought: scanQueries[1].data ?? [],
      goldenCross: scanQueries[2].data ?? [],
      deathCross: scanQueries[3].data ?? [],
      topGainers: scanQueries[4].data ?? [],
      topLosers: scanQueries[5].data ?? [],
    };
    return buildAlertFeed(results, watchlist);
  }, [scanQueries[0].data, scanQueries[1].data, scanQueries[2].data, scanQueries[3].data, scanQueries[4].data, scanQueries[5].data, watchlist]);

  // Collect sectors for filter
  const sectors = useMemo(() => {
    const set = new Set<string>();
    for (const a of allAlerts) if (a.sector !== "Unknown") set.add(a.sector);
    return Array.from(set).sort();
  }, [allAlerts]);

  // Apply filters
  const filteredAlerts = useMemo(() => {
    return allAlerts.filter((a) => {
      if (typeFilter && a.type !== typeFilter) return false;
      if (watchlistOnly && !a.isWatchlisted) return false;
      if (biasFilter && a.bias !== biasFilter) return false;
      if (sectorFilter && a.sector !== sectorFilter) return false;
      return true;
    });
  }, [allAlerts, typeFilter, watchlistOnly, biasFilter, sectorFilter]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <Bell className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Market Alerts</h1>
            <p className="text-sm text-text-muted">
              Technical events detected across 500+ stocks
            </p>
          </div>
        </div>
        {!isLoading && (
          <div className="flex items-center gap-1.5 rounded-lg border border-green/30 bg-green/10 px-3 py-1.5">
            <Radar className="h-3.5 w-3.5 text-green animate-pulse" />
            <span className="text-xs font-medium text-green">Live scanning</span>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
          <Skeleton className="h-10 rounded-lg" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}

      {/* Content */}
      {!isLoading && (
        <>
          {/* Summary */}
          <AlertSummary
            alerts={allAlerts}
            activeFilter={typeFilter}
            onFilterToggle={setTypeFilter}
          />

          {/* Filters row */}
          <AlertFilters
            watchlistOnly={watchlistOnly}
            onWatchlistToggle={() => setWatchlistOnly((v) => !v)}
            biasFilter={biasFilter}
            onBiasChange={setBiasFilter}
            sectorFilter={sectorFilter}
            onSectorChange={setSectorFilter}
            sectors={sectors}
          />

          {/* Results count */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">
              Showing {filteredAlerts.length} of {allAlerts.length} alerts
              {watchlistOnly && " (watchlist only)"}
              {typeFilter && ` (${typeFilter.replace(/_/g, " ")})`}
            </p>
          </div>

          {/* Alert feed */}
          {filteredAlerts.length > 0 ? (
            <div className="space-y-2">
              {filteredAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-bg-card py-16 text-center">
              <Bell className="mb-3 h-10 w-10 text-text-muted/30" />
              <h2 className="text-lg font-bold text-text-primary">No alerts match your filters</h2>
              <p className="mt-1 max-w-sm text-sm text-text-muted">
                {watchlistOnly
                  ? "None of your watchlist stocks triggered alerts today. Try turning off the watchlist filter."
                  : "Try adjusting your filters to see more alerts."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setTypeFilter(null);
                  setWatchlistOnly(false);
                  setBiasFilter(null);
                  setSectorFilter(null);
                }}
                className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/80"
              >
                Reset Filters
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
