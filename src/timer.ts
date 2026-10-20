export type Phase = 'focus' | 'shortBreak' | 'longBreak';

export interface TimerState {
  phase: Phase;
  remainingSeconds: number;
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
    remainingSeconds: DURATIONS.focus,
    running: false,
    completedFocusSessions: 0,
    endsAt: null,
  };
}

function enterPhase(phase: Phase, completedFocusSessions: number): TimerState {
  return {
    phase,
    remainingSeconds: DURATIONS[phase],
    running: false,
    completedFocusSessions,
    endsAt: null,
  };
}

function remainingAt(state: TimerState, now: number): number {
  if (state.endsAt === null) return state.remainingSeconds;
  return Math.max(0, Math.ceil((state.endsAt - now) / 1000));
}

/** Starts or resumes the countdown from the current remaining time. */
export function start(state: TimerState, now: number): TimerState {
  if (state.running) return state;
  return { ...state, running: true, endsAt: now + state.remainingSeconds * 1000 };
}

/** Freezes the remaining time at `now`. */
export function pause(state: TimerState, now: number): TimerState {
  if (!state.running) return state;
  return { ...state, running: false, endsAt: null, remainingSeconds: remainingAt(state, now) };
}

/** Restores the current phase to its full duration, stopped. */
export function reset(state: TimerState): TimerState {
  return enterPhase(state.phase, state.completedFocusSessions);
}

/**
 * Recomputes remaining time from timestamps, so it stays correct after the
 * app was backgrounded. When the phase ends it advances to the next phase,
 * stopped, awaiting `start`.
 */
export function tick(state: TimerState, now: number): TimerState {
  if (!state.running) return state;
  const remaining = remainingAt(state, now);
  if (remaining > 0) return { ...state, remainingSeconds: remaining };
  if (state.phase === 'focus') {
    const completed = state.completedFocusSessions + 1;
    const next = completed % SESSIONS_BEFORE_LONG_BREAK === 0 ? 'longBreak' : 'shortBreak';
    return enterPhase(next, completed);
  }
  return enterPhase('focus', state.completedFocusSessions);
}

/**
 * Moves to the next phase without completing the current one: skipping a
 * focus session does not count it and leads to a short break.
 */
export function skip(state: TimerState): TimerState {
  return enterPhase(state.phase === 'focus' ? 'shortBreak' : 'focus', state.completedFocusSessions);
}
