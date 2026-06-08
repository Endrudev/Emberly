import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { Activity } from '@/domain/types';
import { FONTS, getPastelColor } from '@/ui/theme';
import { t } from '@/i18n/cs';

interface TodayActivityRowProps {
  activity: Activity;
  completed: boolean;
  currentStreak?: number;
  onTogglePress: () => void;
  onLongPress?: () => void;
  isDark?: boolean;
}

function TodayActivityRowImpl({
  activity,
  completed,
  currentStreak = 0,
  onTogglePress,
  onLongPress,
  isDark = false,
}: TodayActivityRowProps) {
  const cardBg     = isDark ? '#2C2C2E' : '#FFFFFF';
  const nameColor  = isDark ? '#F2F2F7' : '#1A1A1A';
  const metaColor  = isDark ? '#ABABAB' : '#888888';
  const ringColor  = isDark ? '#3A3A3C' : '#E2E4E8';

  const badgeBg = getPastelColor(activity.color);

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={400}
      android_ripple={{ color: `${activity.color}18` }}
      style={[styles.card, { backgroundColor: cardBg }]}
      accessibilityRole="button"
      accessibilityLabel={activity.name}
    >
      {/* ── Pastel badge ── */}
      <View style={[styles.badge, { backgroundColor: badgeBg }]}>
        <Text style={styles.badgeEmoji}>{activity.emoji}</Text>
      </View>

      {/* ── Name + streak ── */}
      <View style={styles.nameBlock}>
        <Text style={[styles.name, { color: nameColor }]} numberOfLines={1}>
          {activity.name}
        </Text>
        {currentStreak > 0 ? (
          <Text style={[styles.metaText, { color: metaColor }]} numberOfLines={1}>
            🔥 {t.home.nDays(currentStreak)}
          </Text>
        ) : null}
      </View>

      {/* ── Single round checkbox (toggles today) ── */}
      <Pressable
        onPress={onTogglePress}
        hitSlop={10}
        style={[
          styles.checkbox,
          completed
            ? { backgroundColor: activity.color, borderColor: activity.color }
            : { backgroundColor: 'transparent', borderColor: ringColor },
        ]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
      >
        {completed ? (
          <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
        ) : null}
      </Pressable>
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
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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
  metaText: {
    fontSize: 12.5,
    fontFamily: FONTS.semiBold,
    marginTop: 3,
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
