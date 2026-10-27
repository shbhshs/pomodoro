import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable,StyleSheet, Text, View } from 'react-native';

import BreakScreen from './screens/BreakScreen';
import { BODY_PARTS, buildRoutine } from './src/exercises';
import { schedulePhaseEnd } from './src/notifications';
import { nextExercise, routineElapsedMs } from './src/session';
import {
  completionBetween,
  emptyStats,
  loadStats,
  mergeStats,
  msUntilNextDay,
  record,
  saveStats,
  statsForDay,
} from './src/stats';
import { theme } from './src/theme';
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

  // One notification per running phase; pausing, resetting, skipping or the
  // phase rolling over changes endsAt and replaces it.
  useEffect(() => {
    if (!state.running || state.endsAt === null) return;
    const scheduled = schedulePhaseEnd(state.phase, state.endsAt).catch(() => null);
    return () => {
      void scheduled
        .then((id) => (id ? Notifications.cancelScheduledNotificationAsync(id) : undefined))
        .catch(() => undefined);
    };
  }, [state.running, state.endsAt, state.phase]);

  const [stats, setStats] = useState(() => emptyStats(Date.now()));
  const statsLoaded = useRef(false);
  const previous = useRef(state);

  useEffect(() => {
    let cancelled = false;
    void loadStats(Date.now()).then((saved) => {
      if (cancelled) return;
      // Keep anything completed while the saved stats were loading.
      setStats((current) => mergeStats(saved, current));
      statsLoaded.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Count a phase that ran to zero on the day it ended, even if the app only
  // noticed later.
  useEffect(() => {
    const prev = previous.current;
    previous.current = state;
    const completed = completionBetween(prev, state);
    if (completed) setStats((s) => record(s, completed, prev.endsAt ?? Date.now()));
  }, [state]);

  useEffect(() => {
    if (statsLoaded.current) void saveStats(stats);
  }, [stats]);

  // Re-render at local midnight and when the app returns to the foreground,
  // so an idle screen does not keep showing yesterday's numbers.
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const id = setTimeout(() => setClock(Date.now()), msUntilNextDay(clock) + 50);
    return () => clearTimeout(id);
  }, [clock]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') setClock(Date.now());
    });
    return () => sub.remove();
  }, []);

  const today = statsForDay(stats, Math.max(clock, Date.now()));

  const routine = useMemo(
    () => (state.phase === 'focus' ? [] : buildRoutine(DURATIONS[state.phase], BODY_PARTS)),
    [state.phase],
  );

  const toggle = () =>
    setState((s) => (s.running ? pause(s, Date.now()) : start(s, Date.now())));

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{LABELS[state.phase]}</Text>
      <Text style={styles.time} accessibilityLabel="time remaining">
        {formatTime(displaySeconds(state))}
      </Text>
      {state.phase !== 'focus' && (
        <BreakScreen
          routine={routine}
          elapsedMs={routineElapsedMs(state)}
          onNext={() => setState((s) => nextExercise(s, routine, Date.now()))}
          onSkipBreak={() => setState((s) => skip(s))}
        />
      )}
      <View style={styles.stats} accessibilityLabel="today stats">
        <Stat value={today.focusSessions} label="Focus sessions" />
        <Stat value={today.focusMinutes} label="Focus minutes" />
        <Stat value={today.exerciseSessions} label="Exercise sessions" />
      </View>
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

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginHorizontal: 28,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.focus.border,
    backgroundColor: theme.focus.background,
  },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: {
    color: theme.focus.text,
    fontSize: 30,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: { color: theme.focus.textMuted, fontSize: 14 },
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
