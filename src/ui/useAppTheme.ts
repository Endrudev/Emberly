/**
 * Shared colour tokens for all screens.
 * Reads the resolved dark/light flag from react-native-paper's PaperProvider
 * (which already handles 'system' | 'light' | 'dark' from useSettingsStore).
 */
import { useTheme } from 'react-native-paper';

export interface AppThemeColors {
  isDark: boolean;
  BG: string;
  surface: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  /** Light summary card background (stats/home) */
  summaryCardBg: string;
  /** Streak circle card background */
  circleCardBg: string;
  /** Progress bar track */
  progressTrack: string;
  /** Pressed state for list rows */
  rowPressed: string;
}

export function useAppTheme(): AppThemeColors {
  const { dark: isDark } = useTheme();
  return {
    isDark,
    BG:             isDark ? '#1C1C1E' : '#ECEDE8',
    surface:        isDark ? '#2C2C2E' : '#FFFFFF',
    text:           isDark ? '#F2F2F7' : '#1A1A1A',
    textSecondary:  isDark ? '#ABABAB' : '#666666',
    textTertiary:   isDark ? '#8E8E93' : '#999999',
    border:         isDark ? '#3A3A3C' : '#F0F0F0',
    summaryCardBg:  isDark ? 'rgba(45,181,74,0.15)' : '#E8F7EB',
    circleCardBg:   isDark ? '#2C2018'  : '#FFF7F0',
    progressTrack:  isDark ? '#3A3A3C' : '#EFEFEF',
    rowPressed:     isDark ? '#3A3A3C' : '#F8F8F8',
  };
}
