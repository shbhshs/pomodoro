import type { Exercise } from './exercises';

export interface ExerciseSession {
  routine: Exercise[];
  /** Index of the current exercise in `routine`. */
  index: number;
  /** Timestamp (ms) at which the current exercise ends. */
  endsAt: number;
}

/** Starts a session on the first exercise of a non-empty routine. */
export function startSession(routine: Exercise[], now: number): ExerciseSession {
  return { routine, index: 0, endsAt: now + routine[0].durationSeconds * 1000 };
}

export function isLast(session: ExerciseSession): boolean {
  return session.index >= session.routine.length - 1;
}

export function currentExercise(session: ExerciseSession): Exercise {
  return session.routine[session.index];
}

/** Whole seconds left in the current exercise, rounded up. */
export function exerciseSeconds(session: ExerciseSession, now: number): number {
  return Math.max(0, Math.ceil((session.endsAt - now) / 1000));
}

/**
 * Moves to the next exercise when the current one has run out. The next one
 * starts where the previous ended, so no time is lost to tick granularity.
 * The last exercise stays on screen at 0 until the break ends.
 */
export function tickSession(session: ExerciseSession, now: number): ExerciseSession {
  let { index, endsAt } = session;
  while (now >= endsAt && index < session.routine.length - 1) {
    index++;
    endsAt += session.routine[index].durationSeconds * 1000;
  }
  if (index === session.index) return session;
  return { ...session, index, endsAt };
}

/** Jumps to the next exercise now. On the last one it does nothing. */
export function nextExercise(session: ExerciseSession, now: number): ExerciseSession {
  if (isLast(session)) return session;
  const index = session.index + 1;
  return { ...session, index, endsAt: now + session.routine[index].durationSeconds * 1000 };
}
