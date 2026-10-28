// Reanimated needs a native runtime, so Jest gets a minimal stand-in. The motion maths
// lives in src/motion.ts and is tested directly; this only lets components render.
// The official `react-native-reanimated/mock` does not load here: Reanimated 4.7 fails with
// "setCSSEventHandler is not available in JSReanimated" even with the worklets mock.
jest.mock('react-native-reanimated', () => {
  const identity = (component: unknown) => component;
  return {
    __esModule: true,
    default: { createAnimatedComponent: identity },
    Easing: { linear: (t: number) => t },
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedProps: (updater: () => object) => updater(),
    withRepeat: jest.fn((animation: unknown) => animation),
    withTiming: jest.fn((to: unknown) => to),
  };
});
