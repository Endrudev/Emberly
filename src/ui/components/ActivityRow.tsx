import { memo, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { DayCheckbox } from './DayCheckbox';
import type { Activity, DayOfWeek } from '@/domain/types';
import { ALL_DAYS } from '@/domain/types';
import { COLORS, FONTS, getPastelColor } from '@/ui/theme';
import { useTranslation } from '@/i18n';
import { AnimatedPressable } from '@/ui/anim/AnimatedPressable';
import { useReduceMotion } from '@/ui/anim/useReduceMotion';

const ROW_SLOT_HEIGHT = 64;

interface ActivityRowProps {
  activity: Activity;
  weekDates: readonly string[]; // 7 ISO dates Po..Ne
  todayIso: string;
  completedByDate: ReadonlySet<string>;
  currentStreak?: number;
  /** Stable callback — receives the activity id so one fn serves every row. */
  onToggle: (activityId: number, dateIso: string) => void;
  onOpen?: (activityId: number) => void;
  /** List edit mode (toggled from the section header) — cross-fades the day
   *  checkboxes (non-interactive anyway while editing) into Edit/Delete. */
  editMode?: boolean;
  onEdit?: (activityId: number) => void;
  onDelete?: (activityId: number) => void;
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
  editMode = false,
  onEdit,
  onDelete,
  isDark = false,
  style,
}: ActivityRowProps) {
  const t = useTranslation();
  const reduceMotion = useReduceMotion();
  const scheduledSet = useMemo(() => new Set(activity.scheduledDays), [activity.scheduledDays]);

  // Dynamic colour tokens
  const cardBg    = isDark ? '#2C2C2E' : '#FFFFFF';
  const nameColor = isDark ? '#F2F2F7' : '#1A1A1A';
  const tagColor  = isDark ? '#8E8E93' : '#9A9A9A';
  const badgeBg   = getPastelColor(activity.color);
  const editBg    = isDark ? 'rgba(76,141,240,0.18)' : '#EEF4FF';
  const deleteBg  = isDark ? 'rgba(255,68,68,0.18)' : '#FFE8E8';

  // Schedule tag: "Everyday" or abbreviated days list
  const scheduleLabel = useMemo(() => {
    if (activity.scheduledDays.length === 7) return t.home.everyDay;
    return activity.scheduledDays.map((d) => t.days.short[d]).join(', ');
  }, [activity.scheduledDays, t]);

  // ── Days row ↔ Edit/Delete actions cross-fade (driven by editMode) ────────
  const editProgress = useSharedValue(editMode ? 1 : 0);
  useEffect(() => {
    editProgress.value = reduceMotion
      ? editMode ? 1 : 0
      : withTiming(editMode ? 1 : 0, { duration: 200 });
  }, [editMode, reduceMotion, editProgress]);

  const daysLayerStyle = useAnimatedStyle(() => ({ opacity: 1 - editProgress.value }));
  const actionsLayerStyle = useAnimatedStyle(() => ({ opacity: editProgress.value }));

  return (
    <Pressable
      onPress={editMode && onEdit ? () => onEdit(activity.id) : undefined}
      onLongPress={!editMode && onOpen ? () => onOpen(activity.id) : undefined}
      delayLongPress={400}
      android_ripple={{ color: `${activity.color}18` }}
      style={[styles.card, { backgroundColor: cardBg }, style]}
      accessibilityRole="button"
      accessibilityLabel={activity.name}
    >
      {/* ── Header row: badge | name+streak | tag ── */}
      <View style={styles.headerRow}>
        {/* Pastel badge */}
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
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

        {/* Schedule tag — plain text, no pill */}
        <Text style={[styles.tagText, { color: tagColor }]} numberOfLines={1}>
          {scheduleLabel}
        </Text>
      </View>

      {/* ── Slot: day checkboxes (normal) ↔ Edit/Delete buttons (edit mode) ── */}
      <View style={styles.slot}>
        <Animated.View
          style={[styles.slotLayer, daysLayerStyle]}
          pointerEvents={editMode ? 'none' : 'auto'}
        >
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
                  disabled={editMode}
                  onPress={() => onToggle(activity.id, dateIso)}
                />
              );
            })}
          </View>
        </Animated.View>

        <Animated.View
          style={[styles.slotLayer, actionsLayerStyle]}
          pointerEvents={editMode ? 'auto' : 'none'}
        >
          <View style={styles.editActionsRow}>
            <View style={styles.actionButtonWrap}>
              <AnimatedPressable
                style={[styles.actionButton, { backgroundColor: editBg }]}
                hapticStyle="light"
                onPress={() => onEdit?.(activity.id)}
                accessibilityRole="button"
                accessibilityLabel={`${t.common.edit} – ${activity.name}`}
              >
                <MaterialCommunityIcons name="pencil-outline" size={16} color="#4C8DF0" />
                <Text style={[styles.actionButtonText, { color: '#4C8DF0' }]}>{t.common.edit}</Text>
              </AnimatedPressable>
            </View>
            <View style={styles.actionButtonWrap}>
              <AnimatedPressable
                style={[styles.actionButton, { backgroundColor: deleteBg }]}
                hapticStyle="light"
                onPress={() => onDelete?.(activity.id)}
                accessibilityRole="button"
                accessibilityLabel={`${t.common.delete} – ${activity.name}`}
              >
                <MaterialCommunityIcons name="delete-outline" size={16} color={COLORS.error} />
                <Text style={[styles.actionButtonText, { color: COLORS.error }]}>{t.common.delete}</Text>
              </AnimatedPressable>
            </View>
          </View>
        </Animated.View>
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

  // "Everyday" / "Po, Út, ..." schedule tag — plain text, right-aligned
  tagText: {
    fontSize: 11.5,
    fontFamily: FONTS.semiBold,
    flexShrink: 0,
    maxWidth: 90,
    textAlign: 'right',
  },

  // Fixed-size slot the days row and edit actions cross-fade within, so
  // swapping never shifts row layout.
  slot: {
    height: ROW_SLOT_HEIGHT,
  },
  slotLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },

  daysRow: {
    flexDirection: 'row',
    gap: 0,
  },

  editActionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  // The actual flex item — AnimatedPressable only forwards `style` to an
  // inner wrapper, never to the Pressable itself, so `flex: 1` has to live
  // on a real sibling-level View or it resolves against nothing and the
  // button collapses to zero width.
  actionButtonWrap: {
    flex: 1,
  },
  actionButton: {
    width: '100%',
    height: 40,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13.5,
    fontFamily: FONTS.semiBold,
  },
});
