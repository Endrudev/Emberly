import { memo, useMemo } from 'react';
import { Image, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';

import { DayCheckbox } from './DayCheckbox';
import type { Activity } from '@/domain/types';
import { dowOf, parseIsoDate } from '@/domain/week';
import { FONTS, getPastelColor } from '@/ui/theme';
import { useTranslation } from '@/i18n';
import { AnimatedPressable } from '@/ui/anim/AnimatedPressable';

// Vlastní ikona (assets/icons/flame.png) nahrazující 🔥 — viz vault design/visual-assets.md.
const FLAME_ICON = require('../../../assets/icons/flame.png');

interface ActivityRowProps {
  activity: Activity;
  weekDates: readonly string[]; // 7 ISO dates Po..Ne
  todayIso: string;
  completedByDate: ReadonlySet<string>;
  currentStreak?: number;
  /** Stable callback — receives the activity id so one fn serves every row. */
  onToggle: (activityId: number, dateIso: string) => void;
  onOpen?: (activityId: number) => void;
  /** Resolved category name (parent looks it up by `activity.categoryId`) —
   *  undefined/null hides the chip entirely (unassigned habit). */
  categoryName?: string | null;
  /** Opens the quick category picker — tapping the always-visible chip. */
  onOpenCategoryPicker?: (activityId: number) => void;
  /** Adapts card surface + text colours to dark theme. */
  isDark?: boolean;
  /** Overrides the card's outer margin — used by the activity form's live preview. */
  style?: StyleProp<ViewStyle>;
}

function ActivityRowImpl({
  activity,
  weekDates,
  todayIso,
  completedByDate,
  currentStreak = 0,
  onToggle,
  onOpen,
  categoryName,
  onOpenCategoryPicker,
  isDark = false,
  style,
}: ActivityRowProps) {
  const t = useTranslation();
  const scheduledSet = useMemo(() => new Set(activity.scheduledDays), [activity.scheduledDays]);

  // Dynamic colour tokens
  const cardBg = isDark ? '#2C2C2E' : '#FFFFFF';
  const nameColor = isDark ? '#F2F2F7' : '#1A1A1A';
  const tagColor = isDark ? '#8E8E93' : '#9A9A9A';
  const badgeBg = getPastelColor(activity.color);
  const chipBg = isDark ? '#3A3A3C' : '#F0F0F0';
  const chipFg = isDark ? '#ABABAB' : '#777777';

  // Schedule tag: "Everyday" or abbreviated days list
  const scheduleLabel = useMemo(() => {
    if (activity.scheduledDays.length === 7) return t.home.everyDay;
    return activity.scheduledDays.map((d) => t.days.short[d]).join(', ');
  }, [activity.scheduledDays, t]);

  return (
    <Pressable
      onLongPress={onOpen ? () => onOpen(activity.id) : undefined}
      delayLongPress={400}
      android_ripple={{ color: `${activity.color}18` }}
      style={[styles.card, { backgroundColor: cardBg }, style]}
      accessibilityRole="button"
      accessibilityLabel={activity.name}
    >
      {/* ── Header row: badge | name+streak+category | tag ── */}
      <View style={styles.headerRow}>
        {/* Pastel badge */}
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={styles.badgeEmoji}>{activity.emoji}</Text>
        </View>

        {/* Name + streak + category chip */}
        <View style={styles.nameBlock}>
          <Text style={[styles.name, { color: nameColor }]} numberOfLines={1}>
            {activity.name}
          </Text>
          <View style={styles.metaRow}>
            {currentStreak > 0 ? (
              <View style={styles.streakRow}>
                <Image source={FLAME_ICON} style={styles.streakIcon} resizeMode="contain" />
                <Text style={styles.streakText}>{t.home.nDays(currentStreak)}</Text>
              </View>
            ) : null}
            {categoryName ? (
              <AnimatedPressable
                hapticStyle="light"
                onPress={() => onOpenCategoryPicker?.(activity.id)}
                style={[styles.categoryChip, { backgroundColor: chipBg }]}
                accessibilityRole="button"
                accessibilityLabel={`${t.activity.categoryLabel}: ${categoryName}`}
              >
                <Text style={[styles.categoryChipText, { color: chipFg }]} numberOfLines={1}>
                  {categoryName}
                </Text>
              </AnimatedPressable>
            ) : null}
          </View>
        </View>

        {/* Schedule tag — plain text, no pill */}
        <Text style={[styles.tagText, { color: tagColor }]} numberOfLines={1}>
          {scheduleLabel}
        </Text>
      </View>

      {/* ── Day checkboxes ── */}
      <View style={styles.daysRow}>
        {weekDates.map((dateIso) => {
          const day = dowOf(parseIsoDate(dateIso));
          return (
            <DayCheckbox
              key={dateIso}
              day={day}
              color={activity.color}
              completed={completedByDate.has(dateIso)}
              scheduled={scheduledSet.has(day)}
              isToday={dateIso === todayIso}
              onPress={() => onToggle(activity.id, dateIso)}
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

  // Pastel badge, 42×42 — same corner radius as the Today view's badge
  badge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeEmoji: {
    fontSize: 20,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    minHeight: 15,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakIcon: { width: 13, height: 13 },
  streakText: {
    fontSize: 12.5,
    fontFamily: FONTS.semiBold,
    color: '#FF8C42',
  },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    maxWidth: 120,
  },
  categoryChipText: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
  },

  // "Everyday" / "Po, Út, ..." schedule tag — plain text, right-aligned
  tagText: {
    fontSize: 11.5,
    fontFamily: FONTS.semiBold,
    flexShrink: 0,
    maxWidth: 90,
    textAlign: 'right',
  },

  daysRow: {
    flexDirection: 'row',
    gap: 0,
    height: 64,
    alignItems: 'center',
  },
});
