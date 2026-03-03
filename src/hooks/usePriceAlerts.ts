import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "peakdipvibe-price-alerts";

export interface PriceAlert {
  above?: number;
  below?: number;
}

type AlertMap = Record<string, PriceAlert>;

function load(): AlertMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(alerts: AlertMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    // QuotaExceededError or SecurityError — in-memory only
  }
}

export function usePriceAlerts() {
  const [alerts, setAlerts] = useState<AlertMap>(load);

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setAlerts(load());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setAlert = useCallback((ticker: string, alert: PriceAlert) => {
    setAlerts((prev) => {
      // Remove if both thresholds are cleared
      if (alert.above == null && alert.below == null) {
        const { [ticker]: _, ...rest } = prev;
        save(rest);
        return rest;
      }
      const next = { ...prev, [ticker]: alert };
      save(next);
      return next;
    });
  }, []);

  const removeAlert = useCallback((ticker: string) => {
    setAlerts((prev) => {
      const { [ticker]: _, ...rest } = prev;
      save(rest);
      return rest;
    });
  }, []);

  const getAlert = useCallback(
    (ticker: string): PriceAlert | undefined => alerts[ticker],
    [alerts],
  );

  /** Check if current price triggers any alert */
  const checkTriggered = useCallback(
    (ticker: string, currentPrice: number | null): "above" | "below" | null => {
      if (currentPrice == null) return null;
      const alert = alerts[ticker];
      if (!alert) return null;
      if (alert.above != null && currentPrice >= alert.above) return "above";
      if (alert.below != null && currentPrice <= alert.below) return "below";
      return null;
    },
    [alerts],
  );

  return { alerts, setAlert, removeAlert, getAlert, checkTriggered };
}
