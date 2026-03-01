import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  SlidersHorizontal,
  BarChart3,
  Star,
  Activity,
  Zap,
  Newspaper,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/signals", icon: Zap, label: "Signals" },
  { to: "/earnings", icon: Newspaper, label: "Earnings" },
  { to: "/screener", icon: SlidersHorizontal, label: "Screener" },
  { to: "/compare", icon: BarChart3, label: "Compare" },
  { to: "/watchlist", icon: Star, label: "Watchlist" },
];

export function Sidebar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
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
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-bg-hover md:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4 text-text-muted" />
          </button>
        </div>

        <nav className="mt-2 flex-1 px-2">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active =
              to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
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

        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Activity className="h-3 w-3" />
            <span>S&P 500 Pipeline</span>
          </div>
        </div>
      </aside>
    </>
  );
}
