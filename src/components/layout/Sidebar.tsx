import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  Search,
  Activity,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/search", icon: Search, label: "Search" },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-56 flex-col border-r border-border bg-bg-secondary">
      <div className="flex h-14 items-center gap-2.5 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-text-primary">PeakDipVibe</h1>
          <p className="text-[10px] text-text-muted">Stock Analytics</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 px-2">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active =
            to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
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
  );
}
