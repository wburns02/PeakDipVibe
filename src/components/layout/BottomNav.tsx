import { Link, useLocation } from "react-router-dom";
import { preloadRoute } from "@/App";
import {
  LayoutDashboard,
  Zap,
  PlayCircle,
  SlidersHorizontal,
  Star,
} from "lucide-react";

const items = [
  { to: "/", icon: LayoutDashboard, label: "Home" },
  { to: "/signals", icon: Zap, label: "Signals" },
  { to: "/simulator", icon: PlayCircle, label: "Simulate" },
  { to: "/screener", icon: SlidersHorizontal, label: "Screen" },
  { to: "/watchlist", icon: Star, label: "Watch" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-bg-secondary pb-[env(safe-area-inset-bottom)] md:hidden">
      {items.map(({ to, icon: Icon, label }) => {
        const active =
          to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            onMouseEnter={() => preloadRoute[to]?.()}
            onFocus={() => preloadRoute[to]?.()}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
              active
                ? "text-accent"
                : "text-text-muted"
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
