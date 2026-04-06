# System 2: Peak/Dip Tracker UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Peak/Dip Tracker as the hero feature of PeakDipVibe — a dedicated `/tracker` route with stage-filtered event feed, pounce score cards, expandable case studies, summary stats, and #1 sidebar placement.

**Architecture:** New `src/features/tracker/` feature folder following existing patterns (lazy-loaded route, TanStack Query hooks, Zod-validated API types, Tailwind-styled components). Data comes from `/api/tracker/*` endpoints (already built in System 1). Components decomposed into TrackerPage (layout + tabs), SummaryBar (KPIs), EventCard (scorecard + expandable case study), and EventFilters.

**Tech Stack:** React 19, TypeScript, TanStack Query, Zod 4, Tailwind 4, Lucide icons, Recharts (for sparklines)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/api/types/tracker.ts` | Create | Zod schemas: PeakDipEventSchema, TrackerSummarySchema, TrackerStatsSchema |
| `src/api/hooks/useTracker.ts` | Create | TanStack Query hooks: useTrackerEvents, useTrackerSummary, useTrackerStats |
| `src/features/tracker/TrackerPage.tsx` | Create | Main page: tab navigation, summary bar, event list with stage filtering |
| `src/features/tracker/components/SummaryBar.tsx` | Create | KPI cards: active count, avg score, best opportunity, win rate, last updated |
| `src/features/tracker/components/EventCard.tsx` | Create | Scorecard with pounce score circle, key stats, stage badge, expandable case study |
| `src/App.tsx` | Modify | Add lazy import, route, preload for /tracker |
| `src/components/layout/Sidebar.tsx` | Modify | Add Tracker as #1 pinned item with active dip count badge |

---

### Task 1: Add API types and hooks

**Files:**
- Create: `/home/will/PeakDipVibe/src/api/types/tracker.ts`
- Create: `/home/will/PeakDipVibe/src/api/hooks/useTracker.ts`

- [ ] **Step 1: Create Zod schemas**

Create `/home/will/PeakDipVibe/src/api/types/tracker.ts`:

```typescript
import { z } from "zod";

export const PeakDipEventSchema = z.object({
  id: z.number(),
  ticker: z.string(),
  name: z.string().nullable(),
  sector: z.string().nullable(),
  market_cap_tier: z.string().nullable(),
  earnings_date: z.string().nullable(),
  signal_date: z.string(),
  prev_close: z.number().nullable(),
  gap_open: z.number().nullable(),
  gap_pct: z.number().nullable(),
  day_high: z.number().nullable(),
  day_close: z.number().nullable(),
  selloff_pct: z.number().nullable(),
  selloff_volume: z.number().nullable(),
  avg_volume: z.number().nullable(),
  volume_ratio: z.number().nullable(),
  catalyst_type: z.string().nullable(),
  catalyst_detail: z.string().nullable(),
  market_regime: z.string().nullable(),
  gap_bucket: z.string().nullable(),
  selloff_bucket: z.string().nullable(),
  outcome_1d: z.number().nullable(),
  outcome_3d: z.number().nullable(),
  outcome_5d: z.number().nullable(),
  outcome_10d: z.number().nullable(),
  outcome_20d: z.number().nullable(),
  win_1d: z.number().nullable(),
  win_5d: z.number().nullable(),
  win_10d: z.number().nullable(),
  pounce_score: z.number().nullable(),
  stage: z.string().nullable(),
  summary_auto: z.string().nullable(),
  summary_ai: z.string().nullable(),
  ai_provider: z.string().nullable(),
  ai_generated_at: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type PeakDipEvent = z.infer<typeof PeakDipEventSchema>;

export const TrackerSummarySchema = z.object({
  active_count: z.number(),
  avg_active_score: z.number().nullable(),
  recovering_count: z.number(),
  total_events: z.number(),
  overall_win_rate_5d: z.number().nullable(),
  resolved_count: z.number(),
  best_active_ticker: z.string().nullable(),
  best_active_score: z.number().nullable(),
});

export type TrackerSummary = z.infer<typeof TrackerSummarySchema>;

export const TrackerStatsSchema = z.object({
  total_events: z.number(),
  win_rate_5d: z.number().nullable(),
  avg_pounce_score: z.number().nullable(),
  by_catalyst: z.array(z.record(z.unknown())).nullable(),
  by_sector: z.array(z.record(z.unknown())).nullable(),
  by_gap_bucket: z.array(z.record(z.unknown())).nullable(),
});

export type TrackerStats = z.infer<typeof TrackerStatsSchema>;

export interface TrackerFilters {
  stage?: string;
  days?: number;
  min_score?: number;
  catalyst_type?: string;
  sector?: string;
  limit?: number;
  offset?: number;
}
```

- [ ] **Step 2: Create TanStack Query hooks**

Create `/home/will/PeakDipVibe/src/api/hooks/useTracker.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../client";
import { STALE_FRESH, STALE_WARM } from "../queryConfig";
import {
  PeakDipEventSchema,
  TrackerSummarySchema,
  TrackerStatsSchema,
  type TrackerFilters,
} from "../types/tracker";

function stripEmpty(obj: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v != null && v !== ""),
  );
}

