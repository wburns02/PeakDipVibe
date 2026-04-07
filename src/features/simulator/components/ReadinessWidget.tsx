import { useReadinessScore } from "@/api/hooks/useTracker";

export function ReadinessWidget() {
  const { data: score, isLoading } = useReadinessScore("user");

  if (isLoading || !score) return null;

  const color =
    score.overall_score >= 85 ? "#6366f1" :
    score.overall_score >= 70 ? "#22c55e" :
    score.overall_score >= 40 ? "#f59e0b" : "#ef4444";

  const level =
    score.graduation_level === "graduate" ? "Graduate" :
    score.graduation_level === "ready" ? "Ready" :
    score.graduation_level === "getting_there" ? "Getting There" : "Beginner";

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {score.overall_score}
        </div>
        <div>
          <div className="text-sm font-semibold text-text-primary">Your Readiness</div>
          <div className="text-xs" style={{ color }}>{level}</div>
          <div className="text-[10px] text-text-muted">{score.total_trades} trades</div>
        </div>
      </div>
      {score.notes && (
        <p className="mt-2 text-xs text-text-muted">{score.notes}</p>
      )}
    </div>
  );
}
