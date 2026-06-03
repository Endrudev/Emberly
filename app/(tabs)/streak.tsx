import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TAB_BAR_SPACE } from './_layout';
import { Text } from 'react-native-paper';

import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/ui/useAppTheme';
import { CircularProgress } from '@/ui/components/CircularProgress';
import { computeCurrentDailyStreak, toActivityForStreak } from '@/domain/streaks';
import { todayIso as todayIsoFn } from '@/domain/week';
import { COLORS, FONTS } from '@/ui/theme';
import { t } from '@/i18n/cs';

const STREAK_COLOR = '#FF8C42';
const STREAK_TRACK_LIGHT = '#FFE5CC';
const STREAK_TRACK_DARK  = '#3D2010';

export default function StreakScreen() {
  const C = useAppTheme();

  const activities  = useAppStore((s) => s.activities);
  const completions = useAppStore((s) => s.completions);
  const today       = todayIsoFn();

  const currentStreak = useMemo(
    () => computeCurrentDailyStreak(activities.map(toActivityForStreak), completions, today),
    [activities, completions, today],
  );

  const tiers = t.streakScreen.tiers;

  const currentTierIndex = useMemo(() => {
    for (let i = tiers.length - 1; i >= 0; i--) {
      const tier = tiers[i];
      if (tier && currentStreak >= tier.min) return i;
    }
    return -1;
  }, [currentStreak]);

  const nextTier       = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;
  const daysToNextBadge = nextTier ? nextTier.min - currentStreak : 0;

  const circleProgress = useMemo(() => {
    if (currentStreak === 0) return 0;
    if (!nextTier) return 1;
    const currentTier = tiers[currentTierIndex];
    const tierStart = currentTier ? currentTier.min : 0;
    return (currentStreak - tierStart) / (nextTier.min - tierStart);
  }, [currentStreak, currentTierIndex, nextTier, tiers]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.BG }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={[styles.pageTitle, { color: C.text }]}>{t.streakScreen.title}</Text>

        {/* Big streak circle */}
        <View style={styles.circleSection}>
          <View style={[styles.circleCard, { backgroundColor: C.circleCardBg }]}>
            <CircularProgress
              size={160}
              strokeWidth={12}
              progress={circleProgress}
              color={STREAK_COLOR}
              trackColor={C.isDark ? STREAK_TRACK_DARK : STREAK_TRACK_LIGHT}
            >
              <View style={styles.circleInner}>
                <Text style={styles.flameEmoji}>🔥</Text>
                <Text style={[styles.streakCount, { color: C.text }]}>{currentStreak}</Text>
                <Text style={[styles.streakLabel, { color: C.textSecondary }]}>
                  {t.streakScreen.dayStreak}
                </Text>
              </View>
            </CircularProgress>

            {currentStreak > 0 && nextTier ? (
              <>
                <Text style={[styles.badgeProgress, { color: C.text }]}>
                  {t.streakScreen.daysToNextBadge(daysToNextBadge, nextTier.name)}
                </Text>
                <Text style={[styles.keepGoing, { color: C.textSecondary }]}>
                  {t.streakScreen.keepGoing}
                </Text>
              </>
            ) : currentStreak === 0 ? (
              <>
                <Text style={[styles.badgeProgress, { color: C.text }]}>
                  {t.streakScreen.noStreak}
                </Text>
                <Text style={[styles.keepGoing, { color: C.textSecondary }]}>
                  {t.streakScreen.noStreakSub}
                </Text>
              </>
            ) : (
              <Text style={[styles.badgeProgress, { color: C.text }]}>
                🏆 Dosáhl jsi maximum!
              </Text>
            )}
          </View>
        </View>

        {/* Tier list */}
        <Text style={[styles.tiersTitle, { color: C.textTertiary }]}>
          {t.streakScreen.tiersTitle}
        </Text>
        <View style={[styles.tiersCard, { backgroundColor: C.surface }]}>
          {tiers.map((tier, idx) => {
            const isAchieved = currentStreak > tier.max;
            const isCurrent  = idx === currentTierIndex;
            const isLocked   = currentStreak < tier.min;

            return (
              <View
                key={tier.key}
                style={[
                  styles.tierRow,
                  idx < tiers.length - 1 && [styles.tierRowBorder, { borderBottomColor: C.border }],
                ]}
              >
                <Text style={[styles.tierEmoji, isLocked && styles.locked]}>{tier.emoji}</Text>
                <View style={styles.tierInfo}>
                  <Text style={[styles.tierName, { color: isLocked ? C.textTertiary : C.text }]}>
                    {tier.name}
                  </Text>
                  <Text style={[styles.tierRange, { color: C.textSecondary }]}>
                    {tier.label}
                  </Text>
                </View>
                {isAchieved ? (
                  <View style={styles.achievedBadge}>
                    <Text style={styles.achievedIcon}>✓</Text>
                  </View>
                ) : isCurrent ? (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>{t.streakScreen.youreHere}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: TAB_BAR_SPACE + 20 },
  pageTitle: {
    fontSize: 28,
    fontFamily: FONTS.extraBold,
    marginBottom: 20,
    letterSpacing: -0.56,
  },
  circleSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  circleCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  circleInner: { alignItems: 'center' },
  flameEmoji: { fontSize: 28, marginBottom: 2 },
  streakCount: {
    fontSize: 42,
    fontFamily: FONTS.extraBold,
    lineHeight: 48,
  },
  streakLabel: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },
  badgeProgress: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    marginTop: 20,
    textAlign: 'center',
  },
  keepGoing: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    marginTop: 4,
    textAlign: 'center',
  },
  tiersTitle: {
    fontSize: 12,
    fontFamily: FONTS.extraBold,
    letterSpacing: 0.96,
    marginBottom: 12,
  },
  tiersCard: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  tierRowBorder: {
    borderBottomWidth: 1,
  },
  tierEmoji: {
    fontSize: 22,
    width: 36,
    textAlign: 'center',
  },
  tierInfo: { flex: 1 },
  tierName: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
  tierRange: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    marginTop: 2,
  },
  achievedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievedIcon: { color: '#fff', fontSize: 14, fontWeight: '700' },
  currentBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  currentBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  locked: { opacity: 0.35 },
});
