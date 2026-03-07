import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { PageSpinner } from "@/components/ui/PageSpinner";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ToastProvider } from "@/components/ui/Toast";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
const WatchlistPage = lazy(() =>
  import("@/features/watchlist/WatchlistPage").then((m) => ({ default: m.WatchlistPage })),
);
import { NotFoundPage } from "@/features/not-found/NotFoundPage";

// Lazy-load heavier pages to reduce initial bundle
const SignalsPage = lazy(() =>
  import("@/features/signals/SignalsPage").then((m) => ({ default: m.SignalsPage })),
);
const EarningsPage = lazy(() =>
  import("@/features/earnings/EarningsPage").then((m) => ({ default: m.EarningsPage })),
);
const SimulatorPage = lazy(() =>
  import("@/features/simulator/SimulatorPage").then((m) => ({ default: m.SimulatorPage })),
);
const TickerDetailPage = lazy(() =>
  import("@/features/ticker-detail/TickerDetailPage").then((m) => ({ default: m.TickerDetailPage })),
);
const ScreenerPage = lazy(() =>
  import("@/features/screener/ScreenerPage").then((m) => ({ default: m.ScreenerPage })),
);
const ComparePage = lazy(() =>
  import("@/features/compare/ComparePage").then((m) => ({ default: m.ComparePage })),
);
const HeatmapPage = lazy(() =>
  import("@/features/heatmap/HeatmapPage").then((m) => ({ default: m.HeatmapPage })),
);
const MorningPulsePage = lazy(() =>
  import("@/features/morning-pulse/MorningPulsePage").then((m) => ({ default: m.MorningPulsePage })),
);
const StrategyLabPage = lazy(() =>
  import("@/features/strategy-lab/StrategyLabPage").then((m) => ({ default: m.StrategyLabPage })),
);
const StockDnaPage = lazy(() =>
  import("@/features/stock-dna/StockDnaPage").then((m) => ({ default: m.StockDnaPage })),
);
const TradePlannerPage = lazy(() =>
  import("@/features/trade-planner/TradePlannerPage").then((m) => ({ default: m.TradePlannerPage })),
);
const JournalPage = lazy(() =>
  import("@/features/trade-journal/JournalPage").then((m) => ({ default: m.JournalPage })),
);
const SectorRotationPage = lazy(() =>
  import("@/features/sector-rotation/SectorRotationPage").then((m) => ({ default: m.SectorRotationPage })),
);
const PortfolioXrayPage = lazy(() =>
  import("@/features/portfolio-xray/PortfolioXrayPage").then((m) => ({ default: m.PortfolioXrayPage })),
);
const MarketAlertsPage = lazy(() =>
  import("@/features/market-alerts/MarketAlertsPage").then((m) => ({ default: m.MarketAlertsPage })),
);
const SeasonalityPage = lazy(() =>
  import("@/features/seasonality/SeasonalityPage").then((m) => ({ default: m.SeasonalityPage })),
);
const BacktesterPage = lazy(() =>
  import("@/features/backtester/BacktesterPage").then((m) => ({ default: m.BacktesterPage })),
);
const MarketInternalsPage = lazy(() =>
  import("@/features/market-internals/MarketInternalsPage").then((m) => ({ default: m.MarketInternalsPage })),
);
const RelativeStrengthPage = lazy(() =>
  import("@/features/relative-strength/RelativeStrengthPage").then((m) => ({ default: m.RelativeStrengthPage })),
);
const TradeIdeasPage = lazy(() =>
  import("@/features/trade-ideas/TradeIdeasPage").then((m) => ({ default: m.TradeIdeasPage })),
);
const VolatilityLabPage = lazy(() =>
  import("@/features/volatility-lab/VolatilityLabPage").then((m) => ({ default: m.VolatilityLabPage })),
);
const DivergenceScannerPage = lazy(() =>
  import("@/features/divergence-scanner/DivergenceScannerPage").then((m) => ({ default: m.DivergenceScannerPage })),
);
const PatternScannerPage = lazy(() =>
  import("@/features/pattern-scanner/PatternScannerPage").then((m) => ({ default: m.PatternScannerPage })),
);
const MomentumRadarPage = lazy(() =>
  import("@/features/momentum-radar/MomentumRadarPage").then((m) => ({ default: m.MomentumRadarPage })),
);
const StrategyPortfoliosPage = lazy(() =>
  import("@/features/strategy-portfolios/StrategyPortfoliosPage").then((m) => ({ default: m.StrategyPortfoliosPage })),
);

