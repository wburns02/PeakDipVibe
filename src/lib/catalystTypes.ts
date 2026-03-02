/** Catalyst type display configuration — shared across Signal table, Simulator, etc. */

export interface CatalystConfig {
  label: string;
  variant: "green" | "red" | "amber" | "accent" | "default";
}

export const CATALYST_MAP: Record<string, CatalystConfig> = {
  earnings_beat: { label: "Earnings Beat", variant: "green" },
  sector_momentum: { label: "Sector Momentum", variant: "accent" },
  technical_breakout: { label: "Breakout", variant: "amber" },
  acquisition: { label: "Acquisition", variant: "green" },
  guidance_raise: { label: "Guidance Raise", variant: "green" },
  product_launch: { label: "Product Launch", variant: "accent" },
  restructuring: { label: "Restructuring", variant: "amber" },
  upgrade: { label: "Upgrade", variant: "accent" },
  positive_news: { label: "News", variant: "default" },
  other: { label: "Other", variant: "default" },
};

export function getCatalystConfig(type: string | null | undefined): CatalystConfig {
  if (!type) return { label: "Unknown", variant: "default" };
  return CATALYST_MAP[type] ?? { label: type.replace(/_/g, " "), variant: "default" };
}
