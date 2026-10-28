import type { Settings } from './settings';
import { durationsFor, type TimerState } from './timer';

/**
 * Share of the current phase that has passed, from 0 (just started) to 1 (done).
 * Clamped because shortening a length in settings can leave more time remaining
 * than the new total.
 */
export function phaseProgress(state: TimerState, settings: Settings): number {
  const totalMs = durationsFor(settings)[state.phase] * 1000;
  return Math.min(1, Math.max(0, 1 - state.remainingMs / totalMs));
}

/** Which focus session of the cycle the screen is in, from 1 to `sessionsBeforeLongBreak`. */
export function sessionNumber(state: TimerState, settings: Settings): number {
  const per = settings.sessionsBeforeLongBreak;
  return (state.completedFocusSessions % per) + 1;
}

/** Minutes of the movement break that follows the current focus session. */
export function nextBreakMinutes(state: TimerState, settings: Settings): number {
  const long = (state.completedFocusSessions + 1) % settings.sessionsBeforeLongBreak === 0;
  return long ? settings.longBreakMinutes : settings.shortBreakMinutes;
}
