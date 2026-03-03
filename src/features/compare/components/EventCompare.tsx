import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { X, Plus, Search } from "lucide-react";
import { useEventLibrary } from "@/api/hooks/useEarnings";
import { useDebounce } from "@/hooks/useDebounce";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ScrollableTable } from "@/components/ui/ScrollableTable";
import { getCatalystConfig } from "@/lib/catalystTypes";
import type { LibraryEvent } from "@/api/types/earnings";

const CHART_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
];

/** Build a normalized % path from event outcome data aligned at Day 0. */
function buildEventPath(event: LibraryEvent) {
  const gap = event.gap_up_pct ?? 0;
  const selloff = event.selloff_pct ?? 0;
  return [
    { stage: "Close -1", value: 0 },
    { stage: "Open", value: gap },
    { stage: "Dip", value: gap + selloff },
    { stage: "Day 1", value: event.outcome_1d ?? gap + selloff },
    { stage: "Day 5", value: event.outcome_5d ?? event.outcome_1d ?? gap },
    { stage: "Day 10", value: event.outcome_10d ?? event.outcome_5d ?? gap },
  ];
}

const STAGES = ["Close -1", "Open", "Dip", "Day 1", "Day 5", "Day 10"];

export function EventCompare() {
  const [events, setEvents] = useState<LibraryEvent[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 200);

  const { data: library } = useEventLibrary({
    ticker: debouncedSearch || undefined,
    per_page: 8,
    page: 1,
  });

  const addEvent = (event: LibraryEvent) => {
    const key = `${event.ticker}-${event.signal_date}`;
    if (
      events.length < 8 &&
      !events.some((e) => `${e.ticker}-${e.signal_date}` === key)
    ) {
      setEvents([...events, event]);
    }
    setSearchInput("");
  };

  const removeEvent = (idx: number) => {
    setEvents(events.filter((_, i) => i !== idx));
  };

  // Build chart data: one row per stage, one column per event
  const chartData = useMemo(() => {
    if (events.length === 0) return [];
    const paths = events.map(buildEventPath);
    return STAGES.map((stage, si) => {
      const row: Record<string, string | number> = { stage };
      for (let ei = 0; ei < events.length; ei++) {
        const key = `${events[ei].ticker} ${events[ei].signal_date.slice(5)}`;
        row[key] = paths[ei][si].value;
      }
      return row;
    });
  }, [events]);

  const eventKeys = events.map(
    (e) => `${e.ticker} ${e.signal_date.slice(5)}`,
  );

  return (
    <div className="space-y-6">
      {/* Event selector */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          {events.map((event, i) => {
            const catalyst = getCatalystConfig(event.catalyst_type);
            return (
              <div
                key={`${event.ticker}-${event.signal_date}`}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-primary px-3 py-1.5"
              >
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                  }}
                />
                <span className="text-sm font-medium text-text-primary">
                  {event.ticker}
                </span>
                <span className="text-xs text-text-muted">
                  {event.signal_date.slice(5)}
                </span>
                <Badge variant={catalyst.variant} className="text-[10px]">
                  +{event.gap_up_pct?.toFixed(1)}%
                </Badge>
                <button
                  type="button"
                  onClick={() => removeEvent(i)}
                  aria-label={`Remove ${event.ticker} event`}
                  className="text-text-muted hover:text-red"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}

          {events.length < 8 && (
            <div className="relative">
              <div className="flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5">
                <Plus className="h-3.5 w-3.5 text-text-muted" />
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Search ticker..."
                  value={searchInput}
                  onChange={(e) =>
                    setSearchInput(e.target.value.toUpperCase())
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setSearchInput("");
                    if (
                      e.key === "Enter" &&
                      library?.events &&
                      library.events.length > 0
                    ) {
                      addEvent(library.events[0]);
                    }
                  }}
                  aria-label="Search events by ticker"
                  className="w-28 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                />
              </div>

              {searchInput.length > 0 &&
                library?.events &&
                library.events.length > 0 && (
                  <div className="absolute left-0 top-full z-20 mt-1 max-h-64 w-80 overflow-y-auto rounded-xl border border-border bg-bg-secondary shadow-xl">
                    {library.events.slice(0, 8).map((event) => {
                      const key = `${event.ticker}-${event.signal_date}`;
                      const already = events.some(
                        (e) => `${e.ticker}-${e.signal_date}` === key,
                      );
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => addEvent(event)}
                          disabled={already}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                            already
                              ? "opacity-40"
                              : "hover:bg-bg-hover"
                          }`}
                        >
                          <div>
                            <span className="font-medium text-accent">
                              {event.ticker}
                            </span>
                            <span className="ml-2 text-xs text-text-muted">
                              {event.signal_date}
                            </span>
                          </div>
                          <Badge
                            variant={
                              (event.gap_up_pct ?? 0) >= 5 ? "green" : "accent"
                            }
                          >
                            +{event.gap_up_pct?.toFixed(1)}%
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                )}
            </div>
          )}
        </div>

        {events.length === 0 && (
          <div className="mt-4 flex flex-col items-center py-8 text-text-muted">
            <Search className="mb-2 h-8 w-8 opacity-30" />
            <p className="text-sm">Search for a ticker to add events</p>
            <p className="mt-1 text-xs">
              Compare how different stocks reacted to their catalyst events
            </p>
          </div>
        )}
      </Card>

      {/* Chart */}
      {events.length >= 2 && chartData.length > 0 && (
        <Card>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 5, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
                  tickFormatter={(v: number) =>
                    `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`
                  }
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                <ReTooltip
                  contentStyle={{
                    background: "#1a1e2e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [
                    `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`,
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  iconType="circle"
                  iconSize={8}
                />
                {eventKeys.map((key, i) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    animationDuration={0}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Comparison table */}
      {events.length >= 2 && (
        <Card
          title="Event Metrics"
          subtitle="Side-by-side comparison of each event"
        >
          <ScrollableTable>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-text-muted">
                  <th className="pb-2 pr-3 text-left">Metric</th>
                  {events.map((e, i) => (
                    <th
                      key={`${e.ticker}-${e.signal_date}`}
                      className="pb-2 px-2 text-center"
                    >
                      <span
                        className="font-semibold"
                        style={{
                          color: CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      >
                        {e.ticker}
                      </span>
                      <br />
                      <span className="font-normal text-text-muted">
                        {e.signal_date.slice(5)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: "Gap Up",
                    key: "gap_up_pct" as const,
                    suffix: "%",
                  },
                  {
                    label: "Selloff",
                    key: "selloff_pct" as const,
                    suffix: "%",
                  },
                  {
                    label: "Day 1 Return",
                    key: "outcome_1d" as const,
                    suffix: "%",
                  },
                  {
                    label: "Day 5 Return",
                    key: "outcome_5d" as const,
                    suffix: "%",
                  },
                  {
                    label: "Day 10 Return",
                    key: "outcome_10d" as const,
                    suffix: "%",
                  },
                  {
                    label: "Strength",
                    key: "signal_strength" as const,
                    suffix: "",
                  },
                ].map((metric) => (
                  <tr
                    key={metric.label}
                    className="border-b border-border/30"
                  >
                    <td className="py-2 pr-3 text-xs font-medium text-text-secondary">
                      {metric.label}
                    </td>
                    {events.map((e, i) => {
                      const val = e[metric.key];
                      const isReturn = metric.key.startsWith("outcome_");
                      const color =
                        val == null
                          ? "text-text-muted"
                          : isReturn
                            ? val >= 0
                              ? "text-green"
                              : "text-red"
                            : metric.key === "selloff_pct"
                              ? "text-red"
                              : metric.key === "gap_up_pct"
                                ? "text-green"
                                : "text-text-primary";
                      return (
                        <td
                          key={`${e.ticker}-${e.signal_date}-${metric.key}`}
                          className={`py-2 px-2 text-center text-xs font-mono ${color}`}
                        >
                          {val != null
                            ? `${val >= 0 && metric.suffix === "%" ? "+" : ""}${val.toFixed(metric.key === "signal_strength" ? 0 : 2)}${metric.suffix}`
                            : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Catalyst row */}
                <tr className="border-b border-border/30">
                  <td className="py-2 pr-3 text-xs font-medium text-text-secondary">
                    Catalyst
                  </td>
                  {events.map((e) => {
                    const catalyst = getCatalystConfig(e.catalyst_type);
                    return (
                      <td
                        key={`${e.ticker}-${e.signal_date}-catalyst`}
                        className="py-2 px-2 text-center"
                      >
                        <Badge variant={catalyst.variant} className="text-[10px]">
                          {catalyst.label}
                        </Badge>
                      </td>
                    );
                  })}
                </tr>
                {/* Status row */}
                <tr className="border-b border-border/30">
                  <td className="py-2 pr-3 text-xs font-medium text-text-secondary">
                    Status
                  </td>
                  {events.map((e) => (
                    <td
                      key={`${e.ticker}-${e.signal_date}-status`}
                      className="py-2 px-2 text-center"
                    >
                      <Badge
                        variant={
                          e.status === "confirmed"
                            ? "green"
                            : e.status === "failed"
                              ? "red"
                              : "default"
                        }
                      >
                        {e.status ?? "Pending"}
                      </Badge>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </ScrollableTable>
        </Card>
      )}
    </div>
  );
}
