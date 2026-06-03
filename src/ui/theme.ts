import { configureFonts, MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

// ── Font families (loaded via @expo-google-fonts/dm-sans) ───────────────────
export const FONTS = {
  semiBold:  'DMSans_600SemiBold',
  bold:      'DMSans_700Bold',
  extraBold: 'DMSans_800ExtraBold',
} as const;

// ── Design tokens ──────────────────────────────────────────────────────────────
export const COLORS = {
  primary: '#2DB54A',
  primaryLight: '#E8F7EB',
  background: '#ECEDE8',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#EFEFEF',
  error: '#FF4444',
  orange: '#FF8C42',
  orangeLight: '#FFF0E8',
} as const;

// Base font config — sets DM Sans SemiBold as default for all Paper Text variants
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const paperFontConfig = { fontFamily: FONTS.semiBold } as any;

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: paperFontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    secondary: '#625B71',
    tertiary: '#7D5260',
    background: COLORS.background,
    surface: COLORS.surface,
    error: COLORS.error,
  },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  fonts: configureFonts({ config: paperFontConfig }),
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#4ECC66',
    secondary: '#CCC2DC',
    tertiary: '#EFB8C8',
    background: '#121212',
    surface: '#1E1E1E',
    error: '#FF6B6B',
  },
};

// ── Activity colour palette ─────────────────────────────────────────────────
// Each entry: { accent: vivid hex, pastel: card-background tint }
export const activityPalette = [
  { accent: '#4AABF5', pastel: '#E8F4FE' }, // blue
  { accent: '#FF8C42', pastel: '#FFF0E8' }, // orange
  { accent: '#9B7FFF', pastel: '#F0EEFF' }, // purple
  { accent: '#FF6B9D', pastel: '#FFE8F4' }, // pink
  { accent: '#2DB54A', pastel: '#E8F7EB' }, // green
  { accent: '#FFB800', pastel: '#FFF8E0' }, // yellow
  { accent: '#FF5555', pastel: '#FFE8E8' }, // red
  { accent: '#14B8A6', pastel: '#E0F7F5' }, // teal
  { accent: '#F97316', pastel: '#FEF0E8' }, // deep orange
  { accent: '#A855F7', pastel: '#F5EEFF' }, // violet
  { accent: '#06B6D4', pastel: '#E0F5FA' }, // cyan
  { accent: '#64748B', pastel: '#F0F2F5' }, // slate
] as const;

/** Backward-compat: flat list of accent colours (used in ActivityForm picker). */
export const activityColors = activityPalette.map((p) => p.accent) as string[];

/** Map accent → pastel (includes legacy colours from before the redesign). */
const PASTEL_MAP: Record<string, string> = {
  ...Object.fromEntries(activityPalette.map((p) => [p.accent, p.pastel])),
  // legacy colours that may already exist in user DBs
  '#EF4444': '#FFE8E8',
  '#F59E0B': '#FFF8E8',
  '#FBBF24': '#FFFBE8',
  '#10B981': '#E8FBF4',
  '#06B6D4': '#E0F8FC',
  '#3B82F6': '#EBF3FF',
  '#6366F1': '#EEEEFF',
  '#8B5CF6': '#F0EBFF',
  '#EC4899': '#FDE8F4',
  '#84CC16': '#F0FBE0',
};

export function getPastelColor(accent: string): string {
  return PASTEL_MAP[accent] ?? '#F5F5F5';
}

export type ActivityColor = (typeof activityColors)[number];
