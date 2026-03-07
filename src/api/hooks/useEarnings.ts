import { useQuery } from "@tanstack/react-query";
import { api } from "../client";
import { STALE_FRESH, STALE_WARM, STALE_STABLE } from "../queryConfig";
import {
  ImpactSummarySchema,
  PriceJourneySchema,
  ThisWeekSchema,
  SectorBreakdownSchema,
  ForwardLookSchema,
  SimulationSchema,
  EventAnalysisSchema,
  AIDecisionsResponseSchema,
} from "../types/earnings";
import type { LibraryEvent, EventLibrary, IntradaySimulation } from "../types/earnings";
import { generateSyntheticIntraday } from "@/features/simulator/lib/synthetic-intraday";

export function useImpactSummary() {
  return useQuery({
    queryKey: ["earnings", "impact-summary"],
    queryFn: async () => {
      const { data } = await api.get("/earnings/impact-summary");
      return ImpactSummarySchema.parse(data);
    },
    staleTime: STALE_WARM,
  });
}

export function usePriceJourney(moveSize: string) {
  return useQuery({
    queryKey: ["earnings", "price-journey", moveSize],
    queryFn: async () => {
      const { data } = await api.get("/earnings/price-journey", {
        params: { move_size: moveSize },
      });
      return PriceJourneySchema.parse(data);
    },
    staleTime: STALE_WARM,
  });
}

export function useThisWeek() {
  return useQuery({
    queryKey: ["earnings", "this-week"],
    queryFn: async () => {
      const { data } = await api.get("/earnings/this-week");
      return ThisWeekSchema.parse(data);
    },
    staleTime: STALE_FRESH,
  });
}

export function useSectorBreakdown(days: number = 365) {
  return useQuery({
    queryKey: ["earnings", "sectors", days],
    queryFn: async () => {
      const { data } = await api.get("/earnings/sector-breakdown", {
        params: { days },
      });
      return SectorBreakdownSchema.parse(data);
    },
    staleTime: STALE_WARM,
  });
}

export function useForwardLook(months: number = 3) {
  return useQuery({
    queryKey: ["earnings", "forward-look", months],
    queryFn: async () => {
      const { data } = await api.get("/earnings/forward-look", {
        params: { months },
      });
      return ForwardLookSchema.parse(data);
    },
    staleTime: STALE_WARM,
  });
}

export function useSimulation(ticker: string, signalDate: string) {
  return useQuery({
    queryKey: ["earnings", "simulate", ticker, signalDate],
    queryFn: async () => {
      const { data } = await api.get(
        `/earnings/simulate/${ticker}/${signalDate}`,
      );
      return SimulationSchema.parse(data);
    },
    enabled: !!ticker && !!signalDate,
    staleTime: STALE_STABLE,
  });
}

/**
 * Fetch all events once (cached), then filter/paginate client-side.
 * Falls back to page-by-page API if the all-events endpoint fails.
 */
let _allEventsCache: LibraryEvent[] | null = null;
let _allEventsFilters: EventLibrary["filters"] | null = null;

async function fetchAllEvents(): Promise<{ events: LibraryEvent[]; filters: EventLibrary["filters"] }> {
  if (_allEventsCache && _allEventsFilters) {
    return { events: _allEventsCache, filters: _allEventsFilters };
  }

  // Try the combined events-all endpoint first
  try {
    const { data } = await api.get("/earnings/events-all", { timeout: 5000 });
    const parsed = data as { total: number; filters: EventLibrary["filters"]; events: unknown[] };
    const events = parsed.events as LibraryEvent[];
    _allEventsCache = events;
    _allEventsFilters = parsed.filters;
    return { events, filters: parsed.filters };
  } catch { /* fall through to paginated loading */ }

  // Fallback: load all pages sequentially
  const allEvents: LibraryEvent[] = [];
  let filters: EventLibrary["filters"] = { gap_sizes: [], outcomes: [], sectors: [] };
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const { data } = await api.get("/earnings/events", { params: { page, per_page: 100 }, timeout: 8000 });
    const parsed = data as EventLibrary;
    allEvents.push(...(parsed.events as LibraryEvent[]));
    filters = parsed.filters;
    totalPages = parsed.total_pages;
    page++;
  }

  _allEventsCache = allEvents;
  _allEventsFilters = filters;
  return { events: allEvents, filters };
}

export function useEventLibrary(params: {
  gap_size?: string;
  sector?: string;
  outcome?: string;
  ticker?: string;
  page?: number;
  per_page?: number;
}) {
  const perPage = params.per_page ?? 12;
  const page = params.page ?? 1;

  return useQuery({
    queryKey: ["earnings", "events", params],
    queryFn: async (): Promise<EventLibrary> => {
      const { events: allEvents, filters } = await fetchAllEvents();

      // Client-side filtering
      let filtered = allEvents;

      if (params.ticker) {
        const search = params.ticker.toUpperCase();
        filtered = filtered.filter(
          (e) =>
            e.ticker.toUpperCase().includes(search) ||
            (e.name && e.name.toUpperCase().includes(search)),
        );
      }
      if (params.gap_size) {
        filtered = filtered.filter((e) => e.gap_size === params.gap_size);
      }
      if (params.sector) {
        filtered = filtered.filter((e) => e.sector === params.sector);
      }
      if (params.outcome) {
        filtered = filtered.filter((e) => e.outcome_label === params.outcome);
      }

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / perPage));
      const start = (page - 1) * perPage;
      const pageEvents = filtered.slice(start, start + perPage);

      return {
        total,
        page,
        per_page: perPage,
        total_pages: totalPages,
        filters,
        events: pageEvents,
      };
    },
    staleTime: STALE_WARM,
  });
}

