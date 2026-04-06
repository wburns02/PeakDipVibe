import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, PlayCircle, BarChart3, Bot } from "lucide-react";
import type { PeakDipEvent } from "@/api/types/tracker";

function scoreColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 65) return "#4ade80";
  if (score >= 50) return "#f59e0b";
  if (score >= 35) return "#fb923c";
  return "#ef4444";
}

function scoreLabel(score: number) {
  if (score >= 80) return "Strong Pounce";
  if (score >= 65) return "Good Setup";
  if (score >= 50) return "Moderate";
  if (score >= 35) return "Risky";
  return "Avoid";
}

function stageBadge(stage: string | null) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    peaked: { bg: "bg-amber/20", text: "text-amber", label: "PEAKED" },
    selling_off: { bg: "bg-red/20", text: "text-red", label: "SELLING OFF" },
    dip_zone: { bg: "bg-accent/20", text: "text-accent", label: "DIP ZONE" },
    recovering: { bg: "bg-green/20", text: "text-green", label: "RECOVERING" },
    resolved: { bg: "bg-bg-hover", text: "text-text-muted", label: "RESOLVED" },
  };
  const s = styles[stage || "resolved"] || styles.resolved;
  return (
    <span className={`${s.bg} ${s.text} rounded px-2 py-0.5 text-[10px] font-semibold`}>
      {s.label}
    </span>
  );
}

function stageColor(stage: string | null) {
  const map: Record<string, string> = {
    peaked: "#f59e0b",
    selling_off: "#ef4444",
    dip_zone: "#6366f1",
    recovering: "#22c55e",
    resolved: "#64748b",
  };
  return map[stage || "resolved"] || "#64748b";
}

const catalystLabels: Record<string, string> = {
  earnings_beat: "Earnings Beat",
  guidance_raise: "Guidance Raise",
  revenue_beat: "Revenue Beat",
  upgrade: "Analyst Upgrade",
  guidance: "Positive Guidance",
  positive_news: "Positive News",
};

interface Props {
  event: PeakDipEvent;
  defaultExpanded?: boolean;
}

export function EventCard({ event, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const score = event.pounce_score ?? 0;
  const color = scoreColor(score);
  const label = scoreLabel(score);

  return (
    <div
      className="overflow-hidden rounded-xl border bg-bg-card"
      style={{ borderLeftWidth: 4, borderLeftColor: stageColor(event.stage) }}
    >
      {/* Scorecard header */}
      <div
        className="flex cursor-pointer items-center gap-4 p-4"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Pounce score circle */}
        <div className="flex-shrink-0 text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {score}
          </div>
          <div className="mt-0.5 text-[9px] font-semibold" style={{ color }}>
            {label}
          </div>
        </div>

        {/* Main info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              to={`/ticker/${event.ticker}`}
              className="text-lg font-bold text-green hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {event.ticker}
            </Link>
            <span className="truncate text-sm text-text-muted">
              {event.name}
            </span>
            {stageBadge(event.stage)}
            <span className="ml-auto hidden text-xs text-text-muted sm:inline">
              {event.signal_date}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
            {event.gap_pct != null && (
              <span>
                Gap: <strong className="text-green">+{event.gap_pct.toFixed(1)}%</strong>
              </span>
            )}
            {event.selloff_pct != null && (
              <span>
                Sell-off: <strong className="text-red">-{event.selloff_pct.toFixed(1)}%</strong>
              </span>
            )}
            {event.volume_ratio != null && (
              <span>
                Volume: <strong>{event.volume_ratio.toFixed(1)}x</strong>
              </span>
            )}
            {event.catalyst_type && (
              <span>
                Catalyst:{" "}
                <strong className="text-green">
                  {catalystLabels[event.catalyst_type] || event.catalyst_type}
                </strong>
              </span>
            )}
            {event.outcome_5d != null && (
              <span>
                5d:{" "}
                <strong className={event.outcome_5d >= 0 ? "text-green" : "text-red"}>
                  {event.outcome_5d >= 0 ? "+" : ""}
                  {event.outcome_5d.toFixed(1)}%
                </strong>
              </span>
            )}
          </div>
        </div>

        {/* Expand icon */}
        <div className="flex-shrink-0 text-text-muted">
          {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <>
          {/* Actions bar */}
          <div className="flex items-center gap-2 border-t border-border px-4 py-2">
            <Link
              to={`/simulator?ticker=${event.ticker}&date=${event.signal_date}`}
              className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent/80"
            >
              <PlayCircle className="h-3.5 w-3.5" /> Simulate
            </Link>
            <Link
              to={`/ticker/${event.ticker}`}
              className="flex items-center gap-1 rounded-md bg-bg-hover px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
            >
              <BarChart3 className="h-3.5 w-3.5" /> Chart
            </Link>
          </div>

          {/* Summary */}
          <div className="border-t border-border px-4 py-3 text-sm leading-relaxed text-text-secondary">
            {event.summary_ai || event.summary_auto || "No analysis available yet."}

            {event.ai_provider && (
              <div className="mt-2 flex items-center gap-2">
                <span className="flex items-center gap-1 rounded bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
                  <Bot className="h-3 w-3" />
                  Generated by {event.ai_provider}
                  {event.ai_generated_at && ` · ${event.ai_generated_at.slice(0, 10)}`}
                </span>
              </div>
            )}
          </div>

          {/* Outcomes grid */}
          {event.outcome_1d != null && (
            <div className="flex gap-3 border-t border-border px-4 py-2 text-xs">
              {[
                { label: "1d", val: event.outcome_1d },
                { label: "3d", val: event.outcome_3d },
                { label: "5d", val: event.outcome_5d },
                { label: "10d", val: event.outcome_10d },
                { label: "20d", val: event.outcome_20d },
              ].map(
                (o) =>
                  o.val != null && (
                    <div key={o.label} className="text-center">
                      <div className="text-text-muted">{o.label}</div>
                      <div
                        className={`font-semibold ${o.val >= 0 ? "text-green" : "text-red"}`}
                      >
                        {o.val >= 0 ? "+" : ""}
                        {o.val.toFixed(1)}%
                      </div>
                    </div>
                  ),
              )}
              {event.win_5d != null && (
                <div className="ml-auto self-center">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      event.win_5d ? "bg-green/20 text-green" : "bg-red/20 text-red"
                    }`}
                  >
                    {event.win_5d ? "WIN" : "LOSS"}
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
