import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import BreakScreen from './screens/BreakScreen';
import { BODY_PARTS, buildRoutine } from './src/exercises';
import { skipAheadMs } from './src/session';
import { formatTime } from './src/time';
import {
  DURATIONS,
  displaySeconds,
  initialState,
  pause,
  reset,
  skip,
  start,
  tick,
  type Phase,
} from './src/timer';

const LABELS: Record<Phase, string> = {
  focus: 'Focus',
  shortBreak: 'Short break',
  longBreak: 'Long break',
};

export default function App() {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    if (!state.running) return;
    const id = setInterval(() => setState((s) => tick(s, Date.now())), 1000);
    return () => clearInterval(id);
  }, [state.running]);

  // Time jumped ahead by "Next exercise", valid only for the break it was made in.
  const [skipped, setSkipped] = useState({ key: '', ms: 0 });
  const breakKey = `${state.phase}-${state.completedFocusSessions}`;
  const skippedMs = skipped.key === breakKey ? skipped.ms : 0;
  const routine = useMemo(() => buildRoutine(DURATIONS[state.phase], BODY_PARTS), [state.phase]);

  const toggle = () =>
    setState((s) => (s.running ? pause(s, Date.now()) : start(s, Date.now())));

  const nextExercise = () => {
    // Refresh from the clock first, so the next exercise starts now rather
    // than up to a tick late.
    const fresh = tick(state, Date.now());
    setState(fresh);
    if (fresh.phase !== state.phase) return;
    const elapsed = DURATIONS[fresh.phase] * 1000 - fresh.remainingMs + skippedMs;
    setSkipped({ key: breakKey, ms: skippedMs + skipAheadMs(routine, elapsed) });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{LABELS[state.phase]}</Text>
      <Text style={styles.time} accessibilityLabel="time remaining">
        {formatTime(displaySeconds(state))}
      </Text>
      {state.phase !== 'focus' && (
        <BreakScreen
          routine={routine}
          elapsedMs={DURATIONS[state.phase] * 1000 - state.remainingMs + skippedMs}
          onNext={nextExercise}
          onSkipBreak={() => setState((s) => skip(s))}
        />
      )}
      <View style={styles.buttons}>
        <Pressable accessibilityRole="button" style={styles.button} onPress={toggle}>
          <Text style={styles.buttonText}>{state.running ? 'Pause' : 'Start'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          onPress={() => {
            setState((s) => reset(s));
            setSkipped({ key: '', ms: 0 });
          }}>
          <Text style={styles.buttonText}>Reset</Text>
        </Pressable>
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontSize: 20,
    color: '#555',
  },
  buttons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#222',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
  time: {
    fontSize: 72,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
