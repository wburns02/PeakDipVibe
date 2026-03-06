import { useState, useMemo } from "react";
import { Lightbulb, Info, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { useScreener } from "@/api/hooks/useScreener";
import { useMarketBreadth } from "@/api/hooks/useMarket";
import { Skeleton } from "@/components/ui/Skeleton";
import { generateIdeas, regimeLabel } from "./lib/idea-engine";
import type { SetupType } from "./lib/idea-engine";
import { setupColor } from "./lib/idea-engine";
import { IdeaCard } from "./components/IdeaCard";

type FilterTab = "all" | SetupType;

const SETUP_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Oversold Bounce", label: "Oversold" },
  { key: "SMA-50 Pullback", label: "Pullback" },
  { key: "Momentum Breakout", label: "Momentum" },
  { key: "Mean Reversion", label: "Mean Rev" },
  { key: "Trend Continuation", label: "Trend" },
];

export function TradeIdeasPage() {
  const [guideOpen, setGuideOpen] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");

  // Data
  const { data: dataAbove, isLoading: loadA } = useScreener({ limit: 200, above_sma200: true, sort_by: "ticker" });
  const { data: dataBelow, isLoading: loadB } = useScreener({ limit: 200, above_sma200: false, sort_by: "ticker" });
  const { data: breadth } = useMarketBreadth();

  const isLoading = loadA || loadB;

  const screenerData = useMemo(() => {
    if (!dataAbove || !dataBelow) return undefined;
    const map = new Map<string, (typeof dataAbove)[number]>();
    for (const s of [...dataAbove, ...dataBelow]) map.set(s.ticker, s);
    return [...map.values()];
  }, [dataAbove, dataBelow]);

  // Generate ideas
  const allIdeas = useMemo(
    () => (screenerData && breadth ? generateIdeas(screenerData, breadth) : []),
    [screenerData, breadth],
  );

  const filtered = useMemo(
    () => (filter === "all" ? allIdeas : allIdeas.filter((i) => i.setup === filter)),
    [allIdeas, filter],
  );

  const regime = breadth ? regimeLabel(breadth) : null;

  // Count per setup type
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const idea of allIdeas) {
      map.set(idea.setup, (map.get(idea.setup) ?? 0) + 1);
    }
    return map;
  }, [allIdeas]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <Lightbulb className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Trade Ideas</h1>
            <p className="text-sm text-text-muted">
              Auto-generated setups from today&rsquo;s market data
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setGuideOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-hover"
        >
          <Info className="h-3.5 w-3.5" />
          How It Works
          {guideOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Guide */}
      {guideOpen && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm text-text-secondary">
          <h3 className="mb-2 font-semibold text-text-primary">How Trade Ideas Work</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 font-medium text-text-primary">Setup Detection</p>
              <p>
                Scans 50 S&P stocks for 5 proven technical patterns: Oversold Bounce, SMA-50 Pullback,
                Momentum Breakout, Mean Reversion, and Trend Continuation.
              </p>
            </div>
            <div>
              <p className="mb-1 font-medium text-text-primary">Entry / Stop / Target</p>
              <p>
                Each idea includes precise price levels computed from moving averages and
                risk/reward analysis. Only ideas with R/R &gt; 1.2:1 are shown.
              </p>
            </div>
            <div>
              <p className="mb-1 font-medium text-text-primary">Conviction Score (1-5 Stars)</p>
              <p>
                Based on setup quality, market regime alignment, RSI confirmation,
                and moving average structure. Higher stars = more factors converging.
              </p>
            </div>
            <div>
              <p className="mb-1 font-medium text-text-primary">One-Click Action</p>
              <p>
                Expand any idea to see the chart visualization, then send directly to
                Trade Planner with entry/stop/target pre-filled.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Market Context */}
      {regime && (
        <div
          className="flex items-center gap-3 rounded-xl border p-4"
          style={{ borderColor: regime.color + "40", backgroundColor: regime.color + "08" }}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: regime.color + "20" }}
          >
            <Zap className="h-4 w-4" style={{ color: regime.color }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">
                Market Regime:
              </span>
              <span className="font-bold" style={{ color: regime.color }}>
                {regime.label}
              </span>
            </div>
            <p className="text-xs text-text-muted">{regime.advice}</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {SETUP_TABS.map((tab) => {
          const count = tab.key === "all" ? allIdeas.length : (counts.get(tab.key) ?? 0);
          if (count === 0 && tab.key !== "all") return null;
          const isActive = filter === tab.key;
          const color = tab.key === "all" ? "var(--color-accent)" : setupColor(tab.key as SetupType);
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "text-white"
                  : "border-border text-text-muted hover:text-text-primary hover:bg-bg-hover"
              }`}
              style={isActive ? { backgroundColor: color, borderColor: color } : undefined}
            >
              {tab.label}
              <span className={`ml-1 ${isActive ? "opacity-80" : "opacity-50"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Ideas list */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((idea) => (
            <IdeaCard key={`${idea.ticker}-${idea.setup}`} idea={idea} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-bg-secondary/50 p-12 text-center">
          <Lightbulb className="mx-auto mb-3 h-10 w-10 text-text-muted/30" />
          <p className="text-sm font-medium text-text-primary">
            No {filter === "all" ? "" : filter + " "}ideas today
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {filter !== "all"
              ? "Try switching to a different setup type or \"All\""
              : "Market conditions didn't trigger any setups. Check back tomorrow."}
          </p>
        </div>
      )}

      {/* Disclaimer */}
      {filtered.length > 0 && (
        <p className="text-center text-[10px] text-text-muted">
          Trade ideas are generated algorithmically from technical data and are not financial advice.
          Always do your own research and manage risk appropriately.
        </p>
      )}
    </div>
  );
}
