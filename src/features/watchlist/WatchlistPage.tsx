import { memo, useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Star, TrendingUp, TrendingDown, Inbox, ArrowUpDown, Download, BarChart3, Trophy, Bell, BellRing, X } from "lucide-react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/api/client";
import { TickerDetailSchema } from "@/api/types/ticker";
import { IndicatorSnapshotSchema } from "@/api/types/indicator";
import { ScreenerResultSchema } from "@/api/types/screener";
import { z } from "zod";
import { useTicker } from "@/api/hooks/useTickers";
import { useLatestIndicators } from "@/api/hooks/useIndicators";
import { useSparkline } from "@/api/hooks/useCompare";
import { STALE_FRESH } from "@/api/queryConfig";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { MiniSparkline } from "@/components/charts/MiniSparkline";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import type { PriceAlert } from "@/hooks/usePriceAlerts";

const SECTOR_COLORS: Record<string, string> = {
  "Technology": "#6366f1",
  "Information Technology": "#6366f1",
  "Health Care": "#22c55e",
  "Financials": "#eab308",
  "Consumer Discretionary": "#f97316",
  "Communication Services": "#ec4899",
  "Industrials": "#64748b",
  "Consumer Staples": "#14b8a6",
  "Energy": "#ef4444",
  "Utilities": "#8b5cf6",
  "Real Estate": "#06b6d4",
  "Materials": "#a3e635",
};

