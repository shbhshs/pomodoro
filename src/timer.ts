import { DEFAULT_SETTINGS, type Settings } from './settings';

export type Phase = 'focus' | 'shortBreak' | 'longBreak';

export interface TimerState {
  phase: Phase;
  /** Time left in the phase, in milliseconds. Round only for display. */
  remainingMs: number;
  running: boolean;
  completedFocusSessions: number;
  /** Breaks that ran to zero; skipping or resetting a break does not count. */
  completedBreaks: number;
  /** Timestamp (ms) at which the current phase ends; set only while running. */
  endsAt: number | null;
  /** Time jumped ahead in the break's exercise routine by "Next exercise". */
  skippedMs: number;
}

/** Length of each phase in seconds under `settings`. */
export function durationsFor(settings: Settings): Record<Phase, number> {
  return {
    focus: settings.focusMinutes * 60,
    shortBreak: settings.shortBreakMinutes * 60,
    longBreak: settings.longBreakMinutes * 60,
  };
}

export function initialState(settings: Settings = DEFAULT_SETTINGS): TimerState {
  return {
    phase: 'focus',
    remainingMs: durationsFor(settings).focus * 1000,
    running: false,
    completedFocusSessions: 0,
    completedBreaks: 0,
    endsAt: null,
    skippedMs: 0,
  };
}

function enterPhase(
  phase: Phase,
  completedFocusSessions: number,
  completedBreaks: number,
  settings: Settings,
): TimerState {
  return {
    phase,
    remainingMs: durationsFor(settings)[phase] * 1000,
    running: false,
    completedFocusSessions,
    completedBreaks,
    endsAt: null,
    skippedMs: 0,
  };
}

function remainingAt(state: TimerState, now: number): number {
  if (state.endsAt === null) return state.remainingMs;
  return Math.max(0, state.endsAt - now);
}

/** Whole seconds to show for the remaining time, rounded up. */
export function displaySeconds(state: TimerState): number {
  return Math.ceil(state.remainingMs / 1000);
}

/** Starts or resumes the countdown from the current remaining time. */
export function start(state: TimerState, now: number): TimerState {
  if (state.running) return state;
  return { ...state, running: true, endsAt: now + state.remainingMs };
}

/**
 * Freezes the remaining time at `now`. If the phase has already ended by
 * `now`, it behaves like `tick` and advances to the next phase.
 */
export function pause(
  state: TimerState,
  now: number,
  settings: Settings = DEFAULT_SETTINGS,
): TimerState {
  if (!state.running) return state;
  const advanced = tick(state, now, settings);
  if (advanced.running) return { ...advanced, running: false, endsAt: null };
  return advanced;
}

/** Restores the current phase to its full duration, stopped. */
export function reset(state: TimerState, settings: Settings = DEFAULT_SETTINGS): TimerState {
  return enterPhase(state.phase, state.completedFocusSessions, state.completedBreaks, settings);
}

/**
 * Recomputes remaining time from timestamps, so it stays correct after the
 * app was backgrounded. When the phase ends it advances to the next phase and
 * keeps running.
 */
export function tick(
  state: TimerState,
  now: number,
  settings: Settings = DEFAULT_SETTINGS,
): TimerState {
  if (!state.running) return state;
  const remaining = remainingAt(state, now);
  if (remaining > 0) return { ...state, remainingMs: remaining };
  let next: TimerState;
  if (state.phase === 'focus') {
    const completed = state.completedFocusSessions + 1;
    next = enterPhase(
      completed % settings.sessionsBeforeLongBreak === 0 ? 'longBreak' : 'shortBreak',
      completed,
      state.completedBreaks,
      settings,
    );
  } else {
    next = enterPhase(
      'focus',
      state.completedFocusSessions,
      state.completedBreaks + 1,
      settings,
    );
  }
  // The next phase starts exactly when this one ended, so no time is lost to
  // tick granularity. After a long gap it starts now instead of cascading.
  const nextEnd = (state.endsAt ?? now) + next.remainingMs;
  const endsAt = nextEnd > now ? nextEnd : now + next.remainingMs;
  return { ...next, running: true, endsAt, remainingMs: endsAt - now };
}

/**
 * Moves to the next phase without completing the current one: skipping a
 * focus session does not count it and leads to a short break.
 */
export function skip(state: TimerState, settings: Settings = DEFAULT_SETTINGS): TimerState {
  return enterPhase(
    state.phase === 'focus' ? 'shortBreak' : 'focus',
    state.completedFocusSessions,
    state.completedBreaks,
    settings,
  );
}
