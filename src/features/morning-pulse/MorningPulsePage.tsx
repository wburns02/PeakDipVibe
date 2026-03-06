import { useMarketBreadth, useMarketOverview, useUpcomingEarnings } from "@/api/hooks/useMarket";
import { usePatternSignals } from "@/api/hooks/useSignals";
import { usePageTitle } from "@/hooks/usePageTitle";
import { computeMarketMood } from "./lib/scoring";
import { PulseHeader } from "./components/PulseHeader";
import { MarketMoodGauge } from "./components/MarketMoodGauge";
import { KeyNumbers } from "./components/KeyNumbers";
import { TopSetups } from "./components/TopSetups";
import { SectorFlow } from "./components/SectorFlow";
import { EarningsRadar } from "./components/EarningsRadar";
import { WatchlistHealth } from "./components/WatchlistHealth";
import { FreshSignals } from "./components/FreshSignals";

export function MorningPulsePage() {
  usePageTitle("Morning Pulse");

  const { data: overview, isLoading: overviewLoading } = useMarketOverview();
  const { data: breadth, isLoading: breadthLoading } = useMarketBreadth();
  const { data: earningsData, isLoading: earningsLoading } = useUpcomingEarnings(12);
  const { data: signals, isLoading: signalsLoading } = usePatternSignals({
    days: 14,
    sort_by: "signal_strength",
    limit: 30,
  });

  const mood = computeMarketMood(breadth, overview?.sectors);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 pb-24 md:pb-6">
      <PulseHeader />

      {/* Market Mood */}
      <section
        className="pulse-section rounded-2xl border border-border bg-bg-card p-6"
        style={{ animationDelay: "0ms" }}
      >
        <MarketMoodGauge mood={mood} loading={breadthLoading} />
      </section>

      {/* Key Numbers */}
      <section className="pulse-section" style={{ animationDelay: "80ms" }}>
        <KeyNumbers breadth={breadth} loading={breadthLoading} />
      </section>

      {/* Top Setups */}
      <section className="pulse-section" style={{ animationDelay: "160ms" }}>
        <TopSetups
          signals={signals}
          sectors={overview?.sectors}
          loading={signalsLoading || overviewLoading}
        />
      </section>

      {/* Sector Rotation */}
      <section className="pulse-section" style={{ animationDelay: "240ms" }}>
        <SectorFlow
          sectors={overview?.sectors}
          loading={overviewLoading}
        />
      </section>

      {/* Two-column: Earnings + Watchlist */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="pulse-section" style={{ animationDelay: "320ms" }}>
          <EarningsRadar
            earnings={earningsData?.earnings}
            loading={earningsLoading}
          />
        </section>

        <section className="pulse-section" style={{ animationDelay: "400ms" }}>
          <WatchlistHealth />
        </section>
      </div>

      {/* Fresh Signals */}
      <section className="pulse-section" style={{ animationDelay: "480ms" }}>
        <FreshSignals signals={signals} loading={signalsLoading} />
      </section>
    </div>
  );
}
