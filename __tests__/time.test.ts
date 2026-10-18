import { formatTime } from '../src/time';

describe('formatTime', () => {
  it('formats a full focus session', () => {
    expect(formatTime(25 * 60)).toBe('25:00');
  });

  it('pads seconds', () => {
    expect(formatTime(65)).toBe('01:05');
  });

  it('clamps negative values to zero', () => {
    expect(formatTime(-3)).toBe('00:00');
  });
});
