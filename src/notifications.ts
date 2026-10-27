import * as Notifications from 'expo-notifications';

import type { Phase } from './timer';

/** What the notification says when `phase` is the one that just ended. */
export function phaseEndMessage(phase: Phase): { title: string; body: string } {
  if (phase === 'focus') {
    return { title: 'Focus session done', body: 'Time for your exercise break.' };
  }
  return { title: 'Break over', body: 'Ready for the next focus session?' };
}

/** Asks for permission only while it has never been asked. Returns whether it is granted. */
export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Schedules the end-of-phase notification at `endsAt` (ms). Returns its id, or null if not permitted. */
export async function schedulePhaseEnd(phase: Phase, endsAt: number): Promise<string | null> {
  if (!(await ensurePermission())) return null;
  return Notifications.scheduleNotificationAsync({
    content: phaseEndMessage(phase),
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(endsAt) },
  });
}