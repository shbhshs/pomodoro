/**
 * Motion definitions for the exercise demonstrations: plain keyframe data plus
 * the pure functions that turn a loop position into a pose and a pose into
 * stick-figure geometry. Functions are marked 'worklet' so Reanimated can run
 * them on the UI thread; they also run as ordinary functions in tests.
 */

import type { IllustrationKey } from './exercises';

/** Joint parameters of the figure. Angles are degrees, lengths are in viewBox units. */
export interface Pose {
  /** Head rotation about the base of the neck; positive tilts to the figure's right. */
  headTilt: number;
  /** Shortens (negative) or lengthens the neck, used for chin tucks. */
  headLift: number;
  /** Horizontal shift of the face mark, showing which way the head is turned. */
  headTurn: number;
  /** Torso rotation: narrows the shoulders and shifts them sideways. */
  twist: number;
  /** Upward shoulder offset, per side. */
  shoulderL: number;
  shoulderR: number;
  /** Upper-arm angle from hanging straight down, outward positive. */
  arm: number;
  /** Extra forearm bend at the elbow. */
  forearm: number;
  /** Direction of the hand segment relative to the forearm. */
  hand: number;
  /** Squat depth, 0 standing to 1 seated. */
  squat: number;
}

const POSE_KEYS: (keyof Pose)[] = [
  'headTilt',
  'headLift',
  'headTurn',
  'twist',
  'shoulderL',
  'shoulderR',
  'arm',
  'forearm',
  'hand',
  'squat',
];

export const REST_POSE: Pose = {
  headTilt: 0,
  headLift: 0,
  headTurn: 0,
  twist: 0,
  shoulderL: 0,
  shoulderR: 0,
  arm: 12,
  forearm: 0,
  hand: 0,
  squat: 0,
};

export interface Keyframe {
  /** Position in the loop, 0 to 1. */
  at: number;
  /** Values not listed fall back to REST_POSE. */
  pose: Partial<Pose>;
}

export interface Animation {
  durationMs: number;
  /** Sorted by `at`, from 0 to 1. The last frame should match the first so the loop is seamless. */
  keyframes: Keyframe[];
}

const frame = (at: number, pose: Partial<Pose>): Keyframe => ({ at, pose });

/** One animation per illustration key in `src/exercises.ts`. */
export const ANIMATIONS: Record<IllustrationKey, Animation> = {
  'neck-tilts': {
    durationMs: 6000,
    keyframes: [
      frame(0, {}),
      frame(0.2, { headTilt: 28 }),
      frame(0.4, {}),
      frame(0.6, { headTilt: -28 }),
      frame(0.75, {}),
      frame(0.85, { headLift: -9 }),
      frame(1, {}),
    ],
  },
  'shoulder-rolls': {
    durationMs: 4000,
    keyframes: [
      frame(0, {}),
      frame(0.2, { shoulderL: 8, shoulderR: -2 }),
      frame(0.4, { shoulderL: 0, shoulderR: 8 }),
      frame(0.6, { shoulderL: -2, shoulderR: 0 }),
      frame(0.8, { shoulderL: 14, shoulderR: 14, arm: 6 }),
      frame(1, {}),
    ],
  },
  'spinal-twist': {
    durationMs: 5000,
    keyframes: [
      frame(0, {}),
      frame(0.25, { twist: 60, headTurn: 8 }),
      frame(0.5, {}),
      frame(0.75, { twist: -60, headTurn: -8 }),
      frame(1, {}),
    ],
  },
  'wrist-circles': {
    durationMs: 4000,
    keyframes: [
      frame(0, { arm: 90, hand: 0 }),
      frame(0.25, { arm: 90, hand: 90 }),
      frame(0.5, { arm: 90, hand: 180 }),
      frame(0.75, { arm: 90, hand: 270 }),
      frame(1, { arm: 90, hand: 360 }),
    ],
  },
  'chair-squats': {
    durationMs: 3600,
    keyframes: [
      frame(0, { arm: 70, forearm: -40 }),
      frame(0.45, { squat: 1, arm: 70, forearm: -40 }),
      frame(0.55, { squat: 1, arm: 70, forearm: -40 }),
      frame(1, { arm: 70, forearm: -40 }),
    ],
  },
};

