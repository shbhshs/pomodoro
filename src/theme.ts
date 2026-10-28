/** Colour tokens from docs/design.md. Screens import from here; no hex values elsewhere. */
export const theme = {
  focus: {
    background: '#1B1412',
    border: '#3A2E29',
    borderStrong: '#5A4A42',
    text: '#F6EFE9',
    textMuted: '#A89A90',
  },
  break: {
    background: '#0F1B1A',
    surface: '#162826',
    track: '#213532',
    border: '#3B5651',
    text: '#EAF5F2',
    textBody: '#B9D0CB',
    textMuted: '#8FAAA5',
    accent: '#4FB3A5',
    onAccent: '#0F1B1A',
  },
} as const;
