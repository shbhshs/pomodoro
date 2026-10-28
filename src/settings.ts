import { BODY_PARTS, type BodyPart } from './exercises';

export interface Settings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  bodyParts: BodyPart[];
}

export const DEFAULT_SETTINGS: Settings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  bodyParts: BODY_PARTS,
};

export const MIN_MINUTES = 1;
export const MAX_MINUTES = 90;

export type NumberKey = Exclude<keyof Settings, 'bodyParts'>;

const NUMBER_KEYS: NumberKey[] = [
  'focusMinutes',
  'shortBreakMinutes',
  'longBreakMinutes',
  'sessionsBeforeLongBreak',
];

/** A whole number from 1 to 90, the range for every duration and the session count. */
export function isValidMinutes(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_MINUTES &&
    value <= MAX_MINUTES
  );
}

export function isValidSettings(value: unknown): value is Settings {
  const v = value as Partial<Settings> | null;
  if (typeof v !== 'object' || v === null) return false;
  return (
    NUMBER_KEYS.every((key) => isValidMinutes(v[key])) &&
    Array.isArray(v.bodyParts) &&
    v.bodyParts.length > 0 &&
    v.bodyParts.every((p) => BODY_PARTS.includes(p))
  );
}

/** Adds `delta` to a number setting, staying within 1 to 90. */
export function step(settings: Settings, key: NumberKey, delta: number): Settings {
  const next = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, settings[key] + delta));
  return { ...settings, [key]: next };
}

/** Turns a body part on or off. The last selected part cannot be turned off. */
export function toggleBodyPart(settings: Settings, part: BodyPart): Settings {
  const on = settings.bodyParts.includes(part);
  if (on && settings.bodyParts.length === 1) return settings;
  const selected = on
    ? settings.bodyParts.filter((p) => p !== part)
    : [...settings.bodyParts, part];
  // Keep catalogue order so routines do not depend on the order of tapping.
  return { ...settings, bodyParts: BODY_PARTS.filter((p) => selected.includes(p)) };
}
