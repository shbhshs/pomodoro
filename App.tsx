import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle } from 'react-native-svg';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import BreakScreen from './screens/BreakScreen';
import SettingsScreen from './screens/SettingsScreen';
import { playCue, shouldCue } from './src/cue';
import { buildRoutine } from './src/exercises';
import { schedulePhaseEnd } from './src/notifications';
import { nextBreakMinutes, phaseProgress, sessionNumber } from './src/progress';
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
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [state, setState] = useState(() => initialState(DEFAULT_SETTINGS));
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Nothing is shown until the saved settings are in, so the timer never runs
  // with lengths that later change under it and the user cannot edit before
  // the load finishes.
  useEffect(() => {
    let cancelled = false;
    void loadSettings().then((saved) => {
      if (cancelled) return;
      setSettings(saved);
      setState((s) => reset(s, saved));
      setSettingsLoaded(true);
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
    if (completed) setStats((s) => record(s, completed, prev.endsAt ?? Date.now(), settingsRef.current));
    // Only a new timer state is a completion; later settings changes are not.
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

  if (!settingsLoaded) return null;

  const progress = phaseProgress(state, settings);
  const next =
    state.phase === 'focus'
      ? `Next: a ${nextBreakMinutes(state, settings)} minute movement break`
      : 'Next: a focus session';

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.session}>
          Session {sessionNumber(state, settings)} of {settings.sessionsBeforeLongBreak}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={styles.iconButton}
          onPress={() => setShowSettings(true)}>
          <Text style={styles.iconText}>⚙</Text>
        </Pressable>
      </View>
      <Text style={styles.label}>{LABELS[state.phase]}</Text>
      <View style={styles.ring}>
        <Svg width={RING_SIZE} height={RING_SIZE} importantForAccessibility="no-hide-descendants">
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={theme.focus.surface}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={theme.focus.accent}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={[RING_CIRCUMFERENCE * progress, RING_CIRCUMFERENCE]}
            rotation={-90}
            origin={[RING_SIZE / 2, RING_SIZE / 2].join(', ')}
          />
        </Svg>
        <Text style={styles.time} accessibilityLabel="time remaining">
          {formatTime(displaySeconds(state))}
        </Text>
      </View>
      <Text style={styles.next}>{next}</Text>
      {state.phase !== 'focus' && (
        <BreakScreen
          routine={routine}
          elapsedMs={routineElapsedMs(state, settings)}
          onNext={() => setState((s) => nextExercise(s, routine, Date.now(), settings))}
          onSkipBreak={() => setState((s) => skip(s, settings))}
        />
      )}
      <View style={styles.buttons}>
        <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={toggle}>
          <Text style={styles.primaryText}>{state.running ? 'Pause' : 'Start'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.outlineButton}
          onPress={() => setState((s) => reset(s, settings))}>
          <Text style={styles.outlineText}>Reset</Text>
        </Pressable>
      </View>
      <View style={styles.stats} accessibilityLabel="today stats">
        <Stat value={today.focusSessions} label="Focus sessions" />
        <Stat value={today.focusMinutes} label="Focus minutes" />
        <Stat value={today.exerciseSessions} label="Exercise sessions" />
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

const RING_SIZE = 300;
const RING_STROKE = 12;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.focus.background,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 64,
    paddingBottom: 32,
    gap: 8,
  },
  topRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  session: { color: theme.focus.textMuted, fontSize: 16 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.focus.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { color: theme.focus.text, fontSize: 20 },
  label: {
    color: theme.focus.accentText,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2.16,
    textTransform: 'uppercase',
    marginTop: 16,
  },
  ring: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  time: {
    position: 'absolute',
    color: theme.focus.text,
    fontSize: 80,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  next: { color: theme.focus.textMuted, fontSize: 16, marginTop: 8 },
  buttons: { alignSelf: 'stretch', flexDirection: 'row', gap: 16, marginTop: 16 },
  primaryButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.focus.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: theme.focus.onAccent, fontSize: 18, fontWeight: '700' },
  outlineButton: {
    height: 56,
    paddingHorizontal: 32,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.focus.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: { color: theme.focus.text, fontSize: 18, fontWeight: '500' },
  stats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: 'auto',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.focus.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: {
    color: theme.focus.text,
    fontSize: 30,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: { color: theme.focus.textMuted, fontSize: 14, textAlign: 'center' },
});
