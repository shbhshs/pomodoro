import { EXERCISES } from '../src/exercises';
import {
  currentExercise,
  exerciseSeconds,
  nextExercise,
  startSession,
  tickSession,
} from '../src/session';

const routine = EXERCISES.slice(0, 3);

describe('exercise session', () => {
  it('starts on the first exercise with its full duration', () => {
    const s = startSession(routine, 1000);
    expect(currentExercise(s)).toBe(routine[0]);
    expect(exerciseSeconds(s, 1000)).toBe(60);
    expect(exerciseSeconds(s, 1500)).toBe(60);
  });

  it('advances when the exercise ends, keeping leftover time', () => {
    const s = tickSession(startSession(routine, 0), 61_500);
    expect(currentExercise(s)).toBe(routine[1]);
    expect(exerciseSeconds(s, 61_500)).toBe(59);
  });

  it('skips several exercises after a long gap and stops on the last', () => {
    const s = tickSession(startSession(routine, 0), 500_000);
    expect(currentExercise(s)).toBe(routine[2]);
    expect(exerciseSeconds(s, 500_000)).toBe(0);
  });

  it('Next jumps ahead with a fresh countdown and is a no-op on the last', () => {
    let s = nextExercise(startSession(routine, 0), 10_000);
    expect(currentExercise(s)).toBe(routine[1]);
    expect(exerciseSeconds(s, 10_000)).toBe(60);
    s = nextExercise(s, 11_000);
    expect(nextExercise(s, 12_000)).toBe(s);
  });
});
