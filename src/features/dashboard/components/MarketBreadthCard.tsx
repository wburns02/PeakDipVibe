import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import { useMarketBreadth } from "@/api/hooks/useMarket";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export function MarketBreadthCard() {
  const { data: breadth, isLoading } = useMarketBreadth();

  if (isLoading) return <Skeleton className="h-40" />;
  if (!breadth) return null;

  const bullish = breadth.advance_decline_ratio >= 1;
  const adLabel = bullish ? "Bullish" : "Bearish";
  const adColor = bullish ? "text-green" : "text-red";

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-text-primary">Market Breadth</h3>
        <span className={`ml-auto text-xs font-medium ${adColor}`}>{adLabel}</span>
      </div>

      {/* Advance/Decline bar */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1 text-green">
            <TrendingUp className="h-3 w-3" />
            {breadth.advancers} Advancers
          </span>
          <span className="flex items-center gap-1 text-red">
            {breadth.decliners} Decliners
            <TrendingDown className="h-3 w-3" />
          </span>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-bg-hover">
          <div
            className="bg-green transition-all duration-500"
            style={{ width: `${(breadth.advancers / breadth.total_stocks) * 100}%` }}
          />
          <div
            className="bg-red transition-all duration-500"
            style={{ width: `${(breadth.decliners / breadth.total_stocks) * 100}%` }}
          />
        </div>
        <p className="mt-1 text-center text-[10px] text-text-muted">
          A/D Ratio: {breadth.advance_decline_ratio.toFixed(2)} ({breadth.total_stocks} stocks)
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {/* Above SMA 50 */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-text-muted">
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
          <div className="flex items-center justify-between text-[11px] text-text-muted">
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
          <div className="flex items-center justify-between text-[11px] text-text-muted">
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
          <div className="flex items-center justify-between text-[11px] text-text-muted">
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
    </Card>
  );
}
