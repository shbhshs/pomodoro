import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Exercise } from '../src/exercises';
import {
  currentExercise,
  exerciseSeconds,
  nextExercise,
  startSession,
  tickSession,
} from '../src/session';
import { theme } from '../src/theme';
import { formatTime } from '../src/time';

const colors = theme.break;

interface Props {
  routine: Exercise[];
  onSkipBreak: () => void;
}

export default function BreakScreen({ routine, onSkipBreak }: Props) {
  const [session, setSession] = useState(() => startSession(routine, Date.now()));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setSession((s) => tickSession(s, t));
      setNow(t);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const exercise = currentExercise(session);
  const onNext = () => {
    const t = Date.now();
    setSession((s) => nextExercise(s, t));
    setNow(t);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>MOVEMENT BREAK</Text>
        <Text style={styles.muted}>
          {session.index + 1} of {session.routine.length}
        </Text>
      </View>
      <View style={styles.segments}>
        {session.routine.map((e, i) => (
          <View key={i} style={[styles.segment, i <= session.index && styles.segmentActive]} />
        ))}
      </View>
      <View
        testID="illustration"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.demo}
      />
      <Text style={styles.name}>{exercise.name}</Text>
      <View>
        {exercise.steps.map((step, i) => (
          <Text key={i} style={styles.step}>
            {i + 1}. {step}
          </Text>
        ))}
      </View>
      <Text style={styles.countdown} accessibilityLabel="exercise time remaining">
        {formatTime(exerciseSeconds(session, now))}
      </Text>
      <Pressable accessibilityRole="button" style={styles.primary} onPress={onNext}>
        <Text style={styles.primaryText}>Next exercise</Text>
      </Pressable>
      <Pressable accessibilityRole="button" style={styles.outlined} onPress={onSkipBreak}>
        <Text style={styles.outlinedText}>Skip break</Text>
      </Pressable>
      <Text style={styles.muted}>Stop if anything hurts.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    backgroundColor: colors.background,
    paddingHorizontal: 28,
    gap: 8,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: colors.accent, fontSize: 18, fontWeight: '700', letterSpacing: 2 },
  muted: { color: colors.textMuted, fontSize: 14 },
  segments: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.track },
  segmentActive: { backgroundColor: colors.accent },
  demo: { height: 300, borderRadius: 28, backgroundColor: colors.surface },
  name: { color: colors.text, fontSize: 30, fontWeight: '700' },
  step: { color: colors.textBody, fontSize: 18 },
  countdown: {
    color: colors.text,
    fontSize: 56,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  primary: {
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: colors.onAccent, fontSize: 18, fontWeight: '700' },
  outlined: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlinedText: { color: colors.text, fontSize: 18, fontWeight: '700' },
});
