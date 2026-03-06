import { TrendingUp, TrendingDown, RefreshCw, ArrowRight } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useImpactSummary, usePriceJourney, useThisWeek } from "@/api/hooks/useEarnings";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { MiniLesson } from "@/components/education/MiniLesson";
import { PriceJourneyChart } from "./components/PriceJourneyChart";
import { ImpactCards } from "./components/ImpactCards";
import { ThisWeekTimeline } from "./components/ThisWeekTimeline";
import { SectorChart } from "./components/SectorChart";
import { ForwardLook } from "./components/ForwardLook";
import { SignalCalendar } from "./components/SignalCalendar";

export function EarningsPage() {
  usePageTitle("Earnings Events");
  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useImpactSummary();
  const { data: journey, isError: journeyError, refetch: refetchJourney } = usePriceJourney("all");
  const { data: thisWeek, isLoading: weekLoading, isError: weekError, refetch: refetchWeek } = useThisWeek();

  // Build the callout sentence from journey data
  const openGain = journey?.stages.find((s) => s.stage === "Open")?.value;
  const dayLow = journey?.stages.find(
    (s) => s.stage === "Day Low" || s.stage === "Intraday Dip",
  )?.value;
  const nextDay = journey?.stages.find(
    (s) => s.stage === "Next Day" || s.stage === "Day 1 Close",
  )?.value;

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-12">
      {/* ── Section 1: Hero — "The Pattern" ── */}
      <section>
        <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
          What Happens After Big News?
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          When a company reports great earnings, the stock jumps. But what
          happens NEXT? Here's the 3-step pattern we found.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Step 1 */}
          <Card className="relative border-emerald-500/20 bg-emerald-500/5 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <TrendingUp className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-sm font-bold text-emerald-400">JUMP</p>
            <p className="mt-1 text-xs text-text-secondary">
              Good news drops.
            </p>
            <p className="text-xs text-text-muted">Stock gaps up at open.</p>
            {/* Arrow connector — hidden on mobile */}
            <ArrowRight className="absolute right-[-22px] top-1/2 hidden h-5 w-5 -translate-y-1/2 text-text-muted/30 sm:block" />
          </Card>

          {/* Step 2 */}
          <Card className="relative border-red-500/20 bg-red-500/5 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <TrendingDown className="h-6 w-6 text-red-400" />
            </div>
            <p className="text-sm font-bold text-red-400">DIP</p>
            <p className="mt-1 text-xs text-text-secondary">
              Profit-takers sell.
            </p>
            <p className="text-xs text-text-muted">
              Price drops from the peak.
            </p>
            <ArrowRight className="absolute right-[-22px] top-1/2 hidden h-5 w-5 -translate-y-1/2 text-text-muted/30 sm:block" />
          </Card>

          {/* Step 3 */}
          <Card className="border-accent/20 bg-accent/5 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
              <RefreshCw className="h-6 w-6 text-accent" />
            </div>
            <p className="text-sm font-bold text-accent">RECOVERY?</p>
            <p className="mt-1 text-xs text-text-secondary">
              Does it bounce back?
            </p>
            <p className="text-xs text-text-muted">That's what we track.</p>
          </Card>
        </div>

        <p className="mt-4 text-center text-sm text-text-muted">
          We tracked{" "}
          <span className="font-semibold text-text-primary">
            {summary?.totals.total ?? "..."}
          </span>{" "}
          of these events across tracked stocks to find out.
        </p>
      </section>

      {/* ── Section 2: The Big Answer — Price Journey Chart ── */}
      <section>
        <h2 className="mb-1 text-xl font-bold text-text-primary">
          The Big Answer
        </h2>
        <p className="mb-4 text-sm text-text-muted">
          Follow the average stock from before the news to one week later.
        </p>

        {/* Callout summary */}
        {openGain != null && (
          <Card className="mb-4 border-accent/20 bg-accent/5">
            <p className="text-sm text-text-secondary">
              On average, the stock gains{" "}
              <span className="font-bold text-emerald-400">
                +{(openGain - 100).toFixed(1)}%
              </span>{" "}
              at open
              {dayLow != null && (
                <>
                  , dips{" "}
                  <span className="font-bold text-red-400">
                    {(dayLow - openGain).toFixed(1)}%
                  </span>{" "}
                  during the day
                </>
              )}
              {nextDay != null && dayLow != null && (
                <>
                  , then{" "}
                  <span className="font-bold text-accent">
                    {nextDay > dayLow ? "recovers" : "stays flat"}
                  </span>{" "}
                  the next day
                </>
              )}
              .
            </p>
          </Card>
        )}

        {journeyError ? (
          <ErrorState message="Could not load price journey data." onRetry={refetchJourney} />
        ) : (
          <PriceJourneyChart />
        )}
      </section>

      {/* ── Section 3: "Does Size Matter?" — Impact Cards ── */}
      <section>
        <h2 className="mb-1 text-xl font-bold text-text-primary">
          Does Size Matter?
        </h2>
        <p className="mb-4 text-sm text-text-muted">
          We grouped every big move by how large the initial jump was. Here's
          the verdict for each group.
        </p>
        {summaryError ? (
          <ErrorState message="Could not load earnings data. The API may be offline." onRetry={refetchSummary} />
        ) : (
          <ImpactCards
            categories={summary?.categories ?? []}
            isLoading={summaryLoading}
          />
        )}
      </section>

      {/* ── Section 4: "What Happened This Week" ── */}
      <section>
        <h2 className="mb-1 text-xl font-bold text-text-primary">
          What Happened This Week
        </h2>
        <p className="mb-4 text-sm text-text-muted">
          The biggest stock moves from this week and what happened next.
        </p>
        {weekError ? (
          <ErrorState message="Could not load this week's data." onRetry={refetchWeek} />
        ) : (
          <ThisWeekTimeline data={thisWeek} isLoading={weekLoading} />
        )}
      </section>

      {/* ── Signal Calendar ── */}
      <section>
        <h2 className="mb-1 text-xl font-bold text-text-primary">
          Signal Calendar
        </h2>
        <p className="mb-4 text-sm text-text-muted">
          When did gap-up events happen this month? Dots show signal activity.
        </p>
        <SignalCalendar />
      </section>

      {/* ── Section 5: "What's Coming Up?" — Forward Look ── */}
      <section>
        <h2 className="mb-1 text-xl font-bold text-text-primary">
          Repeat Movers to Watch
        </h2>
        <p className="mb-4 text-sm text-text-muted">
          Stocks that have gapped up multiple times before. When they move again,
          here's what history says.
        </p>
        <ForwardLook />
      </section>

      {/* ── Section 6: "Which Sectors Move the Most?" ── */}
      <section>
        <h2 className="mb-1 text-xl font-bold text-text-primary">
          Which Sectors Move the Most?
        </h2>
        <p className="mb-4 text-sm text-text-muted">
          Some industries have bigger, more frequent price jumps than others.
        </p>
        <SectorChart />
      </section>

      {/* Educational mini-lesson */}
      <MiniLesson
        icon="📊"
        title="Earnings 101: Why Stocks Jump on News"
        points={[
          "Every 3 months, public companies report how much money they made. If profits beat expectations, the stock often jumps higher the next morning.",
          "The size of the jump depends on how much the company beat by AND how the market is feeling that day. A 5% beat in a bad market might barely move.",
          "After the initial jump, there's almost always a sell-off. Early buyers lock in profits, which pushes the price down during the day. This is the 'dip' in Peak-Dip.",
          "The real opportunity is watching what happens AFTER the dip. If the stock bounces back, it often means big investors believe the good news is real.",
        ]}
      />
    </div>
  );
}