/** Pose at `progress` (0 to 1) of an animation, interpolating linearly between keyframes. */
export function poseAt(animation: Animation, progress: number): Pose {
  'worklet';
  const frames = animation.keyframes;
  const p = Math.min(1, Math.max(0, progress));
  let i = 0;
  while (i < frames.length - 2 && p > frames[i + 1].at) i++;
  const a = frames[i];
  const b = frames[Math.min(i + 1, frames.length - 1)];
  const span = b.at - a.at;
  const k = span > 0 ? Math.min(1, Math.max(0, (p - a.at) / span)) : 1;
  const out = {} as Pose;
  for (let n = 0; n < POSE_KEYS.length; n++) {
    const key = POSE_KEYS[n];
    const from = a.pose[key] ?? REST_POSE[key];
    const to = b.pose[key] ?? REST_POSE[key];
    out[key] = from + (to - from) * k;
  }
  return out;
}

export const VIEW_BOX = '0 0 200 300';
export const HEAD_RADIUS = 20;

interface Geometry {
  /** SVG path data for the neck, torso, arms and legs. */
  body: string;
  head: { cx: number; cy: number };
  /** SVG path data for a short mark showing which way the face points. */
  face: string;
}

/** Stick-figure geometry for a pose, seen from the front. */
export function geometryOf(pose: Pose): Geometry {
  'worklet';
  const f = (n: number) => n.toFixed(1);
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const neckX = 100;
  const neckY = 96;
  const neckLen = 16 + pose.headLift;

  // The head sits on top of the neck, rotated about the neck base.
  const tilt = rad(pose.headTilt);
  const reach = neckLen + HEAD_RADIUS;
  const headX = neckX + Math.sin(tilt) * reach;
  const headY = neckY - Math.cos(tilt) * reach;
  const faceX = headX + pose.headTurn;
  const faceY = headY + 4;
  const face = `M ${f(faceX)} ${f(faceY)} L ${f(faceX + Math.sin(tilt) * 2)} ${f(faceY + 7)}`;

  // Shoulders narrow as the torso twists.
  const half = 30 * Math.cos(rad(pose.twist));
  const slide = Math.sin(rad(pose.twist)) * 10;
  const lsx = neckX - half + slide;
  const rsx = neckX + half + slide;
  const lsy = neckY + 6 - pose.shoulderL;
  const rsy = neckY + 6 - pose.shoulderR;

  // Arms: upper arm 28, forearm 26, hand 10. `side` is -1 for left, 1 for right.
  // With the shoulders 30 from the centre, outstretched arms reach 94 and stay inside the view box.
  const limb = (sx: number, sy: number, side: number) => {
    const upper = rad(pose.arm * side);
    const ex = sx + Math.sin(upper) * 28;
    const ey = sy + Math.cos(upper) * 28;
    const lower = rad((pose.arm + pose.forearm) * side);
    const wx = ex + Math.sin(lower) * 26;
    const wy = ey + Math.cos(lower) * 26;
    const h = rad(pose.hand);
    const hx = wx + Math.sin(h) * 10 * side;
    const hy = wy + Math.cos(h) * 10;
    return `M ${f(sx)} ${f(sy)} L ${f(ex)} ${f(ey)} L ${f(wx)} ${f(wy)} L ${f(hx)} ${f(hy)}`;
  };

  // Legs: the hips drop and the knees move out as the figure squats.
  const hipY = 186 + pose.squat * 34;
  const footY = 284;
  const kneeY = hipY + (footY - hipY) * 0.5 - pose.squat * 6;
  const kneeOut = 20 + pose.squat * 18;
  const leg = (side: number) =>
    `M ${f(neckX + side * 14)} ${f(hipY)} L ${f(neckX + side * kneeOut)} ${f(kneeY)} L ${f(neckX + side * 24)} ${f(footY)} L ${f(neckX + side * 36)} ${f(footY)}`;

  const body = [
    `M ${neckX} ${f(neckY)} L ${f(neckX + Math.sin(tilt) * neckLen)} ${f(neckY - Math.cos(tilt) * neckLen)}`,
    `M ${f(lsx)} ${f(lsy)} L ${f(rsx)} ${f(rsy)}`,
    `M ${neckX} ${f(neckY)} L ${neckX} ${f(hipY)}`,
    `M ${neckX - 14} ${f(hipY)} L ${neckX + 14} ${f(hipY)}`,
    limb(lsx, lsy, -1),
    limb(rsx, rsy, 1),
    leg(-1),
    leg(1),
  ].join(' ');

  return { body, head: { cx: headX, cy: headY }, face };
}
