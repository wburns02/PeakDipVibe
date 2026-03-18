import { Link } from "react-router-dom";
import { Activity, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { useMarketBreadth } from "@/api/hooks/useMarket";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export function MarketBreadthCard() {
  const { data: breadth, isLoading } = useMarketBreadth();

  if (isLoading) return <Skeleton className="h-40" />;
  if (!breadth) return null;

  const preMarket = breadth.total_stocks === 0;
  const bullish = breadth.advance_decline_ratio >= 1;
  const adLabel = preMarket ? "Pre-Market" : bullish ? "Bullish" : "Bearish";
  const adColor = preMarket ? "text-accent" : bullish ? "text-green" : "text-red";
  const advPct = preMarket ? 0 : (breadth.advancers / breadth.total_stocks) * 100;
  const decPct = preMarket ? 0 : (breadth.decliners / breadth.total_stocks) * 100;

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-text-primary">Market Breadth</h3>
        <span className={`ml-auto text-xs font-medium ${adColor}`}>{adLabel}</span>
      </div>

      {/* Advance/Decline bar */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-green">
            <TrendingUp className="h-3 w-3" />
            {preMarket ? "—" : breadth.advancers} Advancers
          </span>
          <span className="flex items-center gap-1 text-red">
            {preMarket ? "—" : breadth.decliners} Decliners
            <TrendingDown className="h-3 w-3" />
          </span>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-bg-hover">
          <div
            className="bg-green transition-all duration-500"
            style={{ width: `${advPct}%` }}
          />
          <div
            className="bg-red transition-all duration-500"
            style={{ width: `${decPct}%` }}
          />
        </div>
        <p className="mt-1 text-center text-xs text-text-muted">
          {preMarket
            ? "Market hasn't opened yet — data updates at 9:30 AM ET"
            : `A/D Ratio: ${breadth.advance_decline_ratio.toFixed(2)} (${breadth.total_stocks} stocks)`}
        </p>
      </div>

      {/* Quick links */}
      <div className="mb-3 flex flex-wrap gap-2">
        <Link
          to="/screener?rsi_max=30&sort_by=rsi&sort_dir=asc"
          className="rounded-md border border-border px-2.5 py-2 text-xs text-green transition-colors hover:border-green hover:bg-green/10"
        >
          Oversold stocks ({breadth.pct_oversold}%)
        </Link>
        <Link
          to="/screener?rsi_min=70&sort_by=rsi&sort_dir=desc"
          className="rounded-md border border-border px-2.5 py-2 text-xs text-red transition-colors hover:border-red hover:bg-red/10"
        >
          Overbought stocks ({breadth.pct_overbought}%)
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {/* Above SMA 50 */}
        <div>
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Above SMA 50</span>
            <span className="font-medium text-text-primary">{breadth.pct_above_sma50}%</span>
          </div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-bg-hover">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${breadth.pct_above_sma50}%` }}
            />
          </div>
        </div>

        {/* Above SMA 200 */}
        <div>
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Above SMA 200</span>
            <span className="font-medium text-text-primary">{breadth.pct_above_sma200}%</span>
          </div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-bg-hover">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${breadth.pct_above_sma200}%` }}
            />
          </div>
        </div>

        {/* Avg RSI */}
        <div>
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Avg RSI</span>
            <span className={`font-medium ${
              breadth.avg_rsi != null
                ? breadth.avg_rsi < 40 ? "text-green" : breadth.avg_rsi > 60 ? "text-red" : "text-text-primary"
                : "text-text-primary"
            }`}>
              {breadth.avg_rsi?.toFixed(1) ?? "—"}
            </span>
          </div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-bg-hover">
            <div
              className="h-full rounded-full bg-accent/60 transition-all duration-500"
              style={{ width: `${breadth.avg_rsi ?? 50}%` }}
            />
          </div>
        </div>

        {/* Oversold / Overbought */}
        <div>
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="text-green">{breadth.pct_oversold}% Oversold</span>
            <span className="text-red">{breadth.pct_overbought}% Overbought</span>
          </div>
          <div className="mt-0.5 flex h-1.5 overflow-hidden rounded-full bg-bg-hover">
            <div
              className="h-full bg-green transition-all duration-500"
              style={{ width: `${breadth.pct_oversold}%` }}
            />
            <div className="flex-1" />
            <div
              className="h-full bg-red transition-all duration-500"
              style={{ width: `${breadth.pct_overbought}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        <Link
          to="/internals"
          className="flex items-center gap-1 rounded-lg px-2 py-2.5 text-sm text-accent hover:bg-accent/10 hover:underline"
        >
          Deep dive <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <span className="text-text-muted">|</span>
        <Link
          to="/screener"
          className="flex items-center gap-1 rounded-lg px-2 py-2.5 text-sm text-text-muted hover:bg-bg-hover hover:text-accent hover:underline"
        >
          Screener <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Card>
  );
}
