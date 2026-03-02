import { Link } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";

export function NotFoundPage() {
  usePageTitle("Page Not Found");

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center py-24 text-center">
      <p className="text-6xl font-bold text-accent">404</p>
      <h1 className="mt-4 text-xl font-semibold text-text-primary">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
