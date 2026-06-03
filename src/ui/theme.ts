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
// Muted palette (S≈55-68 %, L≈48-58 %) — pleasant, non-garish badge colours.
// Each entry: { accent: badge bg, pastel: light card-background tint }
export const activityPalette = [
  { accent: '#4D8FC0', pastel: '#E5EFF7' }, // steel blue
  { accent: '#D97038', pastel: '#FAF0E5' }, // terracotta orange
  { accent: '#7862C8', pastel: '#ECEAF8' }, // dusty purple
  { accent: '#C45878', pastel: '#F8EAF0' }, // muted rose
  { accent: '#2DB54A', pastel: '#E8F7EB' }, // brand green
  { accent: '#C89020', pastel: '#FAF2E0' }, // golden amber
  { accent: '#C84848', pastel: '#F8E8E8' }, // soft red
  { accent: '#2A9882', pastel: '#E0F4F0' }, // sage teal
  { accent: '#CC6228', pastel: '#FAEDE5' }, // burnt sienna
  { accent: '#7840C0', pastel: '#EEE8F8' }, // plum violet
  { accent: '#1898AA', pastel: '#E0F2F6' }, // ocean cyan
  { accent: '#6A7898', pastel: '#ECEEF4' }, // blue-slate
] as const;

/** Backward-compat: flat list of accent colours (used in ActivityForm picker). */
export const activityColors = activityPalette.map((p) => p.accent) as string[];

/** Map accent → pastel (includes legacy colours from before the redesign). */
const PASTEL_MAP: Record<string, string> = {
  ...Object.fromEntries(activityPalette.map((p) => [p.accent, p.pastel])),
  // legacy v0.1 saturated palette (may exist in user DBs)
  '#4AABF5': '#E8F4FE',
  '#FF8C42': '#FFF0E8',
  '#9B7FFF': '#F0EEFF',
  '#FF6B9D': '#FFE8F4',
  '#FFB800': '#FFF8E0',
  '#FF5555': '#FFE8E8',
  '#14B8A6': '#E0F7F5',
  '#F97316': '#FEF0E8',
  '#A855F7': '#F5EEFF',
  '#06B6D4': '#E0F5FA',
  '#64748B': '#F0F2F5',
  // older legacy colours
  '#EF4444': '#FFE8E8',
  '#F59E0B': '#FFF8E8',
  '#FBBF24': '#FFFBE8',
  '#10B981': '#E8FBF4',
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
