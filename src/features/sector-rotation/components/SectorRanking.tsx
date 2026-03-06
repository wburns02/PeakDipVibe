import { useState } from "react";
import { Link } from "react-router-dom";
import type { SectorMetrics } from "../lib/rotation";
import { getQuadrantMeta } from "../lib/rotation";
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  ExternalLink,
} from "lucide-react";

interface Props {
  sectors: SectorMetrics[];
  selected: string | null;
  onSelect: (sector: string | null) => void;
}

export function SectorRanking({ sectors, selected, onSelect }: Props) {
  return (
    <div className="space-y-2">
      {sectors.map((s, i) => (
        <SectorRow key={s.sector} sector={s} rank={i + 1} isSelected={selected === s.sector} onSelect={onSelect} />
      ))}
    </div>
  );
}

function SectorRow({
  sector: s,
  rank,
  isSelected,
  onSelect,
}: {
  sector: SectorMetrics;
  rank: number;
  isSelected: boolean;
  onSelect: (sector: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const qMeta = getQuadrantMeta(s.quadrant);

  return (
    <div
      className={`rounded-xl border transition-all ${
        isSelected ? "border-accent/40 bg-accent/5" : "border-border bg-bg-card hover:border-border"
      }`}
    >
      <button
        type="button"
        onClick={() => { setExpanded((v) => !v); onSelect(isSelected ? null : s.sector); }}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {/* Rank */}
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-bg-secondary text-xs font-bold text-text-muted">
          {rank}
        </div>

        {/* Sector info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-text-primary">{s.sector}</span>
            <span
              className="rounded-md px-1.5 py-0.5 text-[9px] font-semibold"
              style={{ backgroundColor: qMeta.color + "18", color: qMeta.color }}
            >
              {qMeta.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-text-muted">
            <span>{s.stockCount} stocks</span>
            <span>RSI {s.avgRsi.toFixed(0)}</span>
            <span>{s.pctAboveSma50.toFixed(0)}% &gt; 50-SMA</span>
          </div>
        </div>

        {/* Score + Change */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <div className={`text-xs font-semibold ${s.avgChangePct >= 0 ? "text-green" : "text-red"}`}>
              {s.avgChangePct >= 0 ? "+" : ""}{s.avgChangePct.toFixed(2)}%
            </div>
            <div className="text-[10px] text-text-muted">avg chg</div>
          </div>

          {/* Score badge */}
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
            style={{
              backgroundColor: qMeta.color + "18",
              color: qMeta.color,
            }}
          >
            {s.score}
          </div>

          {expanded ? (
            <ChevronUp className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3 animate-slideDown">
          {/* Metrics bar */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Rel. Strength" value={s.relativeStrength} />
            <Metric label="Momentum" value={s.momentum} />
            <Metric label="Avg RSI" value={s.avgRsi} neutral />
            <Metric label="> 200-SMA" value={s.pctAboveSma200} suffix="%" neutral />
          </div>

          {/* Breadth bars */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-text-muted">Breadth: % above 50-SMA</span>
              <span className="font-mono text-text-secondary">{s.pctAboveSma50.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-bg-hover">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${s.pctAboveSma50}%`,
                  backgroundColor: s.pctAboveSma50 > 60 ? "#22c55e" : s.pctAboveSma50 > 40 ? "#eab308" : "#ef4444",
                }}
              />
            </div>
          </div>

          {/* Top & Bottom stocks */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <h4 className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-green">
                <TrendingUp className="h-3 w-3" /> Top Movers
              </h4>
              {s.topStocks.map((st) => (
                <Link
                  key={st.ticker}
                  to={`/ticker/${st.ticker}`}
                  className="flex items-center justify-between rounded-lg px-2 py-1 text-xs transition-colors hover:bg-bg-hover"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-accent">{st.ticker}</span>
                    <span className="truncate text-text-muted">{st.name}</span>
                  </div>
                  <span className={`font-mono ${st.changePct >= 0 ? "text-green" : "text-red"}`}>
                    {st.changePct >= 0 ? "+" : ""}{st.changePct.toFixed(2)}%
                  </span>
                </Link>
              ))}
            </div>
            <div>
              <h4 className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-red">
                <TrendingDown className="h-3 w-3" /> Bottom Movers
              </h4>
              {s.bottomStocks.map((st) => (
                <Link
                  key={st.ticker}
                  to={`/ticker/${st.ticker}`}
                  className="flex items-center justify-between rounded-lg px-2 py-1 text-xs transition-colors hover:bg-bg-hover"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-accent">{st.ticker}</span>
                    <span className="truncate text-text-muted">{st.name}</span>
                  </div>
                  <span className={`font-mono ${st.changePct >= 0 ? "text-green" : "text-red"}`}>
                    {st.changePct >= 0 ? "+" : ""}{st.changePct.toFixed(2)}%
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Link to screener */}
          <Link
            to={`/screener?sector=${encodeURIComponent(s.sector)}`}
            className="flex items-center gap-1.5 text-[11px] font-medium text-accent hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            View all {s.stockCount} stocks in screener
          </Link>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, suffix, neutral }: { label: string; value: number; suffix?: string; neutral?: boolean }) {
  const color = neutral
    ? "text-text-primary"
    : value >= 0 ? "text-green" : "text-red";
  return (
    <div className="rounded-lg bg-bg-secondary px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{label}</p>
      <p className={`text-sm font-bold font-mono ${color}`}>
        {!neutral && value > 0 ? "+" : ""}{typeof value === "number" ? value.toFixed(1) : value}{suffix ?? ""}
      </p>
    </div>
  );
}
