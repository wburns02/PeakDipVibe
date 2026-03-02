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
        className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-bg-hover text-text-muted transition-colors hover:bg-accent/20 hover:text-accent"
        aria-label={`What is ${entry.term}?`}
      >
        <Info className="h-2.5 w-2.5" />
      </span>
    </Tooltip>
  );
}
