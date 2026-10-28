import AsyncStorage from '@react-native-async-storage/async-storage';

import { BODY_PARTS } from '../src/exercises';
import { nextExercise, routineElapsedMs } from '../src/session';
import {
  DEFAULT_SETTINGS,
  isValidMinutes,
  isValidSettings,
  step,
  toggleBodyPart,
  type Settings,
} from '../src/settings';
import { SETTINGS_KEY, loadSettings, saveSettings } from '../src/settingsStorage';
import { record, emptyStats } from '../src/stats';
import { initialState, reset, skip, start, tick } from '../src/timer';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const custom: Settings = {
  focusMinutes: 10,
  shortBreakMinutes: 2,
  longBreakMinutes: 7,
  sessionsBeforeLongBreak: 2,
  bodyParts: ['neck', 'legs'],
};

beforeEach(() => AsyncStorage.clear());

describe('validation', () => {
  it('accepts whole minutes from 1 to 90 only', () => {
    expect(isValidMinutes(1)).toBe(true);
    expect(isValidMinutes(90)).toBe(true);
    for (const bad of [0, 91, -5, 2.5, NaN, '25', null]) expect(isValidMinutes(bad)).toBe(false);
  });

  it('rejects settings with no body part or an out-of-range value', () => {
    expect(isValidSettings(custom)).toBe(true);
    expect(isValidSettings({ ...custom, bodyParts: [] })).toBe(false);
    expect(isValidSettings({ ...custom, bodyParts: ['elbows'] })).toBe(false);
    expect(isValidSettings({ ...custom, focusMinutes: 91 })).toBe(false);
    expect(isValidSettings({ ...custom, sessionsBeforeLongBreak: 0 })).toBe(false);
    expect(isValidSettings(null)).toBe(false);
  });

  it('steps within 1 to 90', () => {
    expect(step(DEFAULT_SETTINGS, 'focusMinutes', 1).focusMinutes).toBe(26);
    expect(step({ ...custom, focusMinutes: 1 }, 'focusMinutes', -1).focusMinutes).toBe(1);
    expect(step({ ...custom, longBreakMinutes: 90 }, 'longBreakMinutes', 1).longBreakMinutes).toBe(90);
  });

  it('never deselects the last body part', () => {
    const one = { ...custom, bodyParts: ['back' as const] };
    expect(toggleBodyPart(one, 'back')).toBe(one);
    expect(toggleBodyPart(custom, 'neck').bodyParts).toEqual(['legs']);
    expect(toggleBodyPart(custom, 'back').bodyParts).toEqual(['neck', 'back', 'legs']);
    expect(toggleBodyPart({ ...custom, bodyParts: ['legs'] }, 'neck').bodyParts).toEqual([
      'neck',
      'legs',
    ]);
  });
});

describe('persistence', () => {
  it('round-trips saved settings', async () => {
    await saveSettings(custom);
    expect(await loadSettings()).toEqual(custom);
  });

  it('falls back to defaults when nothing or garbage is saved', async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
    await AsyncStorage.setItem(SETTINGS_KEY, '{nope');
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...custom, bodyParts: [] }));
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('defaults to every body part', () => {
    expect(DEFAULT_SETTINGS.bodyParts).toEqual(BODY_PARTS);
  });
});

describe('timer with settings', () => {
  const T0 = 1_000_000;

  it('uses the configured lengths', () => {
    expect(initialState(custom).remainingMs).toBe(10 * 60_000);
    expect(skip(initialState(custom), custom).remainingMs).toBe(2 * 60_000);
    expect(reset(initialState(custom), custom).remainingMs).toBe(10 * 60_000);
  });

  it('takes the long break after the configured number of sessions', () => {
    let s = start(initialState(custom), T0);
    s = tick(s, T0 + 10 * 60_000, custom);
    expect(s.phase).toBe('shortBreak');
    const afterBreak = tick(s, T0 + 12 * 60_000, custom);
    expect(afterBreak.phase).toBe('focus');
    const second = tick(afterBreak, T0 + 22 * 60_000, custom);
    expect(second.phase).toBe('longBreak');
    expect(second.remainingMs).toBe(7 * 60_000);
  });

  it('measures routine progress against the configured break', () => {
    const s = start(skip(initialState(custom), custom), T0);
    expect(routineElapsedMs(tick(s, T0 + 30_000, custom), custom)).toBe(30_000);
    expect(nextExercise(s, [], T0, custom).phase).toBe('shortBreak');
  });

  it('counts the configured focus minutes in stats', () => {
    expect(record(emptyStats(T0), 'focus', T0, custom).focusMinutes).toBe(10);
  });
});
