import { useEffect, useCallback } from "react";

const STORAGE_KEY = "peakdipvibe-mood-history";
const MAX_DAYS = 30;

export interface MoodEntry {
  date: string; // YYYY-MM-DD
  score: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): MoodEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(entries: MoodEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_DAYS)));
  } catch {
    // ignore
  }
}

export function useMoodHistory(score: number | null) {
  // Record today's score (once per day)
  useEffect(() => {
    if (score == null || score === 50) return; // skip loading/default state
    const entries = load();
    const d = today();
    const idx = entries.findIndex((e) => e.date === d);
    if (idx >= 0) {
      entries[idx].score = score;
    } else {
      entries.push({ date: d, score });
    }
    save(entries);
  }, [score]);

  const getHistory = useCallback((days = 7): MoodEntry[] => {
    const entries = load();
    return entries.slice(-days);
  }, []);

  return { getHistory };
}
