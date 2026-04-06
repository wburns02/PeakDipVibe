import type { ReadinessScore } from "@/api/types/tracker";
import { Skeleton } from "@/components/ui/Skeleton";

function levelColor(level: string) {
  const map: Record<string, string> = {
    beginner: "#ef4444",
    getting_there: "#f59e0b",
    ready: "#22c55e",
    graduate: "#6366f1",
  };
  return map[level] || "#94a3b8";
}

function levelLabel(level: string) {
  const map: Record<string, string> = {
    beginner: "Beginner",
    getting_there: "Getting There",
    ready: "Ready",
    graduate: "Graduate",
  };
  return map[level] || level;
}

function levelEmoji(level: string) {
  const map: Record<string, string> = {
    beginner: "\u{1F423}",
    getting_there: "\u{1F4CA}",
    ready: "\u{1F3AF}",
    graduate: "\u{1F3C6}",
  };
  return map[level] || "\u{1F4CA}";
}

function ScoreBar({
  label,
  score,
  max,
}: {
  label: string;
  score: number;
  max: number;
}) {
  const pct = Math.min(100, (score / max) * 100);
  const color = pct >= 70 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-text-secondary">{label}</span>
        <span className="font-semibold" style={{ color }}>
          {score}/{max}
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-bg-hover">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

interface Props {
  score: ReadinessScore | undefined;
  loading: boolean;
  actor: string;
}

export function ReadinessPanel({ score, loading, actor }: Props) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!score || score.total_trades === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-12 text-center">
        <div className="text-4xl">{"\u{1F423}"}</div>
        <h3 className="mt-3 text-lg font-semibold text-text-primary">
          No {actor === "ai" ? "Bot" : ""} Trades Yet
        </h3>
        <p className="mt-1 text-sm text-text-muted">
          {actor === "ai"
            ? "Enable auto-pilot to let the AI start trading."
            : "Use the Simulator to practice peak/dip trades."}
        </p>
      </div>
    );
  }

  const color = levelColor(score.graduation_level);

  return (
    <div className="space-y-4">
      {/* Overall score */}
      <div className="rounded-xl border border-border bg-bg-card p-5 text-center">
        <div className="text-3xl">
          {levelEmoji(score.graduation_level)}
        </div>
        <div className="mt-2 text-4xl font-bold" style={{ color }}>
          {score.overall_score}
        </div>
        <div className="text-sm text-text-muted">/100</div>
        <div className="mt-1 text-sm font-semibold" style={{ color }}>
          {levelLabel(score.graduation_level)}
        </div>
        <div className="mt-1 text-xs text-text-muted">
          {score.total_trades} trades &middot;{" "}
          {actor === "ai" ? "AI Bot" : "Your"} Performance
        </div>
      </div>

      {/* Component scores */}
      <div className="space-y-3 rounded-xl border border-border bg-bg-card p-4">
        <ScoreBar label="Win Rate" score={score.win_rate_score} max={20} />
        <ScoreBar
          label="Risk Management"
          score={score.risk_mgmt_score}
          max={20}
        />
        <ScoreBar label="Entry Timing" score={score.entry_score} max={15} />
        <ScoreBar label="Exit Timing" score={score.exit_score} max={15} />
        <ScoreBar
          label="Selectivity"
          score={score.selectivity_score}
          max={15}
        />
        <ScoreBar
          label="Consistency"
          score={score.consistency_score}
          max={15}
        />
      </div>

      {/* Notes */}
      {score.notes && (
        <div className="rounded-lg bg-bg-hover px-4 py-3 text-sm text-text-secondary">
          {score.notes}
        </div>
      )}

      {/* Graduation levels */}
      <div className="flex gap-1">
        {(
          ["beginner", "getting_there", "ready", "graduate"] as const
        ).map((level) => (
          <div
            key={level}
            className={`flex-1 rounded-lg py-2 text-center text-[10px] font-semibold ${
              score.graduation_level === level
                ? "border-2"
                : "border border-border opacity-40"
            }`}
            style={
              score.graduation_level === level
                ? {
                    borderColor: levelColor(level),
                    color: levelColor(level),
                    backgroundColor: `${levelColor(level)}10`,
                  }
                : {}
            }
          >
            {levelEmoji(level)} {levelLabel(level)}
          </div>
        ))}
      </div>
    </div>
  );
}
