import { Skeleton } from "@/components/ui/Skeleton";
import type { TrackerSummary } from "@/api/types/tracker";

interface Props {
  summary: TrackerSummary | undefined;
  loading: boolean;
}

export function SummaryBar({ summary, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const cards = [
    {
      label: "Active Dips",
      value: summary.active_count,
      color: summary.active_count > 0 ? "#ef4444" : "#64748b",
      fmt: String(summary.active_count),
    },
    {
      label: "Avg Pounce Score",
      value: summary.avg_active_score,
      color: (summary.avg_active_score ?? 0) >= 65 ? "#22c55e" : "#f59e0b",
      fmt: summary.avg_active_score != null ? Math.round(summary.avg_active_score).toString() : "—",
    },
    {
      label: "Best Opportunity",
      value: summary.best_active_ticker,
      color: "#6366f1",
      fmt: summary.best_active_ticker || "—",
    },
    {
      label: "Historical Win Rate",
      value: summary.overall_win_rate_5d,
      color: "#f59e0b",
      fmt: summary.overall_win_rate_5d != null ? `${summary.overall_win_rate_5d.toFixed(1)}%` : "—",
    },
    {
      label: "Total Events",
      value: summary.total_events,
      color: "#94a3b8",
      fmt: summary.total_events.toLocaleString(),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-lg border border-border bg-bg-card p-3 text-center"
        >
          <div className="text-[11px] text-text-muted">{c.label}</div>
          <div className="mt-1 text-xl font-bold" style={{ color: c.color }}>
            {c.fmt}
          </div>
        </div>
      ))}
    </div>
  );
}
