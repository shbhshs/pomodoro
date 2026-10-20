# Pomodoro backlog

One section per GitHub issue, in build order. Create them with `bin/seed-issues <owner/pomodoro> docs/backlog.md`; each gets the `agent` label.

## Timer engine in src/timer.ts

Add a pure, testable timer model in `src/timer.ts`: a state with `phase` (`focus` | `shortBreak` | `longBreak`), `remainingSeconds`, `running`, and `completedFocusSessions`. Export reducer-style functions `start`, `pause`, `reset`, `tick(now)` and `skip`. Compute remaining time from timestamps (start time + duration), not by counting ticks, so the timer stays correct when the app is backgrounded. Defaults: 25 min focus, 5 min short break, 15 min long break after every 4 focus sessions. Cover each transition with Jest tests.

## Start, pause and reset controls

Wire the timer engine into `App.tsx`: a large mm:ss display, a Start/Pause button and a Reset button. Tick once a second while running. Add a React Native Testing Library test that uses Jest fake timers to show the display counting down and pausing.

## Automatic focus and break cycle

When a phase reaches zero, move to the next phase automatically (focus, short break, and a long break after every 4th focus session) and show the phase name above the time. Use a different background colour for focus and breaks. Test the full cycle with fake timers.

## Haptic and sound cue at the end of a phase

When a phase ends, trigger a haptic with `expo-haptics` and play a short sound with `expo-audio`. Both ship in Expo Go. Mock them in tests and assert they are called once per phase change.

## Local notification when a phase ends in the background

Schedule a local notification with `expo-notifications` for the end of the current phase when the timer starts, and cancel it on pause or reset. Ask for notification permission the first time the user presses Start. Mock the module in tests.

## Settings for durations

Add a settings screen (Expo Router or a simple modal) to change focus, short break and long break lengths and the number of sessions before a long break. Persist them with `@react-native-async-storage/async-storage`. Validate input: whole minutes from 1 to 90.

## Today's stats

Count completed focus sessions per day and show today's count and total focus minutes under the timer. Persist with AsyncStorage and reset the count at local midnight. Test the date rollover with a mocked clock.

## App icon, splash screen and name

Replace the default Expo icon and splash with a simple tomato-red icon and set the display name to "Pomodoro" in `app.json`. Keep assets in `assets/`.
