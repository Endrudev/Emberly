import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { DayCheckbox } from './DayCheckbox';
import type { Activity, DayOfWeek } from '@/domain/types';
import { ALL_DAYS } from '@/domain/types';
import { FONTS } from '@/ui/theme';
import { t } from '@/i18n/cs';

interface ActivityRowProps {
  activity: Activity;
  weekDates: readonly string[]; // 7 ISO dates Po..Ne
  todayIso: string;
  completedByDate: ReadonlySet<string>;
  currentStreak?: number;
  onTogglePress: (dateIso: string) => void;
  onLongPress?: () => void;
  /** Adapts card surface + text colours to dark theme. */
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

  // Dynamic colour tokens
  const cardBg   = isDark ? '#2C2C2E' : '#FFFFFF';
  const nameColor = isDark ? '#F2F2F7' : '#1A1A1A';
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
      {/* ── Header row: badge | name+streak | tag ── */}
      <View style={styles.headerRow}>
        {/* Square badge with solid activity color */}
        <View style={[styles.badge, { backgroundColor: activity.color }]}>
          <Text style={styles.badgeEmoji}>{activity.emoji}</Text>
        </View>

        {/* Name + streak */}
        <View style={styles.nameBlock}>
          <Text style={[styles.name, { color: nameColor }]} numberOfLines={1}>
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
          <Text style={[styles.tagText, { color: tagColor }]} numberOfLines={1}>
            {scheduleLabel}
          </Text>
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
    borderRadius: 22,
    marginHorizontal: 16,
    marginVertical: 5,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },

  // Square badge — solid activity color, 42×42
  badge: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeEmoji: {
    fontSize: 21,
  },

  nameBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16.5,
    fontFamily: FONTS.bold,
    letterSpacing: -0.165,
    lineHeight: 21,
  },
  streakText: {
    fontSize: 12.5,
    fontFamily: FONTS.semiBold,
    color: '#FF8C42',
    marginTop: 2,
  },
  streakTextEmpty: {
    fontSize: 12.5,
    marginTop: 2,
  },

  // "Everyday" / "Po, Út, ..." tag pill
  tagPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 0,
    maxWidth: 90,
  },
  tagText: {
    fontSize: 11.5,
    fontFamily: FONTS.semiBold,
  },

  daysRow: {
    flexDirection: 'row',
    gap: 0,
  },
});
