import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  useSimulation,
  useEventLibrary,
  useRandomEvent,
} from "@/api/hooks/useEarnings";
import { Card } from "@/components/ui/Card";
import type { SimStrategy, LibraryEvent } from "@/api/types/earnings";
import {
  Shuffle,
  Search,
  Play,
  SkipForward,
  HelpCircle,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Info,
  X,
} from "lucide-react";

// ─── Educational Definitions ─────────────────────────────────────────────────

const DEFINITIONS: Record<string, { term: string; explanation: string }> = {
  earnings: {
    term: "Earnings",
    explanation:
      "A company's profits over a period (usually 3 months). Companies report these publicly, and if they earn more than expected, the stock often jumps.",
  },
  "gap-up": {
    term: "Gap Up",
    explanation:
      "When a stock opens much higher than it closed the day before. Like if a toy was $10 yesterday and suddenly costs $12 today at opening.",
  },
  "profit-taking": {
    term: "Profit-Taking",
    explanation:
      "When people who already own the stock sell it to lock in their gains after a big jump. This often causes the price to dip during the day.",
  },
  selloff: {
    term: "Sell-Off",
    explanation:
      "When the price drops because many people are selling at the same time. After a big jump, profit-takers often cause a sell-off.",
  },
  bounce: {
    term: "Bounce Back",
    explanation:
      "When the stock goes back up after dropping. Like a ball that falls and bounces — the price recovers some or all of what it lost.",
  },
  volatility: {
    term: "Volatility",
    explanation:
      "How much the price moves up and down. High volatility means big swings, low volatility means the price is calm and steady.",
  },
  catalyst: {
    term: "Catalyst",
    explanation:
      "The event or news that caused the stock to move. Like earnings reports, analyst upgrades, new products, or big deals.",
  },
};

function DefinitionTooltip({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const def = DEFINITIONS[id];
  if (!def) return null;

  return (
    <span className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-0.5 border-b border-dashed border-accent/40 text-accent hover:border-accent"
      >
        {def.term}
        <Info className="inline h-3 w-3" />
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-border bg-bg-card p-3 text-xs leading-relaxed text-text-secondary shadow-xl">
          <span className="mb-1 block font-bold text-text-primary">
            {def.term}
          </span>
          {def.explanation}
          <button
            onClick={() => setOpen(false)}
            className="absolute right-1.5 top-1.5 text-text-muted hover:text-text-primary"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      )}
    </span>
  );
}

// ─── Step-by-Step Replay Data ────────────────────────────────────────────────

interface ReplayStep {
  id: string;
  label: string;
  value: number | null;
  explanation: string;
  color: string;
}

