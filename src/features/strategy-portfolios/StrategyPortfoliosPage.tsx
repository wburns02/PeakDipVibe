import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Shield,
  Target,
  Zap,
  ArrowDownUp,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Star,
  Dna,
  BarChart3,
  Info,
} from "lucide-react";
import { useScreener } from "@/api/hooks/useScreener";
import { useWatchlist } from "@/hooks/useWatchlist";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ScreenerResult } from "@/api/types/screener";

// ─── Strategy Engine ──────────────────────────────────────────────────────

interface ScoredStock extends ScreenerResult {
  score: number;
  reasons: string[];
}

function scoreShortTerm(s: ScreenerResult): ScoredStock | null {
  const rsi = s.rsi_14;
  const close = s.close;
  const changePct = s.change_pct;
  if (rsi == null || close == null || close <= 0) return null;

  let score = 0;
  const reasons: string[] = [];

  // Oversold bounce candidate (RSI 25-40)
  if (rsi >= 25 && rsi <= 40) {
    score += 30;
    reasons.push(`RSI ${rsi.toFixed(0)} — oversold bounce zone`);
  }
  // Momentum sweet spot (RSI 50-65)
  if (rsi > 50 && rsi <= 65) {
    score += 20;
    reasons.push(`RSI ${rsi.toFixed(0)} — momentum sweet spot`);
  }

  // Above SMA-50 = short-term uptrend
  if (s.above_sma50) {
    score += 15;
    reasons.push("Above 50-day moving average");
  }

  // Recent positive momentum
  if (changePct != null && changePct > 0.5 && changePct < 5) {
    score += 15;
    reasons.push(`+${changePct.toFixed(1)}% recent move — momentum building`);
  }

  // Oversold with support (above SMA-200 but below SMA-50 = pullback in uptrend)
  if (s.above_sma200 && !s.above_sma50 && rsi < 45) {
    score += 25;
    reasons.push("Pullback in long-term uptrend — potential swing entry");
  }

  // Bollinger Band squeeze (near lower band = potential bounce)
  if (s.bb_pctb != null && s.bb_pctb < 0.2) {
    score += 10;
    reasons.push("Near lower Bollinger Band — potential bounce");
  }

  if (score < 25) return null;
  return { ...s, score, reasons };
}

function scoreLongTerm(s: ScreenerResult): ScoredStock | null {
  const rsi = s.rsi_14;
  const close = s.close;
  if (rsi == null || close == null || close <= 0) return null;

  let score = 0;
  const reasons: string[] = [];

  // Above both SMAs = strong long-term trend
  if (s.above_sma50 && s.above_sma200) {
    score += 30;
    reasons.push("Above both 50-day and 200-day moving averages");
  } else if (s.above_sma200) {
    score += 15;
    reasons.push("Above 200-day moving average");
  }

  // Moderate RSI (40-60) = not overextended
  if (rsi >= 40 && rsi <= 60) {
    score += 20;
    reasons.push(`RSI ${rsi.toFixed(0)} — well-balanced, not overextended`);
  }

  // Near SMA-200 support (within 5%)
  if (s.sma_200 != null && close > 0) {
    const distFromSma200 = ((close - s.sma_200) / s.sma_200) * 100;
    if (distFromSma200 > 0 && distFromSma200 < 5) {
      score += 15;
      reasons.push(`${distFromSma200.toFixed(1)}% above SMA-200 — near support`);
    }
  }

  // Stable sectors for long-term holding
  const stableSectors = ["Health Care", "Information Technology", "Consumer Staples", "Utilities", "Industrials"];
  if (s.sector && stableSectors.includes(s.sector)) {
    score += 10;
    reasons.push(`${s.sector} — historically stable sector`);
  }

  // Not too volatile recently
  if (s.change_pct != null && Math.abs(s.change_pct) < 2) {
    score += 10;
    reasons.push("Low recent volatility — steady price action");
  }

  if (score < 30) return null;
  return { ...s, score, reasons };
}

