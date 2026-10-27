// Reanimated needs a native runtime, so Jest gets a minimal stand-in. The motion maths
// lives in src/motion.ts and is tested directly; this only lets components render.
jest.mock('react-native-reanimated', () => {
  const identity = (component: unknown) => component;
  return {
    __esModule: true,
    default: { createAnimatedComponent: identity },
    Easing: { linear: (t: number) => t },
    cancelAnimation: () => undefined,
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedProps: (updater: () => object) => updater(),
    withRepeat: (animation: unknown) => animation,
    withTiming: (to: unknown) => to,
  };
});
