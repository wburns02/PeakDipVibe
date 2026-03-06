export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatLargeNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return formatCurrency(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatVolume(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toLocaleString();
}

export function formatNumber(
  value: number | null | undefined,
  decimals = 2
): string {
  if (value == null) return "—";
  return value.toFixed(decimals);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Normalize inconsistent sector names from the API into canonical GICS names. */
const SECTOR_ALIASES: Record<string, string> = {
  "Technology": "Information Technology",
  "Healthcare": "Health Care",
  "Consumer Cyclical": "Consumer Discretionary",
  "Consumer Defensive": "Consumer Staples",
  "Basic Materials": "Materials",
  "Financial Services": "Financials",
};

export function normalizeSector(sector: string | null | undefined): string {
  if (!sector) return "Unknown";
  return SECTOR_ALIASES[sector] ?? sector;
}

export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00").getTime();
  const diffMs = now - then;
  if (isNaN(diffMs) || diffMs < 0) return "just now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
