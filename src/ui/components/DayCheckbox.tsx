import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { t } from '@/i18n/cs';
import { FONTS } from '@/ui/theme';
import type { DayOfWeek } from '@/domain/types';

interface DayCheckboxProps {
  day: DayOfWeek;
  completed: boolean;
  scheduled: boolean;
  isToday: boolean;
  /** Accent colour of the parent activity. */
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
  const label = t.days.abbr[day];

  // Checkbox style:
  // - completed  → filled with accent colour, white check
  // - scheduled  → white with accent border
  // - unscheduled → light gray, thin border
  const boxBg = completed ? color : '#FFFFFF';
  const boxBorder = completed ? color : scheduled ? color : '#DDDDDD';
  const boxBorderWidth = completed ? 0 : scheduled ? 2 : 1;

  // Day label style
  const labelColor = isToday ? color : '#999999';
  const labelBg = isToday ? `${color}18` : 'transparent';

  return (
    <View style={styles.container}>
      {/* Day label */}
      <View style={[styles.labelWrap, { backgroundColor: labelBg }]}>
        <Text
          style={[
            styles.label,
            {
              color: labelColor,
              fontFamily: isToday ? FONTS.bold : FONTS.semiBold,
            },
          ]}
        >
          {label}
        </Text>
      </View>

      {/* Circular checkbox */}
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed, disabled }}
        accessibilityLabel={`${t.days.long[day]}${completed ? ', splněno' : ''}`}
        style={({ pressed }) => [
          styles.circle,
          {
            backgroundColor: boxBg,
            borderColor: boxBorder,
            borderWidth: boxBorderWidth,
            opacity: pressed ? 0.7 : scheduled || completed ? 1 : 0.45,
          },
        ]}
      >
        {completed ? (
          <MaterialCommunityIcons name="check" size={11} color="#FFFFFF" />
        ) : null}
      </Pressable>
    </View>
  );
}

export const DayCheckbox = memo(DayCheckboxImpl);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  labelWrap: {
    borderRadius: 8,
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  label: {
    fontSize: 10.5,
    lineHeight: 14,
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
