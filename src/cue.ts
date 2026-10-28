import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

let player: ReturnType<typeof createAudioPlayer> | null = null;

export type CuePosition = { phase: string; exerciseIndex: number };

/** True on a phase change or a move forward to a later exercise; going back (Reset) does not cue. */
export function shouldCue(prev: CuePosition, next: CuePosition): boolean {
  return next.phase !== prev.phase || next.exerciseIndex > prev.exerciseIndex;
}

/** Haptic tap plus the short cue sound. Never throws: a cue must not break the timer. */
export function playCue(): void {
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  } catch {
    // Haptics unavailable; the sound still plays.
  }
  try {
    player ??= createAudioPlayer(require('../assets/cue.wav'));
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // Audio unavailable; the haptic still fires.
  }
}
