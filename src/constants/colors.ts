/**
 * SameSalt palette — iOS system colors, light appearance.
 *
 * One tint (blue) for anything tappable, green only for money saved, red only
 * for safety. Everything else is the grouped-background grays.
 */
export const Colors = {
  // Tint
  tint: '#007AFF',
  tintSoft: '#E5F0FF',

  // Meaning
  green: '#34C759',
  greenDeep: '#248A3D',
  greenSoft: '#E8F8EC',
  red: '#FF3B30',
  redDeep: '#C4281C',
  redSoft: '#FFEBEA',
  orange: '#FF9500',
  orangeSoft: '#FFF4E5',

  // Surfaces
  background: '#F2F2F7', // systemGroupedBackground
  card: '#FFFFFF', // secondarySystemGroupedBackground
  fill: '#E9E9EE', // search fields, chips
  separator: '#C6C6C8',
  hairline: 'rgba(60,60,67,0.18)',

  // Text
  label: '#000000',
  secondaryLabel: 'rgba(60,60,67,0.6)',
  tertiaryLabel: 'rgba(60,60,67,0.3)',

  white: '#FFFFFF',
  black: '#000000',

  // --- Legacy names, mapped onto the system palette so screens that still
  // reference them render in the new style.
  teal50: '#F2F2F7',
  teal100: '#E5F0FF',
  teal200: '#C7DEFF',
  teal300: '#99C4FF',
  teal400: '#5AA5FF',
  teal500: '#2E8CFF',
  teal600: '#007AFF',
  teal700: '#007AFF',
  teal800: '#000000',
  teal900: '#000000',
  amber50: '#FFF4E5',
  amber100: '#FFF4E5',
  amber400: '#FF9500',
  amber500: '#FF9500',
  amber600: '#C93400',
  success: '#248A3D',
  warning: '#FF9500',
  error: '#FF3B30',
  ntiRed: '#C4281C',
  gray50: '#F2F2F7',
  gray100: '#E9E9EE',
  gray200: '#D1D1D6',
  gray300: '#C7C7CC',
  gray400: '#AEAEB2',
  gray500: '#8E8E93',
  gray600: '#636366',
  gray700: '#48484A',
  gray800: '#3A3A3C',
  gray900: '#1C1C1E',
  janAushadhi: '#007AFF',
  border: 'rgba(60,60,67,0.18)',
  textPrimary: '#000000',
  textSecondary: 'rgba(60,60,67,0.6)',
  textMuted: 'rgba(60,60,67,0.3)',
} as const;
