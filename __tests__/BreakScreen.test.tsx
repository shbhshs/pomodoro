import { render, screen } from '@testing-library/react-native';

import BreakScreen from '../screens/BreakScreen';
import { EXERCISES } from '../src/exercises';

const mockMounts: string[] = [];

// Stands in for the figure to count how often it is mounted.
jest.mock('../components/StickFigure', () => {
  const { useEffect: useMountEffect } = jest.requireActual('react');
  return {
    __esModule: true,
    default: () => {
      useMountEffect(() => {
        mockMounts.push('mount');
      }, []);
      return null;
    },
  };
});

const routine = [EXERCISES[0], EXERCISES[1]];
const noop = () => {};
const props = { routine, onNext: noop, onSkipBreak: noop };

beforeEach(() => {
  mockMounts.length = 0;
});

describe('BreakScreen demo card', () => {
  it('hides the figure from accessibility', async () => {
    await render(<BreakScreen {...props} elapsedMs={0} />);
    const card = screen.getByTestId('demo-card', { includeHiddenElements: true });
    expect(card.props.accessibilityElementsHidden).toBe(true);
    expect(card.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('remounts the figure with the next exercise when the exercise changes', async () => {
    const { rerender } = await render(<BreakScreen {...props} elapsedMs={0} />);
    expect(mockMounts).toHaveLength(1);
    await rerender(<BreakScreen {...props} elapsedMs={1000} />);
    expect(mockMounts).toHaveLength(1);
    await rerender(<BreakScreen {...props} elapsedMs={routine[0].durationSeconds * 1000} />);
    expect(mockMounts).toHaveLength(2);
  });
});
