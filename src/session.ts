import type { Exercise } from './exercises';
import { DURATIONS, tick, type TimerState } from './timer';

export interface ExercisePosition {
  /** Index of the current exercise in the routine. */
  index: number;
  /** Milliseconds left in the current exercise. */
  remainingMs: number;
}

/**
 * Where the routine is after `elapsedMs` of the break, which the caller takes
 * from the timer state so that pausing the timer pauses the routine. The last
 * exercise stays current, at 0, until the break ends.
 */
export function positionAt(routine: Exercise[], elapsedMs: number): ExercisePosition {
  const last = routine.length - 1;
  let end = 0;
  for (let index = 0; index < last; index++) {
    end += routine[index].durationSeconds * 1000;
    if (elapsedMs < end) return { index, remainingMs: end - elapsedMs };
  }
  end += routine[last].durationSeconds * 1000;
  return { index: last, remainingMs: Math.max(0, end - elapsedMs) };
}

/** Whole seconds to show for an exercise's remaining time, rounded up. */
export function exerciseSeconds(position: ExercisePosition): number {
  return Math.ceil(position.remainingMs / 1000);
}

/**
 * How much further into the routine to move so that the next exercise starts
 * now. Returns 0 on the last exercise.
 */
export function skipAheadMs(routine: Exercise[], elapsedMs: number): number {
  const { index, remainingMs } = positionAt(routine, elapsedMs);
  return index >= routine.length - 1 ? 0 : remainingMs;
}

/** Milliseconds of the routine that have passed, including "Next exercise" jumps. */
export function routineElapsedMs(state: TimerState): number {
  return DURATIONS[state.phase] * 1000 - state.remainingMs + state.skippedMs;
}

/**
 * Starts the next exercise now. The offset lives in the timer state, so it
 * ends with the break. If the break ended by `now`, only the timer advances.
 */
export function nextExercise(state: TimerState, routine: Exercise[], now: number): TimerState {
  const fresh = tick(state, now);
  if (fresh.phase !== state.phase) return fresh;
  return { ...fresh, skippedMs: fresh.skippedMs + skipAheadMs(routine, routineElapsedMs(fresh)) };
}
