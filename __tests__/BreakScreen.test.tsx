import { render, screen } from '@testing-library/react-native';

import BreakScreen from '../screens/BreakScreen';
import { EXERCISES, type Exercise } from '../src/exercises';
import { ANIMATIONS, geometryOf, poseAt } from '../src/motion';

const mockMounts: string[] = [];

// Wraps the real figure to count how often it is mounted.
jest.mock('../components/StickFigure', () => {
  const Actual = jest.requireActual('../components/StickFigure').default;
  const { useEffect: useMountEffect } = jest.requireActual('react');
  return {
    __esModule: true,
    default: (props: { animation: unknown }) => {
      useMountEffect(() => {
        mockMounts.push('mount');
      }, []);
      return <Actual {...props} />;
    },
  };
});

const routine = [EXERCISES[0], EXERCISES[1]];
const noop = () => {};
const props = { routine, onNext: noop, onSkipBreak: noop };
const firstBody = (exercise: Exercise) =>
  geometryOf(poseAt(ANIMATIONS[exercise.illustration], 0)).body;
const renderedBody = () =>
  screen.getByTestId('figure-body', { includeHiddenElements: true }).props.d;

beforeEach(() => {
  mockMounts.length = 0;
});

describe('BreakScreen demo card', () => {
  it("renders the current exercise's figure from its first pose", async () => {
    await render(<BreakScreen {...props} elapsedMs={0} />);
    expect(renderedBody()).toBe(firstBody(routine[0]));
  });

  it('hides the figure from accessibility', async () => {
    await render(<BreakScreen {...props} elapsedMs={0} />);
    const card = screen.getByTestId('demo-card', { includeHiddenElements: true });
    expect(card.props.accessibilityElementsHidden).toBe(true);
    expect(card.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(screen.queryByTestId('figure-body')).toBeNull();
  });

  it('remounts the figure with the next exercise when the exercise changes', async () => {
    const { rerender } = await render(<BreakScreen {...props} elapsedMs={0} />);
    expect(mockMounts).toHaveLength(1);
    await rerender(<BreakScreen {...props} elapsedMs={1000} />);
    expect(mockMounts).toHaveLength(1);
    await rerender(<BreakScreen {...props} elapsedMs={routine[0].durationSeconds * 1000} />);
    expect(mockMounts).toHaveLength(2);
    expect(renderedBody()).toBe(firstBody(routine[1]));
  });
});
