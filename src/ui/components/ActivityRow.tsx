import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { DayCheckbox } from './DayCheckbox';
import type { Activity, DayOfWeek } from '@/domain/types';
import { ALL_DAYS } from '@/domain/types';
import { t } from '@/i18n/cs';

interface ActivityRowProps {
  activity: Activity;
  weekDates: readonly string[]; // 7 ISO dates Po..Ne
  todayIso: string;
  completedByDate: ReadonlySet<string>;
  currentStreak?: number;
  onTogglePress: (dateIso: string) => void;
  onLongPress?: () => void;
  /** Adapts card surface + text colours to the dark theme. */
  isDark?: boolean;
}

function ActivityRowImpl({
  activity,
  weekDates,
  todayIso,
  completedByDate,
  currentStreak = 0,
  onTogglePress,
  onLongPress,
  isDark = false,
}: ActivityRowProps) {
  const scheduledSet = useMemo(() => new Set(activity.scheduledDays), [activity.scheduledDays]);

  // Dynamic tokens
  const cardBg   = isDark ? '#2C2C2E' : '#FFFFFF';
  const namColor = isDark ? '#F2F2F7' : '#1A1A1A';
  const tagBg    = isDark ? '#3A3A3C' : '#F0F0F0';
  const tagColor = isDark ? '#ABABAB' : '#888888';

  // Schedule tag: "Everyday" or abbreviated days list
  const scheduleLabel = useMemo(() => {
    if (activity.scheduledDays.length === 7) return t.home.everyDay;
    return activity.scheduledDays.map((d) => t.days.short[d]).join(', ');
  }, [activity.scheduledDays]);

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={400}
      android_ripple={{ color: `${activity.color}18` }}
      style={[styles.card, { backgroundColor: cardBg }]}
      accessibilityRole="button"
      accessibilityLabel={activity.name}
    >
      {/* ── Header row: icon | name+streak | tag ── */}
      <View style={styles.headerRow}>
        {/* Square icon with solid activity color */}
        <View style={[styles.iconSquare, { backgroundColor: activity.color }]}>
          <Text style={styles.iconEmoji}>{activity.emoji}</Text>
        </View>

        {/* Name + streak */}
        <View style={styles.nameBlock}>
          <Text style={[styles.name, { color: namColor }]} numberOfLines={1}>
            {activity.name}
          </Text>
          {currentStreak > 0 ? (
            <Text style={styles.streakText}>
              🔥 {t.home.nDays(currentStreak)}
            </Text>
          ) : (
            <Text style={styles.streakTextEmpty}> </Text>
          )}
        </View>

        {/* Schedule tag pill */}
        <View style={[styles.tagPill, { backgroundColor: tagBg }]}>
          <Text style={[styles.tagText, { color: tagColor }]} numberOfLines={1}>{scheduleLabel}</Text>
        </View>
      </View>

      {/* ── Day checkboxes ── */}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    // Subtle shadow
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
  // Square icon — solid activity color, rounded corners
  iconSquare: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconEmoji: {
    fontSize: 24,
  },
  nameBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 22,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF8C42',
    marginTop: 2,
  },
  streakTextEmpty: {
    fontSize: 13,
    marginTop: 2,
  },
  // "Everyday" / "Po, Út, ..." tag pill
  tagPill: {
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 0,
    maxWidth: 90,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888888',
  },
  daysRow: {
    flexDirection: 'row',
    gap: 0,
  },
});