function scoreShortCandidate(s: ScreenerResult): ScoredStock | null {
  const rsi = s.rsi_14;
  const close = s.close;
  if (rsi == null || close == null || close <= 0) return null;

  let score = 0;
  const reasons: string[] = [];

  // Below both SMAs = weak stock
  if (!s.above_sma50 && !s.above_sma200) {
    score += 30;
    reasons.push("Below both 50-day and 200-day moving averages");
  } else if (!s.above_sma200) {
    score += 15;
    reasons.push("Below 200-day moving average");
  }

  // Overbought in a downtrend (RSI > 60 but below SMAs)
  if (rsi > 60 && !s.above_sma200) {
    score += 25;
    reasons.push(`RSI ${rsi.toFixed(0)} — overbought in downtrend (bear rally)`);
  }

  // Death cross potential (below SMA-50, above SMA-200 but closing in)
  if (!s.above_sma50 && s.above_sma200 && s.sma_50 != null && s.sma_200 != null) {
    const smaDist = ((s.sma_50 - s.sma_200) / s.sma_200) * 100;
    if (smaDist < 2) {
      score += 20;
      reasons.push("50-day approaching 200-day — potential death cross");
    }
  }

  // Big negative momentum
  if (s.change_pct != null && s.change_pct < -2) {
    score += 15;
    reasons.push(`${s.change_pct.toFixed(1)}% recent decline — downward momentum`);
  }

  // Far below SMA-200 = already in freefall
  if (s.sma_200 != null && close > 0) {
    const distFromSma200 = ((close - s.sma_200) / s.sma_200) * 100;
    if (distFromSma200 < -15) {
      score += 20;
      reasons.push(`${distFromSma200.toFixed(1)}% below SMA-200 — deep weakness`);
    } else if (distFromSma200 < -5) {
      score += 10;
      reasons.push(`${distFromSma200.toFixed(1)}% below SMA-200`);
    }
  }

  if (score < 25) return null;
  return { ...s, score, reasons };
}

// ─── Components ──────────────────────────────────────────────────────────

