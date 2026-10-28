import { shouldCue } from '../src/cue';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));

describe('playCue', () => {
  let notificationAsync: jest.Mock;
  let create: jest.Mock;
  let player: { seekTo: jest.Mock; play: jest.Mock };
  let playCue: () => void;

  beforeEach(() => {
    // Fresh modules so the cached player starts empty.
    jest.resetModules();
    notificationAsync = require('expo-haptics').notificationAsync;
    create = require('expo-audio').createAudioPlayer;
    player = { seekTo: jest.fn().mockResolvedValue(undefined), play: jest.fn() };
    create.mockReturnValue(player);
    notificationAsync.mockResolvedValue(undefined);
    playCue = require('../src/cue').playCue;
  });

  it('plays the haptic and the sound', () => {
    playCue();
    expect(notificationAsync).toHaveBeenCalledWith('success');
    expect(player.seekTo).toHaveBeenCalledWith(0);
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it('creates the player once and reuses it', () => {
    playCue();
    playCue();
    expect(create).toHaveBeenCalledTimes(1);
    expect(player.play).toHaveBeenCalledTimes(2);
  });

  it('does not throw when the haptic throws synchronously', () => {
    notificationAsync.mockImplementation(() => {
      throw new Error('no native module');
    });
    expect(() => playCue()).not.toThrow();
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it('does not throw when the haptic rejects', async () => {
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);
    notificationAsync.mockRejectedValue(new Error('fail'));
    expect(() => playCue()).not.toThrow();
    await new Promise<void>((resolve) => setImmediate(() => resolve()));
    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('does not throw when creating the player throws, and still buzzes', () => {
    create.mockImplementation(() => {
      throw new Error('no audio');
    });
    expect(() => playCue()).not.toThrow();
    expect(notificationAsync).toHaveBeenCalledTimes(1);
  });

  it('swallows a rejected seekTo without an unhandled rejection', async () => {
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);
    player.seekTo.mockRejectedValue(new Error('seek'));
    expect(() => playCue()).not.toThrow();
    expect(player.play).toHaveBeenCalledTimes(1);
    await new Promise<void>((resolve) => setImmediate(() => resolve()));
    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});

describe('shouldCue', () => {
  it('cues on a phase change', () => {
    expect(shouldCue({ phase: 'focus', exerciseIndex: 0 }, { phase: 'short', exerciseIndex: 0 })).toBe(true);
  });
  it('cues when moving forward to a later exercise', () => {
    expect(shouldCue({ phase: 'short', exerciseIndex: 1 }, { phase: 'short', exerciseIndex: 2 })).toBe(true);
  });
  it('does not cue on the same position or when going back', () => {
    expect(shouldCue({ phase: 'short', exerciseIndex: 2 }, { phase: 'short', exerciseIndex: 2 })).toBe(false);
    expect(shouldCue({ phase: 'short', exerciseIndex: 2 }, { phase: 'short', exerciseIndex: 0 })).toBe(false);
  });
});
