import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { formatTime } from './src/time';

const FOCUS_SECONDS = 25 * 60;

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Focus</Text>
      <Text style={styles.time} accessibilityLabel="time remaining">
        {formatTime(FOCUS_SECONDS)}
      </Text>
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
  time: {
    fontSize: 72,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
