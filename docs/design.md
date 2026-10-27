# Pomodoro design

Pomodoro is a focus timer plus a movement coach: a 25 minute focus window, then a break spent on guided desk exercises. The look is calm, dark and minimal. The mockups this was taken from are on the "Pomodoro design" canvas in the Claude app; this file is the source of truth for agents.

## Colours

Focus screen and settings use the warm palette; the movement break uses the cool one. Put these in one `src/theme.ts` and import from there; never write a hex value in a screen.

| Token | Value | Use |
| --- | --- | --- |
| `focus.background` | `#1B1412` | focus and settings background |
| `focus.surface` | `#2E2420` | progress ring track |
| `focus.border` | `#3A2E29` | dividers, card outlines |
| `focus.borderStrong` | `#5A4A42` | outlined buttons |
| `focus.text` | `#F6EFE9` | primary text |
| `focus.textMuted` | `#A89A90` | secondary text |
| `focus.accent` | `#E5533D` | primary button, progress ring |
| `focus.accentText` | `#F0715C` | accent used as text on the dark ground |
| `focus.onAccent` | `#1B1412` | text on the accent button |
| `break.background` | `#0F1B1A` | movement break background |
| `break.surface` | `#162826` | demo card |
| `break.track` | `#213532` | inactive progress segment |
| `break.border` | `#3B5651` | outlined buttons |
| `break.text` | `#EAF5F2` | primary text |
| `break.textBody` | `#B9D0CB` | step caption |
| `break.textMuted` | `#8FAAA5` | secondary text |
| `break.accent` | `#4FB3A5` | primary button, active segments, selected chips |
| `break.onAccent` | `#0F1B1A` | text on the accent button |

Text must keep at least 4.5:1 contrast on its background. Do not use white text on the focus accent; use `focus.onAccent`.

## Type

Font: DM Sans (`@expo-google-fonts/dm-sans`, weights 400, 500, 700). Numbers use tabular figures.

| Role | Size / weight |
| --- | --- |
| Timer digits | 80 / 500 |
| Exercise countdown | 56 / 500 |
| Screen title, exercise name | 30 / 700 |
| Phase label (uppercase, letter spacing 0.12em) | 18 / 700 |
| Body, buttons, list rows | 18 / 400 to 700 |
| Secondary text | 14 to 16 / 400 to 500 |
| Section label (uppercase) | 13 / 700 |

## Spacing and shape

- Screen padding 28 horizontally; content spaced in steps of 8.
- Buttons and chips are pills: height 56 for the main buttons, 44 for chips and round icon buttons. Every touch target is at least 44.
- Cards use a corner radius of 20 to 28.
- Dark only in version 1; no light theme.

## Screens

1. **Focus.** Top row: "Session N of 4" (muted) and a settings icon button. Phase label ("FOCUS") in `focus.accentText`. A 300 pt progress ring with the remaining time inside, `mm:ss`. Below it, "Next: a 5 minute movement break". Buttons: a wide Pause/Start button in the accent and an outlined Reset. At the bottom a stats card with three figures: focus sessions, focus minutes, movement breaks.
2. **Movement break.** Uses the cool palette. Top row: "MOVEMENT BREAK" label and "N of 5". Under it a row of five progress segments. A demo card (300 high) holds the animated stick figure. Then the exercise name, the step text as a caption, and the exercise countdown with a note such as "left, 1 of 2 sides". Buttons: wide "Next exercise" in the accent and an outlined "Skip break". Footer line: "Stop if anything hurts."
3. **Settings** (a modal). Title and a Done button. A "Durations" list with rows for focus, short break, long break and sessions before a long break, each with a minus button, the value and a plus button. A "Movement breaks include" group of chips for neck, shoulders, back, arms and wrists, and legs; selected chips use the cool accent, and at least one stays selected.

## Rules for agents

- Read this file before any UI change and follow it; do not invent colours, sizes or layouts.
- Use only tokens from `src/theme.ts`. If a design need has no token, add one to the table above in the same PR.
- Icon-only buttons need an accessibility label. Animated or decorative graphics are hidden from screen readers unless they carry meaning, and then they get a label.
- State the screen you changed in the PR description.
