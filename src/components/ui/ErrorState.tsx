import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Something went wrong loading this data.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertTriangle className="mb-3 h-8 w-8 text-amber" />
      <p className="text-sm text-text-muted">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 flex items-center gap-1.5 rounded-lg border border-border bg-bg-card px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try Again
        </button>
      )}
    </div>
  );
}
