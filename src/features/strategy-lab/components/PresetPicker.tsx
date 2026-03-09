import { PRESET_STRATEGIES, type Condition } from "../lib/engine";
import { Sparkles } from "lucide-react";

interface Props {
  onSelect: (name: string, description: string, conditions: Condition[], color: string) => void;
}

export function PresetPicker({ onSelect }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-text-primary">Quick Start Templates</h3>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PRESET_STRATEGIES.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => onSelect(preset.name, preset.description, preset.conditions, preset.color)}
            className="group flex flex-col gap-1.5 rounded-xl border border-border bg-bg-card p-3 text-left transition-all duration-200 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5"
          >
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full transition-transform duration-200 group-hover:scale-125"
                style={{ backgroundColor: preset.color }}
              />
              <span className="text-sm font-medium text-text-primary">
                {preset.name}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-text-muted line-clamp-2">
              {preset.description}
            </p>
            <div className="mt-auto flex items-center gap-1 pt-1">
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-sm font-medium text-accent">
                {preset.conditions.length} condition{preset.conditions.length !== 1 ? "s" : ""}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
