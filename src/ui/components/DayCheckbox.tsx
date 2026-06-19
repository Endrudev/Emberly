import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTranslation } from '@/i18n';
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

// Static checkbox (weekly grid). No toggle animation by design — the dense
// 7-per-row grid stays cheap to mount/scroll; the animated pop lives only on
// the single Today checkbox (TodayActivityRow).
function DayCheckboxImpl({
  day,
  completed,
  scheduled,
  isToday,
  color,
  disabled,
  onPress,
}: DayCheckboxProps) {
  const t = useTranslation();
  const label = t.days.abbr[day];

  // Border colour carries the meaning, not just opacity:
  // - completed  → filled, no border
  // - scheduled  → accent colour outline (this day is part of the plan)
  // - unscheduled → faint neutral gray outline (habit isn't set for this day),
  //   further dimmed by the Pressable's opacity below. Still tappable — a tap
  //   logs a "bonus" completion outside the plan.
  const boxBorder = completed ? color : scheduled ? color : '#E2E2E2';
  const boxBorderWidth = completed ? 0 : scheduled ? 1.5 : 1;

  const labelColor = isToday ? color : '#999999';

  return (
    <View style={[styles.container, isToday && { backgroundColor: `${color}14` }]}>
      {/* Day label */}
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

      {/* Circular checkbox */}
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed, disabled }}
        accessibilityLabel={`${t.days.long[day]}${completed ? `, ${t.home.completedLabel}` : ''}`}
        style={({ pressed }) => [
          { opacity: pressed ? 0.7 : scheduled || completed ? 1 : 0.7 },
        ]}
      >
        <View
          style={[
            styles.circle,
            {
              backgroundColor: completed ? color : 'transparent',
              borderColor: boxBorder,
              borderWidth: boxBorderWidth,
            },
          ]}
        >
          {completed ? <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" /> : null}
        </View>
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
    paddingVertical: 6,
    borderRadius: 16,
  },
  label: {
    fontSize: 10.5,
    lineHeight: 14,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
