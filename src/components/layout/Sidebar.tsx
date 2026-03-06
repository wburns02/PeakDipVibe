import { useState, useEffect, memo } from "react";
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

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/signals", icon: Zap, label: "Signals" },
  { to: "/earnings", icon: Newspaper, label: "Earnings" },
  { to: "/simulator", icon: PlayCircle, label: "Simulator" },
  { to: "/screener", icon: SlidersHorizontal, label: "Screener" },
  { to: "/heatmap", icon: Grid3x3, label: "Heatmap" },
  { to: "/compare", icon: BarChart3, label: "Compare" },
  { to: "/watchlist", icon: Star, label: "Watchlist" },
];

export function Sidebar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  const { watchlist } = useWatchlist();
  const sidebarWatchlist = watchlist.slice(0, 5);

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
              <p className="text-[10px] text-text-muted">Stock Analytics</p>
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

        <nav aria-label="Main navigation" className="mt-2 flex-1 px-2">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active =
              to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                onMouseEnter={() => preloadRoute[to]?.()}
                onFocus={() => preloadRoute[to]?.()}
                aria-current={active ? "page" : undefined}
                className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
                  active
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {sidebarWatchlist.length > 0 && (
          <div className="border-t border-border px-3 py-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Watchlist</span>
              {watchlist.length > 5 && (
                <Link to="/watchlist" onClick={() => setOpen(false)} className="text-[10px] text-accent hover:underline">
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
            <kbd className="rounded border border-border bg-bg-primary px-1.5 py-0.5 text-[10px] font-mono text-text-muted" title="Keyboard shortcuts">?</kbd>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Activity className="h-3 w-3" />
            <span>S&P 500 Pipeline</span>
          </div>
        </div>
      </aside>
    </>
  );
}
