import { Link } from "react-router-dom";
import type { SectorHealth } from "../lib/breadth-engine";

interface Props {
  sectors: SectorHealth[];
}

export function SectorBreadth({ sectors }: Props) {
  const maxAbs = Math.max(0.01, ...sectors.map((s) => Math.abs(s.avgChange)));

  return (
    <div className="space-y-2">
      {sectors.map((s) => {
        const pct = (Math.abs(s.avgChange) / maxAbs) * 100;
        const positive = s.avgChange >= 0;
        return (
          <Link
            key={s.sector}
            to={`/screener?sector=${encodeURIComponent(s.sector)}`}
            className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-bg-hover"
          >
            <span className="w-[120px] shrink-0 truncate text-xs font-medium text-text-secondary group-hover:text-text-primary">
              {s.sector}
            </span>
            <div className="flex flex-1 items-center">
              {/* Left half (negative) */}
              <div className="flex h-4 w-1/2 justify-end">
                {!positive && (
                  <div
                    className="h-full rounded-l bg-red/70 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                )}
              </div>
              {/* Center line */}
              <div className="h-5 w-px bg-border" />
              {/* Right half (positive) */}
              <div className="flex h-4 w-1/2">
                {positive && (
                  <div
                    className="h-full rounded-r bg-green/70 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                )}
              </div>
            </div>
            <span
              className={`w-14 text-right text-xs font-semibold tabular-nums ${positive ? "text-green" : "text-red"}`}
            >
              {positive ? "+" : ""}
              {s.avgChange.toFixed(2)}%
            </span>
          </Link>
        );
      })}
    </div>
  );
}
