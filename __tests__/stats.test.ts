import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  completionBetween,
  dayKey,
  emptyStats,
  loadStats,
  mergeStats,
  msUntilNextDay,
  record,
  saveStats,
  statsForDay,
  STATS_KEY,
} from '../src/stats';
import { initialState, pause, reset, skip, start, tick } from '../src/timer';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const at = (y: number, m: number, d: number, h = 12, min = 0, s = 0) =>
  new Date(y, m - 1, d, h, min, s).getTime();

describe('daily stats', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it('counts focus sessions, focus minutes and exercise sessions', () => {
    const now = at(2026, 10, 27);
    let s = emptyStats(now);
    s = record(s, 'focus', now);
    s = record(s, 'focus', now);
    s = record(s, 'exercise', now);
    expect(s).toEqual({ date: '2026-10-27', focusSessions: 2, focusMinutes: 50, exerciseSessions: 1 });
  });

  it('resets at local midnight', () => {
    jest.setSystemTime(at(2026, 10, 27, 23, 59, 59));
    const s = record(emptyStats(Date.now()), 'focus', Date.now());
    expect(statsForDay(s, Date.now()).focusSessions).toBe(1);

    jest.advanceTimersByTime(1000);
    expect(dayKey(Date.now())).toBe('2026-10-28');
    expect(statsForDay(s, Date.now())).toEqual(emptyStats(Date.now()));
  });

  it('records a completion on the day it ended, not the day it was noticed', () => {
    const s = record(emptyStats(at(2026, 10, 27, 23, 0)), 'focus', at(2026, 10, 28, 0, 5));
    expect(s.date).toBe('2026-10-28');
    expect(s.focusSessions).toBe(1);
  });

  it('persists and reloads the same day', async () => {
    jest.setSystemTime(at(2026, 10, 27, 9));
    await saveStats(record(emptyStats(Date.now()), 'exercise', Date.now()));
    expect((await loadStats(Date.now())).exerciseSessions).toBe(1);
  });

  it('drops saved stats from a previous day on load', async () => {
    jest.setSystemTime(at(2026, 10, 27, 9));
    await saveStats(record(emptyStats(Date.now()), 'focus', Date.now()));
    jest.setSystemTime(at(2026, 10, 28, 0, 0, 1));
    expect(await loadStats(Date.now())).toEqual(emptyStats(Date.now()));
  });

  it('starts empty when the saved data is corrupt', async () => {
    await AsyncStorage.setItem(STATS_KEY, 'not json');
    expect((await loadStats(Date.now())).focusSessions).toBe(0);
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify({ date: 5 }));
    expect((await loadStats(Date.now())).focusSessions).toBe(0);
  });
});

describe('day helpers', () => {
  it('finds the time to the next local midnight', () => {
    expect(msUntilNextDay(at(2026, 10, 27, 23, 59, 59))).toBe(1000);
    expect(msUntilNextDay(at(2026, 10, 27, 0, 0, 0))).toBeGreaterThanOrEqual(23 * 3600 * 1000);
  });

  it('merges same-day stats and keeps the later day otherwise', () => {
    const a = record(emptyStats(at(2026, 10, 27)), 'focus', at(2026, 10, 27));
    const b = record(emptyStats(at(2026, 10, 27)), 'exercise', at(2026, 10, 27));
    expect(mergeStats(a, b)).toEqual({
      date: '2026-10-27',
      focusSessions: 1,
      focusMinutes: 25,
      exerciseSessions: 1,
    });
    const next = record(emptyStats(at(2026, 10, 28)), 'focus', at(2026, 10, 28));
    expect(mergeStats(a, next)).toEqual(next);
    expect(mergeStats(next, a)).toEqual(next);
  });
});

describe('completionBetween', () => {
  const t0 = 1_000_000;
  const running = start(initialState(), t0);

  it('reports a focus session that ran out', () => {
    expect(completionBetween(running, tick(running, t0 + 25 * 60 * 1000))).toBe('focus');
  });

  it('reports a break that ran out', () => {
    const inBreak = tick(running, t0 + 25 * 60 * 1000);
    const next = tick(inBreak, inBreak.endsAt! + 1);
    expect(completionBetween(inBreak, next)).toBe('exercise');
  });

  it('reports a break that ended at the moment of Pause', () => {
    const inBreak = tick(running, t0 + 25 * 60 * 1000);
    const paused = pause(inBreak, inBreak.endsAt! + 1);
    expect(paused.running).toBe(false);
    expect(completionBetween(inBreak, paused)).toBe('exercise');
  });

  it('reports a focus session that ended at the moment of Pause', () => {
    const paused = pause(running, t0 + 25 * 60 * 1000 + 1);
    expect(paused.running).toBe(false);
    expect(completionBetween(running, paused)).toBe('focus');
  });

  it('ignores a reset', () => {
    const inBreak = tick(running, t0 + 25 * 60 * 1000);
    expect(completionBetween(running, reset(running))).toBeNull();
    expect(completionBetween(inBreak, reset(inBreak))).toBeNull();
  });

  it('ignores ticks, skips and pauses mid-phase', () => {
    expect(completionBetween(running, tick(running, t0 + 1000))).toBeNull();
    expect(completionBetween(running, skip(running))).toBeNull();
    const inBreak = tick(running, t0 + 25 * 60 * 1000);
    expect(completionBetween(inBreak, skip(inBreak))).toBeNull();
  });
});
