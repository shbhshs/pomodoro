import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { type Animation, HEAD_RADIUS, VIEW_BOX, geometryOf, poseAt } from '../src/motion';
import { theme } from '../src/theme';

const colors = theme.break;

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  animation: Animation;
}

/** A looping stick figure driven by the keyframes of `animation`, sized to the 300 high demo card. */
export default function StickFigure({ animation }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: animation.durationMs, easing: Easing.linear }),
      -1,
      false,
    );
  }, [animation, progress]);

  const bodyProps = useAnimatedProps(() => ({
    d: geometryOf(poseAt(animation, progress.value)).body,
  }));
  const headProps = useAnimatedProps(() => {
    const { head } = geometryOf(poseAt(animation, progress.value));
    return { cx: head.cx, cy: head.cy };
  });
  const faceProps = useAnimatedProps(() => ({
    d: geometryOf(poseAt(animation, progress.value)).face,
  }));

  const initial = geometryOf(poseAt(animation, 0));

  return (
    <Svg width={200} height={300} viewBox={VIEW_BOX}>
      <AnimatedPath
        testID="figure-body"
        d={initial.body}
        animatedProps={bodyProps}
        stroke={colors.accent}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <AnimatedCircle
        testID="figure-head"
        cx={initial.head.cx}
        cy={initial.head.cy}
        r={HEAD_RADIUS}
        animatedProps={headProps}
        stroke={colors.text}
        strokeWidth={6}
        fill="none"
      />
      <AnimatedPath
        d={initial.face}
        animatedProps={faceProps}
        stroke={colors.text}
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
