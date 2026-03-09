import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { IndicatorSnapshot } from "@/api/types/indicator";
import type { TickerDetail } from "@/api/types/ticker";

interface TechnicalSummaryProps {
  ticker: TickerDetail;
  indicators?: IndicatorSnapshot;
}

function computeSignal(
  ticker: TickerDetail,
  indicators?: IndicatorSnapshot
): { label: string; color: string; icon: typeof TrendingUp; reasons: string[] } {
  if (!indicators || Object.keys(indicators.indicators).length === 0) {
    return {
      label: "No Data",
      color: "text-text-muted",
      icon: Minus,
      reasons: ["Insufficient indicator data"],
    };
  }

  const ind = indicators.indicators;
  const price = ticker.latest_close ?? 0;
  let bullish = 0;
  let bearish = 0;
  const reasons: string[] = [];

  // RSI
  const rsi = ind["RSI_14"];
  if (rsi != null) {
    if (rsi < 30) {
      bullish += 2;
      reasons.push("RSI oversold (potential bounce)");
    } else if (rsi > 70) {
      bearish += 2;
      reasons.push("RSI overbought (potential pullback)");
    }
  }

  // MACD
  const macd = ind["MACD"];
  const signal = ind["MACD_SIGNAL"];
  if (macd != null && signal != null) {
    if (macd > signal) {
      bullish++;
      reasons.push("MACD above signal line");
    } else {
      bearish++;
      reasons.push("MACD below signal line");
    }
  }

  // Price vs SMA 50/200
  const sma50 = ind["SMA_50"];
  const sma200 = ind["SMA_200"];
  if (sma50 != null && price > 0) {
    if (price > sma50) {
      bullish++;
      reasons.push("Price above SMA 50");
    } else {
      bearish++;
      reasons.push("Price below SMA 50");
    }
  }
  if (sma200 != null && price > 0) {
    if (price > sma200) {
      bullish++;
      reasons.push("Price above SMA 200");
    } else {
      bearish++;
      reasons.push("Price below SMA 200");
    }
  }

  // Golden/Death cross
  if (sma50 != null && sma200 != null) {
    if (sma50 > sma200) {
      bullish++;
      reasons.push("Golden cross (SMA 50 > SMA 200)");
    } else {
      bearish++;
      reasons.push("Death cross (SMA 50 < SMA 200)");
    }
  }

  // Bollinger %B
  const pctb = ind["BBANDS_PCTB"];
  if (pctb != null) {
    if (pctb < 0.2) {
      bullish++;
      reasons.push("Near lower Bollinger Band");
    } else if (pctb > 0.8) {
      bearish++;
      reasons.push("Near upper Bollinger Band");
    }
  }

  if (bullish > bearish + 1) {
    return { label: "Bullish", color: "text-green", icon: TrendingUp, reasons };
  } else if (bearish > bullish + 1) {
    return { label: "Bearish", color: "text-red", icon: TrendingDown, reasons };
  }
  return { label: "Neutral", color: "text-amber", icon: Minus, reasons };
}

export function TechnicalSummary({
  ticker,
  indicators,
}: TechnicalSummaryProps) {
  const { label, color, icon: Icon, reasons } = computeSignal(
    ticker,
    indicators
  );

  return (
    <Card title="Technical Summary" subtitle="Composite signal from multiple indicators">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${
            label === "Bullish"
              ? "bg-green/10"
              : label === "Bearish"
                ? "bg-red/10"
                : "bg-amber/10"
          }`}
        >
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div>
          <p className={`text-xl font-bold ${color}`}>{label}</p>
          <p className="text-xs text-text-muted">
            Based on {reasons.length} signals
          </p>
        </div>
      </div>
      <ul className="mt-3 space-y-1">
        {reasons.slice(0, 5).map((r) => (
          <li key={r} className="flex items-center gap-2 text-xs text-text-secondary">
            <span className="h-1 w-1 rounded-full bg-text-muted" />
            {r}
          </li>
        ))}
      </ul>

      {/* Plain English summary */}
      <PlainEnglishBlurb ticker={ticker} indicators={indicators} signal={label} />
    </Card>
  );
}

function PlainEnglishBlurb({
  ticker,
  indicators,
  signal,
}: {
  ticker: TickerDetail;
  indicators?: IndicatorSnapshot;
  signal: string;
}) {
  if (!indicators || Object.keys(indicators.indicators).length === 0) return null;

  const ind = indicators.indicators;
  const rsi = ind["RSI_14"];
  const sma50 = ind["SMA_50"];
  const price = ticker.latest_close ?? 0;
  const name = ticker.name ?? ticker.ticker;

  // Build a simple 2-3 sentence summary in plain English
  const parts: string[] = [];

  // Sentence 1: Overall mood
  if (signal === "Bullish") {
    parts.push(
      `${name} is showing positive momentum right now — most indicators suggest the stock could keep moving up.`
    );
  } else if (signal === "Bearish") {
    parts.push(
      `${name} is under pressure — several warning signs suggest the stock may continue dropping.`
    );
  } else {
    parts.push(
      `${name} is in a wait-and-see zone — the signals are mixed, with no strong direction either way.`
    );
  }

  // Sentence 2: RSI context
  if (rsi != null) {
    if (rsi < 30) {
      parts.push(
        `The stock has been sold heavily (RSI ${rsi.toFixed(0)}), which sometimes means it's due for a bounce.`
      );
    } else if (rsi > 70) {
      parts.push(
        `The stock has run up fast (RSI ${rsi.toFixed(0)}), which sometimes means a pullback is coming.`
      );
    } else if (rsi > 50) {
      parts.push(`Buying interest is moderate (RSI ${rsi.toFixed(0)}).`);
    } else {
      parts.push(`Selling pressure is slightly winning (RSI ${rsi.toFixed(0)}).`);
    }
  }

  // Sentence 3: Trend context
  if (sma50 != null && price > 0) {
    const pctAbove = ((price - sma50) / sma50) * 100;
    if (pctAbove > 5) {
      parts.push(
        `The price is well above its 50-day average, showing a strong uptrend.`
      );
    } else if (pctAbove > 0) {
      parts.push(`The price is slightly above its 50-day average — a mild positive sign.`);
    } else if (pctAbove > -5) {
      parts.push(`The price is slightly below its 50-day average — a mild negative sign.`);
    } else {
      parts.push(`The price is well below its 50-day average, showing a clear downtrend.`);
    }
  }

  return (
    <div className="mt-3 rounded-lg bg-bg-hover/50 px-3 py-2.5">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
        In plain English
      </p>
      <p className="text-xs leading-relaxed text-text-secondary">
        {parts.join(" ")}
      </p>
    </div>
  );
}
