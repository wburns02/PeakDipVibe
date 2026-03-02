import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
          <AlertTriangle className="mb-4 h-12 w-12 text-amber" />
          <h2 className="text-xl font-bold text-text-primary">
            Something went wrong
          </h2>
          <p className="mt-2 max-w-md text-sm text-text-muted">
            This page ran into an unexpected error. You can try refreshing, or
            head back to the dashboard.
          </p>
          {this.state.error && (
            <p className="mt-3 max-w-md rounded-lg bg-bg-secondary px-4 py-2 font-mono text-xs text-red">
              {this.state.error.message}
            </p>
          )}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
            <a
              href="/"
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
