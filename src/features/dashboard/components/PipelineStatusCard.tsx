import { Activity, HardDrive } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { StatusResponse } from "@/api/types/market";

interface PipelineStatusCardProps {
  status: StatusResponse;
}

export function PipelineStatusCard({ status }: PipelineStatusCardProps) {
  const lastUpdate = status.last_update
    ? new Date(status.last_update).toLocaleString()
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
