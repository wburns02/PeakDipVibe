import { Zap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTickerSignals } from "@/api/hooks/useSignals";
import { formatPercent } from "@/lib/formatters";

interface SignalHistoryCardProps {
  ticker: string;
}

export function SignalHistoryCard({ ticker }: SignalHistoryCardProps) {
  const { data: signals, isLoading } = useTickerSignals(ticker);

  if (isLoading) return <Skeleton className="h-48" />;
  if (!signals || signals.length === 0) return null;

  return (
    <Card
      title="News Catalyst Signals"
      subtitle="Gap-up + sell-off pattern history"
      action={
        <div className="flex items-center gap-1 text-xs text-accent">
          <Zap className="h-3 w-3" />
          {signals.length} signal{signals.length !== 1 ? "s" : ""}
        </div>
      }
    >
      <div className="space-y-3">
        {signals.slice(0, 5).map((s) => (
          <div
            key={s.signal_date}
            className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary">{s.signal_date}</span>
                {s.catalyst_type && (
                  <Badge
                    variant={
                      s.catalyst_type === "earnings_beat"
                        ? "green"
                        : s.catalyst_type === "upgrade"
                          ? "accent"
                          : s.catalyst_type === "guidance"
                            ? "amber"
                            : "default"
                    }
                  >
                    {s.catalyst_type === "earnings_beat"
                      ? "Earnings"
                      : s.catalyst_type === "upgrade"
                        ? "Upgrade"
                        : s.catalyst_type === "guidance"
                          ? "Guidance"
                          : "News"}
                  </Badge>
                )}
              </div>
              {s.catalyst_headline && (
                <p className="max-w-[200px] truncate text-xs text-text-muted">
                  {s.catalyst_headline}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <Badge variant="green">+{s.gap_up_pct?.toFixed(1)}%</Badge>
                <span className="text-xs text-text-muted">gap</span>
              </div>
              {s.outcome_1d != null && (
                <p className={`mt-0.5 text-xs ${s.outcome_1d >= 0 ? "text-green" : "text-red"}`}>
                  1d: {formatPercent(s.outcome_1d)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
