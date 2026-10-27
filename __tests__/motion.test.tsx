import { render } from '@testing-library/react-native';

import { EXERCISE_ANIMATIONS } from '../components/ExerciseAnimation';
import { EXERCISES } from '../src/exercises';
import { ANIMATIONS, REST_POSE, geometryOf, poseAt } from '../src/motion';

describe('exercise animations', () => {
  it.each(EXERCISES.map((e) => e.illustration))('has motion data and a component for %s', (key) => {
    expect(ANIMATIONS[key]).toBeDefined();
    expect(EXERCISE_ANIMATIONS[key]).toBeDefined();
  });

  it.each(Object.entries(EXERCISE_ANIMATIONS))('renders %s', (_key, Component) => {
    expect(() => render(<Component />)).not.toThrow();
  });

  it.each(Object.entries(ANIMATIONS))('%s has well-formed, seamlessly looping keyframes', (_k, a) => {
    expect(a.durationMs).toBeGreaterThan(0);
    const { keyframes } = a;
    expect(keyframes[0].at).toBe(0);
    expect(keyframes[keyframes.length - 1].at).toBe(1);
    keyframes.forEach((k, i) => i > 0 && expect(k.at).toBeGreaterThan(keyframes[i - 1].at));
    const first = poseAt(a, 0);
    const last = poseAt(a, 1);
    // The wrist circle ends a full turn (360 degrees) later, which looks identical.
    expect({ ...last, hand: last.hand % 360 }).toEqual(first);
  });
});

describe('poseAt', () => {
  const anim = {
    durationMs: 1000,
    keyframes: [
      { at: 0, pose: {} },
      { at: 0.5, pose: { headTilt: 20 } },
      { at: 1, pose: {} },
    ],
  };

  it('starts from the rest pose and interpolates between keyframes', () => {
    expect(poseAt(anim, 0)).toEqual(REST_POSE);
    expect(poseAt(anim, 0.25).headTilt).toBeCloseTo(10);
    expect(poseAt(anim, 0.5).headTilt).toBeCloseTo(20);
    expect(poseAt(anim, 0.75).headTilt).toBeCloseTo(10);
  });

  it('clamps progress outside 0 to 1', () => {
    expect(poseAt(anim, -1)).toEqual(REST_POSE);
    expect(poseAt(anim, 2)).toEqual(REST_POSE);
  });
});

describe('geometryOf', () => {
  it('moves the head sideways when tilted and lowers the hips when squatting', () => {
    const rest = geometryOf(REST_POSE);
    expect(geometryOf({ ...REST_POSE, headTilt: 25 }).head.cx).toBeGreaterThan(rest.head.cx);
    expect(geometryOf({ ...REST_POSE, headTilt: -25 }).head.cx).toBeLessThan(rest.head.cx);
    expect(geometryOf({ ...REST_POSE, squat: 1 }).body).not.toBe(rest.body);
  });

  it('never produces NaN', () => {
    for (const a of Object.values(ANIMATIONS)) {
      for (let p = 0; p <= 1; p += 0.05) expect(geometryOf(poseAt(a, p)).body).not.toContain('NaN');
    }
  });
});
