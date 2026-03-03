import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useEventLibrary } from "@/api/hooks/useEarnings";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function formatDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function monthKey(y: number, m: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

export function SignalCalendar() {
  // Fetch all pages to cover the full dataset (~554 events across 6 pages)
  const { data: p1, isLoading: l1 } = useEventLibrary({ per_page: 100, page: 1 });
  const { data: p2, isLoading: l2 } = useEventLibrary({ per_page: 100, page: 2 });
  const { data: p3, isLoading: l3 } = useEventLibrary({ per_page: 100, page: 3 });
  const { data: p4, isLoading: l4 } = useEventLibrary({ per_page: 100, page: 4 });
  const { data: p5, isLoading: l5 } = useEventLibrary({ per_page: 100, page: 5 });
  const { data: p6, isLoading: l6 } = useEventLibrary({ per_page: 100, page: 6 });

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6;

  // Merge all events
  const allEvents = useMemo(() => {
    return [
      ...(p1?.events ?? []),
      ...(p2?.events ?? []),
      ...(p3?.events ?? []),
      ...(p4?.events ?? []),
      ...(p5?.events ?? []),
      ...(p6?.events ?? []),
    ];
  }, [p1, p2, p3, p4, p5, p6]);

  // Build date -> events map
  const eventsByDate = useMemo(() => {
    const map: Record<string, { count: number; tickers: string[]; maxGap: number }> = {};
    for (const e of allEvents) {
      const d = e.signal_date;
      if (!map[d]) map[d] = { count: 0, tickers: [], maxGap: 0 };
      map[d].count++;
      if (map[d].tickers.length < 3) map[d].tickers.push(e.ticker);
      if (e.gap_up_pct != null && e.gap_up_pct > map[d].maxGap) {
        map[d].maxGap = e.gap_up_pct;
      }
    }
    return map;
  }, [allEvents]);

  // Find the month with the most recent events to default to
  const defaultMonth = useMemo(() => {
    if (allEvents.length === 0) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() };
    }
    // Events are sorted newest first, so first event's month is the most recent
    const latest = allEvents[0].signal_date;
    const [y, m] = latest.split("-").map(Number);
    return { year: y, month: m - 1 };
  }, [allEvents]);

  const [viewYear, setViewYear] = useState<number | null>(null);
  const [viewMonth, setViewMonth] = useState<number | null>(null);

  const year = viewYear ?? defaultMonth.year;
  const month = viewMonth ?? defaultMonth.month;

  const now = new Date();
  const today = formatDate(now.getFullYear(), now.getMonth(), now.getDate());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthLabel = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Count total events this month
  const monthEventCount = useMemo(() => {
    let count = 0;
    const mk = monthKey(year, month);
    for (const [date, info] of Object.entries(eventsByDate)) {
      if (date.startsWith(mk)) count += info.count;
    }
    return count;
  }, [eventsByDate, year, month]);

  // Get events for this month for the "latest signals" list
  const monthEvents = useMemo(() => {
    const mk = monthKey(year, month);
    return allEvents.filter((e) => e.signal_date.startsWith(mk));
  }, [allEvents, year, month]);

  // Navigation
  const goToPrevMonth = () => {
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    setViewYear(y);
    setViewMonth(m);
  };

  const goToNextMonth = () => {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    // Don't go past current month
    const nowKey = monthKey(now.getFullYear(), now.getMonth());
    const nextKey = monthKey(y, m);
    if (nextKey > nowKey) return;
    setViewYear(y);
    setViewMonth(m);
  };

  const isCurrentMonth = monthKey(year, month) === monthKey(now.getFullYear(), now.getMonth());

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <Card>
      {/* Header with nav */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-text-primary">{monthLabel}</p>
          <p className="text-[10px] text-text-muted">
            {monthEventCount} event{monthEventCount !== 1 ? "s" : ""} this month
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goToPrevMonth}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-text-muted">
        {DAY_NAMES.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="mt-1 grid grid-cols-7 gap-1">
        {/* Leading blanks */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}

        {/* Days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = formatDate(year, month, day);
          const info = eventsByDate[dateStr];
          const isToday = dateStr === today;
          const isWeekend = new Date(year, month, day).getDay() % 6 === 0;
          const isFuture = dateStr > today;

          // Dot intensity based on event count
          const dotClass = info
            ? info.maxGap >= 5
              ? "bg-amber"
              : info.count >= 3
                ? "bg-accent"
                : "bg-accent/60"
            : "";

          return (
            <div
              key={day}
              className={`relative flex h-9 flex-col items-center justify-center rounded-md text-xs transition-colors ${
                isToday
                  ? "bg-accent/15 font-bold text-accent ring-1 ring-accent/40"
                  : isFuture
                    ? "text-text-muted/40"
                    : isWeekend
                      ? "text-text-muted/60"
                      : "text-text-secondary"
              } ${info && !isFuture ? "cursor-default" : ""}`}
              title={
                info
                  ? `${info.count} signal${info.count > 1 ? "s" : ""}: ${info.tickers.join(", ")}${info.tickers.length < info.count ? ` +${info.count - info.tickers.length} more` : ""}`
                  : undefined
              }
            >
              <span>{day}</span>
              {info && !isFuture && (
                <span
                  className={`absolute bottom-0.5 h-1.5 w-1.5 rounded-full ${dotClass}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-[10px] text-text-muted">
        <div className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent/60" />
          1-2 signals
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
          3+ signals
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber" />
          Big move (5%+)
        </div>
      </div>

      {/* Recent events list for this month */}
      {monthEvents.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-muted">
            Top signals in {new Date(year, month).toLocaleDateString("en-US", { month: "long" })}
          </p>
          <div className="space-y-1.5">
            {monthEvents.slice(0, 5).map((e) => (
              <Link
                key={`${e.ticker}-${e.signal_date}`}
                to={`/ticker/${e.ticker}`}
                className="flex items-center justify-between rounded-lg px-2 py-1 text-xs transition-colors hover:bg-bg-hover"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-accent">{e.ticker}</span>
                  <span className="text-text-muted">{e.signal_date}</span>
                </div>
                {e.gap_up_pct != null && (
                  <span className="text-green">+{e.gap_up_pct.toFixed(1)}%</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
