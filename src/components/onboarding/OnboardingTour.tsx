import { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart3,
  Search,
  Zap,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  X,
  Rocket,
  Filter,
} from "lucide-react";

const STORAGE_KEY = "peakdipvibe-onboarding-completed";

interface TourStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  tip?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    icon: <Rocket className="h-8 w-8 text-accent" />,
    title: "Welcome to PeakDipVibe!",
    description:
      "This app helps you understand what happens when stocks make big moves. We track gap-ups, sell-offs, and recoveries across the S&P 500 — so you can learn patterns that repeat.",
    tip: "Everything here is educational. No real money, no financial advice.",
  },
  {
    icon: <Search className="h-8 w-8 text-accent" />,
    title: "Search & Dashboard",
    description:
      "The Dashboard is your home base. Search for any stock to see its technicals, signals, and price chart. The sector heatmap and top movers give you a quick market pulse.",
    tip: 'Try pressing "/" anywhere to jump to the search bar.',
  },
  {
    icon: <Zap className="h-8 w-8 text-amber" />,
    title: "News Catalyst Scanner",
    description:
      "The Signals page detects gap-up + sell-off patterns driven by earnings, upgrades, and positive news. Filter by strength, catalyst type, and sector to find interesting setups.",
    tip: "Look for signals with strength 60+ and V-Bounce badges.",
  },
  {
    icon: <TrendingUp className="h-8 w-8 text-green" />,
    title: "Earnings Events",
    description:
      "The Earnings page shows the big pattern: stocks jump on good news, dip as profit-takers sell, then often recover. Follow the price journey chart to see the average path.",
  },
  {
    icon: <BarChart3 className="h-8 w-8 text-purple-400" />,
    title: "Trading Simulator",
    description:
      "Pick any real stock event and replay it in 15/30/60-minute bars. Practice buying the dip and selling the recovery with virtual money. Toggle the Probability Cone to see projected ranges.",
    tip: "Keyboard shortcuts: Space (play), B (buy), S (sell), ←→ (step).",
  },
  {
    icon: <Filter className="h-8 w-8 text-cyan-400" />,
    title: "Screener, Compare & Watchlist",
    description:
      "Use the Screener to filter stocks by technicals. Compare up to 4 tickers side-by-side. Add favorites to your Watchlist for quick access.",
  },
];

export function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (!completed) {
        // Small delay to let the page render first
        const timer = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // Private browsing or storage error — skip tour
    }
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // Silently ignore
    }
  }, []);

  const next = useCallback(() => {
    if (step < TOUR_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }, [step, dismiss]);

  const prev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, next, prev, dismiss]);

  // Focus dialog when it becomes visible
  useEffect(() => {
    if (visible) {
      requestAnimationFrame(() => dialogRef.current?.focus());
    }
  }, [visible]);

  if (!visible) return null;

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[99] flex items-center justify-center bg-black/60 backdrop-blur-sm outline-none"
      onClick={(e) => {
        // Close if clicking the backdrop
        if (e.target === e.currentTarget) dismiss();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tour"
    >
      <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-bg-secondary shadow-2xl">
        {/* Header with close button */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="text-xs font-medium text-text-muted">
            {step + 1} of {TOUR_STEPS.length}
          </span>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-1 text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-bg-hover">
            {current.icon}
          </div>
          <h2 className="mb-2 text-lg font-bold text-text-primary">
            {current.title}
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            {current.description}
          </p>
          {current.tip && (
            <p className="mt-3 rounded-lg bg-accent/5 px-3 py-2 text-xs text-accent">
              Tip: {current.tip}
            </p>
          )}
        </div>

        {/* Progress dots + navigation */}
        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {TOUR_STEPS.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? "w-6 bg-accent"
                    : i < step
                      ? "w-1.5 bg-accent/40"
                      : "w-1.5 bg-bg-hover"
                }`}
                aria-label={`Go to step ${i + 1}: ${s.title}`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={prev}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
            {step === 0 && (
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-text-secondary"
              >
                Skip
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-1 rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              {isLast ? "Get Started" : "Next"}
              {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
