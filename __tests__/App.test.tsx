import { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import App from '../App';
import BreakScreen from '../screens/BreakScreen';

const time = () => screen.getByLabelText('time remaining');

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

describe('App', () => {
  beforeEach(() =>
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }),
  );
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

    it('renders nothing for an empty routine', async () => {
      await render(<BreakScreen routine={[]} elapsedMs={0} onSkipBreak={() => {}} />);
      expect(screen.queryByText('MOVEMENT BREAK')).toBeNull();
    });

    it('Skip break returns to focus', async () => {
      await startBreak();
      await fireEvent.press(screen.getByText('Skip break'));
      expect(screen.getByText('Focus')).toBeTruthy();
      expect(screen.queryByText('MOVEMENT BREAK')).toBeNull();
    });
  });
});
