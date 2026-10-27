import { DURATIONS, TimerState, displaySeconds, initialState, pause, reset, skip, start, tick } from '../src/timer';

const T0 = 1_000_000;
const running = (s: Partial<TimerState> = {}) => start({ ...initialState(), ...s }, T0);

describe('timer', () => {
  it('has the default initial state', () => {
    expect(initialState()).toMatchObject({
      phase: 'focus',
      remainingMs: 1_500_000,
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
    expect(displaySeconds(s)).toBe(900);
    expect(s.running).toBe(true);
  });

  it('tick does nothing when paused', () => {
    const s = initialState();
    expect(tick(s, T0 + 99999)).toBe(s);
  });

  it('pause freezes remaining time and resume continues from it', () => {
    const p = pause(running(), T0 + 60_000);
    expect(p).toMatchObject({ running: false, remainingMs: 1_440_000 });
    expect(tick(p, T0 + 999_999).remainingMs).toBe(1_440_000);
    const resumed = start(p, T0 + 500_000);
    expect(displaySeconds(tick(resumed, T0 + 560_000))).toBe(1380);
  });

  it('pause is a no-op when not running', () => {
    const s = initialState();
    expect(pause(s, T0)).toBe(s);
  });

  it('pause after the phase ended counts the session, advances and freezes the new phase', () => {
    const s = pause(running(), T0 + DURATIONS.focus * 1000 + 5000);
    expect(s).toMatchObject({
      phase: 'shortBreak',
      remainingMs: 295_000,
      running: false,
      completedFocusSessions: 1,
      endsAt: null,
    });
  });

  it('pause keeps sub-second elapsed time, so quick pause/resume cycles count down', () => {
    let s = running();
    let now = T0;
    for (let i = 0; i < 20; i++) {
      now += 100;
      s = pause(s, now);
      expect(s.remainingMs).toBe(1_500_000 - (i + 1) * 100);
      s = start(s, now);
    }
    expect(displaySeconds(s)).toBe(1498);
  });

  it('reset restores the phase duration, stopped, keeping the session count', () => {
    const s = reset({ ...running({ phase: 'shortBreak', completedFocusSessions: 2 }), remainingMs: 10_000 });
    expect(s).toMatchObject({ phase: 'shortBreak', remainingMs: 300_000, running: false, completedFocusSessions: 2 });
  });

  it('reset while running clears endsAt', () => {
    expect(reset(running())).toMatchObject({ running: false, endsAt: null, remainingMs: 1_500_000 });
  });

  it('finishing focus moves to a short break and counts the session', () => {
    const s = tick(running(), T0 + DURATIONS.focus * 1000);
    expect(s).toMatchObject({ phase: 'shortBreak', remainingMs: 300_000, running: true, completedFocusSessions: 1 });
  });

  it('runs the full cycle automatically: 4 focus sessions, short breaks, then a long break', () => {
    let s = running();
    let now = T0;
    const seen: string[] = [];
    for (let i = 0; i < 8; i++) {
      seen.push(s.phase);
      now += DURATIONS[s.phase] * 1000;
      s = tick(s, now);
      expect(s.running).toBe(true);
    }
    expect(seen).toEqual([
      'focus', 'shortBreak', 'focus', 'shortBreak', 'focus', 'shortBreak', 'focus', 'longBreak',
    ]);
    expect(s.phase).toBe('focus');
    expect(s.completedFocusSessions).toBe(4);
  });

  it('carries late ticks into the next phase instead of losing time', () => {
    const s = tick(running(), T0 + DURATIONS.focus * 1000 + 700);
    expect(s).toMatchObject({ phase: 'shortBreak', remainingMs: 299_300 });
  });

  it('handles a long background gap by finishing the phase once', () => {
    const s = tick(running(), T0 + 10 * 60 * 60 * 1000);
    expect(s.phase).toBe('shortBreak');
    expect(s.completedFocusSessions).toBe(1);
    expect(s.remainingMs).toBe(300_000);
  });

  it('finishing the 4th focus session moves to a long break', () => {
    const s = tick(running({ completedFocusSessions: 3 }), T0 + DURATIONS.focus * 1000);
    expect(s).toMatchObject({ phase: 'longBreak', remainingMs: 900_000, completedFocusSessions: 4 });
  });

  it.each(['shortBreak', 'longBreak'] as const)('finishing a %s returns to focus', (phase) => {
    const s = tick(
      running({ phase, remainingMs: DURATIONS[phase] * 1000, completedFocusSessions: 4 }),
      T0 + DURATIONS[phase] * 1000,
    );
    expect(s).toMatchObject({ phase: 'focus', remainingMs: 1_500_000, running: true, completedFocusSessions: 4 });
  });

  it('skip from focus goes to a short break without counting the session', () => {
    expect(skip(running())).toMatchObject({ phase: 'shortBreak', running: false, completedFocusSessions: 0 });
  });

  it('skip from a break goes to focus', () => {
    expect(skip({ ...initialState(), phase: 'longBreak', completedFocusSessions: 4 })).toMatchObject({
      phase: 'focus',
      remainingMs: 1_500_000,
      completedFocusSessions: 4,
    });
  });
});
