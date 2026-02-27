import { Info } from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { getIndicatorMeta, getZone } from "@/lib/indicators";

interface IndicatorExplainerProps {
  indicatorKey: string;
  value?: number | null;
}

export function IndicatorExplainer({
  indicatorKey,
  value,
}: IndicatorExplainerProps) {
  const meta = getIndicatorMeta(indicatorKey);
  const zone = value != null ? getZone(meta, value) : undefined;

  return (
    <Tooltip
      content={
        <div>
          <p className="mb-1.5 font-semibold text-text-primary">{meta.name}</p>
          <p className="mb-2">{meta.description}</p>
          {zone && (
            <p className="rounded bg-bg-hover px-2 py-1 text-text-primary">
              Current zone: <strong>{zone.label}</strong> — {zone.meaning}
            </p>
          )}
          {meta.zones && !zone && (
            <div className="space-y-1">
              {meta.zones.map((z) => (
                <p key={z.label} className="text-[11px]">
                  <strong>{z.label}</strong>: {z.meaning}
                </p>
              ))}
            </div>
          )}
        </div>
      }
    >
      <button
        type="button"
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-bg-hover text-text-muted transition-colors hover:bg-accent/20 hover:text-accent"
      >
        <Info className="h-3 w-3" />
      </button>
    </Tooltip>
  );
}
