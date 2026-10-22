import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatTime } from './src/time';
import { displaySeconds, initialState, pause, reset, start, tick, type Phase } from './src/timer';

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

  const toggle = () =>
    setState((s) => (s.running ? pause(s, Date.now()) : start(s, Date.now())));

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{LABELS[state.phase]}</Text>
      <Text style={styles.time} accessibilityLabel="time remaining">
        {formatTime(displaySeconds(state))}
      </Text>
      <View style={styles.buttons}>
        <Pressable accessibilityRole="button" style={styles.button} onPress={toggle}>
          <Text style={styles.buttonText}>{state.running ? 'Pause' : 'Start'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          onPress={() => setState((s) => reset(s))}>
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
