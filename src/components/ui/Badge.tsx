interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "green" | "red" | "amber" | "accent";
  className?: string;
}

const variants: Record<string, string> = {
  default: "bg-bg-hover text-text-secondary",
  green: "bg-green/15 text-green",
  red: "bg-red/15 text-red",
  amber: "bg-amber/15 text-amber",
  accent: "bg-accent/15 text-accent",
};

export function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
