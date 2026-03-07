/**
 * Synthetic Intraday Data Generator
 *
 * When the upstream API is unreachable, generates realistic-looking
 * intraday bars from event metadata (gap_up_pct, selloff_pct, etc.)
 * so the simulator remains fully functional.
 */

import type { IntradayBar } from "@/api/types/earnings";

/** Seeded PRNG for reproducible results per ticker+date */
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/** Box-Muller normal random using provided PRNG */
function normalRandom(rng: () => number): number {
  const u1 = Math.max(1e-10, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Get N trading dates starting from a base date.
 * Skips weekends. Returns YYYY-MM-DD strings.
 */
function getTradingDates(baseDate: string, daysBefore: number, daysAfter: number): string[] {
  const dates: string[] = [];
  const base = new Date(baseDate + "T12:00:00Z");

  // Go back daysBefore trading days
  const preDates: string[] = [];
  let d = new Date(base);
  let count = 0;
  while (count < daysBefore) {
    d.setDate(d.getDate() - 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      preDates.unshift(d.toISOString().split("T")[0]);
      count++;
    }
  }
  dates.push(...preDates);

  // Signal date itself (if weekday)
  const baseDow = base.getUTCDay();
  if (baseDow !== 0 && baseDow !== 6) {
    dates.push(baseDate);
  }

  // Go forward daysAfter trading days
  d = new Date(base);
  count = 0;
  while (count < daysAfter) {
    d.setDate(d.getDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      dates.push(d.toISOString().split("T")[0]);
      count++;
    }
  }

  return dates;
}

/** Market hours: 9:30 AM to 4:00 PM ET = 14:30 to 21:00 UTC */
const MARKET_HOURS_60M = [
  "14:30", "15:30", "16:30", "17:30", "18:30", "19:30", "20:00",
];

interface EventMeta {
  ticker: string;
  signal_date: string;
  gap_up_pct: number;
  selloff_pct: number;
  name?: string | null;
  sector?: string | null;
  outcome_1d?: number | null;
  outcome_5d?: number | null;
}

export function generateSyntheticIntraday(event: EventMeta): {
  bars: IntradayBar[];
  name: string;
  sector: string;
} {
  const rng = mulberry32(hashStr(event.ticker + event.signal_date));
  const gapPct = event.gap_up_pct || 5;
  const selloffPct = event.selloff_pct || 2;
  const outcome1d = event.outcome_1d ?? (gapPct > 5 ? -1.5 : 0.5);

  // Base price — use a realistic price seeded by ticker
  const basePrice = 50 + (hashStr(event.ticker) % 200);

  // Get trading dates: 1 day before, signal date, 3 days after
  const tradingDates = getTradingDates(event.signal_date, 1, 3);
  const signalIdx = tradingDates.indexOf(event.signal_date);

  const bars: IntradayBar[] = [];
  let prevClose = basePrice;

  for (let dayIdx = 0; dayIdx < tradingDates.length; dayIdx++) {
    const date = tradingDates[dayIdx];
    const isSignalDay = date === event.signal_date;
    const isPreEvent = dayIdx < signalIdx;
    const daysSinceSignal = dayIdx - signalIdx;

    // Determine day's price action
    let dayOpen: number;
    let dayHigh: number;
    let dayLow: number;
    let dayClose: number;

    if (isPreEvent) {
      // Pre-event: small random walk
      const drift = normalRandom(rng) * 0.5;
      dayOpen = prevClose * (1 + (normalRandom(rng) * 0.1) / 100);
      dayClose = prevClose * (1 + drift / 100);
      dayHigh = Math.max(dayOpen, dayClose) * (1 + rng() * 0.3 / 100);
      dayLow = Math.min(dayOpen, dayClose) * (1 - rng() * 0.3 / 100);
    } else if (isSignalDay) {
      // Signal day: big gap up, then selloff
      dayOpen = prevClose * (1 + gapPct / 100);
      const peakPrice = dayOpen * (1 + rng() * 1.5 / 100); // slight overshoot
      const dip = dayOpen * (1 - selloffPct / 100);
      // Close somewhere between dip and peak
      const recoveryFactor = 0.3 + rng() * 0.3;
      dayClose = dip + (peakPrice - dip) * recoveryFactor;
      dayHigh = peakPrice;
      dayLow = dip;
    } else {
      // Post-event days: drift toward outcome
      const dayDrift = daysSinceSignal === 1
        ? (outcome1d ?? 0) / 100
        : ((event.outcome_5d ?? outcome1d ?? 0) / 100) * (0.15 + rng() * 0.1);
      dayOpen = prevClose * (1 + normalRandom(rng) * 0.3 / 100);
      dayClose = prevClose * (1 + dayDrift + normalRandom(rng) * 0.5 / 100);
      const range = Math.abs(dayOpen - dayClose) + prevClose * (rng() * 0.8) / 100;
      dayHigh = Math.max(dayOpen, dayClose) + range * rng() * 0.5;
      dayLow = Math.min(dayOpen, dayClose) - range * rng() * 0.5;
    }

    // Generate 7 intraday bars for this day
    const barCount = MARKET_HOURS_60M.length;

    for (let barIdx = 0; barIdx < barCount; barIdx++) {
      const t = barIdx / (barCount - 1); // 0 to 1 through the day

      let barOpen: number;
      let barClose: number;

      if (isSignalDay) {
        // Signal day shape: gap up → peak at bar 1-2 → selloff → partial recovery
        const peakT = 0.15 + rng() * 0.1; // peak early in the day
        const dipT = 0.6 + rng() * 0.15; // dip in afternoon

        if (t <= peakT) {
          // Rising to peak
          const progress = t / peakT;
          barClose = dayOpen + (dayHigh - dayOpen) * progress;
        } else if (t <= dipT) {
          // Selling off from peak to low
          const progress = (t - peakT) / (dipT - peakT);
          barClose = dayHigh - (dayHigh - dayLow) * progress;
        } else {
          // Partial recovery from low to close
          const progress = (t - dipT) / (1 - dipT);
          barClose = dayLow + (dayClose - dayLow) * progress;
        }
      } else {
        // Normal day: smooth interpolation with noise
        barClose = dayOpen + (dayClose - dayOpen) * t + normalRandom(rng) * prevClose * 0.15 / 100;
      }

      barOpen = barIdx === 0 ? (isSignalDay ? dayOpen : prevClose * (1 + normalRandom(rng) * 0.1 / 100)) : bars[bars.length - 1].close!;

      // Ensure high/low are realistic
      const barHigh = Math.max(barOpen, barClose) * (1 + rng() * 0.15 / 100);
      const barLow = Math.min(barOpen, barClose) * (1 - rng() * 0.15 / 100);

      // Volume pattern: U-shaped (high at open/close, low mid-day)
      const volumeBase = 500000 + hashStr(event.ticker) % 2000000;
      const volumeMult = isSignalDay ? 3 + rng() * 2 : 0.8 + rng() * 0.4;
      const timeVolume = 1.5 - Math.sin(t * Math.PI) * 0.8; // U-shape
      const volume = Math.round(volumeBase * volumeMult * timeVolume / barCount);

      const pctFromPrev = prevClose > 0 ? (barClose - prevClose) / prevClose : 0;

      bars.push({
        datetime: `${date}T${MARKET_HOURS_60M[barIdx]}:00`,
        open: Math.round(barOpen * 100) / 100,
        high: Math.round(barHigh * 100) / 100,
        low: Math.round(barLow * 100) / 100,
        close: Math.round(barClose * 100) / 100,
        volume,
        pct_from_prev_close: Math.round(pctFromPrev * 10000) / 10000,
      });
    }

    prevClose = dayClose;
  }

  return {
    bars,
    name: event.name ?? event.ticker,
    sector: event.sector ?? "Unknown",
  };
}
