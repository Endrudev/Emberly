import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { t } from '@/i18n/cs';
import type { DayOfWeek } from '@/domain/types';

interface DayCheckboxProps {
  day: DayOfWeek;
  completed: boolean;
  scheduled: boolean;
  isToday: boolean;
  /** Barva aktivity, použitá pro splněné/scheduled stav. */
  color: string;
  disabled?: boolean;
  onPress: () => void;
}

function DayCheckboxImpl({
  day,
  completed,
  scheduled,
  isToday,
  color,
  disabled,
  onPress,
}: DayCheckboxProps) {
  const theme = useTheme();

  const borderColor = scheduled ? color : theme.colors.outlineVariant;
  const backgroundColor = completed ? color : 'transparent';
  const iconColor = completed
    ? theme.dark
      ? theme.colors.onSurface
      : '#fff'
    : theme.colors.onSurfaceVariant;

  const label = t.days.short[day];

  return (
    <View style={styles.container}>
      <Text
        variant="labelSmall"
        style={{
          color: isToday ? theme.colors.primary : theme.colors.onSurfaceVariant,
          fontWeight: isToday ? '700' : '400',
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed, disabled }}
        accessibilityLabel={`${t.days.long[day]}${completed ? ', splněno' : ''}`}
        style={({ pressed }) => [
          styles.box,
          {
            borderColor,
            backgroundColor,
            borderWidth: scheduled ? 2 : 1,
            opacity: pressed ? 0.7 : scheduled ? 1 : 0.5,
          },
        ]}
      >
        {completed ? <MaterialCommunityIcons name="check" size={18} color={iconColor} /> : null}
      </Pressable>
      {isToday ? <View style={[styles.todayDot, { backgroundColor: theme.colors.primary }]} /> : null}
    </View>
  );
}

export const DayCheckbox = memo(DayCheckboxImpl);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  box: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
});
