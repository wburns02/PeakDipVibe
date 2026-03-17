import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  LayoutDashboard,
  Zap,
  Newspaper,
  PlayCircle,
  SlidersHorizontal,
  BarChart3,
  Star,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  Grid3x3,
  Sunrise,
  FlaskConical,
  Dna,
  ClipboardList,
  BookOpen,
  RefreshCw,
  Scan,
  Bell,
  CalendarRange,
  TestTubeDiagonal,
  HeartPulse,
  Trophy,
  Lightbulb,
  Gauge,
  ArrowDownUp,
  Shapes,
  Radar,
} from "lucide-react";
import { useTickerList } from "@/api/hooks/useTickers";
import { useDebounce } from "@/hooks/useDebounce";

interface PaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const navigate = useNavigate();

  const debouncedQuery = useDebounce(query, 150);
  const tickerSearch = debouncedQuery.trim().length >= 1 ? debouncedQuery.trim() : undefined;
  const { data: tickerResults } = useTickerList(tickerSearch);

  const go = useCallback(
    (path: string) => {
      navigate(path);
      setOpen(false);
    },
    [navigate],
  );

  const navItems: PaletteItem[] = useMemo(
    () => [
      {
        id: "nav-pulse",
        label: "Today's Briefing",
        sublabel: "What happened in the market today, in plain English",
        icon: <Sunrise className="h-4 w-4" />,
        action: () => go("/pulse"),
        keywords: "morning pulse briefing daily today setups mood",
      },
      {
        id: "nav-alerts",
        label: "Alerts",
        sublabel: "Get notified when stocks make big moves",
        icon: <Bell className="h-4 w-4" />,
        action: () => go("/alerts"),
        keywords: "alerts events scanner oversold overbought golden cross death cross bollinger breakout",
      },
      {
        id: "nav-ideas",
        label: "Trade Ideas",
        sublabel: "Interesting stocks picked for you today",
        icon: <Lightbulb className="h-4 w-4" />,
        action: () => go("/ideas"),
        keywords: "ideas setups trade scan pullback oversold bounce momentum breakout entry stop target",
      },
      {
        id: "nav-planner",
        label: "Game Plan",
        sublabel: "Plan your next move before the market opens",
        icon: <ClipboardList className="h-4 w-4" />,
        action: () => go("/planner"),
        keywords: "planner plan trade setup entry stop target position sizing risk morning game",
      },
      {
        id: "nav-journal",
        label: "Journal",
        sublabel: "Keep a diary of your picks and see how they did",
        icon: <BookOpen className="h-4 w-4" />,
        action: () => go("/journal"),
        keywords: "journal log trade track performance pnl win rate equity curve history",
      },
      {
        id: "nav-dashboard",
        label: "Home",
        sublabel: "See how the market is doing right now",
        icon: <LayoutDashboard className="h-4 w-4" />,
        action: () => go("/"),
        keywords: "home market overview dashboard",
      },
      {
        id: "nav-signals",
        label: "Signals",
        sublabel: "Stocks making big moves right now",
        icon: <Zap className="h-4 w-4" />,
        action: () => go("/signals"),
        keywords: "patterns alerts catalyst big moves",
      },
      {
        id: "nav-earnings",
        label: "Earnings",
        sublabel: "When companies share their report cards",
        icon: <Newspaper className="h-4 w-4" />,
        action: () => go("/earnings"),
        keywords: "calendar reports quarterly earnings",
      },
      {
        id: "nav-simulator",
        label: "Simulator",
        sublabel: "Practice buying & selling with play money",
        icon: <PlayCircle className="h-4 w-4" />,
        action: () => go("/simulator"),
        keywords: "trade replay backtest practice game",
      },
      {
        id: "nav-screener",
        label: "Stock Finder",
        sublabel: "Search for stocks using filters",
        icon: <SlidersHorizontal className="h-4 w-4" />,
        action: () => go("/screener"),
        keywords: "filter search stocks scan screener finder",
      },
      {
        id: "nav-dna",
        label: "Stock DNA",
        sublabel: "A health checkup for any stock",
        icon: <Dna className="h-4 w-4" />,
        action: () => go("/dna"),
        keywords: "dna analysis confluence score verdict indicators health checkup",
      },
      {
        id: "nav-strategy",
        label: "Strategy Lab",
        sublabel: "Build your own stock-finding recipe",
        icon: <FlaskConical className="h-4 w-4" />,
        action: () => go("/strategy"),
        keywords: "strategy lab scanner builder conditions filter custom screener recipe",
      },
      {
        id: "nav-rotation",
        label: "Money Flow",
        sublabel: "See where investors are moving their money",
        icon: <RefreshCw className="h-4 w-4" />,
        action: () => go("/rotation"),
        keywords: "rotation sector rrg relative strength momentum flow money",
      },
      {
        id: "nav-volatility",
        label: "Bumpy or Calm?",
        sublabel: "Find stocks about to make a big move",
        icon: <Gauge className="h-4 w-4" />,
        action: () => go("/volatility"),
        keywords: "volatility squeeze bollinger band bumpy calm big move breakout",
      },
      {
        id: "nav-divergences",
        label: "Hidden Clues",
        sublabel: "Spot when a stock's price and momentum disagree",
        icon: <ArrowDownUp className="h-4 w-4" />,
        action: () => go("/divergences"),
        keywords: "divergence rsi bullish bearish reversal swing momentum hidden clues",
      },
      {
        id: "nav-radar",
        label: "Momentum Map",
        sublabel: "See all stocks on one big radar screen",
        icon: <Radar className="h-4 w-4" />,
        action: () => go("/radar"),
        keywords: "momentum radar scatter bubble map all stocks",
      },
      {
        id: "nav-portfolios",
        label: "Portfolios",
        sublabel: "Ready-made groups of stock picks to follow",
        icon: <BarChart3 className="h-4 w-4" />,
        action: () => go("/portfolios"),
        keywords: "strategy portfolio groups picks ready-made collections",
      },
      {
        id: "nav-patterns",
        label: "Chart Shapes",
        sublabel: "Shapes in price charts that often predict what's next",
        icon: <Shapes className="h-4 w-4" />,
        action: () => go("/patterns"),
        keywords: "pattern chart shapes double bottom top head shoulders predict",
      },
      {
        id: "nav-heatmap",
        label: "Color Map",
        sublabel: "The whole market in one colorful picture",
        icon: <Grid3x3 className="h-4 w-4" />,
        action: () => go("/heatmap"),
        keywords: "heatmap treemap color map market visualization",
      },
      {
        id: "nav-seasonality",
        label: "Best Months",
        sublabel: "Which months are best for each stock",
        icon: <CalendarRange className="h-4 w-4" />,
        action: () => go("/seasonality"),
        keywords: "seasonal monthly calendar best months pattern history",
      },
      {
        id: "nav-strength",
        label: "Leaderboard",
        sublabel: "Which stocks are winning the race right now",
        icon: <Trophy className="h-4 w-4" />,
        action: () => go("/strength"),
        keywords: "relative strength rs rankings leaderboard momentum leaders winners",
      },
      {
        id: "nav-internals",
        label: "Market Health",
        sublabel: "Is the overall market feeling good or bad?",
        icon: <HeartPulse className="h-4 w-4" />,
        action: () => go("/internals"),
        keywords: "internals breadth health regime market feeling",
      },
      {
        id: "nav-backtest",
        label: "Time Machine",
        sublabel: "Test your ideas against 7 years of real history",
        icon: <TestTubeDiagonal className="h-4 w-4" />,
        action: () => go("/backtest"),
        keywords: "backtest strategy test time machine historical performance",
      },
      {
        id: "nav-xray",
        label: "X-Ray",
        sublabel: "See how your stocks relate to each other",
        icon: <Scan className="h-4 w-4" />,
        action: () => go("/xray"),
        keywords: "xray correlation risk diversification portfolio relationship",
      },
      {
        id: "nav-compare",
        label: "Compare",
        sublabel: "Put stocks side by side to see which is better",
        icon: <BarChart3 className="h-4 w-4" />,
        action: () => go("/compare"),
        keywords: "chart side by side compare analysis",
      },
      {
        id: "nav-watchlist",
        label: "Favorites",
        sublabel: "Stocks you starred to keep an eye on",
        icon: <Star className="h-4 w-4" />,
        action: () => go("/watchlist"),
        keywords: "starred favorites watchlist portfolio",
      },
      {
        id: "action-oversold",
        label: "Oversold Stocks",
        sublabel: "Stocks that fell a lot and might bounce back",
        icon: <TrendingDown className="h-4 w-4 text-green" />,
        action: () => { navigate("/screener?preset=oversold"); setOpen(false); },
        keywords: "rsi low dip buy oversold bounce",
      },
      {
        id: "action-overbought",
        label: "Overbought Stocks",
        sublabel: "Stocks that rose a lot and might need a rest",
        icon: <TrendingUp className="h-4 w-4 text-red" />,
        action: () => { navigate("/screener?preset=overbought"); setOpen(false); },
        keywords: "rsi high sell overbought tired",
      },
      {
        id: "action-golden-cross",
        label: "Golden Cross Stocks",
        sublabel: "Stocks showing a bullish trend signal",
        icon: <ArrowRight className="h-4 w-4 text-green" />,
        action: () => { navigate("/screener?preset=golden"); setOpen(false); },
        keywords: "sma bullish trend golden cross",
      },
    ],
    [go, navigate],
  );

  // Build ticker items from API results
  const tickerItems: PaletteItem[] = useMemo(() => {
    if (!tickerResults || !query.trim()) return [];
    return tickerResults.slice(0, 8).map((t) => ({
      id: `ticker-${t.ticker}`,
      label: t.ticker,
      sublabel: [t.name, t.sector].filter(Boolean).join(" · "),
      icon: <TrendingUp className="h-4 w-4" />,
      action: () => go(`/ticker/${t.ticker}`),
    }));
  }, [tickerResults, query, go]);

  const filtered = useMemo(() => {
    if (!query.trim()) return navItems;
    const q = query.toLowerCase();
    const matchingNav = navItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.sublabel?.toLowerCase().includes(q)) ||
        (item.keywords?.toLowerCase().includes(q)),
    );
    // Show tickers first when the query looks like a ticker (uppercase / short)
    return [...tickerItems, ...matchingNav];
  }, [navItems, tickerItems, query]);

  // Reset selection when filtered results change
  useEffect(() => setSelectedIdx(0), [filtered]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Save opener and focus input when opened; restore focus on close
  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement as HTMLElement | null;
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      openerRef.current?.focus();
      openerRef.current = null;
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[selectedIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIdx]) {
          filtered[selectedIdx].action();
          setOpen(false);
        }
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [filtered, selectedIdx],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[99] flex items-start justify-center bg-black/60 pt-[15vh] backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="mx-4 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-bg-secondary shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value.replace(/[^a-zA-Z0-9 .\-]/g, ""))}
            onKeyDown={handleKeyDown}
            placeholder="Search stocks, pages, or actions..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            aria-label="Command palette search"
            autoComplete="off"
          />
          <kbd className="rounded border border-border bg-bg-primary px-1.5 py-0.5 text-xs font-mono text-text-muted">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2" role="listbox">
          {filtered.length > 0 ? (
            filtered.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={i === selectedIdx}
                onClick={() => {
                  item.action();
                  setOpen(false);
                }}
                onMouseEnter={() => setSelectedIdx(i)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === selectedIdx ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-bg-hover"
                }`}
              >
                <span className={i === selectedIdx ? "text-accent" : "text-text-muted"}>
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  {item.sublabel && (
                    <p className="truncate text-xs text-text-muted">{item.sublabel}</p>
                  )}
                </div>
                {i === selectedIdx && (
                  <kbd className="rounded border border-border bg-bg-primary px-1.5 py-0.5 text-xs font-mono text-text-muted">
                    Enter
                  </kbd>
                )}
              </button>
            ))
          ) : (
            <div className="px-4 py-6 text-center text-sm text-text-muted">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <span className="text-xs text-text-muted">
            Navigate with <kbd className="rounded border border-border bg-bg-primary px-1 py-0.5 text-xs font-mono">↑↓</kbd> and <kbd className="rounded border border-border bg-bg-primary px-1 py-0.5 text-xs font-mono">Enter</kbd>
          </span>
          <span className="text-xs text-text-muted">
            <kbd className="rounded border border-border bg-bg-primary px-1 py-0.5 text-xs font-mono">Ctrl+K</kbd> to toggle
          </span>
        </div>
      </div>
    </div>
  );
}
