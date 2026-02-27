import { BarChart3, Calendar, Database, Layers } from "lucide-react";
import type { StatusResponse } from "@/api/types/market";
import { formatDate } from "@/lib/formatters";

interface MarketOverviewCardProps {
  status: StatusResponse;
}

export function MarketOverviewCard({ status }: MarketOverviewCardProps) {
  const stats = [
    {
      label: "Tickers",
      value: status.total_tickers.toLocaleString(),
      icon: BarChart3,
    },
    {
      label: "Price Records",
      value: `${(status.total_prices / 1000).toFixed(0)}K`,
      icon: Database,
    },
    {
      label: "Indicator Rows",
      value: `${(status.total_indicators / 1e6).toFixed(1)}M`,
      icon: Layers,
    },
    {
      label: "Date Range",
      value: status.date_min && status.date_max
        ? `${formatDate(status.date_min)} — ${formatDate(status.date_max)}`
        : "—",
      icon: Calendar,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="rounded-xl border border-border bg-bg-card p-4"
        >
          <div className="mb-2 flex items-center gap-2 text-text-muted">
            <Icon className="h-4 w-4" />
            <span className="text-xs">{label}</span>
          </div>
          <p className="text-lg font-semibold text-text-primary">{value}</p>
        </div>
      ))}
    </div>
  );
}
