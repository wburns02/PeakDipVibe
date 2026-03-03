import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const threshold = window.innerWidth < 768 ? 300 : 500;
    const onScroll = () => setVisible(window.scrollY > threshold);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-20 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-bg-secondary shadow-lg transition-all hover:bg-bg-hover hover:shadow-xl md:bottom-6"
      aria-label="Back to top"
      title="Back to top"
    >
      <ArrowUp className="h-4 w-4 text-text-secondary" />
    </button>
  );
}
