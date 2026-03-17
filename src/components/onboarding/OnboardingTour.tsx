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
    title: "Hey there! Welcome!",
    description:
      "PeakDipVibe is like a weather app, but for the stock market! Instead of checking if it'll rain tomorrow, you can see which companies are having a great day and which ones aren't. No real money involved — it's all just for learning and fun.",
    tip: "Think of stocks like trading cards — each one has stats, and we help you compare them!",
  },
  {
    icon: <Search className="h-8 w-8 text-accent" />,
    title: "Find Any Company",
    description:
      "The Home page is your starting point. Type any company name — like Apple, Tesla, or Nike — into the search bar to learn about it. You'll see colorful charts, today's biggest winners and losers, and a map showing which industries are doing well.",
    tip: "Try searching for your favorite brand — they might be on the stock market!",
  },
  {
    icon: <Zap className="h-8 w-8 text-amber" />,
    title: "Catch the Big Moves",
    description:
      "The Signals page is like a news alert. It shows you stocks that just made a big jump or a big drop — and tells you WHY it happened (like a great earnings report or exciting news). The bigger the \"strength\" number, the bigger the move!",
    tip: "Green badges = the stock bounced back. Red = it kept falling.",
  },
  {
    icon: <TrendingUp className="h-8 w-8 text-green" />,
    title: "Earnings = Report Card Day",
    description:
      "Every few months, companies share their \"report card\" (called earnings). If a company did better than expected, its stock usually jumps up! This page tracks what happens before and after those big announcements.",
  },
  {
    icon: <BarChart3 className="h-8 w-8 text-purple-400" />,
    title: "Practice with Play Money",
    description:
      "The Simulator lets you pretend to buy and sell stocks using fake money. Watch the price move in real time and try to buy low and sell high — like a video game! You can't lose any real money, so experiment all you want.",
    tip: "Press Space to play, B to buy, S to sell, and arrow keys to step through time.",
  },
  {
    icon: <Filter className="h-8 w-8 text-cyan-400" />,
    title: "Build Your Favorites List",
    description:
      "Use the Star button on any stock to add it to your Favorites. You can compare stocks side by side, use the Stock Finder to search with filters (like finding all tech companies), and check back anytime to see how your picks are doing!",
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
