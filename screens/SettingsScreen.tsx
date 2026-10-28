import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BODY_PARTS, type BodyPart } from '../src/exercises';
import {
  MAX_MINUTES,
  MIN_MINUTES,
  step,
  toggleBodyPart,
  type NumberKey,
  type Settings,
} from '../src/settings';
import { theme } from '../src/theme';

const colors = theme.focus;
const chipColors = theme.break;

const PART_LABELS: Record<BodyPart, string> = {
  neck: 'Neck',
  shoulders: 'Shoulders',
  back: 'Back',
  arms: 'Arms and wrists',
  legs: 'Legs',
};

const ROWS: { key: NumberKey; label: string; unit: string }[] = [
  { key: 'focusMinutes', label: 'Focus', unit: ' min' },
  { key: 'shortBreakMinutes', label: 'Short break', unit: ' min' },
  { key: 'longBreakMinutes', label: 'Long break', unit: ' min' },
  { key: 'sessionsBeforeLongBreak', label: 'Sessions before long break', unit: '' },
];

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onDone: () => void;
}

export default function SettingsScreen({ settings, onChange, onDone }: Props) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Settings
        </Text>
        <Pressable accessibilityRole="button" style={styles.done} onPress={onDone}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>DURATIONS</Text>
      <View style={styles.list}>
        {ROWS.map(({ key, label, unit }) => (
          <View key={key} style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <RoundButton
              symbol="−"
              label={`Decrease ${label.toLowerCase()}`}
              disabled={settings[key] <= MIN_MINUTES}
              onPress={() => onChange(step(settings, key, -1))}
            />
            <Text style={styles.value} accessibilityLabel={`${label} value`}>
              {settings[key]}
              {unit}
            </Text>
            <RoundButton
              symbol="+"
              label={`Increase ${label.toLowerCase()}`}
              disabled={settings[key] >= MAX_MINUTES}
              onPress={() => onChange(step(settings, key, 1))}
            />
          </View>
        ))}
      </View>

      <Text style={[styles.section, styles.sectionGap]}>MOVEMENT BREAKS INCLUDE</Text>
      <View style={styles.chips}>
        {BODY_PARTS.map((part) => {
          const selected = settings.bodyParts.includes(part);
          return (
            <Pressable
              key={part}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onChange(toggleBodyPart(settings, part))}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {PART_LABELS[part]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.note}>At least one body part stays on.</Text>
    </ScrollView>
  );
}

function RoundButton({
  symbol,
  label,
  disabled,
  onPress,
}: {
  symbol: string;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={[styles.round, disabled && styles.disabled]}
      onPress={onPress}>
      <Text style={styles.roundText}>{symbol}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 28, paddingTop: 56, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  title: { color: colors.text, fontSize: 30, fontWeight: '700' },
  done: {
    minHeight: 44,
    paddingHorizontal: 24,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { color: colors.text, fontSize: 18 },
  section: { color: colors.textMuted, fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
  sectionGap: { marginTop: 40 },
  list: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { flex: 1, color: colors.text, fontSize: 18 },
  value: {
    minWidth: 64,
    textAlign: 'center',
    color: colors.text,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  roundText: { color: colors.text, fontSize: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: chipColors.accent, borderColor: chipColors.accent },
  chipText: { color: colors.text, fontSize: 18 },
  chipTextSelected: { color: chipColors.onAccent, fontWeight: '700' },
  note: { color: colors.textMuted, fontSize: 16, marginTop: 16 },
});
