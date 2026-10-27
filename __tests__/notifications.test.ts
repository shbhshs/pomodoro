import * as Notifications from 'expo-notifications';

import { ensurePermission, phaseEndMessage, schedulePhaseEnd } from '../src/notifications';

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

const mocked = jest.mocked(Notifications);

beforeEach(() => jest.resetAllMocks());

describe('phaseEndMessage', () => {
  it('invites the user to the exercise break when focus ends', () => {
    expect(phaseEndMessage('focus').body).toMatch(/exercise break/);
  });
  it('says the break is over when a break ends', () => {
    expect(phaseEndMessage('shortBreak').title).toBe('Break over');
    expect(phaseEndMessage('longBreak').title).toBe('Break over');
  });
});

describe('ensurePermission', () => {
  it('does not ask again once granted', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true } as never);
    expect(await ensurePermission()).toBe(true);
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });
  it('asks when never asked', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true } as never);
    mocked.requestPermissionsAsync.mockResolvedValue({ granted: true } as never);
    expect(await ensurePermission()).toBe(true);
  });
  it('does not ask after a denial', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false } as never);
    expect(await ensurePermission()).toBe(false);
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('schedulePhaseEnd', () => {
  it('schedules at the end timestamp', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true } as never);
    mocked.scheduleNotificationAsync.mockResolvedValue('id1');
    expect(await schedulePhaseEnd('focus', 5000)).toBe('id1');
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: phaseEndMessage('focus'),
      trigger: { type: 'date', date: new Date(5000) },
    });
  });
  it('schedules nothing without permission', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false } as never);
    expect(await schedulePhaseEnd('focus', 5000)).toBeNull();
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
