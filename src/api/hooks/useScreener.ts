import { useQuery } from "@tanstack/react-query";
import { api } from "../client";
import { STALE_FRESH } from "../queryConfig";
import { ScreenerResultSchema, type ScreenerFilters } from "../types/screener";
import { z } from "zod";
import { stripEmptyParams } from "@/lib/params";

export function useScreener(filters: ScreenerFilters) {
  return useQuery({
    queryKey: ["screener", filters],
    queryFn: async () => {
      const params = stripEmptyParams(filters);
      const { data } = await api.get("/screener", { params });
      return z.array(ScreenerResultSchema).parse(data);
    },
    staleTime: STALE_FRESH,
  });
}
