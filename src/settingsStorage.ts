import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_SETTINGS, isValidSettings, type Settings } from './settings';

export const SETTINGS_KEY = 'pomodoro.settings';

/** Reads the saved settings; missing or invalid data gives the defaults. */
export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isValidSettings(parsed) ? parsed : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Best effort; the settings still apply for this run.
  }
}
