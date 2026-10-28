import { nextBreakMinutes, phaseProgress, sessionNumber } from '../src/progress';
import { DEFAULT_SETTINGS } from '../src/settings';
import { initialState, type Phase } from '../src/timer';

describe('phaseProgress', () => {
  it('is 0 at the start, 0.5 halfway, 0.75 at three quarters and 1 at the end', () => {
    const s = initialState(DEFAULT_SETTINGS);
    const at = (remainingMs: number) => phaseProgress({ ...s, remainingMs }, DEFAULT_SETTINGS);
    expect(at(s.remainingMs)).toBe(0);
    expect(at(s.remainingMs / 2)).toBe(0.5);
    expect(at(s.remainingMs / 4)).toBe(0.75);
    expect(at(0)).toBe(1);
  });

  it('clamps when the phase was shortened in settings mid-phase', () => {
    const s = initialState(DEFAULT_SETTINGS);
    expect(phaseProgress({ ...s, remainingMs: s.remainingMs * 2 }, DEFAULT_SETTINGS)).toBe(0);
    expect(phaseProgress({ ...s, remainingMs: -5 }, DEFAULT_SETTINGS)).toBe(1);
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
