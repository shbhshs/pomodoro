import { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import App from '../App';

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: jest.fn(async () => 'note-id'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success' },
}));

const mockPlayer = { play: jest.fn(), seekTo: jest.fn(async () => undefined) };
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn(() => mockPlayer) }));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const time = () => screen.getByLabelText('time remaining');

async function saved() {
  return JSON.parse((await AsyncStorage.getItem('pomodoro.settings')) as string);
}

describe('App settings', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('changes the focus length and saves it', async () => {
    await render(<App />);
    await fireEvent.press(screen.getByLabelText('Settings'));
    await fireEvent.press(screen.getByLabelText('Decrease focus'));
    expect(screen.getByLabelText('Focus value')).toHaveTextContent('24 min');
    await fireEvent.press(screen.getByText('Done'));
    expect(time()).toHaveTextContent('24:00');
    expect(await saved()).toMatchObject({ focusMinutes: 24 });
  });

  it('loads saved settings on start', async () => {
    await AsyncStorage.setItem(
      'pomodoro.settings',
      JSON.stringify({
        focusMinutes: 10,
        shortBreakMinutes: 7,
        longBreakMinutes: 20,
        sessionsBeforeLongBreak: 3,
        bodyParts: ['neck'],
      }),
    );
    await render(<App />);
    await act(async () => {});
    expect(time()).toHaveTextContent('10:00');
    await fireEvent.press(screen.getByLabelText('Settings'));
    expect(screen.getByLabelText('Focus value')).toHaveTextContent('10 min');
    expect(screen.getByLabelText('Short break value')).toHaveTextContent('7 min');
    expect(screen.getByLabelText('Long break value')).toHaveTextContent('20 min');
  });

  it('restarts a running timer, stopped, when the focus length changes', async () => {
    await render(<App />);
    await fireEvent.press(screen.getByText('Start'));
    expect(screen.getByText('Pause')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Settings'));
    await fireEvent.press(screen.getByLabelText('Decrease focus'));
    await fireEvent.press(screen.getByText('Done'));
    expect(time()).toHaveTextContent('24:00');
    expect(screen.getByText('Start')).toBeTruthy();
  });

  it('keeps a running timer when another length or a body part changes', async () => {
    await render(<App />);
    await fireEvent.press(screen.getByText('Start'));
    await fireEvent.press(screen.getByLabelText('Settings'));
    await fireEvent.press(screen.getByLabelText('Increase short break'));
    await fireEvent.press(screen.getByText('Legs'));
    await fireEvent.press(screen.getByText('Done'));
    expect(screen.getByText('Pause')).toBeTruthy();
    expect((await saved()).shortBreakMinutes).toBe(6);
  });

  it('keeps at least one body part selected', async () => {
    await render(<App />);
    await fireEvent.press(screen.getByLabelText('Settings'));
    for (const name of ['Neck', 'Shoulders', 'Back', 'Arms and wrists', 'Legs']) {
      await fireEvent.press(screen.getByText(name));
    }
    expect((await saved()).bodyParts).toEqual(['legs']);
  });
});
