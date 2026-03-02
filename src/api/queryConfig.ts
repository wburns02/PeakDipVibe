/**
 * Centralized TanStack Query cache configuration.
 *
 * THREE TIERS:
 * - FRESH:  1 min — data that changes frequently (prices, screener, signals)
 * - WARM:   5 min — data updated a few times daily (overview, comparisons, indicators)
 * - STABLE: 10 min — data that rarely changes (simulations, analysis, event details)
 */

/** 1 minute — for data that changes frequently */
export const STALE_FRESH = 60 * 1000;

/** 5 minutes — for moderately dynamic data */
export const STALE_WARM = 5 * 60 * 1000;

/** 10 minutes — for slow-changing or computed data */
export const STALE_STABLE = 10 * 60 * 1000;