/** Preload map — call on hover/focus for instant navigation. */
export const preloadRoute: Record<string, () => void> = {
  "/pulse": () => { import("@/features/morning-pulse/MorningPulsePage"); },
  "/signals": () => { import("@/features/signals/SignalsPage"); },
  "/earnings": () => { import("@/features/earnings/EarningsPage"); },
  "/simulator": () => { import("@/features/simulator/SimulatorPage"); },
  "/screener": () => { import("@/features/screener/ScreenerPage"); },
  "/compare": () => { import("@/features/compare/ComparePage"); },
  "/watchlist": () => { import("@/features/watchlist/WatchlistPage"); },
  "/heatmap": () => { import("@/features/heatmap/HeatmapPage"); },
  "/strategy": () => { import("@/features/strategy-lab/StrategyLabPage"); },
  "/dna": () => { import("@/features/stock-dna/StockDnaPage"); },
  "/planner": () => { import("@/features/trade-planner/TradePlannerPage"); },
  "/journal": () => { import("@/features/trade-journal/JournalPage"); },
  "/rotation": () => { import("@/features/sector-rotation/SectorRotationPage"); },
  "/xray": () => { import("@/features/portfolio-xray/PortfolioXrayPage"); },
  "/alerts": () => { import("@/features/market-alerts/MarketAlertsPage"); },
  "/seasonality": () => { import("@/features/seasonality/SeasonalityPage"); },
  "/backtest": () => { import("@/features/backtester/BacktesterPage"); },
  "/internals": () => { import("@/features/market-internals/MarketInternalsPage"); },
  "/strength": () => { import("@/features/relative-strength/RelativeStrengthPage"); },
  "/ideas": () => { import("@/features/trade-ideas/TradeIdeasPage"); },
  "/volatility": () => { import("@/features/volatility-lab/VolatilityLabPage"); },
  "/divergences": () => { import("@/features/divergence-scanner/DivergenceScannerPage"); },
  "/patterns": () => { import("@/features/pattern-scanner/PatternScannerPage"); },
  "/radar": () => { import("@/features/momentum-radar/MomentumRadarPage"); },
  "/portfolios": () => { import("@/features/strategy-portfolios/StrategyPortfoliosPage"); },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <ScrollToTop />
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="/pulse" element={<Suspense fallback={<PageSpinner />}><MorningPulsePage /></Suspense>} />
              <Route path="/signals" element={<Suspense fallback={<PageSpinner />}><SignalsPage /></Suspense>} />
              <Route path="/earnings" element={<Suspense fallback={<PageSpinner />}><EarningsPage /></Suspense>} />
              <Route path="/simulator" element={<Suspense fallback={<PageSpinner />}><SimulatorPage /></Suspense>} />
              <Route path="/ticker/:symbol" element={<Suspense fallback={<PageSpinner />}><TickerDetailPage /></Suspense>} />
              <Route path="/screener" element={<Suspense fallback={<PageSpinner />}><ScreenerPage /></Suspense>} />
              <Route path="/compare" element={<Suspense fallback={<PageSpinner />}><ComparePage /></Suspense>} />
              <Route path="/heatmap" element={<Suspense fallback={<PageSpinner />}><HeatmapPage /></Suspense>} />
              <Route path="/strategy" element={<Suspense fallback={<PageSpinner />}><StrategyLabPage /></Suspense>} />
              <Route path="/planner" element={<Suspense fallback={<PageSpinner />}><TradePlannerPage /></Suspense>} />
              <Route path="/journal" element={<Suspense fallback={<PageSpinner />}><JournalPage /></Suspense>} />
              <Route path="/dna" element={<Suspense fallback={<PageSpinner />}><StockDnaPage /></Suspense>} />
              <Route path="/dna/:symbol" element={<Suspense fallback={<PageSpinner />}><StockDnaPage /></Suspense>} />
              <Route path="/rotation" element={<Suspense fallback={<PageSpinner />}><SectorRotationPage /></Suspense>} />
              <Route path="/xray" element={<Suspense fallback={<PageSpinner />}><PortfolioXrayPage /></Suspense>} />
              <Route path="/alerts" element={<Suspense fallback={<PageSpinner />}><MarketAlertsPage /></Suspense>} />
              <Route path="/seasonality" element={<Suspense fallback={<PageSpinner />}><SeasonalityPage /></Suspense>} />
              <Route path="/backtest" element={<Suspense fallback={<PageSpinner />}><BacktesterPage /></Suspense>} />
              <Route path="/internals" element={<Suspense fallback={<PageSpinner />}><MarketInternalsPage /></Suspense>} />
              <Route path="/strength" element={<Suspense fallback={<PageSpinner />}><RelativeStrengthPage /></Suspense>} />
              <Route path="/ideas" element={<Suspense fallback={<PageSpinner />}><TradeIdeasPage /></Suspense>} />
              <Route path="/volatility" element={<Suspense fallback={<PageSpinner />}><VolatilityLabPage /></Suspense>} />
              <Route path="/divergences" element={<Suspense fallback={<PageSpinner />}><DivergenceScannerPage /></Suspense>} />
              <Route path="/patterns" element={<Suspense fallback={<PageSpinner />}><PatternScannerPage /></Suspense>} />
              <Route path="/radar" element={<Suspense fallback={<PageSpinner />}><MomentumRadarPage /></Suspense>} />
              <Route path="/portfolios" element={<Suspense fallback={<PageSpinner />}><StrategyPortfoliosPage /></Suspense>} />
              <Route path="/watchlist" element={<Suspense fallback={<PageSpinner />}><WatchlistPage /></Suspense>} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
