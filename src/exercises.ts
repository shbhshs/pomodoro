export type BodyPart = 'neck' | 'shoulders' | 'back' | 'arms' | 'legs';

export type IllustrationKey =
  | 'neck-tilts'
  | 'shoulder-rolls'
  | 'spinal-twist'
  | 'wrist-circles'
  | 'chair-squats';

export interface Exercise {
  id: string;
  bodyPart: BodyPart;
  name: string;
  /** 2 to 4 short instructions. */
  steps: string[];
  durationSeconds: number;
  /** Keys the motion data in `src/motion.ts`. */
  illustration: IllustrationKey;
}

export const BODY_PARTS: BodyPart[] = ['neck', 'shoulders', 'back', 'arms', 'legs'];

export const EXERCISES: Exercise[] = [
  {
    id: 'neck-tilts',
    bodyPart: 'neck',
    name: 'Neck tilts and chin tucks',
    steps: [
      'Tilt your ear toward your shoulder and hold for 10 seconds.',
      'Switch sides.',
      'Pull your chin straight back and hold for 5 seconds. Repeat.',
    ],
    durationSeconds: 60,
    illustration: 'neck-tilts',
  },
  {
    id: 'shoulder-rolls',
    bodyPart: 'shoulders',
    name: 'Shoulder rolls and shrugs',
    steps: [
      'Roll your shoulders back in big circles for 20 seconds.',
      'Roll them forward for 20 seconds.',
      'Shrug up to your ears, hold 3 seconds, and drop.',
    ],
    durationSeconds: 60,
    illustration: 'shoulder-rolls',
  },
  {
    id: 'spinal-twist',
    bodyPart: 'back',
    name: 'Seated spinal twist',
    steps: [
      'Sit tall with your feet flat.',
      'Turn your torso right, holding the chair back, for 25 seconds.',
      'Switch to the left side.',
    ],
    durationSeconds: 60,
    illustration: 'spinal-twist',
  },
  {
    id: 'wrist-circles',
    bodyPart: 'arms',
    name: 'Wrist circles and finger stretch',
    steps: [
      'Extend your arms and circle your wrists 10 times each way.',
      'Spread your fingers wide, then make a fist. Repeat.',
      'Gently pull each hand back and hold for 10 seconds.',
    ],
    durationSeconds: 60,
    illustration: 'wrist-circles',
  },
  {
    id: 'chair-squats',
    bodyPart: 'legs',
    name: 'Chair squats',
    steps: [
      'Stand in front of your chair, feet shoulder-width apart.',
      'Lower until you almost touch the seat, then stand up.',
      'Repeat at a steady pace.',
    ],
    durationSeconds: 60,
    illustration: 'chair-squats',
  },
];

/**
 * Builds a break routine that fits in `breakSeconds`. Exercises of the enabled
 * body parts are taken in catalogue order and repeated cyclically until the
 * next one would no longer fit, so a long break repeats exercises.
 */
export function buildRoutine(breakSeconds: number, enabled: Iterable<BodyPart>): Exercise[] {
  const parts = new Set(enabled);
  const pool = EXERCISES.filter((e) => parts.has(e.bodyPart));
  const routine: Exercise[] = [];
  if (pool.length === 0) return routine;

  let remaining = breakSeconds;
  for (let i = 0; remaining >= pool[i % pool.length].durationSeconds; i++) {
    const exercise = pool[i % pool.length];
    routine.push(exercise);
    remaining -= exercise.durationSeconds;
  }
  return routine;
}
