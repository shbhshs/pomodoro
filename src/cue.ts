import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

let player: ReturnType<typeof createAudioPlayer> | null = null;

/** Haptic tap plus the short cue sound. Never throws: a cue must not break the timer. */
export function playCue(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  try {
    player ??= createAudioPlayer(require('../assets/cue.wav'));
    void player.seekTo(0);
    player.play();
  } catch {
    // Audio unavailable; the haptic and notification still fire.
  }
}
