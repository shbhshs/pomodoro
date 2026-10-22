import { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import App from '../App';

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

  it('resets to the full duration and stops', async () => {
    await render(<App />);
    await fireEvent.press(screen.getByText('Start'));
    await advance(4000);
    await fireEvent.press(screen.getByText('Reset'));
    expect(time()).toHaveTextContent('25:00');
    expect(screen.getByText('Start')).toBeTruthy();
  });
});
