import { DURATIONS, TimerState, initialState, pause, reset, skip, start, tick } from '../src/timer';

const T0 = 1_000_000;
const running = (s: Partial<TimerState> = {}) => start({ ...initialState(), ...s }, T0);

describe('timer', () => {
  it('has the default initial state', () => {
    expect(initialState()).toMatchObject({
      phase: 'focus',
      remainingSeconds: 1500,
      running: false,
      completedFocusSessions: 0,
    });
  });

  it('start begins running and is idempotent', () => {
    const s = start(initialState(), T0);
    expect(s.running).toBe(true);
    expect(start(s, T0 + 5000)).toBe(s);
  });

  it('tick computes remaining from timestamps, not tick count', () => {
    const s = tick(running(), T0 + 10 * 60 * 1000);
    expect(s.remainingSeconds).toBe(900);
    expect(s.running).toBe(true);
  });

  it('tick does nothing when paused', () => {
    const s = initialState();
    expect(tick(s, T0 + 99999)).toBe(s);
  });

  it('pause freezes remaining time and resume continues from it', () => {
    const p = pause(running(), T0 + 60_000);
    expect(p).toMatchObject({ running: false, remainingSeconds: 1440 });
    expect(tick(p, T0 + 999_999).remainingSeconds).toBe(1440);
    const resumed = start(p, T0 + 500_000);
    expect(tick(resumed, T0 + 560_000).remainingSeconds).toBe(1380);
  });

  it('pause is a no-op when not running', () => {
    const s = initialState();
    expect(pause(s, T0)).toBe(s);
  });

  it('reset restores the phase duration, stopped, keeping the session count', () => {
    const s = reset({ ...running({ phase: 'shortBreak', completedFocusSessions: 2 }), remainingSeconds: 10 });
    expect(s).toMatchObject({ phase: 'shortBreak', remainingSeconds: 300, running: false, completedFocusSessions: 2 });
  });

  it('finishing focus moves to a short break and counts the session', () => {
    const s = tick(running(), T0 + DURATIONS.focus * 1000);
    expect(s).toMatchObject({ phase: 'shortBreak', remainingSeconds: 300, running: false, completedFocusSessions: 1 });
  });

  it('handles a long background gap by finishing the phase once', () => {
    const s = tick(running(), T0 + 10 * 60 * 60 * 1000);
    expect(s.phase).toBe('shortBreak');
    expect(s.completedFocusSessions).toBe(1);
  });

  it('finishing the 4th focus session moves to a long break', () => {
    const s = tick(running({ completedFocusSessions: 3 }), T0 + DURATIONS.focus * 1000);
    expect(s).toMatchObject({ phase: 'longBreak', remainingSeconds: 900, completedFocusSessions: 4 });
  });

  it.each(['shortBreak', 'longBreak'] as const)('finishing a %s returns to focus', (phase) => {
    const s = tick(
      running({ phase, remainingSeconds: DURATIONS[phase], completedFocusSessions: 4 }),
      T0 + DURATIONS[phase] * 1000,
    );
    expect(s).toMatchObject({ phase: 'focus', remainingSeconds: 1500, running: false, completedFocusSessions: 4 });
  });

  it('skip from focus goes to a short break without counting the session', () => {
    expect(skip(running())).toMatchObject({ phase: 'shortBreak', running: false, completedFocusSessions: 0 });
  });

  it('skip from a break goes to focus', () => {
    expect(skip({ ...initialState(), phase: 'longBreak', completedFocusSessions: 4 })).toMatchObject({
      phase: 'focus',
      remainingSeconds: 1500,
      completedFocusSessions: 4,
    });
  });
});
