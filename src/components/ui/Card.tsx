import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export function Card({
  children,
  className = "",
  title,
  subtitle,
  action,
}: CardProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-bg-card p-5 ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-text-primary">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
