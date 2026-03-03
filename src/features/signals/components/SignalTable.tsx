import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, PlayCircle, Zap, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { GlossaryTerm } from "@/components/education/GlossaryTerm";
import { formatPercent, formatRelativeTime } from "@/lib/formatters";
import { getCatalystConfig } from "@/lib/catalystTypes";
import type { PatternSignal } from "@/api/types/signals";
import { ScrollableTable } from "@/components/ui/ScrollableTable";
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

function StrengthBar({ signal }: { signal: PatternSignal }) {
  if (signal.signal_strength == null) return <span className="text-text-muted">—</span>;

  const score = signal.signal_strength;
  const pct = Math.min(100, score);
  const color = pct >= 70 ? "bg-green" : pct >= 40 ? "bg-amber" : "bg-red";

  const components = [
    { label: "Gap", value: signal.gap_score, color: "bg-accent" },
    { label: "Selloff", value: signal.selloff_score, color: "bg-purple" },
    { label: "Volume", value: signal.volume_score, color: "bg-amber" },
    { label: "Catalyst", value: signal.catalyst_score, color: "bg-green" },
  ];
  const hasBreakdown = components.some((c) => c.value != null && c.value > 0);

  return (
    <div className="group relative flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-bg-hover">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-text-secondary">{score}</span>

      {/* Tooltip breakdown on hover */}
      {hasBreakdown && (
        <div className="pointer-events-none absolute top-full left-0 z-30 mt-2 hidden w-44 rounded-lg border border-border bg-bg-card p-2.5 shadow-xl group-hover:block">
          <p className="mb-1.5 text-[10px] font-semibold text-text-primary">
            Score Breakdown
          </p>
          {components.map((c) => (
            <div key={c.label} className="mb-1 last:mb-0">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-text-muted">{c.label}</span>
                <span className="font-medium text-text-secondary">
                  {c.value?.toFixed(0) ?? 0}
                </span>
              </div>
              <div className="mt-0.5 h-1 w-full rounded-full bg-bg-hover">
                <div
                  className={`h-full rounded-full ${c.color} transition-all`}
                  style={{ width: `${Math.min(100, c.value ?? 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CopySignalButton({ signal }: { signal: PatternSignal }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const parts = [`${signal.ticker} ${signal.signal_date}`];
    if (signal.gap_up_pct != null) parts.push(`Gap ${formatPercent(signal.gap_up_pct)}`);
    if (signal.selloff_pct != null) parts.push(`Selloff ${formatPercent(signal.selloff_pct)}`);
    if (signal.catalyst_type) parts.push(getCatalystConfig(signal.catalyst_type).label);
    if (signal.outcome_1d != null) parts.push(`1d ${formatPercent(signal.outcome_1d)}`);
    if (signal.status) parts.push(signal.status);
    navigator.clipboard.writeText(parts.join(" | "));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-md p-1 text-text-muted hover:bg-bg-hover hover:text-text-secondary transition-colors"
      title="Copy signal summary"
      aria-label={`Copy ${signal.ticker} signal to clipboard`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
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

type BounceClass = { label: string; variant: "green" | "red" | "amber" | "accent" | "default"; icon: string };

function classifyBounce(recovery_pct: number | null, outcome_1d: number | null): BounceClass {
  // No outcome data yet
  if (outcome_1d == null && recovery_pct == null) return { label: "Pending", variant: "default", icon: "⏳" };

  const rec = recovery_pct ?? 0;
  const o1d = outcome_1d ?? 0;

  if (rec >= 75 || o1d >= 3) return { label: "V-Bounce", variant: "green", icon: "🚀" };
  if (rec >= 40 || o1d >= 1) return { label: "Bounced", variant: "accent", icon: "↗" };
  if (rec >= 15 || o1d >= -1) return { label: "Weak", variant: "amber", icon: "→" };
  return { label: "Faded", variant: "red", icon: "↘" };
}

function BounceBadge({ signal }: { signal: PatternSignal }) {
  const cls = classifyBounce(signal.recovery_pct, signal.outcome_1d);
  return (
    <Badge variant={cls.variant}>
      <span className="mr-0.5">{cls.icon}</span>{cls.label}
    </Badge>
  );
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
        <ScrollableTable>
          <table className="w-full text-sm">
            <caption className="sr-only">Pattern signals showing gap-up and sell-off events with catalyst scoring</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-muted">
                <th scope="col" className="pb-2" aria-sort={sortBy === "signal_date" ? "descending" : "none"}>
                  <button type="button" onClick={() => onSort("signal_date")} className="flex items-center gap-1">
                    Date {sortIcon("signal_date")}
                  </button>
                </th>
                <th scope="col" className="pb-2">Ticker</th>
                <th scope="col" className="pb-2">Pattern</th>
                <th scope="col" className="pb-2">
                  <span className="flex items-center">Bounce<GlossaryTerm term="bounce" /></span>
                </th>
                <th scope="col" className="pb-2" aria-sort={sortBy === "gap" ? "descending" : "none"}>
                  <button type="button" onClick={() => onSort("gap")} className="flex items-center gap-1">
                    Gap<GlossaryTerm term="gap_up" /> {sortIcon("gap")}
                  </button>
                </th>
                <th scope="col" className="pb-2">
                  <span className="flex items-center">Selloff<GlossaryTerm term="selloff" /></span>
                </th>
                <th scope="col" className="pb-2">
                  <span className="flex items-center">Catalyst<GlossaryTerm term="catalyst" /></span>
                </th>
                <th scope="col" className="pb-2" aria-sort={sortBy === "strength" ? "descending" : "none"}>
                  <button type="button" onClick={() => onSort("strength")} className="flex items-center gap-1">
                    Strength<GlossaryTerm term="signal_strength" /> {sortIcon("strength")}
                  </button>
                </th>
                <th scope="col" className="pb-2" aria-sort={sortBy === "outcome" ? "descending" : "none"}>
                  <button type="button" onClick={() => onSort("outcome")} className="flex items-center gap-1">
                    1d Return {sortIcon("outcome")}
                  </button>
                </th>
                <th scope="col" className="pb-2">Status</th>
                <th scope="col" className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {signals.map((s) => (
                <tr key={`${s.ticker}-${s.signal_date}`} className="border-b border-border/50 transition-colors hover:bg-bg-hover">
                  <td className="py-2 text-text-secondary" title={s.signal_date}>
                    <span className="hidden sm:inline">{s.signal_date}</span>
                    <span className="sm:hidden">{formatRelativeTime(s.signal_date)}</span>
                  </td>
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
                    <BounceBadge signal={s} />
                  </td>
                  <td className="py-2">
                    {s.gap_up_pct != null ? (
                      <Badge variant="green">{formatPercent(s.gap_up_pct)}</Badge>
                    ) : "—"}
                  </td>
                  <td className="py-2">
                    {s.selloff_pct != null ? (
                      <span className="text-red">{formatPercent(s.selloff_pct)}</span>
                    ) : "—"}
                  </td>
                  <td className="py-2">
                    <CatalystBadge type={s.catalyst_type} />
                  </td>
                  <td className="py-2">
                    <StrengthBar signal={s} />
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
                    <div className="flex items-center gap-1">
                      <CopySignalButton signal={s} />
                      <Link
                        to={`/simulator?ticker=${s.ticker}&date=${s.signal_date}`}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-accent hover:bg-accent/10 transition-colors"
                        title="Simulate this event"
                      >
                        <PlayCircle className="h-3.5 w-3.5" />
                        <span className="hidden lg:inline">Simulate</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableTable>
      )}
    </Card>
  );
}