export function useTrackerEvents(filters: TrackerFilters = {}) {
  return useQuery({
    queryKey: ["tracker", "events", filters],
    queryFn: async () => {
      const params = stripEmpty(filters as Record<string, unknown>);
      const { data } = await api.get("/tracker/events", { params });
      return z.array(PeakDipEventSchema).parse(data);
    },
    staleTime: STALE_FRESH,
  });
}

export function useTrackerSummary() {
  return useQuery({
    queryKey: ["tracker", "summary"],
    queryFn: async () => {
      const { data } = await api.get("/tracker/summary");
      return TrackerSummarySchema.parse(data);
    },
    staleTime: STALE_WARM,
  });
}

export function useTrackerStats(days = 365) {
  return useQuery({
    queryKey: ["tracker", "stats", days],
    queryFn: async () => {
      const { data } = await api.get("/tracker/stats", { params: { days } });
      return TrackerStatsSchema.parse(data);
    },
    staleTime: STALE_WARM,
  });
}
```

- [ ] **Step 3: Build to verify types compile**

```bash
cd /home/will/PeakDipVibe
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors related to tracker files.

- [ ] **Step 4: Commit**

```bash
cd /home/will/PeakDipVibe
git add src/api/types/tracker.ts src/api/hooks/useTracker.ts
git commit -m "feat: add Peak/Dip Tracker API types and TanStack Query hooks"
```

---

### Task 2: Build the EventCard component

This is the most important visual component — the scorecard + expandable case study.

**Files:**
- Create: `/home/will/PeakDipVibe/src/features/tracker/components/EventCard.tsx`

- [ ] **Step 1: Create the EventCard component**

Create `/home/will/PeakDipVibe/src/features/tracker/components/EventCard.tsx`:

```tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, PlayCircle, BarChart3, Bot } from "lucide-react";
import type { PeakDipEvent } from "@/api/types/tracker";

function scoreColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 65) return "#4ade80";
  if (score >= 50) return "#f59e0b";
  if (score >= 35) return "#fb923c";
  return "#ef4444";
}

function scoreLabel(score: number) {
  if (score >= 80) return "Strong Pounce";
  if (score >= 65) return "Good Setup";
  if (score >= 50) return "Moderate";
  if (score >= 35) return "Risky";
  return "Avoid";
}

function stageBadge(stage: string | null) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    peaked: { bg: "bg-amber/20", text: "text-amber", label: "PEAKED" },
    selling_off: { bg: "bg-red/20", text: "text-red", label: "SELLING OFF" },
    dip_zone: { bg: "bg-accent/20", text: "text-accent", label: "DIP ZONE" },
    recovering: { bg: "bg-green/20", text: "text-green", label: "RECOVERING" },
    resolved: { bg: "bg-bg-hover", text: "text-text-muted", label: "RESOLVED" },
  };
  const s = styles[stage || "resolved"] || styles.resolved;
  return (
    <span className={`${s.bg} ${s.text} rounded px-2 py-0.5 text-[10px] font-semibold`}>
      {s.label}
    </span>
  );
}

function stageColor(stage: string | null) {
  const map: Record<string, string> = {
    peaked: "#f59e0b",
    selling_off: "#ef4444",
    dip_zone: "#6366f1",
    recovering: "#22c55e",
    resolved: "#64748b",
  };
  return map[stage || "resolved"] || "#64748b";
}

const catalystLabels: Record<string, string> = {
  earnings_beat: "Earnings Beat",
  guidance_raise: "Guidance Raise",
  revenue_beat: "Revenue Beat",
  upgrade: "Analyst Upgrade",
  guidance: "Positive Guidance",
  positive_news: "Positive News",
};

interface Props {
  event: PeakDipEvent;
  defaultExpanded?: boolean;
}

export function EventCard({ event, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const score = event.pounce_score ?? 0;
  const color = scoreColor(score);
  const label = scoreLabel(score);

  return (
    <div
      className="overflow-hidden rounded-xl border bg-bg-card"
      style={{ borderLeftWidth: 4, borderLeftColor: stageColor(event.stage) }}
    >
      {/* Scorecard header */}
      <div
        className="flex cursor-pointer items-center gap-4 p-4"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Pounce score circle */}
        <div className="flex-shrink-0 text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {score}
          </div>
          <div className="mt-0.5 text-[9px] font-semibold" style={{ color }}>
            {label}
          </div>
        </div>

        {/* Main info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              to={`/ticker/${event.ticker}`}
              className="text-lg font-bold text-green hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {event.ticker}
            </Link>
            <span className="truncate text-sm text-text-muted">
              {event.name}
            </span>
            {stageBadge(event.stage)}
            <span className="ml-auto hidden text-xs text-text-muted sm:inline">
              {event.signal_date}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
            {event.gap_pct != null && (
              <span>
                Gap: <strong className="text-green">+{event.gap_pct.toFixed(1)}%</strong>
              </span>
            )}
            {event.selloff_pct != null && (
              <span>
                Sell-off: <strong className="text-red">-{event.selloff_pct.toFixed(1)}%</strong>
              </span>
            )}
            {event.volume_ratio != null && (
              <span>
                Volume: <strong>{event.volume_ratio.toFixed(1)}x</strong>
              </span>
            )}
            {event.catalyst_type && (
              <span>
                Catalyst:{" "}
                <strong className="text-green">
                  {catalystLabels[event.catalyst_type] || event.catalyst_type}
                </strong>
              </span>
            )}
            {event.outcome_5d != null && (
              <span>
                5d:{" "}
                <strong className={event.outcome_5d >= 0 ? "text-green" : "text-red"}>
                  {event.outcome_5d >= 0 ? "+" : ""}
                  {event.outcome_5d.toFixed(1)}%
                </strong>
              </span>
            )}
          </div>
        </div>

        {/* Expand icon */}
        <div className="flex-shrink-0 text-text-muted">
          {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <>
          {/* Actions bar */}
          <div className="flex items-center gap-2 border-t border-border px-4 py-2">
            <Link
              to={`/simulator?ticker=${event.ticker}&date=${event.signal_date}`}
              className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent/80"
            >
              <PlayCircle className="h-3.5 w-3.5" /> Simulate
            </Link>
            <Link
              to={`/ticker/${event.ticker}`}
              className="flex items-center gap-1 rounded-md bg-bg-hover px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
            >
              <BarChart3 className="h-3.5 w-3.5" /> Chart
            </Link>
          </div>

          {/* Summary */}
          <div className="border-t border-border px-4 py-3 text-sm leading-relaxed text-text-secondary">
            {event.summary_ai || event.summary_auto || "No analysis available yet."}

            {event.ai_provider && (
              <div className="mt-2 flex items-center gap-2">
                <span className="flex items-center gap-1 rounded bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
                  <Bot className="h-3 w-3" />
                  Generated by {event.ai_provider}
                  {event.ai_generated_at && ` · ${event.ai_generated_at.slice(0, 10)}`}
                </span>
              </div>
            )}
          </div>

          {/* Outcomes grid */}
          {event.outcome_1d != null && (
            <div className="flex gap-3 border-t border-border px-4 py-2 text-xs">
              {[
                { label: "1d", val: event.outcome_1d },
                { label: "3d", val: event.outcome_3d },
                { label: "5d", val: event.outcome_5d },
                { label: "10d", val: event.outcome_10d },
                { label: "20d", val: event.outcome_20d },
              ].map(
                (o) =>
                  o.val != null && (
                    <div key={o.label} className="text-center">
                      <div className="text-text-muted">{o.label}</div>
                      <div
                        className={`font-semibold ${o.val >= 0 ? "text-green" : "text-red"}`}
                      >
                        {o.val >= 0 ? "+" : ""}
                        {o.val.toFixed(1)}%
                      </div>
                    </div>
                  ),
              )}
              {event.win_5d != null && (
                <div className="ml-auto self-center">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      event.win_5d ? "bg-green/20 text-green" : "bg-red/20 text-red"
                    }`}
                  >
                    {event.win_5d ? "WIN" : "LOSS"}
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/will/PeakDipVibe
git add src/features/tracker/components/EventCard.tsx
git commit -m "feat: add EventCard component with pounce score, stage badge, expandable detail"
```

---

### Task 3: Build the SummaryBar component

**Files:**
- Create: `/home/will/PeakDipVibe/src/features/tracker/components/SummaryBar.tsx`

- [ ] **Step 1: Create the SummaryBar component**

Create `/home/will/PeakDipVibe/src/features/tracker/components/SummaryBar.tsx`:

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
cd /home/will/PeakDipVibe
git add src/features/tracker/components/SummaryBar.tsx
git commit -m "feat: add SummaryBar component for tracker KPI cards"
```

