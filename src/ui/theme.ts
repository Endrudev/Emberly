import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

const sharedColors = {
  primary: '#6750A4',
  secondary: '#625B71',
  tertiary: '#7D5260',
};

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: sharedColors.primary,
    secondary: sharedColors.secondary,
    tertiary: sharedColors.tertiary,
  },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#D0BCFF',
    secondary: '#CCC2DC',
    tertiary: '#EFB8C8',
  },
};

export const activityColors = [
  '#EF4444', // red
  '#F59E0B', // amber
  '#FBBF24', // yellow
  '#10B981', // emerald
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#64748B', // slate
  '#84CC16', // lime
  '#14B8A6', // teal
] as const;

export type ActivityColor = (typeof activityColors)[number];
