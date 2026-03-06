import { Link } from "react-router-dom";
import { Calendar, ChevronRight, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { UpcomingEarning } from "@/api/types/market";
import { formatDate, formatLargeNumber } from "@/lib/formatters";

interface Props {
  earnings: UpcomingEarning[] | undefined;
  loading?: boolean;
}

export function EarningsRadar({ earnings, loading }: Props) {
  if (loading) {
    return (
      <div>
        <Skeleton className="mb-4 h-6 w-40" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!earnings?.length) {
    return (
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold text-text-primary">
            Earnings Radar
          </h2>
        </div>
        <div className="rounded-xl border border-border bg-bg-card p-6 text-center">
          <Calendar className="mx-auto mb-2 h-8 w-8 text-text-muted" />
          <p className="text-sm text-text-muted">
            No upcoming earnings in the pipeline.
          </p>
        </div>
      </div>
    );
  }

  // Group by date
  const grouped = new Map<string, UpcomingEarning[]>();
  for (const e of earnings) {
    const key = e.earnings_date;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold text-text-primary">
            Earnings Radar
          </h2>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
            {earnings.length} upcoming
          </span>
        </div>
        <Link
          to="/earnings"
          className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
        >
          Full calendar <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-4">
        {[...grouped.entries()].slice(0, 3).map(([date, events]) => (
          <div key={date}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
              {formatDate(date)}
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <Link
                  key={e.ticker}
                  to={`/ticker/${e.ticker}`}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-bg-card p-3 transition-all duration-200 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                    <DollarSign className="h-5 w-5 text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-accent">{e.ticker}</span>
                      {e.name && (
                        <span className="truncate text-xs text-text-muted">
                          {e.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-text-muted">
                      {e.sector && <span>{e.sector}</span>}
                      {e.market_cap && (
                        <>
                          <span className="text-border">|</span>
                          <span>{formatLargeNumber(e.market_cap)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
