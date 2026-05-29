import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { DayCheckbox } from './DayCheckbox';
import type { Activity, DayOfWeek } from '@/domain/types';
import { ALL_DAYS } from '@/domain/types';
import { getPastelColor } from '@/ui/theme';
import { t } from '@/i18n/cs';

interface ActivityRowProps {
  activity: Activity;
  weekDates: readonly string[]; // 7 ISO dates Po..Ne
  todayIso: string;
  completedByDate: ReadonlySet<string>;
  currentStreak?: number; // number of consecutive completed scheduled days
  onTogglePress: (dateIso: string) => void;
  onLongPress?: () => void;
}

function ActivityRowImpl({
  activity,
  weekDates,
  todayIso,
  completedByDate,
  currentStreak = 0,
  onTogglePress,
  onLongPress,
}: ActivityRowProps) {
  const scheduledSet = useMemo(() => new Set(activity.scheduledDays), [activity.scheduledDays]);
  const pastelBg = getPastelColor(activity.color);

  // Sublabel: "Každý den" or abbreviated days
  const scheduleLabel = useMemo(() => {
    if (activity.scheduledDays.length === 7) return t.home.everyDay;
    return activity.scheduledDays.map((d) => t.days.short[d]).join(', ');
  }, [activity.scheduledDays]);

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={400}
      android_ripple={{ color: `${activity.color}22` }}
      style={[styles.card, { backgroundColor: pastelBg }]}
      accessibilityRole="button"
      accessibilityLabel={activity.name}
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        {/* Emoji bubble */}
        <View style={[styles.emojiBubble, { backgroundColor: `${activity.color}28` }]}>
          <Text style={styles.emoji}>{activity.emoji}</Text>
        </View>

        {/* Name + schedule */}
        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={1}>
            {activity.name}
          </Text>
          <Text style={styles.schedule}>{scheduleLabel}</Text>
        </View>

        {/* Streak counter */}
        {currentStreak > 0 ? (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>
              🔥 {t.home.nDays(currentStreak)}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Day checkboxes */}
      <View style={styles.daysRow}>
        {ALL_DAYS.map((day: DayOfWeek) => {
          const dateIso = weekDates[day];
          if (!dateIso) return null;
          return (
            <DayCheckbox
              key={day}
              day={day}
              color={activity.color}
              completed={completedByDate.has(dateIso)}
              scheduled={scheduledSet.has(day)}
              isToday={dateIso === todayIso}
              onPress={() => onTogglePress(dateIso)}
            />
          );
        })}
      </View>
    </Pressable>
  );
}

export const ActivityRow = memo(ActivityRowImpl);

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    padding: 16,
    // shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  emojiBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: {
    fontSize: 22,
  },
  nameBlock: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    lineHeight: 22,
  },
  schedule: {
    fontSize: 13,
    color: '#888',
    marginTop: 1,
  },
  streakBadge: {
    flexShrink: 0,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF8C42',
  },
  daysRow: {
    flexDirection: 'row',
    gap: 2,
  },
});