function buildReplaySteps(sim: {
  gap_up_pct: number | null;
  selloff_pct: number | null;
  timeline: Array<{
    day: number;
    close: number | null;
    open: number | null;
    high: number | null;
    pct_from_prev_close: number;
  }>;
}): ReplayStep[] {
  const t = sim.timeline;
  const prevDay = t.find((d) => d.day === -1);
  const day0 = t.find((d) => d.day === 0);
  const day1 = t.find((d) => d.day === 1);
  const day5 = t.find((d) => d.day === 5) ?? t.find((d) => d.day === 4);
  const day10 = t.find((d) => d.day === 10) ?? t.find((d) => d.day === 9);

  const gap = sim.gap_up_pct ?? 0;
  const selloff = sim.selloff_pct ?? 0;
  const closePct = day0?.pct_from_prev_close ?? 0;
  const day1Pct = day1?.pct_from_prev_close ?? null;

  const steps: ReplayStep[] = [
    {
      id: "prev",
      label: "The Day Before",
      value: 0,
      explanation:
        "This is where the stock closed yesterday. Nothing special yet. Tomorrow, big news will drop.",
      color: "text-text-muted",
    },
    {
      id: "open",
      label: "Market Opens!",
      value: gap,
      explanation: `The news is out! Buyers rush in and the stock jumps +${gap.toFixed(1)}% right at the opening bell. Everyone is excited.`,
      color: "text-emerald-400",
    },
    {
      id: "peak",
      label: "The Peak",
      value: prevDay
        ? ((day0?.high ?? 0) - (prevDay.close ?? 0)) /
          (prevDay.close ?? 1) *
          100
        : gap + 2,
      explanation:
        "The price hits its highest point of the day, usually within the first couple hours. This is where the excitement maxes out.",
      color: "text-emerald-400",
    },
    {
      id: "close",
      label: "Profit-Takers Sell",
      value: closePct,
      explanation: `People who bought earlier decide to sell and lock in their gains. The price drops ${selloff.toFixed(1)}% from the peak. This is called "profit-taking."`,
      color: selloff > 3 ? "text-red-400" : "text-amber-400",
    },
  ];

  if (day1Pct !== null) {
    steps.push({
      id: "day1",
      label: "Next Day",
      value: day1Pct,
      explanation:
        day1Pct > closePct
          ? "The next day, the stock bounced back! New buyers came in, seeing the dip as a buying opportunity."
          : "The next day, the selling continued. More people decided to take profits or cut losses.",
      color: day1Pct > closePct ? "text-emerald-400" : "text-red-400",
    });
  }

  const day5Pct = day5?.pct_from_prev_close ?? null;
  if (day5Pct !== null) {
    steps.push({
      id: "day5",
      label: "One Week Later",
      value: day5Pct,
      explanation:
        "A full trading week has passed. The initial excitement has faded — this is where the stock usually settles into its new normal.",
      color: day5Pct > 0 ? "text-emerald-400" : "text-red-400",
    });
  }

  const day10Pct = day10?.pct_from_prev_close ?? null;
  if (day10Pct !== null) {
    steps.push({
      id: "day10",
      label: "Two Weeks Later",
      value: day10Pct,
      explanation:
        day10Pct > gap * 0.5
          ? "Two weeks out, the stock held most of its gains. The big move was real!"
          : day10Pct > 0
            ? "Two weeks later, some gains remain but the excitement has faded."
            : "Two weeks later, the stock has given back all its gains. The big jump was temporary.",
      color: day10Pct > 0 ? "text-emerald-400" : "text-red-400",
    });
  }

  return steps;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SimulatorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ticker = searchParams.get("ticker") || "";
  const signalDate = searchParams.get("date") || "";

  // Modes: "browse" (landing) or "replay" (step-by-step)
  const [mode, setMode] = useState<"browse" | "replay">(
    ticker && signalDate ? "replay" : "browse",
  );

  // Event browser state
  const [filters, setFilters] = useState<{
    gap_size?: string;
    sector?: string;
    outcome?: string;
    ticker?: string;
    page: number;
  }>({ page: 1 });
  const [searchInput, setSearchInput] = useState("");

  const { data: library, isLoading: libraryLoading } = useEventLibrary({
    ...filters,
    per_page: 12,
  });

  const { refetch: fetchRandom, isFetching: randomLoading } = useRandomEvent();

  // Simulation state
  const [activeTicker, setActiveTicker] = useState(ticker);
  const [activeDate, setActiveDate] = useState(signalDate);
  const { data: sim, isLoading: simLoading } = useSimulation(
    activeTicker,
    activeDate,
  );

  // Step-by-step replay
  const [currentStep, setCurrentStep] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const selectEvent = useCallback(
    (t: string, d: string) => {
      setActiveTicker(t);
      setActiveDate(d);
      setCurrentStep(0);
      setShowExplanation(false);
      setMode("replay");
      setSearchParams({ ticker: t, date: d });
    },
    [setSearchParams],
  );

  const handleSurpriseMe = useCallback(async () => {
    const result = await fetchRandom();
    if (result.data) {
      selectEvent(result.data.ticker, result.data.signal_date);
    }
  }, [fetchRandom, selectEvent]);

  const handleSearch = () => {
    if (searchInput.trim()) {
      setFilters((f) => ({ ...f, ticker: searchInput.trim(), page: 1 }));
    } else {
      setFilters((f) => {
        const { ticker: _, ...rest } = f;
        return { ...rest, page: 1 };
      });
    }
  };

  const goBack = () => {
    setMode("browse");
    setActiveTicker("");
    setActiveDate("");
    setSearchParams({});
  };

  // Build replay steps from sim data
  const steps = sim && !("error" in sim) ? buildReplaySteps(sim) : [];
  const visibleSteps = steps.slice(0, currentStep + 1);

  // ─── BROWSE MODE ─────────────────────────────────────────────────────────

  if (mode === "browse") {
    return (
      <div className="mx-auto max-w-5xl space-y-8 pb-12">
        {/* Hero */}
        <section className="text-center">
          <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">
            Stock Market Science Lab
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-text-muted">
            When a company reports great{" "}
            <DefinitionTooltip id="earnings" />, the stock price often{" "}
            <DefinitionTooltip id="gap-up" />. But what happens next?
            Pick any event and replay it step by step.
          </p>

          {/* Big action buttons */}
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={handleSurpriseMe}
              disabled={randomLoading}
              className="flex items-center gap-2 rounded-xl bg-accent px-8 py-4 text-lg font-bold text-white shadow-lg shadow-accent/20 transition-all hover:scale-105 hover:bg-accent/90 disabled:opacity-50"
            >
              <Shuffle className="h-5 w-5" />
              {randomLoading ? "Picking..." : "Surprise Me!"}
            </button>
          </div>

          <p className="mt-2 text-xs text-text-muted">
            Picks a random big stock jump for you to explore
          </p>
        </section>

        {/* Search + Filters */}
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Search by ticker
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="AAPL, TSLA, NVDA..."
                    className="w-full rounded-lg border border-border bg-bg-secondary py-2 pl-9 pr-3 text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="rounded-lg bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20"
                >
                  Search
                </button>
              </div>
            </div>
          </div>

          {/* Filter chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {/* Gap size */}
            {["Small", "Medium", "Big", "Huge"].map((s) => (
              <button
                key={s}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    gap_size: f.gap_size === s ? undefined : s,
                    page: 1,
                  }))
                }
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filters.gap_size === s
                    ? "bg-accent text-white"
                    : "bg-bg-hover text-text-secondary hover:bg-bg-hover/80"
                }`}
              >
                {s === "Small"
                  ? "Small (1-3%)"
                  : s === "Medium"
                    ? "Medium (3-5%)"
                    : s === "Big"
                      ? "Big (5-10%)"
                      : "Huge (10%+)"}
              </button>
            ))}

            <span className="mx-1 self-center text-border">|</span>

            {/* Outcome */}
            {["Bounced", "Faded", "Kept Falling"].map((o) => (
              <button
                key={o}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    outcome: f.outcome === o ? undefined : o,
                    page: 1,
                  }))
                }
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filters.outcome === o
                    ? o === "Bounced"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : o === "Kept Falling"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-amber-500/20 text-amber-400"
                    : "bg-bg-hover text-text-secondary hover:bg-bg-hover/80"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </Card>

        {/* Event Grid */}
        {libraryLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <div className="h-28 animate-pulse rounded-lg bg-bg-hover" />
              </Card>
            ))}
          </div>
        ) : library && library.events.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">
                {library.total} events found
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {library.events.map((ev) => (
                <EventBrowserCard
                  key={`${ev.ticker}-${ev.signal_date}`}
                  event={ev}
                  onSelect={() => selectEvent(ev.ticker, ev.signal_date)}
                />
              ))}
            </div>

            {/* Pagination */}
            {library.total_pages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() =>
                    setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))
                  }
                  disabled={library.page <= 1}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover disabled:opacity-30"
                >
                  Previous
                </button>
                <span className="text-xs text-text-muted">
                  Page {library.page} of {library.total_pages}
                </span>
                <button
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      page: Math.min(library.total_pages, f.page + 1),
                    }))
                  }
                  disabled={library.page >= library.total_pages}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <Card className="text-center">
            <p className="text-sm text-text-muted">
              No events match your filters. Try adjusting them.
            </p>
          </Card>
        )}
      </div>
    );
  }

  // ─── REPLAY MODE ─────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Back button */}
      <button
        onClick={goBack}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        Browse More Events
      </button>

      {simLoading && (
        <Card>
          <div className="flex h-60 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="mt-3 text-sm text-text-muted">
                Loading event replay...
              </p>
            </div>
          </div>
        </Card>
      )}

      {sim && !("error" in sim) && (
        <>
          {/* Event Header */}
          <Card className="border-accent/20 bg-accent/5">
            <div className="text-center">
              <h2 className="text-xl font-bold text-text-primary sm:text-2xl">
                What happened here?
              </h2>
              <p className="mt-2 text-sm text-text-muted">
                {sim.name || sim.ticker} · {sim.sector} ·{" "}
                {new Date(sim.signal_date + "T12:00:00").toLocaleDateString(
                  "en-US",
                  { month: "long", day: "numeric", year: "numeric" },
                )}
              </p>
              {sim.catalyst_headline && (
                <p className="mt-1 text-xs italic text-text-muted/70">
                  "{sim.catalyst_headline}"
                </p>
              )}
              <div className="mt-4 flex justify-center gap-6">
                <div>
                  <p className="text-2xl font-bold text-emerald-400">
                    +{(sim.gap_up_pct ?? 0).toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-text-muted">
                    <DefinitionTooltip id="gap-up" />
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-400">
                    -{(sim.selloff_pct ?? 0).toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-text-muted">
                    <DefinitionTooltip id="selloff" />
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Step-by-Step Replay */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">
                Step-by-Step Replay
              </h3>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <button
                    onClick={() => {
                      setCurrentStep(0);
                      setShowExplanation(false);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-bg-hover px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary"
                  >
                    <Play className="h-3 w-3" />
                    Restart
                  </button>
                )}
                {currentStep < steps.length - 1 && (
                  <button
                    onClick={() => {
                      setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
                      setShowExplanation(false);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white hover:bg-accent/80"
                  >
                    <SkipForward className="h-3 w-3" />
                    {currentStep === 0 ? "Start" : "Next Step"}
                  </button>
                )}
                <button
                  onClick={() => setShowExplanation(!showExplanation)}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ${
                    showExplanation
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-bg-hover text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <HelpCircle className="h-3 w-3" />
                  Explain
                </button>
              </div>
            </div>

            {/* Visual progress bar */}
            <div className="mb-4 flex gap-1">
              {steps.map((step, i) => (
                <div
                  key={step.id}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    i <= currentStep ? "bg-accent" : "bg-bg-hover"
                  }`}
                />
              ))}
            </div>

            {/* Chart showing revealed steps */}
            <div className="h-52 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={visibleSteps.map((s) => ({
                    step: s.label,
                    value: s.value,
                  }))}
                  margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                  />
                  <XAxis
                    dataKey="step"
                    tick={{ fontSize: 9, fill: "rgba(255,255,255,0.5)" }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
                    tickFormatter={(v: number) =>
                      `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`
                    }
                    domain={["dataMin - 1", "dataMax + 1"]}
                  />
                  <ReTooltip
                    contentStyle={{
                      background: "#1a1e2e",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number | undefined) =>
                      v != null
                        ? [`${v >= 0 ? "+" : ""}${v.toFixed(2)}%`, "Change"]
                        : ["—", "Change"]
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#14b8a6"
                    strokeWidth={3}
                    dot={{
                      r: 6,
                      fill: "#14b8a6",
                      stroke: "#0d1117",
                      strokeWidth: 2,
                    }}
                    animationDuration={500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Current step explanation */}
            {visibleSteps.length > 0 && (
              <div className="mt-4 rounded-lg border border-border bg-bg-hover/30 p-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-lg font-bold ${visibleSteps[currentStep].color}`}
                  >
                    {visibleSteps[currentStep].value !== null &&
                      `${visibleSteps[currentStep].value! >= 0 ? "+" : ""}${visibleSteps[currentStep].value!.toFixed(1)}%`}
                  </span>
                  <span className="text-sm font-semibold text-text-primary">
                    {visibleSteps[currentStep].label}
                  </span>
                </div>

                {showExplanation && (
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    {visibleSteps[currentStep].explanation}
                  </p>
                )}

                {/* Question prompt at step 1 */}
                {currentStep === 1 && !showExplanation && (
                  <p className="mt-2 text-sm font-medium text-amber-400">
                    The stock just jumped. What do you think happens next?
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Strategies - show after all steps revealed */}
          {currentStep >= steps.length - 1 && sim.strategies.length > 0 && (
            <Card>
              <h3 className="mb-1 text-sm font-semibold text-text-primary">
                What If You Had Bought?
              </h3>
              <p className="mb-3 text-xs text-text-muted">
                Three different strategies — buy immediately, wait for the dip,
                or skip the chaos entirely.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {sim.strategies.map((s) => (
                  <StrategyCard key={s.name} strategy={s} />
                ))}
              </div>
            </Card>
          )}

          {/* Similar events - show after all steps */}
          {currentStep >= steps.length - 1 && sim.analogs.length > 0 && (
            <Card>
              <h3 className="mb-1 text-sm font-semibold text-text-primary">
                Similar Events in History
              </h3>
              <p className="mb-3 text-xs text-text-muted">
                Other stocks that jumped about the same amount. Here's what
                happened to them.
              </p>

              {/* Analog chart */}
              {(() => {
                const stages =
                  sim.analogs[0]?.path.map((p) => p.stage) ?? [];
                const chartData = stages.map((stage, idx) => {
                  const point: Record<string, string | number> = { stage };
                  sim.analogs.forEach((a, ai) => {
                    point[`analog_${ai}`] = a.path[idx]?.value ?? 0;
                  });
                  return point;
                });
                const colors = ["#f59e0b", "#8b5cf6", "#ec4899"];
                return (
                  <div className="mb-4 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.06)"
                        />
                        <XAxis
                          dataKey="stage"
                          tick={{
                            fontSize: 10,
                            fill: "rgba(255,255,255,0.5)",
                          }}
                        />
                        <YAxis
                          tick={{
                            fontSize: 10,
                            fill: "rgba(255,255,255,0.5)",
                          }}
                          tickFormatter={(v: number) => `$${v}`}
                          domain={["dataMin - 1", "dataMax + 1"]}
                        />
                        <ReTooltip
                          contentStyle={{
                            background: "#1a1e2e",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        {sim.analogs.map((a, i) => (
                          <Line
                            key={a.ticker + a.signal_date}
                            dataKey={`analog_${i}`}
                            name={`${a.ticker} (${a.signal_date.slice(5)})`}
                            stroke={colors[i % colors.length]}
                            strokeWidth={1.5}
                            dot={{ r: 3 }}
                            type="monotone"
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}

              <div className="space-y-2">
                {sim.analogs.map((a) => {
                  const outcome1d = a.outcome_1d ?? 0;
                  return (
                    <button
                      key={a.ticker + a.signal_date}
                      onClick={() => selectEvent(a.ticker, a.signal_date)}
                      className="flex w-full items-center justify-between rounded-lg bg-bg-hover/50 p-2.5 text-left transition-colors hover:bg-bg-hover"
                    >
                      <div>
                        <p className="text-xs font-medium text-text-primary">
                          {a.ticker}{" "}
                          <span className="text-text-muted">
                            — {a.name} · {a.signal_date}
                          </span>
                        </p>
                        <p className="text-[10px] text-text-muted">
                          Gap: +{a.gap_up_pct?.toFixed(1)}% · Selloff:{" "}
                          {a.selloff_pct?.toFixed(1)}%
                        </p>
                      </div>
                      <div className="flex gap-3 text-xs">
                        <span
                          className={
                            outcome1d >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }
                        >
                          1d: {outcome1d >= 0 ? "+" : ""}
                          {a.outcome_1d?.toFixed(1)}%
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            a.status === "confirmed"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : a.status === "failed"
                                ? "bg-red-500/15 text-red-400"
                                : "bg-amber-500/15 text-amber-400"
                          }`}
                        >
                          {a.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Educational note at bottom */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <div className="flex gap-3">
              <HelpCircle className="h-5 w-5 shrink-0 text-amber-400" />
              <div className="space-y-1 text-xs leading-relaxed text-text-muted">
                <p className="font-medium text-amber-400">
                  Learn While You Explore
                </p>
                <p>
                  This simulator replays real events from the stock market. It's
                  not a prediction tool — it's a science lab for understanding
                  patterns.
                </p>
                <p>
                  Key concepts:{" "}
                  <DefinitionTooltip id="earnings" /> ·{" "}
                  <DefinitionTooltip id="profit-taking" /> ·{" "}
                  <DefinitionTooltip id="bounce" /> ·{" "}
                  <DefinitionTooltip id="volatility" /> ·{" "}
                  <DefinitionTooltip id="catalyst" />
                </p>
              </div>
            </div>
          </Card>
        </>
      )}

      {sim && "error" in sim && (
        <Card>
          <p className="text-sm text-red-400">
            Event not found. Try browsing the event library instead.
          </p>
          <button
            onClick={goBack}
            className="mt-2 text-sm text-accent hover:underline"
          >
            Back to Event Browser
          </button>
        </Card>
      )}
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function EventBrowserCard({
  event: ev,
  onSelect,
}: {
  event: LibraryEvent;
  onSelect: () => void;
}) {
  const gap = ev.gap_up_pct ?? 0;
  const outcome = ev.outcome_label;

  const outcomeBg =
    outcome === "Bounced"
      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
      : outcome === "Kept Falling"
        ? "bg-red-500/10 border-red-500/20 text-red-400"
        : outcome === "Faded"
          ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
          : "bg-bg-hover border-border text-text-muted";

  const OutcomeIcon =
    outcome === "Bounced"
      ? TrendingUp
      : outcome === "Kept Falling"
        ? TrendingDown
        : outcome === "Faded"
          ? Minus
          : Clock;

  return (
    <button
      onClick={onSelect}
      className="group flex flex-col rounded-xl border border-border bg-bg-card p-4 text-left transition-all hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5"
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-lg font-bold text-accent">
            +{gap.toFixed(1)}%
          </span>
          <span className="ml-1.5 rounded bg-bg-hover px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
            {ev.gap_size}
          </span>
        </div>
        <div
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${outcomeBg}`}
        >
          <OutcomeIcon className="h-3 w-3" />
          {outcome}
        </div>
      </div>

      <div className="mt-2">
        <p className="text-sm font-semibold text-text-primary group-hover:text-accent">
          {ev.ticker}
        </p>
        <p className="truncate text-xs text-text-muted">
          {ev.name ?? ev.ticker}
          {ev.sector && (
            <span className="text-text-muted/50"> · {ev.sector}</span>
          )}
        </p>
      </div>

      <p className="mt-2 line-clamp-2 flex-1 text-[11px] leading-relaxed text-text-muted/80">
        {ev.summary}
      </p>

      <p className="mt-2 text-[10px] text-text-muted/50">
        {new Date(ev.signal_date + "T12:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
    </button>
  );
}

function StrategyCard({ strategy: s }: { strategy: SimStrategy }) {
  return (
    <div className="rounded-lg border border-border bg-bg-hover/30 p-3">
      <p className="text-xs font-bold text-text-primary">{s.name}</p>
      <p className="mt-0.5 text-[10px] text-text-muted">{s.description}</p>
      <p className="mt-1 text-[10px] text-text-muted">
        Entry: ${s.entry_price.toFixed(2)}
      </p>
      <div className="mt-2 flex gap-3 text-xs">
        {s.return_1d != null && (
          <span
            className={
              s.return_1d >= 0 ? "text-emerald-400" : "text-red-400"
            }
          >
            1d: {s.return_1d >= 0 ? "+" : ""}
            {s.return_1d.toFixed(2)}%
          </span>
        )}
        {s.return_5d != null && (
          <span
            className={
              s.return_5d >= 0 ? "text-emerald-400" : "text-red-400"
            }
          >
            5d: {s.return_5d >= 0 ? "+" : ""}
            {s.return_5d.toFixed(2)}%
          </span>
        )}
        {s.return_10d != null && (
          <span
            className={
              s.return_10d >= 0 ? "text-emerald-400" : "text-red-400"
            }
          >
            10d: {s.return_10d >= 0 ? "+" : ""}
            {s.return_10d.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}
