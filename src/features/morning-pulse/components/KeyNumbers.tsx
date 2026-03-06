import type { MarketBreadth } from "@/api/types/market";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Gauge,
  AlertTriangle,
} from "lucide-react";

interface Props {
  breadth: MarketBreadth | undefined;
  loading?: boolean;
}

export function KeyNumbers({ breadth, loading }: Props) {
  if (loading || !breadth) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  const items = [
    {
      icon: TrendingUp,
      label: "Advancers",
      value: breadth.advancers.toString(),
      color: "text-green",
      bg: "bg-green/10",
    },
    {
      icon: TrendingDown,
      label: "Decliners",
      value: breadth.decliners.toString(),
      color: "text-red",
      bg: "bg-red/10",
    },
    {
      icon: Activity,
      label: "A/D Ratio",
      value: breadth.advance_decline_ratio.toFixed(2),
      color:
        breadth.advance_decline_ratio >= 1 ? "text-green" : "text-red",
      bg:
        breadth.advance_decline_ratio >= 1 ? "bg-green/10" : "bg-red/10",
    },
    {
      icon: BarChart3,
      label: "> 50 SMA",
      value: `${breadth.pct_above_sma50.toFixed(0)}%`,
      color: breadth.pct_above_sma50 >= 50 ? "text-green" : "text-red",
      bg: breadth.pct_above_sma50 >= 50 ? "bg-green/10" : "bg-red/10",
    },
    {
      icon: Gauge,
      label: "Avg RSI",
      value: breadth.avg_rsi?.toFixed(1) ?? "—",
      color:
        breadth.avg_rsi && breadth.avg_rsi >= 45 && breadth.avg_rsi <= 70
          ? "text-green"
          : "text-amber",
      bg:
        breadth.avg_rsi && breadth.avg_rsi >= 45 && breadth.avg_rsi <= 70
          ? "bg-green/10"
          : "bg-amber/10",
    },
    {
      icon: AlertTriangle,
      label: "Oversold",
      value: `${breadth.pct_oversold.toFixed(1)}%`,
      color: breadth.pct_oversold > 10 ? "text-amber" : "text-text-secondary",
      bg: breadth.pct_oversold > 10 ? "bg-amber/10" : "bg-bg-hover",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="group flex items-center gap-3 rounded-xl border border-border bg-bg-card p-3 transition-all duration-200 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5"
        >
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.bg}`}>
            <item.icon className={`h-4 w-4 ${item.color}`} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs text-text-muted">{item.label}</p>
            <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
