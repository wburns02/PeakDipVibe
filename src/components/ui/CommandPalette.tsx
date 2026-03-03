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
} from "lucide-react";

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
  const navigate = useNavigate();

  const go = useCallback(
    (path: string) => {
      navigate(path);
      setOpen(false);
    },
    [navigate],
  );

  const items: PaletteItem[] = useMemo(
    () => [
      // Pages
      {
        id: "nav-dashboard",
        label: "Dashboard",
        sublabel: "Market overview",
        icon: <LayoutDashboard className="h-4 w-4" />,
        action: () => go("/"),
        keywords: "home market overview",
      },
      {
        id: "nav-signals",
        label: "Signals",
        sublabel: "Peak & Dip patterns",
        icon: <Zap className="h-4 w-4" />,
        action: () => go("/signals"),
        keywords: "patterns alerts catalyst",
      },
      {
        id: "nav-earnings",
        label: "Earnings",
        sublabel: "Earnings calendar & events",
        icon: <Newspaper className="h-4 w-4" />,
        action: () => go("/earnings"),
        keywords: "calendar reports quarterly",
      },
      {
        id: "nav-simulator",
        label: "Simulator",
        sublabel: "Trade replay",
        icon: <PlayCircle className="h-4 w-4" />,
        action: () => go("/simulator"),
        keywords: "trade replay backtest practice",
      },
      {
        id: "nav-screener",
        label: "Screener",
        sublabel: "Filter S&P 500 stocks",
        icon: <SlidersHorizontal className="h-4 w-4" />,
        action: () => go("/screener"),
        keywords: "filter search stocks scan",
      },
      {
        id: "nav-compare",
        label: "Compare",
        sublabel: "Side-by-side analysis",
        icon: <BarChart3 className="h-4 w-4" />,
        action: () => go("/compare"),
        keywords: "chart side by side analysis correlation",
      },
      {
        id: "nav-watchlist",
        label: "Watchlist",
        sublabel: "Your starred stocks",
        icon: <Star className="h-4 w-4" />,
        action: () => go("/watchlist"),
        keywords: "starred favorites portfolio",
      },
      // Quick actions
      {
        id: "action-oversold",
        label: "Oversold Stocks",
        sublabel: "Screener: RSI < 30",
        icon: <TrendingDown className="h-4 w-4 text-green" />,
        action: () => {
          navigate("/screener?preset=oversold");
          setOpen(false);
        },
        keywords: "rsi low dip buy",
      },
      {
        id: "action-overbought",
        label: "Overbought Stocks",
        sublabel: "Screener: RSI > 70",
        icon: <TrendingUp className="h-4 w-4 text-red" />,
        action: () => {
          navigate("/screener?preset=overbought");
          setOpen(false);
        },
        keywords: "rsi high sell",
      },
      {
        id: "action-golden-cross",
        label: "Golden Cross Stocks",
        sublabel: "SMA 50 > SMA 200",
        icon: <ArrowRight className="h-4 w-4 text-green" />,
        action: () => {
          navigate("/screener?preset=golden");
          setOpen(false);
        },
        keywords: "sma bullish trend",
      },
    ],
    [go, navigate],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.sublabel?.toLowerCase().includes(q)) ||
        (item.keywords?.toLowerCase().includes(q)),
    );
  }, [items, query]);

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

  // Focus input when opened
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
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
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            aria-label="Command palette search"
            autoComplete="off"
          />
          <kbd className="rounded border border-border bg-bg-primary px-1.5 py-0.5 text-[10px] font-mono text-text-muted">
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
                  <kbd className="rounded border border-border bg-bg-primary px-1.5 py-0.5 text-[10px] font-mono text-text-muted">
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
          <span className="text-[11px] text-text-muted">
            Navigate with <kbd className="rounded border border-border bg-bg-primary px-1 py-0.5 text-[10px] font-mono">↑↓</kbd> and <kbd className="rounded border border-border bg-bg-primary px-1 py-0.5 text-[10px] font-mono">Enter</kbd>
          </span>
          <span className="text-[11px] text-text-muted">
            <kbd className="rounded border border-border bg-bg-primary px-1 py-0.5 text-[10px] font-mono">Ctrl+K</kbd> to toggle
          </span>
        </div>
      </div>
    </div>
  );
}
