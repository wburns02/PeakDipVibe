import { Activity, HardDrive } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { StatusResponse } from "@/api/types/market";

interface PipelineStatusCardProps {
  status: StatusResponse;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (isNaN(diffMs) || diffMs < 0) return "just now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function PipelineStatusCard({ status }: PipelineStatusCardProps) {
  const lastUpdate = status.last_update
    ? formatRelativeTime(status.last_update)
    : "Unknown";

  return (
    <Card title="Pipeline Status" subtitle="Stock data ingestion health">
      <div className="flex items-center gap-4 text-xs text-text-secondary">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-green" />
          <span>{status.total_tickers} tickers tracked</span>
        </div>
        <span className="text-border">|</span>
        <div className="flex items-center gap-1.5">
          <HardDrive className="h-3.5 w-3.5" />
          <span>{status.db_size_mb.toFixed(0)} MB database</span>
        </div>
        <span className="text-border">|</span>
        <span>Updated: {lastUpdate}</span>
      </div>
    </Card>
  );
}
