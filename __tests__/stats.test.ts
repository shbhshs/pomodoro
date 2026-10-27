import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  completionBetween,
  dayKey,
  emptyStats,
  loadStats,
  record,
  saveStats,
  statsForDay,
  STATS_KEY,
} from '../src/stats';
import { initialState, skip, start, tick } from '../src/timer';

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

  it('ignores ticks, skips and pauses mid-phase', () => {
    expect(completionBetween(running, tick(running, t0 + 1000))).toBeNull();
    expect(completionBetween(running, skip(running))).toBeNull();
    const inBreak = tick(running, t0 + 25 * 60 * 1000);
    expect(completionBetween(inBreak, skip(inBreak))).toBeNull();
  });
});
