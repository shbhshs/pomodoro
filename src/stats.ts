import AsyncStorage from '@react-native-async-storage/async-storage';

import { DURATIONS, type TimerState } from './timer';

export interface DailyStats {
  /** Local calendar day these counts belong to, as YYYY-MM-DD. */
  date: string;
  focusSessions: number;
  focusMinutes: number;
  exerciseSessions: number;
}

export type Completion = 'focus' | 'exercise';

export const STATS_KEY = 'pomodoro.stats';

/** The local calendar day of a timestamp, as YYYY-MM-DD. */
export function dayKey(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function emptyStats(timestamp: number): DailyStats {
  return { date: dayKey(timestamp), focusSessions: 0, focusMinutes: 0, exerciseSessions: 0 };
}

/** The stats for the day of `now`: zeros if `stats` is from an earlier day. */
export function statsForDay(stats: DailyStats, now: number): DailyStats {
  return stats.date === dayKey(now) ? stats : emptyStats(now);
}

/** Milliseconds from `now` to the next local midnight. */
export function msUntilNextDay(now: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - now;
}

/** Adds up two records of the same day; for different days the later one wins. */
export function mergeStats(a: DailyStats, b: DailyStats): DailyStats {
  if (a.date !== b.date) return a.date > b.date ? a : b;
  return {
    date: a.date,
    focusSessions: a.focusSessions + b.focusSessions,
    focusMinutes: a.focusMinutes + b.focusMinutes,
    exerciseSessions: a.exerciseSessions + b.exerciseSessions,
  };
}

/** Counts a completion on the day of `at`, starting a new day if needed. */
export function record(stats: DailyStats, kind: Completion, at: number): DailyStats {
  const today = statsForDay(stats, at);
  if (kind === 'focus') {
    return {
      ...today,
      focusSessions: today.focusSessions + 1,
      focusMinutes: today.focusMinutes + DURATIONS.focus / 60,
    };
  }
  return { ...today, exerciseSessions: today.exerciseSessions + 1 };
}

/**
 * What finished between two timer states, if anything: a focus session that
 * ran to zero, or a break that ran to zero. Skipping and resetting count as
 * neither, because they leave both completion counters alone.
 */
export function completionBetween(prev: TimerState, next: TimerState): Completion | null {
  if (next.completedFocusSessions > prev.completedFocusSessions) return 'focus';
  if (next.completedBreaks > prev.completedBreaks) return 'exercise';
  return null;
}

function isStats(value: unknown): value is DailyStats {
  const v = value as Partial<DailyStats> | null;
  return (
    typeof v?.date === 'string' &&
    typeof v.focusSessions === 'number' &&
    typeof v.focusMinutes === 'number' &&
    typeof v.exerciseSessions === 'number'
  );
}

/** Reads the saved stats; missing or corrupt data gives an empty day. */
export async function loadStats(now: number): Promise<DailyStats> {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isStats(parsed) ? statsForDay(parsed, now) : emptyStats(now);
  } catch {
    return emptyStats(now);
  }
}

export async function saveStats(stats: DailyStats): Promise<void> {
  try {
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Stats are best effort; the timer must keep working.
  }
}
