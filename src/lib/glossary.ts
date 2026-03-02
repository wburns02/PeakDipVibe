/**
 * Plain-English glossary for financial terms.
 * Target reading level: Grade 5-6.
 * Each definition should be understandable by a 10-year-old.
 */
export const GLOSSARY: Record<string, { term: string; definition: string }> = {
  rsi: {
    term: "RSI (Relative Strength Index)",
    definition:
      "A score from 0 to 100 that measures if a stock has been going up too much (overbought, above 70) or down too much (oversold, below 30). Think of it like a tiredness meter — when a stock runs too hard in one direction, it often needs a rest.",
  },
  gap_up: {
    term: "Gap Up",
    definition:
      "When a stock's opening price jumps much higher than yesterday's closing price — like going to bed at $100 and waking up at $108. This usually happens because of big news overnight.",
  },
  selloff: {
    term: "Sell-Off",
    definition:
      "When lots of people sell a stock quickly, pushing the price down. After a gap up, early buyers sometimes sell to lock in quick profits, causing the price to dip during the day.",
  },
  catalyst: {
    term: "Catalyst",
    definition:
      "The reason a stock made a big move. It could be great earnings, a new product launch, or an analyst upgrade. Think of it as the spark that started the fire.",
  },
  signal_strength: {
    term: "Signal Strength",
    definition:
      "A score from 0 to 100 that combines how big the gap was, how much it sold off, and how much volume traded. Higher scores mean the pattern is more pronounced and historically more reliable.",
  },
  volume_ratio: {
    term: "Volume Ratio",
    definition:
      "How much trading happened compared to a normal day. A ratio of 3x means three times more shares changed hands than usual — a sign that big investors are paying attention.",
  },
  sma: {
    term: "SMA (Simple Moving Average)",
    definition:
      "The average price over a set number of days. The 50-day SMA smooths out short-term noise, while the 200-day SMA shows the long-term trend. When price is above the SMA, the trend is generally up.",
  },
  ema: {
    term: "EMA (Exponential Moving Average)",
    definition:
      "Similar to SMA but gives more weight to recent prices, making it react faster to changes. Traders use it to spot trend shifts earlier than the regular moving average.",
  },
  bollinger: {
    term: "Bollinger Bands",
    definition:
      "Two lines drawn above and below the moving average that show how volatile a stock is. When the price touches the upper band, it might be stretched too high. When it touches the lower band, it might be stretched too low.",
  },
  golden_cross: {
    term: "Golden Cross",
    definition:
      "When the 50-day moving average crosses above the 200-day moving average — a bullish sign that the short-term trend is now stronger than the long-term trend. Historically, this often signals more upside ahead.",
  },
  death_cross: {
    term: "Death Cross",
    definition:
      "The opposite of a Golden Cross — the 50-day average crosses below the 200-day average. This is a bearish sign that the short-term trend is weakening. The scary name makes it sound worse than it usually is.",
  },
  recovery: {
    term: "Recovery",
    definition:
      "How much a stock bounces back after the initial sell-off. If a stock gapped up 5% but sold off to only +2%, and then climbed back to +4%, the recovery is strong — buyers stepped back in.",
  },
  macd: {
    term: "MACD",
    definition:
      "A momentum indicator that shows the relationship between two moving averages. When the MACD line crosses above the signal line, it's a buy signal. When it crosses below, it's a sell signal. Think of it as a traffic light for momentum.",
  },
  atr: {
    term: "ATR (Average True Range)",
    definition:
      "Measures how much a stock typically moves in a day. A high ATR means the stock is volatile and swings a lot. A low ATR means it's calm and steady. Useful for knowing what kind of ride you're in for.",
  },
  obv: {
    term: "OBV (On-Balance Volume)",
    definition:
      "A running total that adds volume on up days and subtracts volume on down days. If OBV is rising while price is flat, it could mean big buyers are quietly accumulating shares before a move up.",
  },
  win_rate: {
    term: "Win Rate",
    definition:
      "The percentage of times a pattern or strategy made money. A 60% win rate means 6 out of 10 trades were profitable. In the stock market, anything above 50% is considered decent.",
  },
  sector: {
    term: "Sector",
    definition:
      "A group of companies that do similar things. Technology (Apple, Microsoft), Healthcare (Pfizer, J&J), and Energy (ExxonMobil) are examples. Stocks in the same sector often move together.",
  },
  backtest: {
    term: "Backtest",
    definition:
      "Testing a trading strategy on historical data to see if it would have worked in the past. It's like a practice run — if a strategy didn't work in the past, it probably won't work in the future.",
  },
  earnings: {
    term: "Earnings",
    definition:
      "The profit (or loss) a company made during a quarter — a 3-month period. Companies announce earnings on a specific day, and the results often cause big stock price moves if they're better or worse than expected.",
  },
  earnings_surprise: {
    term: "Earnings Surprise",
    definition:
      "When a company's actual earnings are much better or worse than what Wall Street analysts predicted. A big positive surprise often causes the stock to gap up the next morning.",
  },
  gap_down: {
    term: "Gap Down",
    definition:
      "The opposite of a gap up — a stock's opening price is much lower than yesterday's closing price, usually because of bad news like missed earnings or a downgrade.",
  },
  sp500: {
    term: "S&P 500",
    definition:
      "A list of the 500 biggest companies in America by market value. It includes names like Apple, Amazon, and Google. When people say 'the market,' they usually mean the S&P 500.",
  },
};
