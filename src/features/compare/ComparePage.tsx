import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { X, Plus, BarChart3, Zap, Link2, Check, Download, Lightbulb, TrendingUp, Shield } from "lucide-react";
import { ErrorState } from "@/components/ui/ErrorState";
import { useCompare } from "@/api/hooks/useCompare";
import { useTickerList } from "@/api/hooks/useTickers";
import { useDebounce } from "@/hooks/useDebounce";
import { useQueries } from "@tanstack/react-query";
import { api } from "@/api/client";
import { TickerDetailSchema } from "@/api/types/ticker";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ScrollableTable } from "@/components/ui/ScrollableTable";
import { Skeleton } from "@/components/ui/Skeleton";
import { ComparisonChart } from "@/components/charts/ComparisonChart";
import { EventCompare } from "./components/EventCompare";

const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#8b5cf6", "#14b8a6"];

const PERIOD_OPTIONS = [
  { label: "1M", days: 21 },
  { label: "3M", days: 63 },
  { label: "6M", days: 126 },
  { label: "1Y", days: 252 },
  { label: "2Y", days: 504 },
  { label: "5Y", days: 1260 },
];

const PRESET_GROUPS = [
  { label: "Mag 7", tickers: ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA"] },
  { label: "Banks", tickers: ["JPM", "BAC", "GS", "MS", "C"] },
  { label: "Semis", tickers: ["NVDA", "AMD", "INTC", "AVGO", "QCOM"] },
  { label: "FAANG", tickers: ["META", "AAPL", "AMZN", "NFLX", "GOOGL"] },
  { label: "Defense", tickers: ["LMT", "RTX", "NOC", "GD", "BA"] },
  { label: "Pharma", tickers: ["JNJ", "PFE", "MRK", "ABBV", "LLY"] },
];

/** Well-known stocks per sector for quick suggestions (no extra API calls). */
const SECTOR_PEERS: Record<string, string[]> = {
  "Technology": ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "CRM", "ADBE", "ORCL"],
  "Information Technology": ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "CRM", "ADBE", "ORCL"],
  "Financials": ["JPM", "BAC", "GS", "MS", "C", "WFC", "BLK", "AXP"],
  "Financial Services": ["JPM", "BAC", "GS", "MS", "C", "WFC", "BLK", "AXP"],
  "Health Care": ["JNJ", "UNH", "PFE", "MRK", "ABBV", "LLY", "TMO", "ABT"],
  "Healthcare": ["JNJ", "UNH", "PFE", "MRK", "ABBV", "LLY", "TMO", "ABT"],
  "Consumer Discretionary": ["AMZN", "TSLA", "HD", "NKE", "MCD", "SBUX", "LOW", "TJX"],
  "Consumer Cyclical": ["AMZN", "TSLA", "HD", "NKE", "MCD", "SBUX", "LOW", "TJX"],
  "Communication Services": ["GOOGL", "META", "NFLX", "DIS", "CMCSA", "T", "VZ", "TMUS"],
  "Industrials": ["CAT", "DE", "UNP", "HON", "GE", "RTX", "LMT", "BA"],
  "Energy": ["XOM", "CVX", "COP", "SLB", "EOG", "MPC", "PSX", "OXY"],
  "Consumer Staples": ["PG", "KO", "PEP", "WMT", "COST", "PM", "CL", "MDLZ"],
  "Consumer Defensive": ["PG", "KO", "PEP", "WMT", "COST", "PM", "CL", "MDLZ"],
  "Utilities": ["NEE", "DUK", "SO", "D", "AEP", "EXC", "SRE", "XEL"],
  "Real Estate": ["AMT", "PLD", "CCI", "EQIX", "SPG", "O", "PSA", "WELL"],
  "Materials": ["LIN", "APD", "SHW", "ECL", "NEM", "FCX", "NUE", "VMC"],
  "Basic Materials": ["LIN", "APD", "SHW", "ECL", "NEM", "FCX", "NUE", "VMC"],
};

/** Diversification: hedging picks from defensive/uncorrelated sectors */
const HEDGE_PICKS = ["XOM", "JNJ", "PG", "NEE", "AMT", "KO", "GLD", "WMT"];

