import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { PageSpinner } from "@/components/ui/PageSpinner";
import { ScrollToTop } from "@/components/ScrollToTop";
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

/** Preload map — call on hover/focus for instant navigation. */
export const preloadRoute: Record<string, () => void> = {
  "/signals": () => { import("@/features/signals/SignalsPage"); },
  "/earnings": () => { import("@/features/earnings/EarningsPage"); },
  "/simulator": () => { import("@/features/simulator/SimulatorPage"); },
  "/screener": () => { import("@/features/screener/ScreenerPage"); },
  "/compare": () => { import("@/features/compare/ComparePage"); },
  "/watchlist": () => { import("@/features/watchlist/WatchlistPage"); },
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
        <ScrollToTop />
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="/signals" element={<Suspense fallback={<PageSpinner />}><SignalsPage /></Suspense>} />
            <Route path="/earnings" element={<Suspense fallback={<PageSpinner />}><EarningsPage /></Suspense>} />
            <Route path="/simulator" element={<Suspense fallback={<PageSpinner />}><SimulatorPage /></Suspense>} />
            <Route path="/ticker/:symbol" element={<Suspense fallback={<PageSpinner />}><TickerDetailPage /></Suspense>} />
            <Route path="/screener" element={<Suspense fallback={<PageSpinner />}><ScreenerPage /></Suspense>} />
            <Route path="/compare" element={<Suspense fallback={<PageSpinner />}><ComparePage /></Suspense>} />
            <Route path="/watchlist" element={<Suspense fallback={<PageSpinner />}><WatchlistPage /></Suspense>} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
