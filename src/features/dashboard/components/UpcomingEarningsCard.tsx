import { Link } from "react-router-dom";
import { CalendarDays, ArrowRight } from "lucide-react";
import { useUpcomingEarnings } from "@/api/hooks/useMarket";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function formatEarningsDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function UpcomingEarningsCard() {
  const { data, isLoading } = useUpcomingEarnings(8);

  if (isLoading) return <Skeleton className="h-48" />;
  if (!data || data.earnings.length === 0) return null;

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-text-primary">Upcoming Earnings</h3>
        <span className="ml-auto text-xs text-text-muted">
          Next {data.earnings.length} reports
        </span>
      </div>

      <div className="space-y-1">
        {data.earnings.map((e) => {
          const days = daysUntil(e.earnings_date);
          const urgency =
            days <= 0 ? "green" as const
            : days <= 3 ? "amber" as const
            : "default" as const;

          return (
            <Link
              key={e.ticker}
              to={`/ticker/${e.ticker}`}
              className="flex items-center justify-between rounded-lg px-2 py-2.5 transition-colors hover:bg-bg-hover"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-accent">{e.ticker}</span>
                <span className="hidden text-xs text-text-muted sm:inline">
                  {e.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary">
                  {formatEarningsDate(e.earnings_date)}
                </span>
                <Badge variant={urgency}>
                  {days <= 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                </Badge>
              </div>
            </Link>
          );
        })}
      </div>

      <Link
        to="/earnings"
        className="mt-3 flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-sm text-accent hover:bg-accent/10 hover:underline"
      >
        View earnings analysis <ArrowRight className="h-3 w-3" />
      </Link>
    </Card>
  );
}
