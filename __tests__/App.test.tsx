import { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

import App from '../App';
import { dayKey } from '../src/stats';

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

const haptic = jest.mocked(Haptics.notificationAsync);
const scheduled = jest.mocked(Notifications.scheduleNotificationAsync);
const cancelled = jest.mocked(Notifications.cancelScheduledNotificationAsync);

const time = () => screen.getByLabelText('time remaining');

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

describe('App', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  });
  afterEach(() => jest.useRealTimers());

  it('shows a 25 minute focus session', async () => {
    await render(<App />);
    expect(time()).toHaveTextContent('25:00');
  });

  it('counts down while running and holds when paused', async () => {
    await render(<App />);
    await fireEvent.press(screen.getByText('Start'));
    await advance(3000);
    expect(time()).toHaveTextContent('24:57');

    await fireEvent.press(screen.getByText('Pause'));
    await advance(5000);
    expect(time()).toHaveTextContent('24:57');

    await fireEvent.press(screen.getByText('Start'));
    await advance(2000);
    expect(time()).toHaveTextContent('24:55');
  });

  it('moves from focus into the break automatically and back', async () => {
    await render(<App />);
    await fireEvent.press(screen.getByText('Start'));
    await advance(25 * 60 * 1000);
    expect(screen.getByText('Short break')).toBeTruthy();
    expect(screen.getByText('MOVEMENT BREAK')).toBeTruthy();
    expect(time()).toHaveTextContent('05:00');

    await advance(5 * 60 * 1000);
    expect(screen.getByText('Focus')).toBeTruthy();
    expect(time()).toHaveTextContent('25:00');
  });

  it('takes a long break after the 4th focus session', async () => {
    await render(<App />);
    await fireEvent.press(screen.getByText('Start'));
    // Step by the minute: updates batch inside one act, so a single huge advance reads one late Date.now().
    for (let i = 0; i < 3 * 30 + 25; i++) await advance(60 * 1000);
    expect(screen.getByText('Long break')).toBeTruthy();
    expect(time()).toHaveTextContent('15:00');
  });

  describe('cues', () => {
    it('cues once per phase change and once per exercise change', async () => {
      await render(<App />);
      await fireEvent.press(screen.getByText('Start'));
      await advance(25 * 60 * 1000 - 1000);
      expect(haptic).not.toHaveBeenCalled();

      await advance(1000); // focus -> short break
      expect(haptic).toHaveBeenCalledTimes(1);
      expect(mockPlayer.play).toHaveBeenCalledTimes(1);

      await advance(60 * 1000); // exercise 1 -> 2
      expect(haptic).toHaveBeenCalledTimes(2);
      expect(mockPlayer.play).toHaveBeenCalledTimes(2);

      await fireEvent.press(screen.getByText('Next exercise')); // 2 -> 3
      expect(haptic).toHaveBeenCalledTimes(3);
      expect(mockPlayer.play).toHaveBeenCalledTimes(3);

      await advance(60 * 1000); // 3 -> 4
      expect(haptic).toHaveBeenCalledTimes(4);
    });

    it('does not cue on Reset', async () => {
      await render(<App />);
      await fireEvent.press(screen.getByText('Start'));
      await advance(25 * 60 * 1000);
      await advance(60 * 1000);
      haptic.mockClear();
      await fireEvent.press(screen.getByText('Reset'));
      expect(haptic).not.toHaveBeenCalled();
    });
  });

  describe('today stats', () => {
    const stats = () => screen.getByLabelText('today stats');

    it('shows zeros, then counts a finished focus session and break', async () => {
      await render(<App />);
      expect(stats()).toHaveTextContent('0Focus sessions0Focus minutes0Exercise sessions');
      await fireEvent.press(screen.getByText('Start'));
      await advance(25 * 60 * 1000);
      expect(stats()).toHaveTextContent('1Focus sessions25Focus minutes0Exercise sessions');
      await advance(5 * 60 * 1000);
      expect(stats()).toHaveTextContent('1Focus sessions25Focus minutes1Exercise sessions');
    });

    it('does not count a skipped break', async () => {
      await render(<App />);
      await fireEvent.press(screen.getByText('Start'));
      await advance(25 * 60 * 1000);
      await fireEvent.press(screen.getByText('Skip break'));
      expect(stats()).toHaveTextContent('1Focus sessions25Focus minutes0Exercise sessions');
    });

    it('does not count a reset', async () => {
      await render(<App />);
      await fireEvent.press(screen.getByText('Start'));
      await advance(60 * 1000);
      await fireEvent.press(screen.getByText('Reset'));
      expect(stats()).toHaveTextContent('0Focus sessions0Focus minutes0Exercise sessions');
    });

    it('counts a break that ends at the moment of Pause', async () => {
      await render(<App />);
      await fireEvent.press(screen.getByText('Start'));
      await advance(25 * 60 * 1000);
      jest.setSystemTime(Date.now() + 5 * 60 * 1000 + 500);
      await fireEvent.press(screen.getByText('Pause'));
      expect(stats()).toHaveTextContent('1Focus sessions25Focus minutes1Exercise sessions');
    });

    it('rolls over at midnight while idle', async () => {
      jest.setSystemTime(new Date(2026, 9, 27, 23, 59, 50).getTime());
      await AsyncStorage.setItem(
        'pomodoro.stats',
        JSON.stringify({ date: '2026-10-27', focusSessions: 2, focusMinutes: 50, exerciseSessions: 1 }),
      );
      await render(<App />);
      await advance(0);
      expect(stats()).toHaveTextContent('2Focus sessions50Focus minutes1Exercise sessions');
      await advance(20 * 1000);
      expect(stats()).toHaveTextContent('0Focus sessions0Focus minutes0Exercise sessions');
    });

    it('keeps a completion that happens before the saved stats finish loading', async () => {
      const day = dayKey(Date.now());
      let release!: (value: string) => void;
      jest.spyOn(AsyncStorage, 'getItem').mockImplementationOnce(
        () => new Promise<string | null>((resolve) => (release = resolve)),
      );
      await render(<App />);
      await fireEvent.press(screen.getByText('Start'));
      await advance(25 * 60 * 1000);
      expect(stats()).toHaveTextContent('1Focus sessions25Focus minutes0Exercise sessions');
      await act(async () => {
        release(JSON.stringify({ date: day, focusSessions: 2, focusMinutes: 50, exerciseSessions: 1 }));
      });
      expect(stats()).toHaveTextContent('3Focus sessions75Focus minutes1Exercise sessions');
      const saved = JSON.parse((await AsyncStorage.getItem('pomodoro.stats'))!);
      expect(saved).toMatchObject({ focusSessions: 3, focusMinutes: 75, exerciseSessions: 1 });
    });

    it('restores today from storage and saves new counts', async () => {
      const day = dayKey(Date.now());
      await AsyncStorage.setItem(
        'pomodoro.stats',
        JSON.stringify({ date: day, focusSessions: 2, focusMinutes: 50, exerciseSessions: 1 }),
      );
      await render(<App />);
      await advance(0);
      expect(stats()).toHaveTextContent('2Focus sessions50Focus minutes1Exercise sessions');
      await fireEvent.press(screen.getByText('Start'));
      await advance(25 * 60 * 1000);
      const saved = JSON.parse((await AsyncStorage.getItem('pomodoro.stats'))!);
      expect(saved.focusSessions).toBe(3);
    });
  });

  describe('notifications', () => {
    it('schedules the phase end on Start and cancels it on Pause', async () => {
      await render(<App />);
      const t0 = Date.now();
      await fireEvent.press(screen.getByText('Start'));
      expect(scheduled).toHaveBeenCalledTimes(1);
      const request = scheduled.mock.calls[0][0] as unknown as { trigger: { date: Date } };
      expect(request.trigger.date.getTime()).toBe(t0 + 25 * 60 * 1000);
      expect(cancelled).not.toHaveBeenCalled();

      await fireEvent.press(screen.getByText('Pause'));
      expect(cancelled).toHaveBeenCalledWith('note-id');
    });

    it('cancels on Reset', async () => {
      await render(<App />);
      await fireEvent.press(screen.getByText('Start'));
      await fireEvent.press(screen.getByText('Reset'));
      expect(cancelled).toHaveBeenCalledWith('note-id');
    });

    it('schedules the break end when focus rolls into the break', async () => {
      await render(<App />);
      await fireEvent.press(screen.getByText('Start'));
      await advance(25 * 60 * 1000);
      expect(scheduled).toHaveBeenCalledTimes(2);
      expect(cancelled).toHaveBeenCalledTimes(1);
      const second = scheduled.mock.calls[1][0] as unknown as {
        content: { title: string };
        trigger: { date: Date };
      };
      expect(second.content.title).toBe('Break over');
      expect(second.trigger.date.getTime()).toBe(Date.now() + 5 * 60 * 1000);
    });

    it('cancels on Skip break and does not schedule while stopped', async () => {
      await render(<App />);
      await fireEvent.press(screen.getByText('Start'));
      await advance(25 * 60 * 1000);
      cancelled.mockClear();
      scheduled.mockClear();
      await fireEvent.press(screen.getByText('Skip break'));
      expect(cancelled).toHaveBeenCalledWith('note-id');
      expect(scheduled).not.toHaveBeenCalled();
    });

    it('schedules nothing without permission, and Start still works', async () => {
      jest
        .mocked(Notifications.getPermissionsAsync)
        .mockResolvedValueOnce({ granted: false, canAskAgain: false } as never);
      await render(<App />);
      await fireEvent.press(screen.getByText('Start'));
      await advance(3000);
      expect(scheduled).not.toHaveBeenCalled();
      expect(time()).toHaveTextContent('24:57');
    });
  });

  it('resets to the full duration and stops', async () => {
    await render(<App />);
    await fireEvent.press(screen.getByText('Start'));
    await advance(4000);
    await fireEvent.press(screen.getByText('Reset'));
    expect(time()).toHaveTextContent('25:00');
    expect(screen.getByText('Start')).toBeTruthy();
  });

  describe('exercise break', () => {
    const startBreak = async () => {
      await render(<App />);
      await fireEvent.press(screen.getByText('Start'));
      await advance(25 * 60 * 1000);
    };
    const exerciseTime = () => screen.getByLabelText('exercise time remaining');

    it('shows the first exercise, its steps and the safety line', async () => {
      await startBreak();
      expect(screen.getByText('Neck tilts and chin tucks')).toBeTruthy();
      expect(screen.getByText(/1\. Tilt your ear/)).toBeTruthy();
      expect(screen.getByText('1 of 5')).toBeTruthy();
      expect(screen.getByText('Stop if anything hurts.')).toBeTruthy();
      expect(exerciseTime()).toHaveTextContent('01:00');
    });

    it('advances to the next exercise when its countdown ends', async () => {
      await startBreak();
      await advance(30 * 1000);
      expect(exerciseTime()).toHaveTextContent('00:30');
      await advance(31 * 1000);
      expect(screen.getByText('Shoulder rolls and shrugs')).toBeTruthy();
      expect(screen.getByText('2 of 5')).toBeTruthy();
    });

    it('Next exercise moves on immediately', async () => {
      await startBreak();
      await fireEvent.press(screen.getByText('Next exercise'));
      expect(screen.getByText('Shoulder rolls and shrugs')).toBeTruthy();
      expect(exerciseTime()).toHaveTextContent('01:00');
    });

    it('pausing the break pauses the exercise countdown', async () => {
      await startBreak();
      await advance(50 * 1000);
      await fireEvent.press(screen.getByText('Pause'));
      await advance(5 * 60 * 1000);
      expect(screen.getByText('1 of 5')).toBeTruthy();
      expect(exerciseTime()).toHaveTextContent('00:10');

      await fireEvent.press(screen.getByText('Start'));
      await advance(11 * 1000);
      expect(screen.getByText('2 of 5')).toBeTruthy();
    });

    it('Next exercise mid-tick still starts the next exercise at a full minute', async () => {
      await startBreak();
      await advance(10 * 1000 + 500);
      await fireEvent.press(screen.getByText('Next exercise'));
      expect(screen.getByText('2 of 5')).toBeTruthy();
      expect(exerciseTime()).toHaveTextContent('01:00');
    });

    it('a Next exercise in one break does not carry into the next', async () => {
      await startBreak();
      await fireEvent.press(screen.getByText('Next exercise'));
      await fireEvent.press(screen.getByText('Skip break'));
      await fireEvent.press(screen.getByText('Start'));
      await advance(25 * 60 * 1000);
      expect(screen.getByText('1 of 5')).toBeTruthy();
    });

    it('shows the right exercise after the app was backgrounded', async () => {
      await startBreak();
      // The clock jumps 2 minutes 30 seconds with no ticks in between.
      jest.setSystemTime(Date.now() + 150 * 1000);
      await advance(1000);
      expect(screen.getByText('3 of 5')).toBeTruthy();
      expect(exerciseTime()).toHaveTextContent('00:29');
    });

    it('Reset during a break restarts the routine', async () => {
      await startBreak();
      await fireEvent.press(screen.getByText('Next exercise'));
      await fireEvent.press(screen.getByText('Reset'));
      expect(screen.getByText('1 of 5')).toBeTruthy();
      expect(exerciseTime()).toHaveTextContent('01:00');
    });

    it('stays on the last exercise until the break ends', async () => {
      await startBreak();
      for (let i = 0; i < 4; i++) await advance(60 * 1000);
      await advance(59 * 1000);
      expect(screen.getByText('5 of 5')).toBeTruthy();
      expect(exerciseTime()).toHaveTextContent('00:01');
      await fireEvent.press(screen.getByText('Next exercise'));
      expect(screen.getByText('5 of 5')).toBeTruthy();
      expect(exerciseTime()).toHaveTextContent('00:01');
    });

    it('Skip break returns to a stopped, full focus session', async () => {
      await startBreak();
      await fireEvent.press(screen.getByText('Skip break'));
      expect(screen.getByText('Focus')).toBeTruthy();
      expect(time()).toHaveTextContent('25:00');
      expect(screen.getByText('Start')).toBeTruthy();
      expect(screen.queryByText('MOVEMENT BREAK')).toBeNull();
    });
  });
});