---

### Task 4: Build the TrackerPage with tab navigation

**Files:**
- Create: `/home/will/PeakDipVibe/src/features/tracker/TrackerPage.tsx`

- [ ] **Step 1: Create the TrackerPage**

Create `/home/will/PeakDipVibe/src/features/tracker/TrackerPage.tsx`:

```tsx
import { useState, useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useTrackerEvents, useTrackerSummary } from "@/api/hooks/useTracker";
import { SummaryBar } from "./components/SummaryBar";
import { EventCard } from "./components/EventCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Target, Flame, TrendingUp, History, ChevronLeft, ChevronRight } from "lucide-react";

type TabId = "active" | "recovering" | "history";

const TABS: { id: TabId; label: string; icon: typeof Flame; stage?: string }[] = [
  { id: "active", label: "Active Dips", icon: Flame, stage: "dip_zone" },
  { id: "recovering", label: "Recovering", icon: TrendingUp, stage: "recovering" },
  { id: "history", label: "All History", icon: History },
];

const PAGE_SIZE = 20;

export function TrackerPage() {
  usePageTitle("Peak/Dip Tracker");
  const [activeTab, setActiveTab] = useState<TabId>("active");
  const [page, setPage] = useState(0);

  const { data: summary, isLoading: summaryLoading } = useTrackerSummary();

  const tab = TABS.find((t) => t.id === activeTab)!;

  // For "active" tab, include peaked + selling_off + dip_zone
  const stageFilter = activeTab === "active"
    ? undefined  // we'll filter client-side for active stages
    : activeTab === "recovering"
      ? "recovering"
      : undefined;

  const daysFilter = activeTab === "history" ? 1825 : 30;

  const { data: events, isLoading: eventsLoading } = useTrackerEvents({
    stage: stageFilter,
    days: daysFilter,
    limit: activeTab === "active" ? 100 : PAGE_SIZE,
    offset: activeTab === "history" ? page * PAGE_SIZE : 0,
  });

  // Client-side filter for active tab (multiple stages)
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (activeTab === "active") {
      return events.filter((e) =>
        ["peaked", "selling_off", "dip_zone"].includes(e.stage || ""),
      );
    }
    return events;
  }, [events, activeTab]);

  const tabCounts = {
    active: summary?.active_count ?? 0,
    recovering: summary?.recovering_count ?? 0,
    history: summary?.total_events ?? 0,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
          <Target className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Peak/Dip Tracker</h1>
          <p className="text-sm text-text-muted">
            Catch the dip after the peak — earnings gap-ups that sell off
          </p>
        </div>
      </div>

      {/* Summary bar */}
      <SummaryBar summary={summary} loading={summaryLoading} />

      {/* Tab navigation */}
      <div className="flex border-b border-border">
        {TABS.map((t) => {
          const Icon = t.icon;
          const count = tabCounts[t.id];
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setPage(0); }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "border-b-2 border-accent text-accent"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    isActive
                      ? t.id === "active"
                        ? "bg-red/20 text-red"
                        : t.id === "recovering"
                          ? "bg-green/20 text-green"
                          : "bg-accent/20 text-accent"
                      : "bg-bg-hover text-text-muted"
                  }`}
                >
                  {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Event list */}
      <div className="space-y-3">
        {eventsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center">
            <Target className="mx-auto h-10 w-10 text-text-muted" />
            <h3 className="mt-3 text-lg font-semibold text-text-primary">
              {activeTab === "active"
                ? "No Active Dips"
                : activeTab === "recovering"
                  ? "No Recovering Events"
                  : "No Events Found"}
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              {activeTab === "active"
                ? "No earnings gap-ups are currently selling off. Check back around earnings season."
                : activeTab === "recovering"
                  ? "No events currently in recovery phase."
                  : "Run the historical backfill to populate events."}
            </p>
          </div>
        ) : (
          filteredEvents.map((event, i) => (
            <EventCard
              key={event.id}
              event={event}
              defaultExpanded={activeTab === "active" && i === 0}
            />
          ))
        )}
      </div>

      {/* Pagination (history tab only) */}
      {activeTab === "history" && filteredEvents.length > 0 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-sm text-text-muted">Page {page + 1}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={filteredEvents.length < PAGE_SIZE}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/will/PeakDipVibe
git add src/features/tracker/TrackerPage.tsx
git commit -m "feat: add TrackerPage with tab navigation, summary bar, event feed"
```

---

### Task 5: Wire up route and sidebar

**Files:**
- Modify: `/home/will/PeakDipVibe/src/App.tsx`
- Modify: `/home/will/PeakDipVibe/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add lazy import, route, and preload to App.tsx**

In `/home/will/PeakDipVibe/src/App.tsx`:

Add the lazy import with the other lazy imports (around line 9):
```typescript
const TrackerPage = lazy(() =>
  import("@/features/tracker/TrackerPage").then((m) => ({ default: m.TrackerPage })),
);
```

Add to the `preloadRoute` object:
```typescript
  "/tracker": () => { import("@/features/tracker/TrackerPage"); },
```

Add the Route inside the Routes block (put it near the top, after the `/pulse` route):
```tsx
<Route path="/tracker" element={<Suspense fallback={<PageSpinner />}><TrackerPage /></Suspense>} />
```

- [ ] **Step 2: Add Tracker as #1 pinned item in Sidebar.tsx**

In `/home/will/PeakDipVibe/src/components/layout/Sidebar.tsx`:

Add `Target` to the lucide-react imports:
```typescript
import { ..., Target, ... } from "lucide-react";
```

Find the `pinnedItems` array (line 69). Add Tracker as the FIRST item:
```typescript
const pinnedItems: NavItem[] = [
  { to: "/tracker", icon: Target, label: "Peak/Dip Tracker", desc: "Catch the dip after the peak" },
  { to: "/", icon: LayoutDashboard, label: "Home", desc: "See how the market is doing" },
  { to: "/pulse", icon: Sunrise, label: "Today's Briefing", desc: "What happened today, in plain English" },
];
```

- [ ] **Step 3: Build and verify**

```bash
cd /home/will/PeakDipVibe
npm run build
```

Expected: Clean build, no TypeScript errors.

- [ ] **Step 4: Test with Playwright**

Start the dev server and navigate to /tracker:
```bash
npm run dev &
sleep 3
```

Use Playwright to:
1. Navigate to `http://localhost:5173/tracker`
2. Verify the page title shows "Peak/Dip Tracker"
3. Verify the summary bar renders (even if data is from cached/empty API)
4. Verify tab navigation works (click each tab)
5. Verify sidebar shows "Peak/Dip Tracker" as the first nav item
6. Take a screenshot

```bash
kill %1
```

- [ ] **Step 5: Commit and push**

```bash
cd /home/will/PeakDipVibe
git add src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: wire up /tracker route and sidebar as #1 pinned item"
git push origin main
```
