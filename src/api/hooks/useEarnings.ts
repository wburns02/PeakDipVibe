import { useQuery } from "@tanstack/react-query";
import { api } from "../client";
import {
  ImpactSummarySchema,
  PriceJourneySchema,
  ThisWeekSchema,
  SectorBreakdownSchema,
  ForwardLookSchema,
  SimulationSchema,
} from "../types/earnings";

export function useImpactSummary() {
  return useQuery({
    queryKey: ["earnings", "impact-summary"],
    queryFn: async () => {
      const { data } = await api.get("/earnings/impact-summary");
      return ImpactSummarySchema.parse(data);
    },
    staleTime: 5 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
  });
}

export function useThisWeek() {
  return useQuery({
    queryKey: ["earnings", "this-week"],
    queryFn: async () => {
      const { data } = await api.get("/earnings/this-week");
      return ThisWeekSchema.parse(data);
    },
    staleTime: 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
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
    staleTime: 10 * 60 * 1000,
  });
}
