import { useState, useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  useTrackerEvents,
  useTrackerSummary,
  useTrackerPredictions,
  useReadinessScore,
} from "@/api/hooks/useTracker";
import { SummaryBar } from "./components/SummaryBar";
import { EventCard } from "./components/EventCard";
import { PredictionCard } from "./components/PredictionCard";
import { ReadinessPanel } from "./components/ReadinessPanel";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Target,
  Flame,
  TrendingUp,
  History,
  ChevronLeft,
  ChevronRight,
  Eye,
  Bot,
} from "lucide-react";

type TabId = "active" | "recovering" | "watch" | "history" | "performance";

const TABS: { id: TabId; label: string; icon: typeof Flame; stage?: string }[] = [
  { id: "active", label: "Active Dips", icon: Flame, stage: "dip_zone" },
  { id: "recovering", label: "Recovering", icon: TrendingUp, stage: "recovering" },
  { id: "watch", label: "Pre-Earnings Watch", icon: Eye },
  { id: "history", label: "All History", icon: History },
  { id: "performance", label: "Bot Performance", icon: Bot },
];

const PAGE_SIZE = 20;

export function TrackerPage() {
  usePageTitle("Peak/Dip Tracker");
  const [activeTab, setActiveTab] = useState<TabId>("active");
  const [page, setPage] = useState(0);

  const { data: summary, isLoading: summaryLoading } = useTrackerSummary();
  const { data: predictions, isLoading: predictionsLoading } =
    useTrackerPredictions();
  const { data: userReadiness, isLoading: userReadinessLoading } =
    useReadinessScore("user");
  const { data: aiReadiness, isLoading: aiReadinessLoading } =
    useReadinessScore("ai");

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
    watch: predictions?.length ?? 0,
    history: summary?.total_events ?? 0,
    performance: 0,
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

      {/* Tab content */}
      {activeTab === "watch" ? (
        <div className="space-y-3">
          {predictionsLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))
          ) : !predictions?.length ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <Eye className="mx-auto h-10 w-10 text-text-muted" />
              <h3 className="mt-3 text-lg font-semibold text-text-primary">
                No Upcoming Earnings
              </h3>
              <p className="mt-1 text-sm text-text-muted">
                Predictions appear when earnings are scheduled in the next 14
                days.
              </p>
            </div>
          ) : (
            predictions.map((p) => (
              <PredictionCard key={p.ticker} prediction={p} />
            ))
          )}
        </div>
      ) : activeTab === "performance" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-text-muted">
              Your Readiness
            </h3>
            <ReadinessPanel
              score={userReadiness}
              loading={userReadinessLoading}
              actor="user"
            />
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-text-muted">
              AI Bot Readiness
            </h3>
            <ReadinessPanel
              score={aiReadiness}
              loading={aiReadinessLoading}
              actor="ai"
            />
          </div>
        </div>
      ) : (
        /* Event list (Active Dips, Recovering, History) */
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
      )}

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
