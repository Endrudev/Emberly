import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { DayCheckbox } from './DayCheckbox';
import type { Activity, DayOfWeek } from '@/domain/types';
import { ALL_DAYS } from '@/domain/types';

interface ActivityRowProps {
  activity: Activity;
  weekDates: readonly string[]; // 7 ISO dates po..ne
  todayIso: string;
  completedByDate: ReadonlySet<string>; // ISO data, kdy je tato aktivita splněná
  onTogglePress: (dateIso: string) => void;
  onLongPress?: () => void;
}

function ActivityRowImpl({
  activity,
  weekDates,
  todayIso,
  completedByDate,
  onTogglePress,
  onLongPress,
}: ActivityRowProps) {
  const theme = useTheme();
  const scheduledSet = new Set(activity.scheduledDays);

  return (
    <Pressable
      onLongPress={onLongPress}
      android_ripple={{ color: theme.colors.surfaceVariant }}
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
    >
      <View style={[styles.colorStripe, { backgroundColor: activity.color }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="titleMedium" style={{ marginRight: 8 }}>
            {activity.emoji}
          </Text>
          <Text variant="titleMedium" numberOfLines={1} style={{ flex: 1 }}>
            {activity.name}
          </Text>
        </View>
        <View style={styles.days}>
          {ALL_DAYS.map((day: DayOfWeek) => {
            const dateIso = weekDates[day];
            if (!dateIso) return null;
            const scheduled = scheduledSet.has(day);
            const completed = completedByDate.has(dateIso);
            return (
              <DayCheckbox
                key={day}
                day={day}
                color={activity.color}
                completed={completed}
                scheduled={scheduled}
                isToday={dateIso === todayIso}
                onPress={() => onTogglePress(dateIso)}
              />
            );
          })}
        </View>
      </View>
    </Pressable>
  );
}

export const ActivityRow = memo(ActivityRowImpl);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    marginVertical: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
    elevation: 1,
  },
  colorStripe: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  days: {
    flexDirection: 'row',
  },
});
