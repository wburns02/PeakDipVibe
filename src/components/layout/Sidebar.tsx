import { useState, useEffect, useCallback, memo } from "react";
import { Link, useLocation } from "react-router-dom";
import { preloadRoute } from "@/App";
import { useTheme } from "@/hooks/useTheme";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useSparkline } from "@/api/hooks/useCompare";
import { MiniSparkline } from "@/components/charts/MiniSparkline";
import {
  LayoutDashboard,
  TrendingUp,
  SlidersHorizontal,
  BarChart3,
  Star,
  Activity,
  Zap,
  Newspaper,
  PlayCircle,
  Menu,
  X,
  Sun,
  Moon,
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
  ChevronRight,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

const SidebarSparkline = memo(function SidebarSparkline({ ticker }: { ticker: string }) {
  const { data } = useSparkline(ticker, 7);
  if (!data || data.closes.length < 2) return <div className="h-[20px] w-12" />;
  const color = data.closes[data.closes.length - 1] >= data.closes[0] ? "#22c55e" : "#ef4444";
  return (
    <div className="w-12">
      <MiniSparkline data={data.closes.map((v) => ({ value: v }))} color={color} height={20} />
    </div>
  );
});

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

const pinnedItems: NavItem[] = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/pulse", icon: Sunrise, label: "Morning Pulse" },
];

const navSections: NavSection[] = [
  {
    id: "trading",
    title: "Trading",
    items: [
      { to: "/ideas", icon: Lightbulb, label: "Trade Ideas" },
      { to: "/planner", icon: ClipboardList, label: "Trade Planner" },
      { to: "/journal", icon: BookOpen, label: "Journal" },
      { to: "/alerts", icon: Bell, label: "Alerts" },
      { to: "/portfolios", icon: Briefcase, label: "Portfolios" },
    ],
  },
  {
    id: "discover",
    title: "Discover",
    items: [
      { to: "/signals", icon: Zap, label: "Signals" },
      { to: "/earnings", icon: Newspaper, label: "Earnings" },
      { to: "/screener", icon: SlidersHorizontal, label: "Screener" },
      { to: "/dna", icon: Dna, label: "Stock DNA" },
      { to: "/strategy", icon: FlaskConical, label: "Strategy Lab" },
    ],
  },
  {
    id: "analyze",
    title: "Analyze",
    items: [
      { to: "/simulator", icon: PlayCircle, label: "Simulator" },
      { to: "/backtest", icon: TestTubeDiagonal, label: "Backtester" },
      { to: "/internals", icon: HeartPulse, label: "Internals" },
      { to: "/strength", icon: Trophy, label: "RS Rankings" },
      { to: "/rotation", icon: RefreshCw, label: "Rotation" },
    ],
  },
  {
    id: "technical",
    title: "Technical",
    items: [
      { to: "/volatility", icon: Gauge, label: "Volatility Lab" },
      { to: "/divergences", icon: ArrowDownUp, label: "Divergences" },
      { to: "/patterns", icon: Shapes, label: "Patterns" },
      { to: "/radar", icon: Radar, label: "Momentum Radar" },
      { to: "/seasonality", icon: CalendarRange, label: "Seasonality" },
    ],
  },
  {
    id: "portfolio",
    title: "Portfolio",
    items: [
      { to: "/compare", icon: BarChart3, label: "Compare" },
      { to: "/xray", icon: Scan, label: "X-Ray" },
      { to: "/heatmap", icon: Grid3x3, label: "Heatmap" },
      { to: "/watchlist", icon: Star, label: "Watchlist" },
    ],
  },
];

const STORAGE_KEY = "pdv-sidebar-sections";

function loadOpenSections(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  // Default: trading and discover open, rest collapsed
  return { trading: true, discover: true, analyze: false, technical: false, portfolio: false };
}

