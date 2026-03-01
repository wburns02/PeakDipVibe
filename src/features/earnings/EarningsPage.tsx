import { useState } from "react";
import { Info } from "lucide-react";
import { useImpactSummary, useThisWeek } from "@/api/hooks/useEarnings";
import { Card } from "@/components/ui/Card";
import { PriceJourneyChart } from "./components/PriceJourneyChart";
import { ImpactCards } from "./components/ImpactCards";
import { ThisWeekTimeline } from "./components/ThisWeekTimeline";
import { SectorChart } from "./components/SectorChart";

const TABS = [
  { id: "overview", label: "How It Works" },
  { id: "this-week", label: "This Week" },
  { id: "sectors", label: "By Sector" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function EarningsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const { data: summary, isLoading: summaryLoading } = useImpactSummary();
  const { data: thisWeek, isLoading: weekLoading } = useThisWeek();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          What Happens After Big News?
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          When a company reports great earnings or gets an analyst upgrade, the stock
          jumps. But what happens NEXT? This page shows you the patterns.
        </p>
      </div>

      {/* Quick explainer card */}
      <Card className="border-accent/30 bg-accent/5">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div className="text-sm text-text-secondary">
            <p className="font-medium text-text-primary">Quick Guide for Beginners</p>
            <p className="mt-1">
              Stocks often <strong>jump</strong> when good news comes out (like
              beating earnings expectations). But then profit-takers sell during
              the day, causing a <strong>dip</strong>. Sometimes the stock{" "}
              <strong>recovers</strong> the next day as buyers jump back in.
              We've tracked <strong>{summary?.totals.total ?? "..."}</strong>{" "}
              of these events to show you what typically happens.
            </p>
          </div>
        </div>
      </Card>

      {/* Totals summary */}
      {summary && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <p className="text-xs text-text-muted">Total Big Moves Tracked</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">
              {summary.totals.total}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">across S&P 500 stocks</p>
          </Card>
          <Card>
            <p className="text-xs text-text-muted">
              Next-Day Win Rate
            </p>
            <p className="mt-1 text-2xl font-bold text-text-primary">
              {summary.totals.win_rate_1d ?? "—"}%
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              of the time, the stock goes up the next day
            </p>
          </Card>
          <Card>
            <p className="text-xs text-text-muted">Avg Next-Day Move</p>
            <p
              className={`mt-1 text-2xl font-bold ${
                (summary.totals.avg_return_1d ?? 0) >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {(summary.totals.avg_return_1d ?? 0) >= 0 ? "+" : ""}
              {summary.totals.avg_return_1d ?? "—"}%
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              average stock movement the day after
            </p>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-bg-secondary p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <ImpactCards
            categories={summary?.categories ?? []}
            isLoading={summaryLoading}
          />
          <PriceJourneyChart />
        </div>
      )}

      {activeTab === "this-week" && (
        <ThisWeekTimeline data={thisWeek} isLoading={weekLoading} />
      )}

      {activeTab === "sectors" && <SectorChart />}
    </div>
  );
}
