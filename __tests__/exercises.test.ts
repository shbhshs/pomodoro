import { BODY_PARTS, EXERCISES, buildRoutine } from '../src/exercises';

describe('exercise data', () => {
  it('has five exercises with unique ids covering every body part', () => {
    expect(EXERCISES).toHaveLength(5);
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(5);
    expect(new Set(EXERCISES.map((e) => e.bodyPart))).toEqual(new Set(BODY_PARTS));
  });

  it.each(EXERCISES)('$id has a valid shape', (e) => {
    expect(e.name).not.toBe('');
    expect(e.illustration).not.toBe('');
    expect(e.steps.length).toBeGreaterThanOrEqual(2);
    expect(e.steps.length).toBeLessThanOrEqual(4);
    expect(e.durationSeconds).toBeGreaterThanOrEqual(45);
    expect(e.durationSeconds).toBeLessThanOrEqual(75);
  });
});

describe('buildRoutine', () => {
  it('covers each enabled part once in a short break', () => {
    const r = buildRoutine(5 * 60, BODY_PARTS);
    expect(r.map((e) => e.bodyPart)).toEqual(BODY_PARTS);
  });

  it('only uses enabled body parts', () => {
    const r = buildRoutine(5 * 60, ['neck', 'legs']);
    expect(r.every((e) => e.bodyPart === 'neck' || e.bodyPart === 'legs')).toBe(true);
    expect(r).toHaveLength(5);
  });

  it('repeats exercises in a long break', () => {
    const r = buildRoutine(15 * 60, BODY_PARTS);
    expect(r).toHaveLength(15);
    expect(r[5].id).toBe(r[0].id);
  });

  it('never exceeds the break length', () => {
    const r = buildRoutine(100, ['back']);
    expect(r).toHaveLength(1);
    expect(r.reduce((s, e) => s + e.durationSeconds, 0)).toBeLessThanOrEqual(100);
  });

  it('returns nothing for no parts or too short a break', () => {
    expect(buildRoutine(300, [])).toEqual([]);
    expect(buildRoutine(30, BODY_PARTS)).toEqual([]);
    expect(buildRoutine(0, BODY_PARTS)).toEqual([]);
  });
});
