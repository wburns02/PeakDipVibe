import { Link } from "react-router-dom";
import { Zap, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { usePatternSignals } from "@/api/hooks/useSignals";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { getCatalystConfig } from "@/lib/catalystTypes";
import { formatPercent, formatRelativeTime } from "@/lib/formatters";

export function RecentSignalsCard() {
  const { data: signals, isLoading } = usePatternSignals({
    limit: 5,
    sort_by: "date",
  });

  if (isLoading) return <Skeleton className="h-48" />;
  if (!signals || signals.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">Recent Signals</h3>
        </div>
        <p className="mt-3 text-center text-sm text-text-muted">
          No recent signals detected yet.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">Recent Signals</h3>
        </div>
        <Link
          to="/signals"
          className="flex items-center gap-1 text-sm text-accent hover:underline"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-3 space-y-2">
        {signals.map((s) => {
          const config = getCatalystConfig(s.catalyst_type);
          const outcome = s.outcome_1d;
          return (
            <Link
              key={`${s.ticker}-${s.signal_date}`}
              to={`/ticker/${s.ticker}`}
              className="flex items-center justify-between rounded-lg border border-border/50 bg-bg-primary px-3 py-2.5 transition-colors hover:bg-bg-hover"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-accent">{s.ticker}</span>
                <Badge variant={config.variant}>{config.label}</Badge>
                <span className="hidden text-xs text-text-muted sm:inline" title={s.signal_date}>
                  {formatRelativeTime(s.signal_date)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {s.gap_up_pct != null && (
                  <span className="text-xs text-text-muted">
                    Gap {formatPercent(s.gap_up_pct)}
                  </span>
                )}
                {outcome != null && (
                  <span className={`flex items-center gap-0.5 text-xs font-medium ${outcome >= 0 ? "text-green" : "text-red"}`}>
                    {outcome >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {formatPercent(outcome)}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
