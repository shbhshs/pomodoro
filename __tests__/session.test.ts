import { BODY_PARTS, buildRoutine, EXERCISES } from '../src/exercises';
import { exerciseSeconds, positionAt, skipAheadMs } from '../src/session';

const routine = EXERCISES.slice(0, 3);

describe('exercise session', () => {
  it('starts on the first exercise with its full duration', () => {
    const p = positionAt(routine, 0);
    expect(p.index).toBe(0);
    expect(exerciseSeconds(p)).toBe(60);
    expect(exerciseSeconds(positionAt(routine, 500))).toBe(60);
  });

  it('advances when the exercise ends, keeping leftover time', () => {
    const p = positionAt(routine, 61_500);
    expect(p.index).toBe(1);
    expect(exerciseSeconds(p)).toBe(59);
  });

  it('skips several exercises after a long gap and stops on the last at 0', () => {
    const p = positionAt(routine, 500_000);
    expect(p.index).toBe(2);
    expect(exerciseSeconds(p)).toBe(0);
  });

  it('skipAheadMs moves to the start of the next exercise, and is 0 on the last', () => {
    expect(skipAheadMs(routine, 10_000)).toBe(50_000);
    const p = positionAt(routine, 10_000 + skipAheadMs(routine, 10_000));
    expect(p.index).toBe(1);
    expect(exerciseSeconds(p)).toBe(60);
    expect(skipAheadMs(routine, 150_000)).toBe(0);
  });

  it('covers a long break with one exercise per minute, ending on the 15th', () => {
    const long = buildRoutine(15 * 60, BODY_PARTS);
    expect(long).toHaveLength(15);
    expect(positionAt(long, 0).index).toBe(0);
    expect(positionAt(long, 14 * 60_000).index).toBe(14);
    expect(positionAt(long, 15 * 60_000)).toEqual({ index: 14, remainingMs: 0 });
  });
});
