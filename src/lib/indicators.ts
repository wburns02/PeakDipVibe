export interface IndicatorZone {
  max: number;
  label: string;
  color: string;
  meaning: string;
}

export interface IndicatorMeta {
  name: string;
  shortName: string;
  description: string;
  zones?: IndicatorZone[];
  format?: "number" | "percent" | "volume" | "price";
}

export const INDICATORS: Record<string, IndicatorMeta> = {
  RSI_14: {
    name: "Relative Strength Index (14-day)",
    shortName: "RSI",
    description:
      "Measures how fast a stock is rising or falling — like a speedometer for momentum. Ranges from 0 to 100.",
    zones: [
      {
        max: 30,
        label: "Oversold",
        color: "emerald",
        meaning:
          "Stock dropped a lot recently. Some traders see this as a buying opportunity — the selling may be overdone.",
      },
      {
        max: 70,
        label: "Neutral",
        color: "slate",
        meaning:
          "Normal trading range. No extreme signal in either direction.",
      },
      {
        max: 100,
        label: "Overbought",
        color: "red",
        meaning:
          "Stock rose a lot recently. May be due for a pullback — the buying enthusiasm could be fading.",
      },
    ],
    format: "number",
  },
  MACD: {
    name: "Moving Average Convergence Divergence",
    shortName: "MACD",
    description:
      "Tracks the relationship between two moving averages. When MACD crosses above its signal line, it suggests upward momentum is building.",
    format: "number",
  },
  MACD_SIGNAL: {
    name: "MACD Signal Line",
    shortName: "Signal",
    description:
      "A smoothed version of MACD. When MACD crosses above this line, traders see it as a bullish signal. Below = bearish.",
    format: "number",
  },
  MACD_HIST: {
    name: "MACD Histogram",
    shortName: "Histogram",
    description:
      "The difference between MACD and its signal line. Growing bars = strengthening trend. Shrinking bars = trend may be weakening.",
    format: "number",
  },
  SMA_10: {
    name: "Simple Moving Average (10-day)",
    shortName: "SMA 10",
    description:
      "Average closing price over the last 10 trading days. A short-term trend indicator — when price is above SMA 10, the short-term trend is up.",
    format: "price",
  },
  SMA_20: {
    name: "Simple Moving Average (20-day)",
    shortName: "SMA 20",
    description:
      "Average closing price over the last 20 trading days (~1 month). Often used as a near-term support/resistance level.",
    format: "price",
  },
  SMA_50: {
    name: "Simple Moving Average (50-day)",
    shortName: "SMA 50",
    description:
      "Average closing price over the last 50 trading days (~2.5 months). A key medium-term trend indicator watched by many traders.",
    format: "price",
  },
  SMA_200: {
    name: "Simple Moving Average (200-day)",
    shortName: "SMA 200",
    description:
      "Average closing price over the last 200 trading days (~10 months). The most-watched long-term trend indicator. Price above SMA 200 = bullish long-term trend.",
    format: "price",
  },
  EMA_12: {
    name: "Exponential Moving Average (12-day)",
    shortName: "EMA 12",
    description:
      "Like SMA but gives more weight to recent prices, making it more responsive. Used in MACD calculation.",
    format: "price",
  },
  EMA_50: {
    name: "Exponential Moving Average (50-day)",
    shortName: "EMA 50",
    description:
      "A responsive medium-term trend line. More sensitive to recent price changes than SMA 50.",
    format: "price",
  },
  BBANDS_UPPER: {
    name: "Bollinger Band (Upper)",
    shortName: "BB Upper",
    description:
      "Upper boundary = SMA 20 + 2 standard deviations. Price touching the upper band suggests the stock may be stretched high.",
    format: "price",
  },
  BBANDS_LOWER: {
    name: "Bollinger Band (Lower)",
    shortName: "BB Lower",
    description:
      "Lower boundary = SMA 20 - 2 standard deviations. Price touching the lower band suggests the stock may be oversold.",
    format: "price",
  },
  BBANDS_MIDDLE: {
    name: "Bollinger Band (Middle)",
    shortName: "BB Mid",
    description: "The middle line is simply the 20-day SMA.",
    format: "price",
  },
  BBANDS_WIDTH: {
    name: "Bollinger Band Width",
    shortName: "BB Width",
    description:
      "How wide the bands are. Narrow bands (low width) = low volatility, often precedes a big move. Wide bands = high volatility.",
    format: "number",
  },
  BBANDS_PCTB: {
    name: "Bollinger %B",
    shortName: "%B",
    description:
      "Where the price sits within the bands. 0 = at lower band, 0.5 = middle, 1 = upper band. Above 1 or below 0 = price is outside the bands.",
    zones: [
      {
        max: 0,
        label: "Below Lower Band",
        color: "emerald",
        meaning: "Price broke below the lower band — could be deeply oversold.",
      },
      {
        max: 0.2,
        label: "Near Lower Band",
        color: "emerald",
        meaning: "Price is near the bottom of normal range.",
      },
      {
        max: 0.8,
        label: "Middle Range",
        color: "slate",
        meaning: "Price is trading in normal range within the bands.",
      },
      {
        max: 1,
        label: "Near Upper Band",
        color: "red",
        meaning: "Price is near the top of normal range.",
      },
      {
        max: Infinity,
        label: "Above Upper Band",
        color: "red",
        meaning:
          "Price broke above the upper band — could be overextended.",
      },
    ],
    format: "number",
  },
  ATR_14: {
    name: "Average True Range (14-day)",
    shortName: "ATR",
    description:
      "Measures volatility — the average daily price range over 14 days. Higher ATR = more volatile stock. Useful for setting stop-losses.",
    format: "price",
  },
  OBV: {
    name: "On Balance Volume",
    shortName: "OBV",
    description:
      "Running total of volume (adds on up days, subtracts on down days). Rising OBV with rising price confirms the uptrend. Divergence warns of reversal.",
    format: "volume",
  },
  ROC_10: {
    name: "Rate of Change (10-day)",
    shortName: "ROC 10",
    description:
      "Percentage price change over the last 10 days. Positive = price went up, negative = went down. Helps identify momentum.",
    format: "percent",
  },
  ROC_20: {
    name: "Rate of Change (20-day)",
    shortName: "ROC 20",
    description:
      "Percentage price change over the last 20 days. A slightly longer-term momentum view than ROC 10.",
    format: "percent",
  },
};

export function getIndicatorMeta(key: string): IndicatorMeta {
  return (
    INDICATORS[key] ?? {
      name: key,
      shortName: key,
      description: "Technical indicator",
    }
  );
}

export function getZone(
  meta: IndicatorMeta,
  value: number
): IndicatorZone | undefined {
  return meta.zones?.find((z) => value <= z.max);
}
