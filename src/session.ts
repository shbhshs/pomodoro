import type { Exercise } from './exercises';

export interface ExercisePosition {
  /** Index of the current exercise in the routine. */
  index: number;
  /** Milliseconds left in the current exercise. */
  remainingMs: number;
}

/** Milliseconds from the start of the break at which exercise `index` starts. */
function startOf(routine: Exercise[], index: number): number {
  let ms = 0;
  for (let i = 0; i < index; i++) ms += routine[i].durationSeconds * 1000;
  return ms;
}

/**
 * Where the routine is after `elapsedMs` of the break, which the caller takes
 * from the timer state so that pausing the timer pauses the routine. The last
 * exercise stays current, at 0, until the break ends. The routine must not be
 * empty.
 */
export function positionAt(routine: Exercise[], elapsedMs: number): ExercisePosition {
  const last = routine.length - 1;
  let start = 0;
  for (let index = 0; index < last; index++) {
    const end = start + routine[index].durationSeconds * 1000;
    if (elapsedMs < end) return { index, remainingMs: end - elapsedMs };
    start = end;
  }
  const end = start + routine[last].durationSeconds * 1000;
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
  const { index } = positionAt(routine, elapsedMs);
  if (index >= routine.length - 1) return 0;
  return startOf(routine, index + 1) - elapsedMs;
}