function CorrelationSuggestions({
  tickers,
  correlations,
  onAdd,
}: {
  tickers: string[];
  correlations: Record<string, Record<string, number>> | null;
  onAdd: (ticker: string) => void;
}) {
  // Fetch sectors for current tickers
  const detailQueries = useQueries({
    queries: tickers.map((t) => ({
      queryKey: ["ticker", t],
      queryFn: async () => {
        const { data } = await api.get(`/tickers/${t}`);
        return TickerDetailSchema.parse(data);
      },
    })),
  });

  const sectors = useMemo(() => {
    const s = new Set<string>();
    for (const q of detailQueries) {
      if (q.data?.sector) s.add(q.data.sector);
    }
    return [...s];
  }, [detailQueries]);

  // Average off-diagonal correlation
  const avgCorr = useMemo(() => {
    if (!correlations || tickers.length < 2) return null;
    let sum = 0, count = 0;
    for (let i = 0; i < tickers.length; i++) {
      for (let j = i + 1; j < tickers.length; j++) {
        sum += Math.abs(correlations[tickers[i]]?.[tickers[j]] ?? 0);
        count++;
      }
    }
    return count > 0 ? sum / count : null;
  }, [correlations, tickers]);

  // Sector peer suggestions (not already in comparison)
  const peerSuggestions = useMemo(() => {
    const suggestions: string[] = [];
    for (const sector of sectors) {
      const peers = SECTOR_PEERS[sector] ?? [];
      for (const p of peers) {
        if (!tickers.includes(p) && !suggestions.includes(p)) {
          suggestions.push(p);
        }
        if (suggestions.length >= 6) break;
      }
      if (suggestions.length >= 6) break;
    }
    return suggestions;
  }, [sectors, tickers]);

  // Diversification suggestions
  const hedgeSuggestions = useMemo(() => {
    return HEDGE_PICKS.filter((t) => !tickers.includes(t) && !peerSuggestions.includes(t)).slice(0, 4);
  }, [tickers, peerSuggestions]);

  if (tickers.length < 2 || (peerSuggestions.length === 0 && hedgeSuggestions.length === 0)) return null;

  const highCorr = avgCorr != null && avgCorr > 0.7;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-amber" />
        <h3 className="text-sm font-semibold text-text-primary">Suggestions</h3>
      </div>

      {/* Correlation insight */}
      {avgCorr != null && (
        <div className={`mb-3 rounded-lg px-3 py-2 text-xs ${highCorr ? "bg-amber/10 text-amber" : "bg-green/10 text-green"}`}>
          {highCorr ? (
            <>
              <strong>High correlation detected</strong> (avg |r| = {avgCorr.toFixed(2)}). Your stocks move together — consider adding an uncorrelated asset for diversification.
            </>
          ) : (
            <>
              <strong>Good diversification</strong> (avg |r| = {avgCorr.toFixed(2)}). Your selected stocks have moderate independence from each other.
            </>
          )}
        </div>
      )}

      {/* Sector peers */}
      {peerSuggestions.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="h-3 w-3 text-accent" />
            <span className="text-xs font-medium text-text-secondary">
              Sector Peers ({sectors.join(", ")})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {peerSuggestions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onAdd(t)}
                className="flex items-center gap-1 rounded-lg border border-border bg-bg-primary px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
              >
                <Plus className="h-3 w-3" />
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Diversification picks */}
      {highCorr && hedgeSuggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Shield className="h-3 w-3 text-green" />
            <span className="text-xs font-medium text-text-secondary">Diversify With</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {hedgeSuggestions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onAdd(t)}
                className="flex items-center gap-1 rounded-lg border border-dashed border-green/40 bg-green/5 px-2.5 py-1 text-xs font-medium text-green transition-colors hover:border-green hover:bg-green/10"
              >
                <Plus className="h-3 w-3" />
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export function ComparePage() {
  usePageTitle("Compare");
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [copied, setCopied] = useState(false);
  const debouncedSearch = useDebounce(searchInput, 200);

  // Read state from URL params (with defaults)
  const tab = (searchParams.get("tab") === "events" ? "events" : "stocks") as "stocks" | "events";
  const tickersParam = searchParams.get("tickers");
  const tickers = tickersParam ? tickersParam.split(",").filter(Boolean).slice(0, 8) : ["AAPL", "MSFT"];
  const periodParam = searchParams.get("period");
  const period = periodParam ? Number(periodParam) : 252;

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, val] of Object.entries(updates)) {
        if (val == null) next.delete(key);
        else next.set(key, val);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setTab = (t: "stocks" | "events") => updateParams({ tab: t === "stocks" ? null : t });
  const setTickers = (t: string[]) => updateParams({ tickers: t.join(",") });
  const setPeriod = (d: number) => updateParams({ period: d === 252 ? null : String(d) });

  const { data: compareData, isLoading, isFetching, isError, refetch } = useCompare(tickers, period);
  const isRefetching = isFetching && !isLoading;
  const { data: searchResults } = useTickerList(debouncedSearch || undefined);

  const addTicker = (ticker: string) => {
    if (!tickers.includes(ticker) && tickers.length < 8) {
      setTickers([...tickers, ticker]);
    }
    setSearchInput("");
  };

  const removeTicker = (ticker: string) => {
    setTickers(tickers.filter((t) => t !== ticker));
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadCSV = () => {
    if (!compareData || chartData.length === 0) return;
    const header = ["Date", ...tickers].join(",");
    const rows = chartData.map((row) => {
      const r = row as Record<string, string | number>;
      const vals = tickers.map((t) => {
        const v = r[t];
        return v != null ? Number(v).toFixed(4) : "";
      });
      return [row.date, ...vals].join(",");
    });
    // Add correlation matrix as a footer
    const corrLines: string[] = ["", "Correlation Matrix"];
    if (correlations) {
      corrLines.push(["", ...tickers].join(","));
      for (const t1 of tickers) {
        corrLines.push([t1, ...tickers.map((t2) => (correlations[t1]?.[t2] ?? 0).toFixed(4))].join(","));
      }
    }
    const csv = [header, ...rows, ...corrLines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compare_${tickers.join("_")}_${period}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Build chart data
  const chartData = useMemo(() => {
    if (!compareData) return [];
    return compareData.rows.map((row) => ({
      date: row.date,
      ...row.values,
    }));
  }, [compareData]);

  // Final performance for summary
  const performance = useMemo(() => {
    if (!compareData || compareData.rows.length === 0) return {};
    const lastRow = compareData.rows[compareData.rows.length - 1];
    return lastRow.values;
  }, [compareData]);

  // Correlation matrix between tickers
  const correlations = useMemo(() => {
    if (!compareData || compareData.rows.length < 10 || tickers.length < 2) return null;
    const series: Record<string, number[]> = {};
    for (const t of tickers) series[t] = [];
    for (const row of compareData.rows) {
      for (const t of tickers) {
        series[t].push(row.values[t] ?? 0);
      }
    }
    const corr = (a: number[], b: number[]): number => {
      const n = a.length;
      const meanA = a.reduce((s, v) => s + v, 0) / n;
      const meanB = b.reduce((s, v) => s + v, 0) / n;
      let num = 0, denA = 0, denB = 0;
      for (let i = 0; i < n; i++) {
        const da = a[i] - meanA, db = b[i] - meanB;
        num += da * db;
        denA += da * da;
        denB += db * db;
      }
      const den = Math.sqrt(denA * denB);
      return den === 0 ? 0 : num / den;
    };
    const matrix: Record<string, Record<string, number>> = {};
    for (const t1 of tickers) {
      matrix[t1] = {};
      for (const t2 of tickers) {
        matrix[t1][t2] = t1 === t2 ? 1 : corr(series[t1], series[t2]);
      }
    }
    return matrix;
  }, [compareData, tickers]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Compare</h1>
          <p className="mt-1 text-sm text-text-muted">
            Side-by-side analysis of stocks or catalyst events
          </p>
        </div>
        {tab === "stocks" && tickers.length >= 2 && (
          <div className="flex items-center gap-2">
            {compareData && chartData.length > 0 && (
              <button
                type="button"
                onClick={downloadCSV}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
                title="Download comparison as CSV"
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </button>
            )}
            <button
              type="button"
              onClick={copyLink}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
              title="Copy shareable link"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green" /> : <Link2 className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        )}
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 rounded-xl bg-bg-hover/50 p-1">
        <button
          type="button"
          onClick={() => setTab("stocks")}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === "stocks"
              ? "bg-bg-card text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Stocks
        </button>
        <button
          type="button"
          onClick={() => setTab("events")}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === "events"
              ? "bg-bg-card text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <Zap className="h-4 w-4" />
          Events
        </button>
      </div>

      {tab === "events" && <EventCompare />}

      {tab === "stocks" && <>
      {/* Ticker management */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          {tickers.map((ticker, i) => (
            <div
              key={ticker}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-primary px-3 py-1.5"
            >
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              <span className="text-sm font-medium text-text-primary">{ticker}</span>
              {tickers.length > 2 && (
                <button type="button" onClick={() => removeTicker(ticker)} aria-label={`Remove ${ticker}`} className="text-text-muted hover:text-red">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}

          {tickers.length < 8 && (
            <div className="relative">
              <div className="flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5">
                <Plus className="h-3.5 w-3.5 text-text-muted" />
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Add ticker..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setSearchInput("");
                    if (e.key === "Enter" && searchResults && searchResults.length > 0) {
                      const first = searchResults.find((t) => !tickers.includes(t.ticker));
                      if (first) addTicker(first.ticker);
                    }
                  }}
                  aria-label="Add ticker to compare"
                  className="w-24 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                />
              </div>

              {searchInput.length > 0 && searchResults && searchResults.length > 0 && (
                <div className="absolute left-0 top-full z-20 mt-1 max-h-48 w-64 overflow-y-auto rounded-xl border border-border bg-bg-secondary shadow-xl">
                  {searchResults
                    .filter((t) => !tickers.includes(t.ticker))
                    .slice(0, 8)
                    .map((t) => (
                      <button
                        type="button"
                        key={t.ticker}
                        onClick={() => addTicker(t.ticker)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-bg-hover"
                      >
                        <span className="font-medium text-accent">{t.ticker}</span>
                        <span className="text-xs text-text-muted">{t.name}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Preset groups */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRESET_GROUPS.map((g) => (
            <button
              type="button"
              key={g.label}
              onClick={() => setTickers(g.tickers)}
              className="rounded-lg border border-border bg-bg-primary px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Period selector */}
        <div className="mt-3 flex gap-1">
          {PERIOD_OPTIONS.map((p) => (
            <button
              type="button"
              key={p.label}
              onClick={() => setPeriod(p.days)}
              aria-pressed={period === p.days}
              aria-label={`Show ${p.label} performance`}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                period === p.days
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:bg-bg-hover"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Chart */}
      {isLoading ? (
        <Skeleton className="h-[400px]" />
      ) : isError ? (
        <ErrorState message="Could not load comparison data. The API may be offline." onRetry={refetch} />
      ) : compareData && chartData.length > 0 ? (
        <Card>
          <div className={`transition-opacity duration-300 ${isRefetching ? "opacity-50" : ""}`}>
          <ComparisonChart
            data={chartData}
            tickers={tickers}
            colors={CHART_COLORS}
          />
          </div>
        </Card>
      ) : tickers.length >= 2 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <BarChart3 className="mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm font-medium">No overlapping data found</p>
            <p className="mt-1 max-w-xs text-center text-xs">
              These tickers don't have matching price history. Try different tickers or a shorter time period.
            </p>
          </div>
        </Card>
      ) : null}

      {/* Performance summary */}
      {compareData && Object.keys(performance).length > 0 && (
        <Card title="Period Performance" subtitle={`${compareData.trading_days} trading days`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tickers.map((ticker, i) => {
              const pct = performance[ticker];
              if (pct === undefined) return null;
              return (
                <div
                  key={ticker}
                  className="flex items-center justify-between rounded-lg border border-border bg-bg-primary p-3"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="font-medium text-text-primary">{ticker}</span>
                  </div>
                  <Badge variant={pct >= 0 ? "green" : "red"}>
                    {pct >= 0 ? "+" : ""}
                    {pct.toFixed(2)}%
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Correlation matrix */}
      {correlations && tickers.length >= 2 && (
        <Card title="Correlation Matrix" subtitle="How closely these stocks move together (-1 to +1)">
          <ScrollableTable>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-text-muted">
                  <th className="pb-2 pr-3 text-left" />
                  {tickers.map((t) => (
                    <th key={t} className="pb-2 px-2 text-center font-medium text-text-secondary">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickers.map((t1) => (
                  <tr key={t1} className="border-b border-border/30">
                    <td className="py-1.5 pr-3 text-xs font-medium text-text-secondary">{t1}</td>
                    {tickers.map((t2) => {
                      const v = correlations[t1]?.[t2] ?? 0;
                      const abs = Math.abs(v);
                      const bg = t1 === t2
                        ? "bg-accent/10"
                        : abs > 0.7
                          ? v > 0 ? "bg-emerald-500/15" : "bg-red-500/15"
                          : abs > 0.4
                            ? v > 0 ? "bg-emerald-500/8" : "bg-red-500/8"
                            : "";
                      const color = t1 === t2
                        ? "text-text-muted"
                        : abs > 0.7
                          ? v > 0 ? "text-emerald-400" : "text-red-400"
                          : "text-text-secondary";
                      return (
                        <td key={t2} className={`py-1.5 px-2 text-center text-xs font-mono ${bg} ${color}`}>
                          {t1 === t2 ? "1.00" : v.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTable>
          <p className="mt-2 text-[10px] text-text-muted">
            Values near +1.0 mean stocks move together. Near -1.0 means they move opposite. Near 0 means little relationship.
          </p>
        </Card>
      )}

      {/* Correlation suggestions */}
      {tickers.length >= 2 && (
        <CorrelationSuggestions
          tickers={tickers}
          correlations={correlations}
          onAdd={addTicker}
        />
      )}
      </>}
    </div>
  );
}