function saveOpenSections(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

function NavLink({
  item,
  active,
  onNav,
}: {
  item: NavItem;
  active: boolean;
  onNav: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNav}
      onMouseEnter={() => preloadRoute[item.to]?.()}
      onFocus={() => preloadRoute[item.to]?.()}
      aria-current={active ? "page" : undefined}
      className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
        active
          ? "bg-accent/10 text-accent font-medium"
          : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {item.label}
    </Link>
  );
}

function SectionGroup({
  section,
  isOpen,
  onToggle,
  pathname,
  onNav,
}: {
  section: NavSection;
  isOpen: boolean;
  onToggle: () => void;
  pathname: string;
  onNav: () => void;
}) {
  const hasActive = section.items.some(
    (item) => item.to === "/" ? pathname === "/" : pathname.startsWith(item.to),
  );

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-bg-hover ${
          hasActive && !isOpen ? "text-accent" : "text-text-muted"
        }`}
      >
        <ChevronRight
          className={`h-3 w-3 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-90" : ""
          }`}
        />
        {section.title}
        {hasActive && !isOpen && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
        )}
      </button>
      {isOpen && (
        <div className="ml-1 mt-0.5">
          {section.items.map((item) => {
            const active =
              item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <NavLink key={item.to} item={item} active={active} onNav={onNav} />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  const { watchlist } = useWatchlist();
  const sidebarWatchlist = watchlist.slice(0, 5);
  const [openSections, setOpenSections] = useState(loadOpenSections);

  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveOpenSections(next);
      return next;
    });
  }, []);

  // Auto-expand section containing active route
  useEffect(() => {
    for (const section of navSections) {
      const hasActive = section.items.some((item) =>
        item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to),
      );
      if (hasActive && !openSections[section.id]) {
        setOpenSections((prev) => {
          const next = { ...prev, [section.id]: true };
          saveOpenSections(next);
          return next;
        });
        break;
      }
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeNav = useCallback(() => setOpen(false), []);

  // Close mobile sidebar on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-lg bg-bg-secondary border border-border md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-text-primary" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless open */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-56 flex-col border-r border-border bg-bg-secondary transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:z-30`}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-text-primary">PeakDipVibe</h1>
              <p className="text-xs text-text-muted">Stock Analytics</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-bg-hover md:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4 text-text-muted" />
          </button>
        </div>

        <nav aria-label="Main navigation" className="mt-1 flex-1 overflow-y-auto px-2 scrollbar-thin">
          {/* Pinned items — always visible */}
          {pinnedItems.map((item) => {
            const active =
              item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            return (
              <NavLink key={item.to} item={item} active={active} onNav={closeNav} />
            );
          })}

          <div className="my-2 border-t border-border/50" />

          {/* Collapsible sections */}
          {navSections.map((section) => (
            <SectionGroup
              key={section.id}
              section={section}
              isOpen={!!openSections[section.id]}
              onToggle={() => toggleSection(section.id)}
              pathname={location.pathname}
              onNav={closeNav}
            />
          ))}
        </nav>

        {sidebarWatchlist.length > 0 && (
          <div className="border-t border-border px-3 py-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">Watchlist</span>
              {watchlist.length > 5 && (
                <Link to="/watchlist" onClick={() => setOpen(false)} className="text-xs text-accent hover:underline">
                  +{watchlist.length - 5} more
                </Link>
              )}
            </div>
            {sidebarWatchlist.map((ticker) => (
              <Link
                key={ticker}
                to={`/ticker/${ticker}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded px-1.5 py-1 text-xs transition-colors hover:bg-bg-hover"
              >
                <span className="font-medium text-accent">{ticker}</span>
                <SidebarSparkline ticker={ticker} />
              </Link>
            ))}
          </div>
        )}

        <div className="border-t border-border px-3 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <kbd className="rounded border border-border bg-bg-primary px-1.5 py-0.5 text-xs font-mono text-text-muted" title="Keyboard shortcuts">?</kbd>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Activity className="h-3 w-3" />
            <span>US Markets</span>
          </div>
        </div>
      </aside>
    </>
  );
}