function StockRow({ stock, rank }: { stock: ScoredStock; rank: number }) {
  const { watchlist, toggle } = useWatchlist();
  const isWatching = watchlist.includes(stock.ticker);
  const [expanded, setExpanded] = useState(false);
  const rsi = stock.rsi_14 ?? 0;
  const changePct = stock.change_pct ?? 0;

  return (
    <div className="rounded-xl border border-border bg-bg-card transition-colors hover:border-border/80">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-bg-hover text-xs font-bold text-text-muted">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-accent">{stock.ticker}</span>
            <span className="truncate text-xs text-text-muted">{stock.name}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-[10px] text-text-muted">
            <span>{stock.sector}</span>
            <span className="text-text-muted/50">•</span>
            <span>${stock.close?.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div>
            <div className={`text-xs font-bold tabular-nums ${changePct >= 0 ? "text-green" : "text-red"}`}>
              {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
            </div>
            <div className="text-[10px] text-text-muted">RSI {rsi.toFixed(0)}</div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <span className="text-xs font-bold text-accent">{stock.score}</span>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/50 px-4 py-3">
          <div className="mb-2 space-y-1">
            {stock.reasons.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                <span className="mt-0.5 text-accent">•</span>
                {r}
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[10px]">
            <div className="rounded-lg bg-bg-hover p-1.5">
              <div className="text-text-muted">SMA-50</div>
              <div className={`font-bold ${stock.above_sma50 ? "text-green" : "text-red"}`}>
                {stock.above_sma50 ? "Above" : "Below"}
              </div>
            </div>
            <div className="rounded-lg bg-bg-hover p-1.5">
              <div className="text-text-muted">SMA-200</div>
              <div className={`font-bold ${stock.above_sma200 ? "text-green" : "text-red"}`}>
                {stock.above_sma200 ? "Above" : "Below"}
              </div>
            </div>
            <div className="rounded-lg bg-bg-hover p-1.5">
              <div className="text-text-muted">RSI</div>
              <div className={`font-bold ${rsi < 30 ? "text-green" : rsi > 70 ? "text-red" : "text-text-primary"}`}>
                {rsi.toFixed(1)}
              </div>
            </div>
            <div className="rounded-lg bg-bg-hover p-1.5">
              <div className="text-text-muted">BB %B</div>
              <div className="font-bold text-text-primary">
                {stock.bb_pctb != null ? (stock.bb_pctb * 100).toFixed(0) + "%" : "—"}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to={`/ticker/${stock.ticker}`}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-text-secondary hover:bg-bg-hover"
            >
              <ExternalLink className="h-3 w-3" /> Chart
            </Link>
            <Link
              to={`/dna/${stock.ticker}`}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-text-secondary hover:bg-bg-hover"
            >
              <Dna className="h-3 w-3" /> DNA
            </Link>
            <Link
              to={`/planner?add=${stock.ticker}`}
              className="flex items-center gap-1 rounded-lg bg-accent/10 px-2.5 py-1.5 text-[11px] font-medium text-accent hover:bg-accent/20"
            >
              <Target className="h-3 w-3" /> Plan Trade
            </Link>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggle(stock.ticker); }}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium ${
                isWatching
                  ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                  : "border-border text-text-secondary hover:bg-bg-hover"
              }`}
            >
              <Star className={`h-3 w-3 ${isWatching ? "fill-yellow-400" : ""}`} />
              {isWatching ? "Watching" : "Watch"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────

type Tab = "short-term" | "long-term" | "short-sell";

const TABS: { key: Tab; label: string; icon: typeof Zap; color: string; description: string }[] = [
  {
    key: "short-term",
    label: "Short-Term Trades",
    icon: Zap,
    color: "text-amber-400",
    description: "Swing trades — days to a few weeks. Oversold bounces, momentum plays, and pullback entries.",
  },
  {
    key: "long-term",
    label: "Long-Term Holds",
    icon: Shield,
    color: "text-emerald-400",
    description: "Buy and hold — year or more. Strong trends, above key moving averages, stable sectors.",
  },
  {
    key: "short-sell",
    label: "Short Candidates",
    icon: TrendingDown,
    color: "text-red-400",
    description: "Potential shorts — stocks showing weakness. Below moving averages, bear rallies, death cross setups.",
  },
];

export function StrategyPortfoliosPage() {
  usePageTitle("Strategy Portfolios");
  const [activeTab, setActiveTab] = useState<Tab>("short-term");
  const [showGuide, setShowGuide] = useState(false);

  // Load all screener data
  const { data: allStocks, isLoading } = useScreener({
    sort_by: "ticker",
    limit: 500,
  });

  // Score all stocks for each strategy
  const portfolios = useMemo(() => {
    if (!allStocks) return { "short-term": [], "long-term": [], "short-sell": [] };

    const shortTerm = allStocks
      .map(scoreShortTerm)
      .filter((s): s is ScoredStock => s !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    const longTerm = allStocks
      .map(scoreLongTerm)
      .filter((s): s is ScoredStock => s !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    const shortSell = allStocks
      .map(scoreShortCandidate)
      .filter((s): s is ScoredStock => s !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return { "short-term": shortTerm, "long-term": longTerm, "short-sell": shortSell };
  }, [allStocks]);

  const activePortfolio = portfolios[activeTab];
  const activeConfig = TABS.find((t) => t.key === activeTab)!;

  // Summary stats
  const stats = useMemo(() => {
    if (!allStocks) return null;
    const total = allStocks.length;
    const aboveSma50 = allStocks.filter((s) => s.above_sma50).length;
    const aboveSma200 = allStocks.filter((s) => s.above_sma200).length;
    const avgRsi = allStocks.reduce((sum, s) => sum + (s.rsi_14 ?? 50), 0) / total;
    return { total, aboveSma50, aboveSma200, avgRsi };
  }, [allStocks]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <BarChart3 className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Strategy Portfolios</h1>
            <p className="text-sm text-text-muted">
              AI-scored stock picks organized by trading strategy
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-hover"
        >
          <Info className="h-3.5 w-3.5" />
          How It Works
          {showGuide ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Guide */}
      {showGuide && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm text-text-secondary">
          <h3 className="mb-2 font-semibold text-text-primary">How Strategy Scoring Works</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="mb-1 font-medium text-amber-400">Short-Term Trades</p>
              <p>
                Identifies oversold bounces (RSI 25-40), momentum sweet spots (RSI 50-65),
                pullbacks in uptrends (above SMA-200, below SMA-50), and stocks near
                lower Bollinger Band support.
              </p>
            </div>
            <div>
              <p className="mb-1 font-medium text-emerald-400">Long-Term Holds</p>
              <p>
                Favors stocks above both key moving averages, with balanced RSI (40-60),
                near SMA-200 support, in stable sectors like Healthcare and Tech,
                with low recent volatility.
              </p>
            </div>
            <div>
              <p className="mb-1 font-medium text-red-400">Short Candidates</p>
              <p>
                Flags stocks below both SMAs, overbought in downtrends (RSI &gt; 60 below SMAs),
                potential death crosses, negative momentum, and deep weakness below SMA-200.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Market Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-bg-secondary p-3">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Stocks Analyzed</p>
            <p className="mt-1 text-xl font-bold text-text-primary">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-3">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Above SMA-50</p>
            <p className="mt-1 text-xl font-bold text-green">
              {((stats.aboveSma50 / stats.total) * 100).toFixed(0)}%
            </p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-3">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Above SMA-200</p>
            <p className="mt-1 text-xl font-bold text-green">
              {((stats.aboveSma200 / stats.total) * 100).toFixed(0)}%
            </p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-3">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Avg RSI</p>
            <p className="mt-1 text-xl font-bold text-text-primary">{stats.avgRsi.toFixed(1)}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = portfolios[tab.key].length;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-text-secondary hover:bg-bg-hover"
              }`}
            >
              <Icon className={`h-4 w-4 ${activeTab === tab.key ? "text-accent" : tab.color}`} />
              {tab.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                activeTab === tab.key
                  ? "bg-accent/20 text-accent"
                  : "bg-bg-hover text-text-muted"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Strategy Description */}
      <div className={`flex items-center gap-3 rounded-xl border p-4 ${
        activeTab === "short-term"
          ? "border-amber-500/20 bg-amber-500/5"
          : activeTab === "long-term"
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-red-500/20 bg-red-500/5"
      }`}>
        {activeTab === "short-term" ? (
          <Clock className="h-5 w-5 shrink-0 text-amber-400" />
        ) : activeTab === "long-term" ? (
          <TrendingUp className="h-5 w-5 shrink-0 text-emerald-400" />
        ) : (
          <ArrowDownUp className="h-5 w-5 shrink-0 text-red-400" />
        )}
        <div>
          <h3 className={`text-sm font-semibold ${activeConfig.color}`}>
            {activeConfig.label}
          </h3>
          <p className="text-xs text-text-muted">{activeConfig.description}</p>
        </div>
      </div>

      {/* Stock List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : activePortfolio.length > 0 ? (
        <div className="space-y-2">
          {activePortfolio.map((stock, i) => (
            <StockRow key={stock.ticker} stock={stock} rank={i + 1} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-bg-secondary/50 p-12 text-center">
          <BarChart3 className="mx-auto mb-3 h-10 w-10 text-text-muted/30" />
          <p className="text-sm font-medium text-text-primary">
            No stocks match this strategy right now
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Market conditions may not favor this strategy at the moment. Check back later.
          </p>
        </div>
      )}

      {/* Disclaimer */}
      {activePortfolio.length > 0 && (
        <p className="text-center text-[10px] text-text-muted">
          Strategy scores are based on technical indicators only and are not investment advice.
          Always do your own research and manage risk appropriately. Past performance does not guarantee future results.
        </p>
      )}
    </div>
  );
}
