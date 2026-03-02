import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Clock,
  ChevronDown,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ThisWeek, WeekEvent } from "@/api/types/earnings";

interface Props {
  data: ThisWeek | undefined;
  isLoading: boolean;
}

const VERDICT_ICON: Record<string, typeof ArrowUpRight> = {
  bounce_back: ArrowUpRight,
  kept_falling: ArrowDownRight,
  flat: Minus,
  pending: Clock,
};

const VERDICT_COLOR: Record<string, string> = {
  bounce_back: "text-emerald-400",
  kept_falling: "text-red-400",
  flat: "text-text-muted",
  pending: "text-amber-400",
};

const VERDICT_BG: Record<string, string> = {
  bounce_back: "bg-emerald-500/10 border-emerald-500/20",
  kept_falling: "bg-red-500/10 border-red-500/20",
  flat: "bg-bg-hover border-border",
  pending: "bg-amber-500/10 border-amber-500/20",
};

const INITIAL_COUNT = 8;

export function ThisWeekTimeline({ data, isLoading }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <div className="h-16 animate-pulse rounded-lg bg-bg-hover" />
          </Card>
        ))}
      </div>
    );
  }

  if (!data || data.events.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-3 py-4 text-text-muted">
          <Clock className="h-5 w-5 shrink-0 opacity-40" />
          <p className="text-sm">No major earnings moves this week. Check back next week for upcoming events.</p>
        </div>
      </Card>
    );
  }

  // Sort by gap_up_pct descending (biggest movers first)
  const sorted = [...data.events].sort(
    (a, b) => (b.gap_up_pct ?? 0) - (a.gap_up_pct ?? 0),
  );

  const visible = showAll ? sorted : sorted.slice(0, INITIAL_COUNT);
  const hasMore = sorted.length > INITIAL_COUNT;

  return (
    <div className="space-y-4">
      {/* Week summary */}
      <Card className="border-accent/20 bg-accent/5">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs text-text-muted">
              Week of{" "}
              {new Date(data.week_start + "T12:00:00").toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric" },
              )}{" "}
              –{" "}
              {new Date(data.week_end + "T12:00:00").toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric", year: "numeric" },
              )}
            </p>
            <p className="mt-1 text-lg font-bold text-text-primary">
              {data.total_events} big moves this week
            </p>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-text-muted">Major/Large</p>
              <p className="text-lg font-bold text-orange-400">
                {data.major_events}
              </p>
            </div>
            {data.bounce_rate !== null && (
              <div>
                <p className="text-xs text-text-muted">Bounced Back</p>
                <p className="text-lg font-bold text-emerald-400">
                  {data.bounce_rate}%
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Events list */}
      <div className="space-y-2">
        {visible.map((event) => (
          <EventCard
            key={`${event.ticker}-${event.signal_date}`}
            event={event}
          />
        ))}
      </div>

      {/* Show all / Show less */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          aria-expanded={showAll}
          aria-label={showAll ? "Show fewer events" : `Show all ${sorted.length} events`}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-bg-card px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:border-accent/30 hover:text-text-primary"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showAll ? "rotate-180" : ""}`}
          />
          {showAll
            ? "Show less"
            : `Show all ${sorted.length} events`}
        </button>
      )}
    </div>
  );
}

function EventCard({ event }: { event: WeekEvent }) {
  const VerdictIcon = VERDICT_ICON[event.verdict] ?? Clock;
  const verdictColor = VERDICT_COLOR[event.verdict] ?? "text-text-muted";
  const verdictBg = VERDICT_BG[event.verdict] ?? "bg-bg-hover border-border";
  const gap = event.gap_up_pct ?? 0;

  return (
    <Card className="transition-colors hover:border-accent/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Ticker + gap */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-accent">
              +{gap.toFixed(1)}%
            </span>
            <span className="text-[10px] text-text-muted">{event.move_size}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link
                to={`/ticker/${event.ticker}`}
                className="text-sm font-bold text-text-primary hover:text-accent"
              >
                {event.ticker}
              </Link>
            </div>
            <p className="truncate text-xs text-text-muted">
              {event.name ?? event.ticker}
              {event.sector && (
                <span className="ml-1 text-text-muted/50">
                  · {event.sector}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Big verdict badge */}
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-2 ${verdictBg}`}
        >
          <VerdictIcon className={`h-5 w-5 ${verdictColor}`} />
          <div>
            <p className={`text-sm font-bold ${verdictColor}`}>
              {event.verdict_label}
            </p>
            {event.outcome_1d !== null && (
              <p className="text-xs text-text-muted">
                {event.outcome_1d >= 0 ? "+" : ""}
                {event.outcome_1d.toFixed(2)}% next day
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Explanation + Simulate link */}
      <div className="mt-2 flex items-start justify-between gap-2">
        <p className="text-xs leading-relaxed text-text-muted">
          {event.explanation}
        </p>
        <Link
          to={`/simulator?ticker=${event.ticker}&date=${event.signal_date}`}
          className="shrink-0 rounded px-2 py-1 text-[10px] font-medium text-accent hover:bg-accent/10"
        >
          Simulate →
        </Link>
      </div>

      {/* Similar Past Events */}
      {event.analogs && event.analogs.length > 0 && (
        <div className="mt-2 border-t border-border/50 pt-2">
          <p className="mb-1 text-[10px] font-medium text-text-muted/70">
            Similar past events:
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            {event.analogs.map((a) => {
              const o = a.outcome_1d ?? 0;
              return (
                <span
                  key={`${a.ticker}-${a.signal_date}`}
                  className="text-[10px] text-text-muted"
                >
                  <span className="font-medium text-text-secondary">
                    {a.ticker}
                  </span>{" "}
                  +{(a.gap_up_pct ?? 0).toFixed(0)}% →{" "}
                  <span
                    className={
                      o > 0 ? "text-emerald-400" : o < 0 ? "text-red-400" : ""
                    }
                  >
                    {o >= 0 ? "+" : ""}
                    {o.toFixed(1)}%
                  </span>{" "}
                  <span
                    className={`rounded px-1 py-px text-[8px] font-bold ${
                      a.status === "confirmed"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : a.status === "failed"
                          ? "bg-red-500/15 text-red-400"
                          : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    {a.status}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
