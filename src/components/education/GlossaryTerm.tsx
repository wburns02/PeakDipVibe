import { Info } from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { GLOSSARY } from "@/lib/glossary";

interface GlossaryTermProps {
  /** Key into the GLOSSARY map (e.g. "rsi", "gap_up") */
  term: string;
}

/**
 * Inline [?] icon that shows a beginner-friendly tooltip explaining a financial term.
 * Usage: <GlossaryTerm term="rsi" />
 */
export function GlossaryTerm({ term }: GlossaryTermProps) {
  const entry = GLOSSARY[term];
  if (!entry) return null;

  return (
    <Tooltip
      content={
        <div>
          <p className="mb-1 font-semibold text-text-primary">{entry.term}</p>
          <p>{entry.definition}</p>
        </div>
      }
    >
      <span
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            (e.currentTarget as HTMLElement).focus();
          }
        }}
        className="ml-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-bg-hover text-text-muted transition-colors hover:bg-accent/20 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        aria-label={`What is ${entry.term}?`}
      >
        <Info className="h-3.5 w-3.5" />
      </span>
    </Tooltip>
  );
}
