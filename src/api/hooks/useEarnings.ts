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
  IntradaySimulationSchema,
  EventLibrarySchema,
  RandomEventSchema,
  EventAnalysisSchema,
} from "../types/earnings";

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

export function useIntradaySimulation(
  ticker: string,
  signalDate: string,
  interval: "15m" | "30m" | "60m" = "60m",
  days: number = 5,
) {
  return useQuery({
    queryKey: ["earnings", "simulate-intraday", ticker, signalDate, interval, days],
    queryFn: async () => {
      const { data } = await api.get(
        `/earnings/simulate/${ticker}/${signalDate}/intraday`,
        { params: { interval, days } },
      );
      return IntradaySimulationSchema.parse(data);
    },
    enabled: !!ticker && !!signalDate,
    staleTime: STALE_STABLE,
  });
}

export function useEventLibrary(params: {
  gap_size?: string;
  sector?: string;
  outcome?: string;
  ticker?: string;
  page?: number;
  per_page?: number;
}) {
  return useQuery({
    queryKey: ["earnings", "events", params],
    queryFn: async () => {
      const { data } = await api.get("/earnings/events", { params });
      return EventLibrarySchema.parse(data);
    },
    staleTime: STALE_WARM,
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
  });
}

export function useRandomEvent() {
  return useQuery({
    queryKey: ["earnings", "events", "random"],
    queryFn: async () => {
      const { data } = await api.get("/earnings/events/random");
      return RandomEventSchema.parse(data);
    },
    enabled: false, // Only fetch on demand
    staleTime: 0,
    gcTime: 0,
  });
}
