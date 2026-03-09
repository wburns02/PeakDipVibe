import { useState, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { HeartPulse, Info, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { api } from "@/api/client";
import { ChartRowSchema } from "@/api/types/price";
import { useMarketBreadth, useMarketOverview } from "@/api/hooks/useMarket";
import { useScreener } from "@/api/hooks/useScreener";
import { STALE_STABLE } from "@/api/queryConfig";
import { Skeleton } from "@/components/ui/Skeleton";
import { z } from "zod";
import {
  SAMPLE_TICKERS,
  computeHealthScore,
  classifyRegime,
  computeHistoricalBreadth,
  computeRsiBuckets,
  buildSectorHealth,
} from "./lib/breadth-engine";
import { HealthGauge } from "./components/HealthGauge";
import { BreadthTimeline } from "./components/BreadthTimeline";
import { RsiDistribution } from "./components/RsiDistribution";
import { SectorBreadth } from "./components/SectorBreadth";

export function MarketInternalsPage() {
  const [guideOpen, setGuideOpen] = useState(false);

  // --- Data ---
  const { data: breadth, isLoading: breadthLoading } = useMarketBreadth();
  const { data: overview } = useMarketOverview();
  const { data: screenerData } = useScreener({ limit: 200, sort_by: "ticker" });

  // Historical breadth from sample stocks
  const chartQueries = useQueries({
    queries: SAMPLE_TICKERS.map((ticker) => ({
      queryKey: ["chart", ticker, { limit: 260 }],
      queryFn: async () => {
        const { data } = await api.get(`/prices/${ticker}/chart`, { params: { limit: 260 } });
        return { ticker, rows: z.array(ChartRowSchema).parse(data) };
      },
      staleTime: STALE_STABLE,
    })),
  });

  const allChartsLoaded = chartQueries.every((q) => q.isSuccess);
  const chartsLoading = chartQueries.some((q) => q.isLoading);

  // Computed values
  const healthScore = useMemo(() => (breadth ? computeHealthScore(breadth) : 0), [breadth]);
  const regime = useMemo(() => (breadth ? classifyRegime(breadth) : null), [breadth]);

  const historicalBreadth = useMemo(() => {
    if (!allChartsLoaded) return [];
    const tickerData: Record<string, any[]> = {};
    for (const q of chartQueries) {
      if (q.data) tickerData[q.data.ticker] = q.data.rows;
    }
    return computeHistoricalBreadth(tickerData);
  }, [allChartsLoaded, chartQueries]);

  const rsiBuckets = useMemo(
    () => (screenerData ? computeRsiBuckets(screenerData) : []),
    [screenerData],
  );

  const sectorHealth = useMemo(
    () => (overview ? buildSectorHealth(overview.sectors) : []),
    [overview],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <HeartPulse className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Market Internals</h1>
            <p className="text-sm text-text-muted">Under-the-surface health of the S&P 500</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setGuideOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-bg-hover"
        >
          <Info className="h-3.5 w-3.5" />
          How It Works
          {guideOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Guide */}
      {guideOpen && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm text-text-secondary">
          <h3 className="mb-2 font-semibold text-text-primary">How Market Internals Work</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 font-medium text-text-primary">Health Score (0-100)</p>
              <p>Composite score from % above SMA-50/200, A/D ratio, average RSI, and oversold/overbought extremes. Higher = stronger market.</p>
            </div>
            <div>
              <p className="mb-1 font-medium text-text-primary">Market Regime</p>
              <p>Classifies current conditions into Risk On, Risk Off, Caution, Rotation, or Oversold Bounce — each with specific trading actions.</p>
            </div>
            <div>
              <p className="mb-1 font-medium text-text-primary">Breadth Timeline</p>
              <p>Historical % of stocks above their 50-day and 200-day moving averages, computed from 22 representative S&P stocks across all 11 sectors.</p>
            </div>
            <div>
              <p className="mb-1 font-medium text-text-primary">RSI Distribution</p>
              <p>Histogram of RSI-14 values across 200 stocks. Clusters in the 20-30 range signal broad oversold conditions; 70-80 signals overbought.</p>
            </div>
          </div>
        </div>
      )}

      {/* Row 1: Gauge + Regime */}
      {breadthLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : breadth && regime ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Health Gauge */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-bg-secondary p-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">Market Health</p>
            <HealthGauge score={healthScore} regime={regime} />
          </div>

          {/* Regime Card */}
          <div className="rounded-2xl border border-border bg-bg-secondary p-6">
            <div className="mb-3 flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: regime.color }}
              />
              <h2 className="text-lg font-bold text-text-primary">{regime.label}</h2>
            </div>
            <p className="mb-4 text-sm text-text-secondary">{regime.description}</p>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
              Suggested Actions
            </p>
            <ul className="space-y-2">
              {regime.actions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: regime.color }}
                  />
                  {action}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {/* Row 2: 6 Stat Cards */}
      {breadth && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            label="A/D Ratio"
            value={breadth.advance_decline_ratio.toFixed(2)}
            sub={`${breadth.advancers} up / ${breadth.decliners} down`}
            color={breadth.advance_decline_ratio >= 1 ? "#22c55e" : "#ef4444"}
            pct={Math.min(100, breadth.advance_decline_ratio * 50)}
          />
          <StatCard
            label="Above SMA-50"
            value={`${breadth.pct_above_sma50}%`}
            sub={`of ${breadth.total_stocks} stocks`}
            color={breadth.pct_above_sma50 > 60 ? "#22c55e" : breadth.pct_above_sma50 < 40 ? "#ef4444" : "#f59e0b"}
            pct={breadth.pct_above_sma50}
          />
          <StatCard
            label="Above SMA-200"
            value={`${breadth.pct_above_sma200}%`}
            sub="Long-term trend"
            color={breadth.pct_above_sma200 > 60 ? "#22c55e" : breadth.pct_above_sma200 < 40 ? "#ef4444" : "#f59e0b"}
            pct={breadth.pct_above_sma200}
          />
          <StatCard
            label="Average RSI"
            value={(breadth.avg_rsi ?? 50).toFixed(1)}
            sub={breadth.avg_rsi != null && breadth.avg_rsi < 40 ? "Oversold bias" : breadth.avg_rsi != null && breadth.avg_rsi > 60 ? "Overbought bias" : "Neutral zone"}
            color={(breadth.avg_rsi ?? 50) < 40 ? "#22c55e" : (breadth.avg_rsi ?? 50) > 60 ? "#ef4444" : "#6b7280"}
            pct={breadth.avg_rsi ?? 50}
          />
          <StatCard
            label="Oversold"
            value={`${breadth.pct_oversold}%`}
            sub="RSI < 30"
            color="#22c55e"
            pct={Math.min(100, breadth.pct_oversold * 5)}
            icon={<TrendingDown className="h-3 w-3" />}
          />
          <StatCard
            label="Overbought"
            value={`${breadth.pct_overbought}%`}
            sub="RSI > 70"
            color="#ef4444"
            pct={Math.min(100, breadth.pct_overbought * 5)}
            icon={<TrendingUp className="h-3 w-3" />}
          />
        </div>
      )}

      {/* Row 3: Historical Breadth Timeline */}
      <div className="rounded-2xl border border-border bg-bg-secondary p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Breadth Timeline</h2>
            <p className="text-xs text-text-muted">% of stocks above key moving averages (22-stock proxy)</p>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded bg-green/70" />
              Above SMA-50
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded bg-blue-500/70" />
              Above SMA-200
            </span>
          </div>
        </div>
        {chartsLoading ? (
          <Skeleton className="h-[280px]" />
        ) : historicalBreadth.length > 0 ? (
          <BreadthTimeline data={historicalBreadth} />
        ) : (
          <div className="flex h-[280px] items-center justify-center text-sm text-text-muted">
            <Activity className="mr-2 h-4 w-4" />
            Loading historical breadth data...
          </div>
        )}
      </div>

      {/* Row 4: RSI Distribution + Sector Breadth */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* RSI Distribution */}
        <div className="rounded-2xl border border-border bg-bg-secondary p-4 sm:p-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-text-primary">RSI Distribution</h2>
            <p className="text-xs text-text-muted">How 200 stocks are distributed across RSI levels</p>
          </div>
          <div className="mb-2 flex items-center gap-4 text-[10px] text-text-muted">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded bg-green/70" />
              Oversold (&lt;30)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded bg-gray-500/70" />
              Neutral (30-70)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded bg-red/70" />
              Overbought (&gt;70)
            </span>
          </div>
          {rsiBuckets.length > 0 ? (
            <RsiDistribution buckets={rsiBuckets} />
          ) : (
            <Skeleton className="h-[220px]" />
          )}
        </div>

        {/* Sector Breadth */}
        <div className="rounded-2xl border border-border bg-bg-secondary p-4 sm:p-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Sector Breadth</h2>
            <p className="text-xs text-text-muted">Average daily change by sector — click to explore</p>
          </div>
          {sectorHealth.length > 0 ? (
            <SectorBreadth sectors={sectorHealth} />
          ) : (
            <Skeleton className="h-[260px]" />
          )}
        </div>
      </div>

      {/* Breadth Insights */}
      {breadth && (
        <div className="rounded-2xl border border-border bg-bg-secondary p-4 sm:p-6">
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Key Observations</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {generateInsights(breadth).map((insight, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-bg-primary p-3"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: insight.color }}
                  />
                  <span className="text-xs font-semibold text-text-primary">{insight.title}</span>
                </div>
                <p className="text-xs text-text-muted">{insight.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Stat Card ---

function StatCard({
  label,
  value,
  sub,
  color,
  pct,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  pct: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-3">
      <div className="mb-1 flex items-center gap-1.5">
        {icon && <span style={{ color }}>{icon}</span>}
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{label}</span>
      </div>
      <p className="text-lg font-bold tabular-nums" style={{ color }}>{value}</p>
      <p className="mt-0.5 text-[10px] text-text-muted">{sub}</p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-bg-hover">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.max(2, pct)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// --- Insight Generator ---

interface Insight {
  title: string;
  description: string;
  color: string;
}

function generateInsights(b: import("@/api/types/market").MarketBreadth): Insight[] {
  const insights: Insight[] = [];

  // Breadth divergence
  if (b.pct_above_sma50 < 40 && b.pct_above_sma200 > 60) {
    insights.push({
      title: "Breadth Divergence",
      description: `Short-term breadth (${b.pct_above_sma50}% above SMA-50) is weak while long-term trend (${b.pct_above_sma200}% above SMA-200) holds. Watch for follow-through.`,
      color: "#f59e0b",
    });
  }

  // Oversold extreme
  if (b.pct_oversold > 5) {
    insights.push({
      title: "Oversold Extreme",
      description: `${b.pct_oversold}% of stocks have RSI below 30 — well above normal levels. Historical mean-reversion setups tend to emerge here.`,
      color: "#22c55e",
    });
  }

  // Overbought extreme
  if (b.pct_overbought > 5) {
    insights.push({
      title: "Overbought Extreme",
      description: `${b.pct_overbought}% of stocks have RSI above 70. Momentum is strong but pullback risk is elevated.`,
      color: "#ef4444",
    });
  }

  // Strong breadth
  if (b.pct_above_sma50 > 70) {
    insights.push({
      title: "Broad Strength",
      description: `${b.pct_above_sma50}% of stocks above their SMA-50 — a sign of healthy, broad-based rally participation.`,
      color: "#22c55e",
    });
  }

  // Weak breadth
  if (b.pct_above_sma50 < 30) {
    insights.push({
      title: "Broad Weakness",
      description: `Only ${b.pct_above_sma50}% of stocks above SMA-50. The selling is widespread, not concentrated.`,
      color: "#ef4444",
    });
  }

  // A/D skew
  if (b.advance_decline_ratio < 0.5) {
    insights.push({
      title: "Heavy Selling Pressure",
      description: `A/D ratio of ${b.advance_decline_ratio.toFixed(2)} means decliners outnumber advancers ~${Math.round(1 / b.advance_decline_ratio)}:1. Broad selling pressure today.`,
      color: "#ef4444",
    });
  } else if (b.advance_decline_ratio > 2) {
    insights.push({
      title: "Strong Buying Pressure",
      description: `A/D ratio of ${b.advance_decline_ratio.toFixed(2)} means advancers outnumber decliners ~${b.advance_decline_ratio.toFixed(0)}:1. Broad buying participation.`,
      color: "#22c55e",
    });
  }

  // RSI convergence
  if ((b.avg_rsi ?? 50) > 45 && (b.avg_rsi ?? 50) < 55) {
    insights.push({
      title: "Neutral RSI",
      description: `Average RSI of ${(b.avg_rsi ?? 50).toFixed(1)} is in the neutral zone. No strong momentum bias either way — a choppy or transitional market.`,
      color: "#6b7280",
    });
  }

  return insights.slice(0, 3);
}
