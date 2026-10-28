import { BODY_PARTS, buildRoutine, EXERCISES } from '../src/exercises';
import {
  exerciseSeconds,
  nextExercise,
  positionAt,
  routineElapsedMs,
} from '../src/session';
import { DEFAULT_SETTINGS } from '../src/settings';
import { durationsFor, initialState, skip, start } from '../src/timer';

const DURATIONS = durationsFor(DEFAULT_SETTINGS);

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

  it('treats an empty routine as index 0 with nothing left', () => {
    expect(positionAt([], 10_000)).toEqual({ index: 0, remainingMs: 0 });
  });

  describe('nextExercise', () => {
    const t0 = 1_000_000;
    const inBreak = () => {
      let s = start(skip(initialState()), t0);
      s = nextExercise(s, routine, t0 + 10_000);
      return s;
    };

    it('starts the next exercise at the given time', () => {
      const s = inBreak();
      const p = positionAt(routine, routineElapsedMs(s));
      expect(p.index).toBe(1);
      expect(exerciseSeconds(p)).toBe(60);
    });

    it('does not move past the last exercise', () => {
      const last = nextExercise(start(skip(initialState()), t0), routine, t0 + 150_000);
      const again = nextExercise(last, routine, t0 + 150_000);
      expect(again.skippedMs).toBe(last.skippedMs);
      expect(positionAt(routine, routineElapsedMs(again)).index).toBe(2);
    });

    it('does not carry into a break reached by skipping focus', () => {
      // Same phase and completedFocusSessions as the first break.
      const second = skip(skip(inBreak()));
      expect(second.phase).toBe('shortBreak');
      expect(second.completedFocusSessions).toBe(0);
      expect(positionAt(routine, routineElapsedMs(second)).index).toBe(0);
    });

    it('only advances the timer when the break already ended', () => {
      const s = inBreak();
      const after = nextExercise(s, routine, t0 + 10_000 + DURATIONS.shortBreak * 1000);
      expect(after.phase).toBe('focus');
      expect(after.skippedMs).toBe(0);
    });
  });

  it('covers a long break with one exercise per minute, ending on the 15th', () => {
    const long = buildRoutine(15 * 60, BODY_PARTS);
    expect(long).toHaveLength(15);
    expect(positionAt(long, 0).index).toBe(0);
    expect(positionAt(long, 14 * 60_000).index).toBe(14);
    expect(positionAt(long, 15 * 60_000)).toEqual({ index: 14, remainingMs: 0 });
  });
});
