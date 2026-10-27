import type { ComponentType } from 'react';

import { ANIMATIONS } from '../src/motion';
import StickFigure from './StickFigure';

export const NeckTilts = () => <StickFigure animation={ANIMATIONS['neck-tilts']} />;
export const ShoulderRolls = () => <StickFigure animation={ANIMATIONS['shoulder-rolls']} />;
export const SpinalTwist = () => <StickFigure animation={ANIMATIONS['spinal-twist']} />;
export const WristCircles = () => <StickFigure animation={ANIMATIONS['wrist-circles']} />;
export const ChairSquats = () => <StickFigure animation={ANIMATIONS['chair-squats']} />;

/** Animation component for each illustration key in `src/exercises.ts`. */
export const EXERCISE_ANIMATIONS: Record<string, ComponentType> = {
  'neck-tilts': NeckTilts,
  'shoulder-rolls': ShoulderRolls,
  'spinal-twist': SpinalTwist,
  'wrist-circles': WristCircles,
  'chair-squats': ChairSquats,
};