/**
 * Intraday simulation with synthetic data fallback.
 * Tries the real API first; if it fails (502/timeout), generates
 * synthetic intraday bars from the event metadata.
 */
export function useIntradaySimulation(
  ticker: string,
  signalDate: string,
  interval: "15m" | "30m" | "60m" = "60m",
  days: number = 5,
) {
  return useQuery({
    queryKey: ["earnings", "simulate-intraday", ticker, signalDate, interval, days],
    queryFn: async (): Promise<IntradaySimulation> => {
      // Try real API first
      try {
        const { data } = await api.get(
          `/earnings/simulate/${ticker}/${signalDate}/intraday`,
          { params: { interval, days }, timeout: 5000 },
        );
        return data as IntradaySimulation;
      } catch {
        // API unreachable — find event metadata and generate synthetic data
      }

      // Look up event metadata from the cached all-events list
      let eventMeta: { ticker: string; signal_date: string; gap_up_pct: number; selloff_pct: number; name?: string | null; sector?: string | null; outcome_1d?: number | null; outcome_5d?: number | null } | null = null;

      try {
        const { events } = await fetchAllEvents();
        const match = events.find(
          (e) => e.ticker === ticker && e.signal_date === signalDate,
        );
        if (match) {
          eventMeta = {
            ticker: match.ticker,
            signal_date: match.signal_date,
            gap_up_pct: match.gap_up_pct ?? 5,
            selloff_pct: match.selloff_pct ?? 2,
            name: match.name,
            sector: match.sector,
            outcome_1d: match.outcome_1d,
            outcome_5d: match.outcome_5d,
          };
        }
      } catch { /* ignore */ }

      // Fallback defaults if event not found
      if (!eventMeta) {
        eventMeta = {
          ticker,
          signal_date: signalDate,
          gap_up_pct: 5,
          selloff_pct: 2,
          name: ticker,
          sector: "Unknown",
        };
      }

      const synthetic = generateSyntheticIntraday(eventMeta);

      return {
        ticker,
        signal_date: signalDate,
        name: synthetic.name,
        sector: synthetic.sector,
        gap_up_pct: eventMeta.gap_up_pct,
        selloff_pct: eventMeta.selloff_pct,
        interval,
        bars: synthetic.bars,
        strategies: [],
        analogs: [],
      };
    },
    enabled: !!ticker && !!signalDate,
    staleTime: STALE_STABLE,
    retry: 0, // Don't retry — we handle fallback internally
  });
}

export function useEventAnalysis(ticker: string, signalDate: string) {
  return useQuery({
    queryKey: ["earnings", "events", ticker, signalDate, "analysis"],
    queryFn: async () => {
      const { data } = await api.get(
        `/earnings/events/${ticker}/${signalDate}/analysis`,
      );
      return EventAnalysisSchema.parse(data);
    },
    enabled: !!ticker && !!signalDate,
    staleTime: STALE_STABLE,
    retry: 0, // Don't retry if upstream is down
  });
}

export function useAIDecisions(
  ticker: string,
  signalDate: string,
  interval: "15m" | "30m" | "60m" = "60m",
  days: number = 5,
) {
  return useQuery({
    queryKey: ["earnings", "ai-decisions", ticker, signalDate, interval, days],
    queryFn: async () => {
      const { data } = await api.get(
        `/earnings/simulate/${ticker}/${signalDate}/ai-decisions`,
        { params: { interval, days } },
      );
      return AIDecisionsResponseSchema.parse(data);
    },
    enabled: !!ticker && !!signalDate,
    staleTime: STALE_STABLE,
    retry: 0,
  });
}

/**
 * Random event — picks from the cached all-events list client-side.
 * No longer needs the upstream /events/random endpoint.
 */
export function useRandomEvent() {
  return useQuery({
    queryKey: ["earnings", "events", "random"],
    queryFn: async () => {
      const { events } = await fetchAllEvents();
      const idx = Math.floor(Math.random() * events.length);
      const event = events[idx];
      return {
        ticker: event.ticker,
        name: event.name,
        sector: event.sector,
        signal_date: event.signal_date,
        gap_up_pct: event.gap_up_pct,
        selloff_pct: event.selloff_pct,
        outcome_1d: event.outcome_1d,
        outcome_10d: event.outcome_10d ?? null,
        catalyst_type: event.catalyst_type,
        signal_strength: event.signal_strength,
        status: event.status,
        gap_size: event.gap_size,
        summary: event.summary,
      };
    },
    enabled: false, // Only fetch on demand
    staleTime: 0,
    gcTime: 0,
  });
}
