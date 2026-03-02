import { useState, useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { X, Plus, BarChart3 } from "lucide-react";
import { ErrorState } from "@/components/ui/ErrorState";
import { useCompare } from "@/api/hooks/useCompare";
import { useTickerList } from "@/api/hooks/useTickers";
import { useDebounce } from "@/hooks/useDebounce";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ComparisonChart } from "@/components/charts/ComparisonChart";

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

export function ComparePage() {
  usePageTitle("Compare Stocks");
  const [tickers, setTickers] = useState<string[]>(["AAPL", "MSFT"]);
  const [searchInput, setSearchInput] = useState("");
  const [period, setPeriod] = useState(252);
  const debouncedSearch = useDebounce(searchInput, 200);

  const { data: compareData, isLoading, isError, refetch } = useCompare(tickers, period);
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
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Compare Stocks</h1>
        <p className="mt-1 text-sm text-text-muted">
          Normalized % change comparison — all tickers start at 0%
        </p>
      </div>

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
                  onKeyDown={(e) => e.key === "Escape" && setSearchInput("")}
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
          <ComparisonChart
            data={chartData}
            tickers={tickers}
            colors={CHART_COLORS}
          />
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
          <div className="overflow-x-auto">
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
          </div>
          <p className="mt-2 text-[10px] text-text-muted">
            Values near +1.0 mean stocks move together. Near -1.0 means they move opposite. Near 0 means little relationship.
          </p>
        </Card>
      )}
    </div>
  );
}
