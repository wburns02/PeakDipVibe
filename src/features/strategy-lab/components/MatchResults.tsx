import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import type { ScreenerResult } from "@/api/types/screener";
import { Skeleton } from "@/components/ui/Skeleton";
import { TrendingUp, TrendingDown, ChevronUp, ChevronDown, ExternalLink } from "lucide-react";

type SortKey = "ticker" | "close" | "change_pct" | "rsi_14" | "market_cap";
type SortDir = "asc" | "desc";

interface Props {
  results: ScreenerResult[];
  loading?: boolean;
  strategyColor?: string;
}

const fmt = (n: number | null | undefined, digits = 2) =>
  n != null ? n.toFixed(digits) : "—";

const fmtCap = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
};

export function MatchResults({ results, loading, strategyColor }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("change_pct");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState(true);

  const sorted = useMemo(() => {
    const copy = [...results];
    copy.sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      switch (sortKey) {
        case "ticker": av = a.ticker; bv = b.ticker; break;
        case "close": av = a.close ?? 0; bv = b.close ?? 0; break;
        case "change_pct": av = a.change_pct ?? 0; bv = b.change_pct ?? 0; break;
        case "rsi_14": av = a.rsi_14 ?? 0; bv = b.rsi_14 ?? 0; break;
        case "market_cap": av = a.market_cap ?? 0; bv = b.market_cap ?? 0; break;
      }
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return copy;
  }, [results, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "ticker" ? "asc" : "desc");
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="inline h-3 w-3" />
    ) : (
      <ChevronDown className="inline h-3 w-3" />
    );
  };

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: strategyColor ?? "var(--color-accent)" }}
          />
          <span className="text-sm font-semibold text-text-primary">
            {results.length} Match{results.length !== 1 ? "es" : ""}
          </span>
          <span className="text-xs text-text-muted">matches found</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-text-muted" />
        )}
      </button>

      {expanded && results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border bg-bg-secondary/50 text-xs text-text-muted">
                {([
                  ["ticker", "Ticker"],
                  ["close", "Price"],
                  ["change_pct", "Change"],
                  ["rsi_14", "RSI"],
                  ["market_cap", "Mkt Cap"],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className="cursor-pointer select-none px-4 py-2 text-left font-medium transition-colors hover:text-text-primary"
                  >
                    {label} <SortIcon col={key} />
                  </th>
                ))}
                <th className="px-4 py-2 text-left font-medium">Sector</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr
                  key={s.ticker}
                  className="border-t border-border/50 transition-colors hover:bg-bg-hover"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/ticker/${s.ticker}`}
                      className="font-semibold text-accent hover:underline"
                    >
                      {s.ticker}
                    </Link>
                    <p className="truncate text-xs text-text-muted max-w-[140px]">{s.name}</p>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-text-primary">
                    ${fmt(s.close)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1 font-mono text-xs font-medium ${
                        (s.change_pct ?? 0) >= 0 ? "text-green" : "text-red"
                      }`}
                    >
                      {(s.change_pct ?? 0) >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {(s.change_pct ?? 0) >= 0 ? "+" : ""}
                      {fmt(s.change_pct)}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`font-mono text-xs ${
                        (s.rsi_14 ?? 50) < 30
                          ? "text-green"
                          : (s.rsi_14 ?? 50) > 70
                            ? "text-red"
                            : "text-text-secondary"
                      }`}
                    >
                      {fmt(s.rsi_14, 1)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-text-secondary">
                    {fmtCap(s.market_cap)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-text-muted truncate max-w-[120px]">
                    {s.sector ?? "—"}
                  </td>
                  <td className="px-2 py-2.5">
                    <Link
                      to={`/ticker/${s.ticker}`}
                      className="rounded p-1 text-text-muted transition-colors hover:bg-accent/10 hover:text-accent"
                      title={`View ${s.ticker}`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {expanded && results.length === 0 && (
        <div className="border-t border-border px-4 py-8 text-center">
          <p className="text-sm text-text-muted">No stocks match these conditions</p>
          <p className="mt-1 text-xs text-text-muted/60">Try adjusting your thresholds or adding fewer conditions</p>
        </div>
      )}
    </div>
  );
}
