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
      "The average price over a set number of days. Think of it like your grade average in school — it smooths out the ups and downs to show the overall trend. When the price is above the average, things are generally going well.",
  },
  ema: {
    term: "EMA (Exponential Moving Average)",
    definition:
      "Similar to a regular average but gives more weight to recent days, so it reacts faster to changes. Like checking your test scores but caring more about your latest tests than the ones from months ago.",
  },
  bollinger: {
    term: "Bollinger Bands",
    definition:
      "Two lines drawn above and below the average price that show how much a stock is bouncing around. When the price touches the top line, it might be stretched too high. When it touches the bottom, it might be stretched too low — like a rubber band.",
  },
  golden_cross: {
    term: "Golden Cross",
    definition:
      "When the short-term average crosses above the long-term average — a good sign! It means the stock has been picking up speed recently. Historically, more good days often follow.",
  },
  death_cross: {
    term: "Death Cross",
    definition:
      "The opposite of a Golden Cross — the short-term average drops below the long-term average. The scary name makes it sound worse than it usually is! It just means the stock has been slowing down.",
  },
  recovery: {
    term: "Recovery",
    definition:
      "How much a stock bounces back after falling. If a stock dropped to $95 but then climbed back to $99, that's a strong recovery — like getting back up after tripping.",
  },
  bounce: {
    term: "Bounce Strength",
    definition:
      "How strongly a stock recovered after falling. V-Bounce means it snapped back hard (like a rubber ball). Bounced means a solid recovery. Weak means it barely came back. Faded means it kept falling.",
  },
  macd: {
    term: "MACD",
    definition:
      "A tool that shows if a stock is speeding up or slowing down. When two lines cross, it's like a traffic light changing — one direction means 'go' and the other means 'slow down.'",
  },
  atr: {
    term: "ATR (Average True Range)",
    definition:
      "Measures how much a stock typically moves in a single day. A high number means it's a bumpy roller coaster ride. A low number means it's a smooth, gentle train ride.",
  },
  obv: {
    term: "OBV (On-Balance Volume)",
    definition:
      "A running total that adds trading volume on up days and subtracts it on down days. If this number is rising while the price is flat, it could mean big buyers are quietly loading up before a big move.",
  },
  win_rate: {
    term: "Win Rate",
    definition:
      "The percentage of times a strategy made money. A 60% win rate means 6 out of 10 tries were winners — like a basketball player who makes 6 out of 10 free throws.",
  },
  sector: {
    term: "Sector",
    definition:
      "A group of companies that do similar things. Technology (Apple, Microsoft), Healthcare (Pfizer), and Energy (ExxonMobil) are examples. Companies in the same group often go up and down together, like teammates.",
  },
  backtest: {
    term: "Backtest",
    definition:
      "Testing a trading idea on old data to see if it would have worked in the past. It's like a time machine — you go back and check if your plan would have made or lost money.",
  },
  earnings: {
    term: "Earnings",
    definition:
      "A company's report card that comes out every 3 months. It shows how much money the company made (or lost). If the report card is better than expected, the stock usually goes up!",
  },
  earnings_surprise: {
    term: "Earnings Surprise",
    definition:
      "When a company does much better (or worse) than everyone expected. A big positive surprise is like getting an A+ when everyone thought you'd get a B — the stock often jumps up!",
  },
  gap_down: {
    term: "Gap Down",
    definition:
      "The opposite of a gap up — a stock's opening price is much lower than yesterday's close, usually because of bad news. Like waking up to find your $100 stock is now worth $92.",
  },
  sp500: {
    term: "S&P 500",
    definition:
      "A list of the 500 biggest companies in America. When people say 'the market went up today,' they usually mean these 500 stocks went up on average. PeakDipVibe tracks all of them!",
  },
  // --- New terms for kid-friendly coverage ---
  stock: {
    term: "Stock",
    definition:
      "A tiny piece of ownership in a company. If you buy one share of Apple stock, you own a teeny tiny piece of Apple! When the company does well, your piece becomes worth more.",
  },
  ticker: {
    term: "Ticker Symbol",
    definition:
      "A short nickname for a company on the stock market. Apple is AAPL, Tesla is TSLA, Nike is NKE. It's like a username — shorter and faster to type than the full name.",
  },
  share: {
    term: "Share",
    definition:
      "One unit of stock. If a company has 1,000 shares and you own 1, you own 1/1,000th of the company. Companies like Apple have billions of shares!",
  },
  market: {
    term: "Stock Market",
    definition:
      "A place where people buy and sell pieces of companies (stocks). Think of it like a giant online store where instead of buying toys, people buy and sell small pieces of businesses.",
  },
  portfolio: {
    term: "Portfolio",
    definition:
      "All the stocks you own, grouped together. Like a collection — some people collect cards, but investors collect stocks. A good portfolio has different kinds of stocks, not all the same.",
  },
  watchlist: {
    term: "Watchlist (Favorites)",
    definition:
      "A list of stocks you want to keep an eye on — like a wishlist! You haven't bought them yet, but you're curious about how they're doing. Star any stock to add it.",
  },
  heatmap: {
    term: "Heatmap",
    definition:
      "A colorful picture of the whole market where each company is a rectangle. Green means the stock went up today, red means it went down. The bigger the rectangle, the bigger the company.",
  },
  screener: {
    term: "Stock Finder (Screener)",
    definition:
      "A tool that lets you search for stocks using filters — like finding all technology companies that went down a lot recently. Think of it like searching for a specific type of Pokémon card.",
  },
  simulator: {
    term: "Simulator",
    definition:
      "A practice mode where you can pretend to buy and sell stocks with fake money. It replays real events from the past so you can learn without any risk — like a flight simulator for trading!",
  },
  volatility: {
    term: "Volatility",
    definition:
      "How much a stock's price jumps around. A volatile stock is like a roller coaster — big ups and big downs. A calm stock is like a slow train — steady and predictable.",
  },
  divergence: {
    term: "Divergence",
    definition:
      "When a stock's price goes one direction but its momentum score goes the other way. It's like if you're running uphill but getting more tired each step — you might be about to slow down and turn around.",
  },
  momentum: {
    term: "Momentum",
    definition:
      "How fast a stock is moving in one direction. A stock with strong upward momentum is like a ball thrown really hard — it keeps going up for a while before gravity brings it back.",
  },
  seasonality: {
    term: "Seasonality",
    definition:
      "Patterns that repeat at the same time each year. Some stocks tend to go up in December and down in September — just like how ice cream sells better in summer. It doesn't always happen, but it's a pattern worth knowing.",
  },
  rotation: {
    term: "Sector Rotation",
    definition:
      "When investors move their money from one type of company to another. Like when everyone suddenly wants tech stocks instead of energy stocks — the money 'rotates' between groups.",
  },
  breadth: {
    term: "Market Breadth",
    definition:
      "How many stocks are going up vs. going down on the same day. If most stocks are going up, the market has 'good breadth' — it means the whole team is winning, not just a few star players.",
  },
  confluence: {
    term: "Confluence",
    definition:
      "When multiple different clues all point in the same direction. Like if the weather forecast, dark clouds, AND your knee all say it's going to rain — that's confluence, and you should bring an umbrella!",
  },
  regime: {
    term: "Market Regime",
    definition:
      "The overall mood of the market right now. Is it a 'bull market' (happy, prices going up) or a 'bear market' (worried, prices going down)? This helps you know the general vibe.",
  },
  bull_market: {
    term: "Bull Market",
    definition:
      "When stocks are generally going up and people feel optimistic. Called a 'bull' because bulls charge forward and push their horns UP. A bull market usually means good times for investors.",
  },
  bear_market: {
    term: "Bear Market",
    definition:
      "When stocks are generally going down and people feel worried. Called a 'bear' because bears swipe their paws DOWN. Bear markets don't last forever — they always end eventually.",
  },
  overbought: {
    term: "Overbought",
    definition:
      "When a stock has gone up so much, so fast, that it might be due for a rest. Like sprinting too fast at the start of a race — you might need to slow down soon. RSI above 70 = overbought.",
  },
  oversold: {
    term: "Oversold",
    definition:
      "When a stock has fallen so much that it might be ready to bounce back. Like a rubber band stretched too far — it wants to snap back. RSI below 30 = oversold.",
  },
  support: {
    term: "Support Level",
    definition:
      "A price where a stock tends to stop falling and bounce back up — like a trampoline. Enough people think it's a good deal at that price that they start buying, which stops the drop.",
  },
  resistance: {
    term: "Resistance Level",
    definition:
      "A price where a stock tends to stop rising and pull back — like hitting a ceiling. Enough people decide to sell at that price that it creates a barrier.",
  },
  trend: {
    term: "Trend",
    definition:
      "The general direction a stock has been moving. An uptrend means it's been going up over time (like climbing stairs). A downtrend means it's been going down. 'The trend is your friend' is a famous saying!",
  },
  pe_ratio: {
    term: "P/E Ratio",
    definition:
      "Price-to-Earnings ratio — how much you're paying for each dollar of profit the company makes. A P/E of 20 means you're paying $20 for every $1 of profit. Lower can mean a better deal, but not always!",
  },
  market_cap: {
    term: "Market Cap",
    definition:
      "The total value of all a company's shares combined. Apple's market cap is over $3 trillion — that's the 'size' of the company on the stock market. Bigger market cap = bigger company.",
  },
  dividend: {
    term: "Dividend",
    definition:
      "Money a company pays you just for owning their stock — like getting allowance! Not all companies pay dividends, but ones that do send you a little money every few months.",
  },
  relative_strength: {
    term: "Relative Strength (RS)",
    definition:
      "A ranking from 1-99 that shows how well a stock is doing compared to all other stocks. RS 95 means it's beating 95% of all stocks — like being in the top 5 of your class!",
  },
  pattern: {
    term: "Chart Pattern",
    definition:
      "A shape that appears in a stock's price chart that might predict what happens next. Like seeing dark clouds (pattern) might mean rain (prediction). Common ones: 'double bottom' (W shape) and 'head and shoulders.'",
  },
  correlation: {
    term: "Correlation",
    definition:
      "How much two stocks move together. If Apple and Microsoft always go up on the same days, they have high correlation. If one goes up while the other goes down, that's negative correlation — like a seesaw!",
  },
  drawdown: {
    term: "Drawdown",
    definition:
      "How much a stock (or your portfolio) dropped from its highest point. If a stock hit $100 then fell to $80, that's a 20% drawdown. Smaller drawdowns = smoother ride.",
  },
  equity_curve: {
    term: "Equity Curve",
    definition:
      "A line chart showing how much money a strategy made over time. If the line goes up and to the right, the strategy is working! If it's going down, time to rethink.",
  },
  probability_cone: {
    term: "Probability Cone",
    definition:
      "A shaded area on a chart showing where a stock's price will likely end up. It's shaped like a funnel because the further into the future you look, the less certain things are — like predicting the weather.",
  },
  position_sizing: {
    term: "Position Sizing",
    definition:
      "Deciding how much money to put into one stock. The golden rule: never put all your eggs in one basket! If you have $100, maybe put $10-20 in each stock so one bad pick doesn't ruin everything.",
  },
  stop_loss: {
    term: "Stop Loss",
    definition:
      "A safety net — an automatic order to sell a stock if it drops to a certain price. Like setting an alarm that says 'if this stock falls 10%, sell it before it falls more.' Smart traders always use these!",
  },
  risk_reward: {
    term: "Risk/Reward Ratio",
    definition:
      "How much you could lose vs. how much you could gain. A 1:3 ratio means you're risking $1 to potentially make $3. Good traders look for setups where the possible reward is bigger than the possible risk.",
  },
  volume: {
    term: "Volume",
    definition:
      "The number of shares traded in a day. High volume means lots of people are buying and selling — like a busy store. Low volume means not many people are interested — like an empty shop.",
  },
  candlestick: {
    term: "Candlestick",
    definition:
      "A little bar on a chart that shows 4 things about a stock's day: where it started (open), where it ended (close), the highest price (high), and the lowest price (low). Green = went up, Red = went down.",
  },
};
