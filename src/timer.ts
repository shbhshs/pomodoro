export type Phase = 'focus' | 'shortBreak' | 'longBreak';

export interface TimerState {
  phase: Phase;
  /** Time left in the phase, in milliseconds. Round only for display. */
  remainingMs: number;
  running: boolean;
  completedFocusSessions: number;
  /** Timestamp (ms) at which the current phase ends; set only while running. */
  endsAt: number | null;
}

export const DURATIONS: Record<Phase, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

export const SESSIONS_BEFORE_LONG_BREAK = 4;

export function initialState(): TimerState {
  return {
    phase: 'focus',
    remainingMs: DURATIONS.focus * 1000,
    running: false,
    completedFocusSessions: 0,
    endsAt: null,
  };
}

function enterPhase(phase: Phase, completedFocusSessions: number): TimerState {
  return {
    phase,
    remainingMs: DURATIONS[phase] * 1000,
    running: false,
    completedFocusSessions,
    endsAt: null,
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
export function pause(state: TimerState, now: number): TimerState {
  if (!state.running) return state;
  const advanced = tick(state, now);
  if (advanced.running) return { ...advanced, running: false, endsAt: null };
  return advanced;
}

/** Restores the current phase to its full duration, stopped. */
export function reset(state: TimerState): TimerState {
  return enterPhase(state.phase, state.completedFocusSessions);
}

/**
 * Recomputes remaining time from timestamps, so it stays correct after the
 * app was backgrounded. When the phase ends it advances to the next phase and
 * keeps running.
 */
export function tick(state: TimerState, now: number): TimerState {
  if (!state.running) return state;
  const remaining = remainingAt(state, now);
  if (remaining > 0) return { ...state, remainingMs: remaining };
  let next: TimerState;
  if (state.phase === 'focus') {
    const completed = state.completedFocusSessions + 1;
    next = enterPhase(
      completed % SESSIONS_BEFORE_LONG_BREAK === 0 ? 'longBreak' : 'shortBreak',
      completed,
    );
  } else {
    next = enterPhase('focus', state.completedFocusSessions);
  }
  // The next phase starts exactly when this one ended, so no time is lost to
  // tick granularity. After a long gap it starts now instead of cascading.
  // endsAt is non-null while running; if the carried end is not in the future
  // (gap longer than the next phase), restart the next phase in full from now.
  const carriedEnd = (state.endsAt ?? now) + next.remainingMs;
  const endsAt = carriedEnd > now ? carriedEnd : now + next.remainingMs;
  return { ...next, running: true, endsAt, remainingMs: endsAt - now };
}

/**
 * Moves to the next phase without completing the current one: skipping a
 * focus session does not count it and leads to a short break.
 */
export function skip(state: TimerState): TimerState {
  return enterPhase(state.phase === 'focus' ? 'shortBreak' : 'focus', state.completedFocusSessions);
}
