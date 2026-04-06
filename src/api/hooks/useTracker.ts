import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../client";
import { STALE_FRESH, STALE_WARM } from "../queryConfig";
import {
  PeakDipEventSchema,
  TrackerSummarySchema,
  TrackerStatsSchema,
  PredictionSchema,
  ReadinessScoreSchema,
  type TrackerFilters,
} from "../types/tracker";

function stripEmpty(obj: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v != null && v !== ""),
  );
}

export function useTrackerEvents(filters: TrackerFilters = {}) {
  return useQuery({
    queryKey: ["tracker", "events", filters],
    queryFn: async () => {
      const params = stripEmpty(filters as Record<string, unknown>);
      const { data } = await api.get("/tracker/events", { params });
      return z.array(PeakDipEventSchema).parse(data);
    },
    staleTime: STALE_FRESH,
  });
}

export function useTrackerSummary() {
  return useQuery({
    queryKey: ["tracker", "summary"],
    queryFn: async () => {
      const { data } = await api.get("/tracker/summary");
      return TrackerSummarySchema.parse(data);
    },
    staleTime: STALE_WARM,
  });
}

export function useTrackerStats(days = 365) {
  return useQuery({
    queryKey: ["tracker", "stats", days],
    queryFn: async () => {
      const { data } = await api.get("/tracker/stats", { params: { days } });
      return TrackerStatsSchema.parse(data);
    },
    staleTime: STALE_WARM,
  });
}

export function useTrackerPredictions() {
  return useQuery({
    queryKey: ["tracker", "predictions"],
    queryFn: async () => {
      const { data } = await api.get("/tracker/predictions");
      return z.array(PredictionSchema).parse(data);
    },
    staleTime: STALE_WARM,
  });
}

export function useReadinessScore(actor: string = "user") {
  return useQuery({
    queryKey: ["tracker", "readiness", actor],
    queryFn: async () => {
      const { data } = await api.get("/tracker/readiness", {
        params: { actor },
      });
      return ReadinessScoreSchema.parse(data);
    },
    staleTime: STALE_WARM,
  });
}
