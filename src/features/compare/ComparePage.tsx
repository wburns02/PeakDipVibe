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
                <button onClick={() => removeTicker(ticker)} aria-label={`Remove ${ticker}`} className="text-text-muted hover:text-red">
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
              key={g.label}
              onClick={() => setTickers(g.tickers)}
              className="rounded-lg border border-border bg-bg-primary px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Period selector */}
        <div className="mt-3 flex gap-1">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.label}
              onClick={() => setPeriod(p.days)}
              aria-pressed={period === p.days}
              aria-label={`Show ${p.label} performance`}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
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
    </div>
  );
}
