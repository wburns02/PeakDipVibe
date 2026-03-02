import { useState } from "react";
import { ChevronDown, ChevronUp, Lightbulb } from "lucide-react";

interface MiniLessonProps {
  icon?: string;
  title: string;
  points: string[];
  /** If true, starts expanded (default: collapsed) */
  defaultOpen?: boolean;
}

/**
 * Collapsible educational card with beginner-friendly bullet points.
 * Designed for Grade 5-6 reading level.
 */
export function MiniLesson({ icon, title, points, defaultOpen = false }: MiniLessonProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-accent/20 bg-accent/5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-accent/10"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-sm">
          {icon ?? <Lightbulb className="h-4 w-4 text-accent" />}
        </span>
        <span className="flex-1 text-sm font-semibold text-text-primary">{title}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-text-muted" />
        )}
      </button>
      {open && (
        <div className="border-t border-accent/10 px-4 py-3">
          <ul className="space-y-2">
            {points.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-text-secondary">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
                  {i + 1}
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
