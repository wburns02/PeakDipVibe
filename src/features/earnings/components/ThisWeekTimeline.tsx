import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ThisWeek, WeekEvent } from "@/api/types/earnings";

interface Props {
  data: ThisWeek | undefined;
  isLoading: boolean;
}

const SIZE_BADGE: Record<string, string> = {
  Minor: "bg-blue-500/20 text-blue-400",
  Medium: "bg-amber-500/20 text-amber-400",
  Large: "bg-orange-500/20 text-orange-400",
  Major: "bg-red-500/20 text-red-400",
};

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

export function ThisWeekTimeline({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <div className="h-20 animate-pulse rounded-lg bg-bg-hover" />
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const grouped = groupByDate(data.events);

  return (
    <div className="space-y-6">
      {/* Week summary */}
      <Card className="border-accent/20 bg-accent/5">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs text-text-muted">
              Week of{" "}
              {new Date(data.week_start + "T12:00:00").toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric" }
              )}{" "}
              –{" "}
              {new Date(data.week_end + "T12:00:00").toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric", year: "numeric" }
              )}
            </p>
            <p className="mt-1 text-lg font-bold text-text-primary">
              {data.total_events} big moves this week
            </p>
          </div>
          <div className="flex gap-4">
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

      {/* Beginner note */}
      <p className="text-xs text-text-muted">
        Each card below shows a stock that had a big price jump this week. The
        verdict tells you what happened next — did the stock keep going up
        ("Bounced Back") or did sellers push it down ("Kept Falling")?
      </p>

      {/* Timeline grouped by date */}
      {Object.entries(grouped).map(([dateStr, events]) => (
        <div key={dateStr}>
          <h3 className="mb-2 text-sm font-medium text-text-secondary">
            {formatDate(dateStr)}
          </h3>
          <div className="space-y-2">
            {events.map((event) => (
              <EventCard key={`${event.ticker}-${event.signal_date}`} event={event} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EventCard({ event }: { event: WeekEvent }) {
  const VerdictIcon = VERDICT_ICON[event.verdict] ?? Clock;
  const verdictColor = VERDICT_COLOR[event.verdict] ?? "text-text-muted";
  const gap = event.gap_up_pct ?? 0;

  return (
    <Card className="transition-colors hover:border-accent/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Ticker info */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                SIZE_BADGE[event.move_size]
              }`}
            >
              {event.move_size}
            </span>
            <span className="mt-1 text-lg font-bold text-accent">
              +{gap.toFixed(1)}%
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link
                to={`/ticker/${event.ticker}`}
                className="text-sm font-bold text-text-primary hover:text-accent"
              >
                {event.ticker}
              </Link>
              <ExternalLink className="h-3 w-3 text-text-muted" />
            </div>
            <p className="truncate text-xs text-text-muted">
              {event.name ?? event.ticker}
              {event.sector && (
                <span className="ml-1 text-text-muted/50">· {event.sector}</span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Verdict */}
        <div className="flex items-center gap-3">
          {/* Price bars */}
          <div className="hidden text-right text-xs text-text-muted sm:block">
            {event.prev_close && (
              <p>
                Before: ${event.prev_close.toFixed(2)}
              </p>
            )}
            {event.day0_close && (
              <p>
                Close: ${event.day0_close.toFixed(2)}
              </p>
            )}
          </div>

          {/* Verdict badge */}
          <div
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${
              event.verdict === "bounce_back"
                ? "bg-emerald-500/10"
                : event.verdict === "kept_falling"
                  ? "bg-red-500/10"
                  : event.verdict === "flat"
                    ? "bg-bg-hover"
                    : "bg-amber-500/10"
            }`}
          >
            <VerdictIcon className={`h-4 w-4 ${verdictColor}`} />
            <div>
              <p className={`text-xs font-medium ${verdictColor}`}>
                {event.verdict_label}
              </p>
              {event.outcome_1d !== null && (
                <p className="text-[10px] text-text-muted">
                  {event.outcome_1d >= 0 ? "+" : ""}
                  {event.outcome_1d.toFixed(2)}% next day
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <p className="mt-2 text-xs text-text-muted leading-relaxed">
        {event.explanation}
      </p>
    </Card>
  );
}

function groupByDate(events: WeekEvent[]): Record<string, WeekEvent[]> {
  const grouped: Record<string, WeekEvent[]> = {};
  for (const e of events) {
    if (!grouped[e.signal_date]) grouped[e.signal_date] = [];
    grouped[e.signal_date].push(e);
  }
  return grouped;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}
