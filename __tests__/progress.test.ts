import { nextBreakMinutes, phaseProgress, progressFraction, sessionNumber } from '../src/progress';
import { DEFAULT_SETTINGS } from '../src/settings';
import { initialState, type Phase } from '../src/timer';

describe('progressFraction', () => {
  it('is 0 at the start, 0.5 halfway and 1 at the end', () => {
    expect(progressFraction(1500, 1500)).toBe(0);
    expect(progressFraction(750, 1500)).toBe(0.5);
    expect(progressFraction(0, 1500)).toBe(1);
  });

  it('clamps out-of-range values and a zero total', () => {
    expect(progressFraction(2000, 1500)).toBe(0);
    expect(progressFraction(-5, 1500)).toBe(1);
    expect(progressFraction(10, 0)).toBe(0);
  });
});

describe('phaseProgress', () => {
  it('uses the phase length from settings', () => {
    const s = initialState(DEFAULT_SETTINGS);
    expect(phaseProgress(s, DEFAULT_SETTINGS)).toBe(0);
    expect(phaseProgress({ ...s, remainingMs: s.remainingMs / 4 }, DEFAULT_SETTINGS)).toBe(0.75);
  });
});

describe('sessionNumber and nextBreakMinutes', () => {
  const n = DEFAULT_SETTINGS.sessionsBeforeLongBreak;
  const at = (completedFocusSessions: number, phase: Phase) => ({
    ...initialState(DEFAULT_SETTINGS),
    completedFocusSessions,
    phase,
  });

  it('counts focus sessions from 1 and wraps after the long break', () => {
    expect(sessionNumber(at(0, 'focus'), DEFAULT_SETTINGS)).toBe(1);
    expect(sessionNumber(at(n - 1, 'focus'), DEFAULT_SETTINGS)).toBe(n);
    expect(sessionNumber(at(n, 'focus'), DEFAULT_SETTINGS)).toBe(1);
  });

  it('keeps a break in the session it follows', () => {
    expect(sessionNumber(at(1, 'shortBreak'), DEFAULT_SETTINGS)).toBe(1);
    expect(sessionNumber(at(n, 'longBreak'), DEFAULT_SETTINGS)).toBe(n);
  });

  it('announces a long break before the last session of the cycle', () => {
    const { shortBreakMinutes, longBreakMinutes } = DEFAULT_SETTINGS;
    expect(nextBreakMinutes(at(0, 'focus'), DEFAULT_SETTINGS)).toBe(shortBreakMinutes);
    expect(nextBreakMinutes(at(n - 1, 'focus'), DEFAULT_SETTINGS)).toBe(longBreakMinutes);
  });
});