function PriceAlertEditor({
  ticker,
  currentPrice,
  alert,
  onSave,
  onRemove,
  onClose,
}: {
  ticker: string;
  currentPrice: number | null;
  alert?: PriceAlert;
  onSave: (ticker: string, alert: PriceAlert) => void;
  onRemove: (ticker: string) => void;
  onClose: () => void;
}) {
  const [above, setAbove] = useState(alert?.above?.toString() ?? "");
  const [below, setBelow] = useState(alert?.below?.toString() ?? "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const aboveVal = above ? parseFloat(above) : undefined;
  const belowVal = below ? parseFloat(below) : undefined;
  const validationError =
    aboveVal != null && aboveVal <= 0
      ? "Above price must be positive"
      : belowVal != null && belowVal <= 0
        ? "Below price must be positive"
        : aboveVal != null && belowVal != null && aboveVal <= belowVal
          ? "Above must be higher than below"
          : null;

  const handleSave = () => {
    if (validationError) return;
    if (aboveVal == null && belowVal == null) {
      onRemove(ticker);
    } else {
      onSave(ticker, { above: aboveVal, below: belowVal });
    }
    onClose();
  };

  return (
    <div ref={ref} className="absolute right-0 top-full z-40 mt-1 w-56 rounded-lg border border-border bg-bg-card p-3 shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-text-primary">Price Alerts — {ticker}</p>
        <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mb-2 text-[10px] text-text-muted">Current: {currentPrice != null ? formatCurrency(currentPrice) : "—"}</p>
      <div className="space-y-2">
        <div>
          <label className="text-[10px] text-text-muted">Alert above ($)</label>
          <input
            type="number"
            step="0.01"
            value={above}
            onChange={(e) => setAbove(e.target.value)}
            placeholder={currentPrice ? (currentPrice * 1.05).toFixed(2) : "0.00"}
            className="mt-0.5 w-full rounded-md border border-border bg-bg-primary px-2 py-1 text-xs text-text-primary placeholder:text-text-muted/50 focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] text-text-muted">Alert below ($)</label>
          <input
            type="number"
            step="0.01"
            value={below}
            onChange={(e) => setBelow(e.target.value)}
            placeholder={currentPrice ? (currentPrice * 0.95).toFixed(2) : "0.00"}
            className="mt-0.5 w-full rounded-md border border-border bg-bg-primary px-2 py-1 text-xs text-text-primary placeholder:text-text-muted/50 focus:border-accent focus:outline-none"
          />
        </div>
      </div>
      {validationError && (
        <p className="mt-2 text-[10px] text-red">{validationError}</p>
      )}
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!!validationError}
          className="flex-1 rounded-md bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save
        </button>
        {alert && (
          <button
            type="button"
            onClick={() => { onRemove(ticker); onClose(); }}
            className="rounded-md border border-border px-2 py-1 text-xs text-red hover:bg-red/10"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

interface WatchlistRowProps {
  ticker: string;
  onRemove: () => void;
  alert?: PriceAlert;
  onSetAlert: (ticker: string, alert: PriceAlert) => void;
  onRemoveAlert: (ticker: string) => void;
  checkTriggered: (ticker: string, price: number | null) => "above" | "below" | null;
}

const WatchlistRow = memo(function WatchlistRow({ ticker, onRemove, alert, onSetAlert, onRemoveAlert, checkTriggered }: WatchlistRowProps) {
  const [showEditor, setShowEditor] = useState(false);
  const { data: detail, isLoading } = useTicker(ticker);
  const { data: indicators } = useLatestIndicators(ticker);
  const { data: sparkline } = useSparkline(ticker, 7);

  // Fetch sector peers for ranking (React Query deduplicates same-sector calls)
  const { data: sectorPeers } = useQuery({
    queryKey: ["screener", { sector: detail?.sector, sort_by: "change", sort_dir: "desc", limit: 200 }],
    queryFn: async () => {
      const { data } = await api.get("/screener", {
        params: { sector: detail!.sector, sort_by: "change", sort_dir: "desc", limit: 200 },
      });
      return z.array(ScreenerResultSchema).parse(data);
    },
    enabled: !!detail?.sector,
    staleTime: STALE_FRESH,
  });

  const sectorRank = useMemo(() => {
    if (!sectorPeers) return null;
    const idx = sectorPeers.findIndex((p) => p.ticker === ticker);
    return idx >= 0 ? { rank: idx + 1, total: sectorPeers.length } : null;
  }, [sectorPeers, ticker]);

  if (isLoading) return <Skeleton className="h-14" />;
  if (!detail) return null;

  const triggered = checkTriggered(ticker, detail.latest_close ?? null);
  const rsi = indicators?.indicators?.RSI_14;

  const sparkColor =
    sparkline && sparkline.closes.length > 1
      ? sparkline.closes[sparkline.closes.length - 1] >= sparkline.closes[0]
        ? "#22c55e"
        : "#ef4444"
      : "#6366f1";

  const hasAlert = !!alert;
  const triggeredClass = triggered === "above"
    ? "ring-1 ring-green/50 bg-green/5"
    : triggered === "below"
      ? "ring-1 ring-red/50 bg-red/5"
      : "";

  return (
    <div className={`relative flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-bg-hover ${triggeredClass}`}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onRemove} aria-label={`Remove ${ticker} from watchlist`} className="text-amber hover:text-amber/70">
          <Star className="h-4 w-4 fill-amber" />
        </button>
        <Link to={`/ticker/${ticker}`} className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-accent">{ticker}</p>
              {triggered && (
                <Badge variant={triggered === "above" ? "green" : "red"}>
                  {triggered === "above" ? "Above" : "Below"} {formatCurrency(triggered === "above" ? alert!.above! : alert!.below!)}
                </Badge>
              )}
            </div>
            <p className="max-w-[160px] truncate text-xs text-text-muted">
              {detail.name}
            </p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {/* Sparkline — hidden on mobile */}
        {sparkline && (
          <div className="hidden w-20 sm:block">
            <MiniSparkline
              data={sparkline.closes.map((v) => ({ value: v }))}
              color={sparkColor}
              height={28}
            />
          </div>
        )}

        {/* Price + Sector Rank */}
        <div className="text-right">
          <p className="text-sm text-text-primary">
            {detail.latest_close ? formatCurrency(detail.latest_close) : "—"}
          </p>
          <div className="flex items-center justify-end gap-1">
            <p className="hidden text-xs text-text-muted sm:block">{detail.sector}</p>
            {sectorRank && (
              <span
                className={`inline-flex items-center gap-0.5 rounded px-1 py-px text-[10px] font-medium ${
                  sectorRank.rank <= 3
                    ? "bg-amber/15 text-amber"
                    : sectorRank.rank <= Math.ceil(sectorRank.total * 0.25)
                      ? "bg-green/15 text-green"
                      : sectorRank.rank > Math.ceil(sectorRank.total * 0.75)
                        ? "bg-red/15 text-red"
                        : "bg-bg-hover text-text-muted"
                }`}
                title={`#${sectorRank.rank} of ${sectorRank.total} in ${detail.sector} by daily change`}
              >
                {sectorRank.rank <= 3 && <Trophy className="h-2.5 w-2.5" />}
                #{sectorRank.rank}/{sectorRank.total}
              </span>
            )}
          </div>
        </div>

        {/* RSI — hidden on small screens */}
        <div className="hidden w-16 text-right md:block">
          {rsi != null ? (
            <Badge variant={rsi < 30 ? "green" : rsi > 70 ? "red" : "default"}>
              RSI {rsi.toFixed(0)}
            </Badge>
          ) : (
            <span className="text-xs text-text-muted">—</span>
          )}
        </div>

        {/* Signal — hidden on small screens */}
        <div className="hidden w-20 text-right md:block">
          {rsi != null ? (
            rsi < 30 ? (
              <Badge variant="green">
                <TrendingUp className="mr-1 h-3 w-3" />
                Oversold
              </Badge>
            ) : rsi > 70 ? (
              <Badge variant="red">
                <TrendingDown className="mr-1 h-3 w-3" />
                Overbought
              </Badge>
            ) : (
              <Badge variant="default">Neutral</Badge>
            )
          ) : null}
        </div>

        {/* Alert bell */}
        <div className="relative w-8 text-center">
          <button
            type="button"
            onClick={() => setShowEditor(!showEditor)}
            className={`rounded-md p-1 transition-colors ${
              hasAlert
                ? "text-accent hover:bg-accent/10"
                : "text-text-muted hover:bg-bg-hover hover:text-text-secondary"
            }`}
            title={hasAlert
              ? `Alert: ${alert.above ? `above ${formatCurrency(alert.above)}` : ""}${alert.above && alert.below ? " / " : ""}${alert.below ? `below ${formatCurrency(alert.below)}` : ""}`
              : "Set price alert"
            }
            aria-label={`${hasAlert ? "Edit" : "Set"} price alert for ${ticker}`}
          >
            {hasAlert ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          </button>
          {showEditor && (
            <PriceAlertEditor
              ticker={ticker}
              currentPrice={detail.latest_close ?? null}
              alert={alert}
              onSave={onSetAlert}
              onRemove={onRemoveAlert}
              onClose={() => setShowEditor(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
});

function WatchlistSummary({ tickers }: { tickers: string[] }) {
  const detailQueries = useQueries({
    queries: tickers.map((t) => ({
      queryKey: ["ticker", t],
      queryFn: async () => {
        const { data } = await api.get(`/tickers/${t}`);
        return TickerDetailSchema.parse(data);
      },
    })),
  });

  const indicatorQueries = useQueries({
    queries: tickers.map((t) => ({
      queryKey: ["indicators", t],
      queryFn: async () => {
        const { data } = await api.get(`/indicators/${t}`);
        return IndicatorSnapshotSchema.parse(data);
      },
    })),
  });

  const sparkQueries = useQueries({
    queries: tickers.map((t) => ({
      queryKey: ["sparkline", t, 7],
      queryFn: async () => {
        const { data } = await api.get(`/prices/${t}/sparkline`, { params: { days: 7 } });
        return data as { closes: number[] };
      },
    })),
  });

  const details = detailQueries.map((q) => q.data).filter(Boolean);
  const indicators = indicatorQueries.map((q) => q.data).filter(Boolean);
  const sparks = sparkQueries.map((q) => q.data).filter(Boolean);

  // Sector distribution
  const sectorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of details) {
      if (d?.sector) counts[d.sector] = (counts[d.sector] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [details]);

  // Average RSI
  const avgRsi = useMemo(() => {
    const rsis = indicators
      .map((i) => i?.indicators?.RSI_14)
      .filter((v): v is number => v != null);
    return rsis.length > 0 ? rsis.reduce((a, b) => a + b, 0) / rsis.length : null;
  }, [indicators]);

  // Average 7d change %
  const avgChange = useMemo(() => {
    const changes: number[] = [];
    for (const s of sparks) {
      if (s && s.closes.length > 1) {
        const first = s.closes[0];
        const last = s.closes[s.closes.length - 1];
        if (first !== 0) changes.push(((last - first) / first) * 100);
      }
    }
    return changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : null;
  }, [sparks]);

  // CSV export
  const exportCSV = useCallback(() => {
    if (details.length === 0) return;
    const headers = ["Ticker", "Name", "Sector", "Price", "RSI 14", "7d Change %"];
    const rows = tickers.map((t, i) => {
      const d = detailQueries[i]?.data;
      const ind = indicatorQueries[i]?.data;
      const sp = sparkQueries[i]?.data;
      const rsi = ind?.indicators?.RSI_14;
      let chg = "";
      if (sp && sp.closes.length > 1 && sp.closes[0] !== 0) {
        chg = (((sp.closes[sp.closes.length - 1] - sp.closes[0]) / sp.closes[0]) * 100).toFixed(2);
      }
      return [
        t,
        `"${(d?.name ?? "").replace(/"/g, '""')}"`,
        d?.sector ?? "",
        d?.latest_close?.toFixed(2) ?? "",
        rsi?.toFixed(1) ?? "",
        chg,
      ];
    });
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `watchlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tickers, details, detailQueries, indicatorQueries, sparkQueries]);

  const isLoading = detailQueries.some((q) => q.isLoading);
  const totalSectors = sectorCounts.reduce((sum, [, c]) => sum + c, 0);

  if (isLoading) return <Skeleton className="h-28" />;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">Portfolio Summary</h3>
        </div>
        <button
          type="button"
          onClick={exportCSV}
          className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-text-secondary transition-colors hover:border-accent hover:text-accent"
        >
          <Download className="h-3 w-3" />
          Export CSV
        </button>
      </div>

      {/* Stats row */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[11px] text-text-muted">Stocks</p>
          <p className="text-lg font-semibold text-text-primary">{tickers.length}</p>
        </div>
        <div>
          <p className="text-[11px] text-text-muted">Avg RSI</p>
          <p className="text-lg font-semibold text-text-primary">
            {avgRsi != null ? (
              <span className={avgRsi < 30 ? "text-green" : avgRsi > 70 ? "text-red" : ""}>
                {avgRsi.toFixed(1)}
              </span>
            ) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-text-muted">7d Chg</p>
          <p className="text-lg font-semibold text-text-primary">
            {avgChange != null ? (
              <span className={avgChange >= 0 ? "text-green" : "text-red"}>
                {formatPercent(avgChange)}
              </span>
            ) : "—"}
          </p>
        </div>
      </div>

      {/* Sector breakdown bar */}
      {sectorCounts.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs text-text-muted">Sector Distribution</p>
          <div className="flex h-3 overflow-hidden rounded-full">
            {sectorCounts.map(([sector, count]) => (
              <div
                key={sector}
                style={{
                  width: `${(count / totalSectors) * 100}%`,
                  backgroundColor: SECTOR_COLORS[sector] || "#64748b",
                }}
                title={`${sector}: ${count}`}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {sectorCounts.map(([sector, count]) => (
              <span key={sector} className="flex items-center gap-1 text-[11px] text-text-secondary">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: SECTOR_COLORS[sector] || "#64748b" }}
                />
                {sector} {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

type SortMode = "custom" | "alpha" | "alpha-desc";

export function WatchlistPage() {
  usePageTitle("Watchlist");
  const { watchlist, add, remove } = useWatchlist();
  const { setAlert, removeAlert, getAlert, checkTriggered } = usePriceAlerts();
  const { show: showToast } = useToast();
  const [sortMode, setSortMode] = useState<SortMode>("custom");

  const sorted = [...watchlist].sort((a, b) => {
    if (sortMode === "alpha") return a.localeCompare(b);
    if (sortMode === "alpha-desc") return b.localeCompare(a);
    return 0; // custom = insertion order
  });

  const cycleSortMode = () => {
    setSortMode((prev) =>
      prev === "custom" ? "alpha" : prev === "alpha" ? "alpha-desc" : "custom",
    );
  };

  const sortLabel =
    sortMode === "alpha" ? "A → Z" : sortMode === "alpha-desc" ? "Z → A" : "Added";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Watchlist</h1>
        <p className="mt-1 text-sm text-text-muted">
          Your starred stocks — data persists in your browser
        </p>
      </div>

      {/* Portfolio summary */}
      {watchlist.length > 0 && <WatchlistSummary tickers={watchlist} />}

      {watchlist.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Inbox className="mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm font-medium text-text-primary">Your watchlist is empty</p>
            <p className="mt-1 max-w-xs text-center text-xs">
              Track your favorite stocks with price alerts, RSI signals, and sector rankings
            </p>

            {/* Quick-add popular stocks */}
            <div className="mt-5">
              <p className="mb-2 text-center text-[10px] uppercase tracking-wide text-text-muted">Quick add</p>
              <div className="flex flex-wrap justify-center gap-2">
                {["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "TSLA"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      add(t);
                      showToast(`${t} added to watchlist`);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:border-accent hover:bg-accent/10"
                  >
                    <Star className="h-3 w-3" />
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Browse links */}
            <div className="mt-5 flex gap-3">
              <Link
                to="/signals"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent hover:text-accent"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Browse Signals
              </Link>
              <Link
                to="/screener?rsi_max=30&sort_by=rsi&sort_dir=asc"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent hover:text-accent"
              >
                <TrendingDown className="h-3.5 w-3.5" />
                Oversold Stocks
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <Card
          title={`${watchlist.length} Stock${watchlist.length === 1 ? "" : "s"}`}
          subtitle="Click star to remove"
          action={
            <button
              type="button"
              onClick={cycleSortMode}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-text-secondary transition-colors hover:border-accent hover:text-accent"
              aria-label="Change sort order"
            >
              <ArrowUpDown className="h-3 w-3" />
              {sortLabel}
            </button>
          }
        >
          <div className="-mx-3 space-y-0.5">
            {sorted.map((ticker) => (
              <WatchlistRow
                key={ticker}
                ticker={ticker}
                onRemove={() => {
                  remove(ticker);
                  showToast(`${ticker} removed from watchlist`);
                }}
                alert={getAlert(ticker)}
                onSetAlert={(t, a) => {
                  setAlert(t, a);
                  showToast(`Price alert set for ${t}`);
                }}
                onRemoveAlert={(t) => {
                  removeAlert(t);
                  showToast(`Price alert removed for ${t}`);
                }}
                checkTriggered={checkTriggered}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
