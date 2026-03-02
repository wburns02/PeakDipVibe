import { useEffect } from "react";

const DEFAULT_TITLE = "PeakDipVibe — Stock Analytics";

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — PeakDipVibe` : DEFAULT_TITLE;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
}
