import { useEffect, useRef, memo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Activity } from '@/domain/types';
import { FONTS, getPastelColor } from '@/ui/theme';
import { useTranslation } from '@/i18n';
import { tapLight, tapMedium } from '@/ui/anim/haptics';
import { useReduceMotion } from '@/ui/anim/useReduceMotion';
import { AnimatedPressable } from '@/ui/anim/AnimatedPressable';

// Vlastní ikona (assets/icons/flame.png) nahrazující 🔥 — viz vault design/visual-assets.md.
const FLAME_ICON = require('../../../assets/icons/flame.png');

interface TodayActivityRowProps {
  activity: Activity;
  completed: boolean;
  currentStreak?: number;
  /** Stable callback — receives the activity id so one fn serves every row. */
  onToggle: (activityId: number) => void;
  onOpen?: (activityId: number) => void;
  /** Resolved category name (parent looks it up by `activity.categoryId`) —
   *  undefined/null hides the chip entirely (unassigned habit). */
  categoryName?: string | null;
  /** Opens the quick category picker — tapping the always-visible chip. */
  onOpenCategoryPicker?: (activityId: number) => void;
  isDark?: boolean;
}

function TodayActivityRowImpl({
  activity,
  completed,
  currentStreak = 0,
  onToggle,
  onOpen,
  categoryName,
  onOpenCategoryPicker,
  isDark = false,
}: TodayActivityRowProps) {
  const t = useTranslation();
  const cardBg = isDark ? '#2C2C2E' : '#FFFFFF';
  const nameColor = isDark ? '#F2F2F7' : '#1A1A1A';
  const metaColor = isDark ? '#ABABAB' : '#888888';
  const ringColor = isDark ? '#3A3A3C' : '#E2E4E8';
  const chipBg = isDark ? '#3A3A3C' : '#F0F0F0';
  const chipFg = isDark ? '#ABABAB' : '#777777';

  const badgeBg = getPastelColor(activity.color);
  const reduceMotion = useReduceMotion();

  // ── Toggle animation: scale pop + bg fill + check fade-in ──────────────────
  const fill = useSharedValue(completed ? 1 : 0);
  const scale = useSharedValue(1);
  const checkOpacity = useSharedValue(completed ? 1 : 0);
  const checkScale = useSharedValue(completed ? 1 : 0.6);
  const prevCompleted = useRef(completed);

  useEffect(() => {
    if (prevCompleted.current === completed) return;
    prevCompleted.current = completed;

    if (reduceMotion) {
      fill.value = completed ? 1 : 0;
      checkOpacity.value = completed ? 1 : 0;
      checkScale.value = 1;
      scale.value = 1;
      if (completed) tapMedium();
      else tapLight();
      return;
    }

    fill.value = withTiming(completed ? 1 : 0, { duration: 120 });

    if (completed) {
      tapMedium();
      scale.value = withSequence(
        withTiming(0.85, { duration: 60 }),
        withSpring(1.12, { duration: 100, dampingRatio: 0.6 }),
        withSpring(1, { duration: 80, dampingRatio: 0.9 }),
      );
      checkOpacity.value = withDelay(40, withTiming(1, { duration: 120 }));
      checkScale.value = withDelay(40, withTiming(1, { duration: 140 }));
    } else {
      tapLight();
      scale.value = withSequence(
        withTiming(1.1, { duration: 40 }),
        withSpring(1, { duration: 90, dampingRatio: 0.8 }),
      );
      checkOpacity.value = withTiming(0, { duration: 80 });
      checkScale.value = withTiming(0.6, { duration: 80 });
    }
  }, [completed, reduceMotion, fill, scale, checkOpacity, checkScale]);

  const circleAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(fill.value, [0, 1], [`${activity.color}00`, activity.color]),
    transform: [{ scale: scale.value }],
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <Pressable
      onLongPress={onOpen ? () => onOpen(activity.id) : undefined}
      delayLongPress={400}
      android_ripple={{ color: `${activity.color}18` }}
      style={[styles.card, { backgroundColor: cardBg }]}
      accessibilityRole="button"
      accessibilityLabel={activity.name}
    >
      <View style={styles.content}>
        {/* ── Pastel badge ── */}
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={styles.badgeEmoji}>{activity.emoji}</Text>
        </View>

        {/* ── Name + streak + category chip ── */}
        <View style={styles.nameBlock}>
          <Text style={[styles.name, { color: nameColor }]} numberOfLines={1}>
            {activity.name}
          </Text>
          <View style={styles.metaRow}>
            {currentStreak > 0 ? (
              <View style={styles.metaGroup}>
                <Image source={FLAME_ICON} style={styles.metaIcon} resizeMode="contain" />
                <Text style={[styles.metaText, { color: metaColor }]} numberOfLines={1}>
                  {t.home.nDays(currentStreak)}
                </Text>
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

        {/* ── Checkbox ── */}
        <Pressable
          onPress={() => onToggle(activity.id)}
          hitSlop={10}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: completed }}
        >
          <Animated.View
            style={[
              styles.checkbox,
              { borderColor: completed ? activity.color : ringColor },
              circleAnimatedStyle,
            ]}
          >
            <Animated.View style={checkAnimatedStyle}>
              <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
            </Animated.View>
          </Animated.View>
        </Pressable>
      </View>
    </Pressable>
  );
}

export const TodayActivityRow = memo(TodayActivityRowImpl);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
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

  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  badge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeEmoji: {
    fontSize: 22,
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
  metaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: { width: 13, height: 13 },
  metaText: {
    fontSize: 12.5,
    fontFamily: FONTS.semiBold,
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

  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
