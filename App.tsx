import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import BreakScreen from './screens/BreakScreen';
import SettingsScreen from './screens/SettingsScreen';
import { playCue, shouldCue } from './src/cue';
import { buildRoutine } from './src/exercises';
import { schedulePhaseEnd } from './src/notifications';
import { nextExercise, positionAt, routineElapsedMs } from './src/session';
import { DEFAULT_SETTINGS, type Settings } from './src/settings';
import { loadSettings, saveSettings } from './src/settingsStorage';
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
  displaySeconds,
  durationsFor,
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
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [state, setState] = useState(() => initialState(DEFAULT_SETTINGS));

  // A phase that has not started yet picks up the saved lengths; one already
  // running keeps going with the lengths it started with.
  useEffect(() => {
    let cancelled = false;
    void loadSettings().then((saved) => {
      if (cancelled) return;
      setSettings(saved);
      setState((s) => (s.running ? s : reset(s, saved)));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Changing a length restarts the current phase at its new length, stopped.
  // Other changes (body parts, session count) leave the timer alone.
  const changeSettings = (next: Settings) => {
    setSettings(next);
    void saveSettings(next);
    if (durationsFor(next)[state.phase] !== durationsFor(settings)[state.phase]) {
      setState((s) => reset(s, next));
    }
  };

  useEffect(() => {
    if (!state.running) return;
    const id = setInterval(() => setState((s) => tick(s, Date.now(), settings)), 1000);
    return () => clearInterval(id);
  }, [state.running, settings]);

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
    if (completed) setStats((s) => record(s, completed, prev.endsAt ?? Date.now(), settings));
    // Only a new timer state is a completion; later settings changes are not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (statsLoaded.current) void saveStats(stats);
  }, [stats]);

  // Only forces a re-render at local midnight and when the app returns to the
  // foreground, so an idle screen does not keep showing yesterday's numbers.
  // Its value is never read; the day always comes from Date.now().
  const [dayTick, setDayTick] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setDayTick((n) => n + 1), msUntilNextDay(Date.now()) + 50);
    return () => clearTimeout(id);
  }, [dayTick]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') setDayTick((n) => n + 1);
    });
    return () => sub.remove();
  }, []);

  const today = statsForDay(stats, Date.now());

  const routine = useMemo(
    () =>
      state.phase === 'focus'
        ? []
        : buildRoutine(durationsFor(settings)[state.phase], settings.bodyParts),
    [state.phase, settings],
  );

  // One cue per phase change, and one per move forward to the next exercise
  // (timed or by "Next exercise"). Reset going back to the first does not cue.
  const exerciseIndex =
    state.phase === 'focus' ? 0 : positionAt(routine, routineElapsedMs(state, settings)).index;
  const lastCued = useRef({ phase: state.phase, exerciseIndex });
  useEffect(() => {
    const last = lastCued.current;
    lastCued.current = { phase: state.phase, exerciseIndex };
    if (shouldCue(last, { phase: state.phase, exerciseIndex })) playCue();
  }, [state.phase, exerciseIndex]);

  const toggle = () =>
    setState((s) => (s.running ? pause(s, Date.now(), settings) : start(s, Date.now())));

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{LABELS[state.phase]}</Text>
      <Text style={styles.time} accessibilityLabel="time remaining">
        {formatTime(displaySeconds(state))}
      </Text>
      {state.phase !== 'focus' && (
        <BreakScreen
          routine={routine}
          elapsedMs={routineElapsedMs(state, settings)}
          onNext={() => setState((s) => nextExercise(s, routine, Date.now(), settings))}
          onSkipBreak={() => setState((s) => skip(s, settings))}
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
          onPress={() => setState((s) => reset(s, settings))}>
          <Text style={styles.buttonText}>Reset</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={styles.button}
          onPress={() => setShowSettings(true)}>
          <Text style={styles.buttonText}>⚙</Text>
        </Pressable>
      </View>
      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSettings(false)}>
        <SettingsScreen
          settings={settings}
          onChange={changeSettings}
          onDone={() => setShowSettings(false)}
        />
      </Modal>
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
