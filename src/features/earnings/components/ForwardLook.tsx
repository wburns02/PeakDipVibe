import { Link } from "react-router-dom";
import { useForwardLook } from "@/api/hooks/useEarnings";
import { Card } from "@/components/ui/Card";
import type { ForwardLookEvent } from "@/api/types/earnings";

export function ForwardLook() {
  const { data, isLoading } = useForwardLook(3);

  if (isLoading) {
    return (
      <Card>
        <div className="flex h-32 items-center justify-center" role="status" aria-label="Loading forward-looking data">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden="true" />
        </div>
      </Card>
    );
  }

  if (!data || data.events.length === 0) {
    return (
      <Card>
        <p className="text-sm text-text-muted">
          No forward-looking data available yet.
        </p>
      </Card>
    );
  }

  // Show top 12, sorted by past_events desc (most data = most useful)
  const top = data.events.slice(0, 12);

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-muted">
        Tracking <span className="font-semibold text-text-primary">{data.total_tracked}</span> tickers
        with repeat gap-up history. Based on past patterns, not predictions.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {top.map((e) => (
          <ForwardCard key={e.ticker} event={e} />
        ))}
      </div>
    </div>
  );
}

function ForwardCard({ event: e }: { event: ForwardLookEvent }) {
  const bounceRate = e.bounce_rate ?? 0;

  return (
    <Card className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            to={`/ticker/${e.ticker}`}
            className="text-sm font-bold text-accent hover:underline"
          >
            {e.ticker}
          </Link>
          <p className="text-xs text-text-muted">
            {e.name}
            {e.sector && <span className="text-text-muted/60"> · {e.sector}</span>}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            e.outlook === "historically_strong"
              ? "bg-emerald-500/15 text-emerald-400"
              : e.outlook === "mixed"
                ? "bg-amber-500/15 text-amber-400"
                : "bg-red-500/15 text-red-400"
          }`}
        >
          {e.outlook_label}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold text-text-primary">
            {e.past_events}
          </p>
          <p className="text-[10px] text-text-muted">past events</p>
        </div>
        <div>
          <p className="text-lg font-bold text-text-primary">
            {e.avg_gap != null ? `+${e.avg_gap}%` : "—"}
          </p>
          <p className="text-[10px] text-text-muted">avg gap</p>
        </div>
        <div>
          <p
            className={`text-lg font-bold ${
              bounceRate >= 55
                ? "text-emerald-400"
                : bounceRate >= 45
                  ? "text-amber-400"
                  : "text-red-400"
            }`}
          >
            {bounceRate > 0 ? `${bounceRate}%` : "—"}
          </p>
          <p className="text-[10px] text-text-muted">bounce rate</p>
        </div>
      </div>

      {/* Outcome strip */}
      <div className="flex items-center gap-2 rounded bg-bg-hover/50 px-2 py-1 text-[10px] text-text-muted">
        <span>
          1d:{" "}
          <span
            className={
              (e.avg_return_1d ?? 0) >= 0
                ? "text-emerald-400"
                : "text-red-400"
            }
          >
            {e.avg_return_1d != null
              ? `${e.avg_return_1d >= 0 ? "+" : ""}${e.avg_return_1d}%`
              : "—"}
          </span>
        </span>
        <span>
          5d:{" "}
          <span
            className={
              (e.avg_return_5d ?? 0) >= 0
                ? "text-emerald-400"
                : "text-red-400"
            }
          >
            {e.avg_return_5d != null
              ? `${e.avg_return_5d >= 0 ? "+" : ""}${e.avg_return_5d}%`
              : "—"}
          </span>
        </span>
        <span>
          10d:{" "}
          <span
            className={
              (e.avg_return_10d ?? 0) >= 0
                ? "text-emerald-400"
                : "text-red-400"
            }
          >
            {e.avg_return_10d != null
              ? `${e.avg_return_10d >= 0 ? "+" : ""}${e.avg_return_10d}%`
              : "—"}
          </span>
        </span>
      </div>
    </Card>
  );
}
