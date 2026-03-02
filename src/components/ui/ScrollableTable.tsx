import { useRef, useState, useEffect, type ReactNode } from "react";

interface ScrollableTableProps {
  children: ReactNode;
  className?: string;
}

/** Wraps a table in a horizontally scrollable container with a right-edge fade hint on mobile. */
export function ScrollableTable({ children, className = "" }: ScrollableTableProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      setCanScroll(el.scrollWidth > el.clientWidth + 1 && el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div ref={ref} className="overflow-x-auto">
        {children}
      </div>
      {canScroll && (
        <div
          className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-bg-card to-transparent"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
