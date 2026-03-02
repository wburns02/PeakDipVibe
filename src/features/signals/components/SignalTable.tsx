import { Link } from "react-router-dom";
import { ArrowUpDown, PlayCircle, Zap } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { GlossaryTerm } from "@/components/education/GlossaryTerm";
import { formatPercent } from "@/lib/formatters";
import { getCatalystConfig } from "@/lib/catalystTypes";
import type { PatternSignal } from "@/api/types/signals";
import { PatternMiniChart } from "./PatternMiniChart";

interface SignalTableProps {
  signals?: PatternSignal[];
  isLoading: boolean;
  sortBy: string;
  onSort: (field: string) => void;
}

function CatalystBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-text-muted">—</span>;
  const config = getCatalystConfig(type);
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function StrengthBar({ score, max = 100 }: { score: number | null; max?: number }) {
  if (score == null) return <span className="text-text-muted">—</span>;

  const pct = Math.min(100, (score / max) * 100);
  const color =
    pct >= 70 ? "bg-green" : pct >= 40 ? "bg-amber" : "bg-red";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-bg-hover">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-text-secondary">{score}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const variants: Record<string, "green" | "red" | "amber" | "default"> = {
    active: "amber",
    confirmed: "green",
    failed: "red",
  };
  return <Badge variant={variants[status] ?? "default"}>{status}</Badge>;
}

export function SignalTable({ signals, isLoading, sortBy, onSort }: SignalTableProps) {
  const sortIcon = (field: string) =>
    sortBy === field ? (
      <ArrowUpDown className="h-3 w-3 text-accent" />
    ) : (
      <ArrowUpDown className="h-3 w-3 text-text-muted opacity-40" />
    );

  return (
    <Card
      title={`Signals${signals ? ` (${signals.length})` : ""}`}
      subtitle="Gap-up + sell-off patterns with catalyst scoring"
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : !signals || signals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-text-muted">
          <Zap className="mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm font-medium">No signals found</p>
          <p className="mt-1 max-w-xs text-center text-xs">
            Try increasing the lookback period, lowering the minimum strength, or removing filters to see more results
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-muted">
                <th className="pb-2">
                  <button onClick={() => onSort("signal_date")} className="flex items-center gap-1">
                    Date {sortIcon("signal_date")}
                  </button>
                </th>
                <th className="pb-2">Ticker</th>
                <th className="pb-2">Pattern</th>
                <th className="pb-2">
                  <button onClick={() => onSort("gap")} className="flex items-center gap-1">
                    Gap<GlossaryTerm term="gap_up" /> {sortIcon("gap")}
                  </button>
                </th>
                <th className="pb-2">
                  <span className="flex items-center">Selloff<GlossaryTerm term="selloff" /></span>
                </th>
                <th className="pb-2">
                  <span className="flex items-center">Catalyst<GlossaryTerm term="catalyst" /></span>
                </th>
                <th className="pb-2">
                  <button onClick={() => onSort("strength")} className="flex items-center gap-1">
                    Strength<GlossaryTerm term="signal_strength" /> {sortIcon("strength")}
                  </button>
                </th>
                <th className="pb-2">
                  <button onClick={() => onSort("outcome")} className="flex items-center gap-1">
                    1d Return {sortIcon("outcome")}
                  </button>
                </th>
                <th className="pb-2">Status</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {signals.map((s) => (
                <tr key={`${s.ticker}-${s.signal_date}`} className="border-b border-border/50 transition-colors hover:bg-bg-hover">
                  <td className="py-2 text-text-secondary">{s.signal_date}</td>
                  <td className="py-2">
                    <Link to={`/ticker/${s.ticker}`} className="font-medium text-accent hover:underline">
                      {s.ticker}
                    </Link>
                    {s.name && (
                      <span className="ml-1.5 hidden text-xs text-text-muted lg:inline">
                        {s.name}
                      </span>
                    )}
                  </td>
                  <td className="py-2">
                    <PatternMiniChart signal={s} />
                  </td>
                  <td className="py-2">
                    {s.gap_up_pct != null ? (
                      <Badge variant="green">+{s.gap_up_pct.toFixed(1)}%</Badge>
                    ) : "—"}
                  </td>
                  <td className="py-2">
                    {s.selloff_pct != null ? (
                      <span className="text-red">{s.selloff_pct.toFixed(1)}%</span>
                    ) : "—"}
                  </td>
                  <td className="py-2">
                    <CatalystBadge type={s.catalyst_type} />
                  </td>
                  <td className="py-2">
                    <StrengthBar score={s.signal_strength} />
                  </td>
                  <td className="py-2">
                    {s.outcome_1d != null ? (
                      <span className={s.outcome_1d >= 0 ? "text-green" : "text-red"}>
                        {formatPercent(s.outcome_1d)}
                      </span>
                    ) : (
                      <span className="text-text-muted">pending</span>
                    )}
                  </td>
                  <td className="py-2">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="py-2">
                    <Link
                      to={`/simulator?ticker=${s.ticker}&date=${s.signal_date}`}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-accent hover:bg-accent/10 transition-colors"
                      title="Simulate this event"
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      <span className="hidden lg:inline">Simulate</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
