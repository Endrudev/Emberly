import { useEffect, useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TAB_BAR_SPACE } from './_layout';
import { Text } from 'react-native-paper';
import { format } from 'date-fns';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useAppStore } from '@/store/useAppStore';
import { useIsPremium } from '@/store/usePurchasesStore';
import { isTierLocked, STREAK_FREEZE_MONTHLY_QUOTA } from '@/purchases/gating';
import { openPaywall } from '@/purchases/openPaywall';
import { useAppTheme } from '@/ui/useAppTheme';
import { TIER_BADGES, FROZEN_FLAME } from '@/ui/streakAssets';
import { CountUpText } from '@/ui/anim/CountUpText';
import { useReduceMotion } from '@/ui/anim/useReduceMotion';
import { computeCurrentDailyStreak, toActivityForStreak } from '@/domain/streaks';
import { freezesRemainingInMonth } from '@/domain/streakFreeze';
import { parseIsoDate, todayIso as todayIsoFn } from '@/domain/week';
import { COLORS, FONTS } from '@/ui/theme';
import { useTranslation, useDateLocale } from '@/i18n';

// Vlastní ikony (assets/icons/) nahrazující emoji — viz vault design/visual-assets.md.
const LOCK_ICON = require('../../assets/icons/lock.png');
const STAR_ICON = require('../../assets/icons/star-filled.png');
const SNOWFLAKE_ICON = require('../../assets/icons/snowflake.png');

/** Animovaný progress bar (fill 0→target). Respektuje reduce motion. */
function ProgressBar({
  progress,
  trackColor,
  reduceMotion,
}: {
  progress: number;
  trackColor: string;
  reduceMotion: boolean;
}) {
  const w = useSharedValue(reduceMotion ? progress : 0);
  useEffect(() => {
    w.value = reduceMotion ? progress : withDelay(200, withTiming(progress, { duration: 700 }));
  }, [progress, reduceMotion, w]);
  const style = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, w.value)) * 100}%` }));
  return (
    <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
      <Animated.View style={[styles.progressFill, style]} />
    </View>
  );
}

export default function StreakScreen() {
  const t = useTranslation();
  const dateLocale = useDateLocale();
  const C = useAppTheme();
  const reduceMotion = useReduceMotion();

  const activities = useAppStore((s) => s.activities);
  const completions = useAppStore((s) => s.completions);
  const frozenDates = useAppStore((s) => s.frozenDates);
  const isPremium = useIsPremium();
  const today = todayIsoFn();

  const frozenSet = useMemo(() => new Set(frozenDates), [frozenDates]);

  const currentStreak = useMemo(
    () =>
      computeCurrentDailyStreak(activities.map(toActivityForStreak), completions, today, frozenSet),
    [activities, completions, today, frozenSet],
  );

  const monthIso = today.slice(0, 7);
  const freezesRemaining = useMemo(
    () => freezesRemainingInMonth(frozenDates, monthIso),
    [frozenDates, monthIso],
  );
  const freezesUsedThisMonth = useMemo(
    () =>
      frozenDates
        .filter((d) => d.slice(0, 7) === monthIso)
        .sort()
        .map((d) => format(parseIsoDate(d), 'd. M.', { locale: dateLocale })),
    [frozenDates, monthIso, dateLocale],
  );

  const tiers = t.streakScreen.tiers;

  const currentTierIndex = useMemo(() => {
    for (let i = tiers.length - 1; i >= 0; i--) {
      const tier = tiers[i];
      if (tier && currentStreak >= tier.min) return i;
    }
    return -1;
  }, [currentStreak, tiers]);

  const nextTier = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;
  const daysToNextBadge = nextTier ? nextTier.min - currentStreak : 0;

  const circleProgress = useMemo(() => {
    if (currentStreak === 0) return 0;
    if (!nextTier) return 1;
    const currentTier = tiers[currentTierIndex];
    const tierStart = currentTier ? currentTier.min : 0;
    return (currentStreak - tierStart) / (nextTier.min - tierStart);
  }, [currentStreak, currentTierIndex, nextTier, tiers]);

  // Hero badge = aktuálně dosažený tier; při streaku 0 ukážeme první tier (cíl) ztlumeně.
  const heroTierIndex = currentTierIndex >= 0 ? currentTierIndex : 0;
  const heroTier = tiers[heroTierIndex];
  const heroLocked = isTierLocked(heroTierIndex, isPremium) && currentStreak > 0;
  const heroDimmed = currentStreak === 0 || heroLocked;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.BG }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { color: C.text }]}>{t.streakScreen.title}</Text>

        {/* ── Hero — velký aktuální tier badge + číslo + progress ── */}
        <Pressable
          onPress={heroLocked ? () => void openPaywall() : undefined}
          style={[styles.heroCard, { backgroundColor: C.circleCardBg }]}
        >
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.duration(320)}
            style={styles.heroBadgeWrap}
          >
            <Image
              source={heroTier ? TIER_BADGES[heroTierIndex] : TIER_BADGES[0]}
              style={[styles.heroBadge, heroDimmed && styles.badgeDimmed]}
              resizeMode="contain"
            />
            {heroLocked ? (
              <View style={styles.heroLockChip}>
                <Image source={LOCK_ICON} style={styles.heroLockChipIcon} resizeMode="contain" />
              </View>
            ) : null}
          </Animated.View>

          <CountUpText
            value={currentStreak}
            duration={800}
            style={[styles.streakCount, { color: C.text }]}
          />
          <Text style={[styles.streakLabel, { color: C.textSecondary }]}>
            {t.streakScreen.dayStreak}
          </Text>

          {currentStreak === 0 ? (
            <>
              <Text style={[styles.heroHint, { color: C.text }]}>{t.streakScreen.noStreak}</Text>
              <Text style={[styles.heroSub, { color: C.textSecondary }]}>
                {t.streakScreen.noStreakSub}
              </Text>
            </>
          ) : nextTier ? (
            <>
              <ProgressBar
                progress={circleProgress}
                trackColor={C.isDark ? '#3D2010' : '#FFE5CC'}
                reduceMotion={reduceMotion}
              />
              <Text style={[styles.heroHint, { color: C.text }]}>
                {t.streakScreen.daysToNextBadge(daysToNextBadge, nextTier.name)}
              </Text>
            </>
          ) : (
            <Text style={[styles.heroHint, { color: C.text }]}>{t.streakScreen.maxReached}</Text>
          )}
        </Pressable>

        {/* ── Sbírka odznaků (všech 5 tierů) ── */}
        <Text style={[styles.sectionTitle, { color: C.textTertiary }]}>
          {t.streakScreen.tiersTitle}
        </Text>
        <View style={[styles.collectionCard, { backgroundColor: C.surface }]}>
          {tiers.map((tier, idx) => {
            const earned = currentStreak >= tier.min;
            const premiumLocked = isTierLocked(idx, isPremium);
            const isCurrent = idx === currentTierIndex;
            const dimmed = premiumLocked || !earned;

            return (
              <Pressable
                key={tier.key}
                onPress={premiumLocked ? () => void openPaywall() : undefined}
                style={styles.collectionItem}
              >
                <View style={styles.collectionBadgeWrap}>
                  <Image
                    source={TIER_BADGES[idx]}
                    style={[styles.collectionBadge, dimmed && styles.badgeDimmed]}
                    resizeMode="contain"
                  />
                  {premiumLocked ? (
                    <View style={styles.collectionLockChip}>
                      <Image source={LOCK_ICON} style={styles.collectionLockChipIcon} resizeMode="contain" />
                    </View>
                  ) : earned ? (
                    <View style={styles.collectionCheck}>
                      <Text style={styles.collectionCheckText}>✓</Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.collectionLabel,
                    { color: isCurrent ? COLORS.primary : dimmed ? C.textTertiary : C.text },
                  ]}
                >
                  {tier.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Ochrana série (ledový plamínek) ── */}
        <Pressable
          onPress={isPremium ? undefined : () => void openPaywall()}
          style={[styles.freezeCard, { backgroundColor: C.surface }]}
        >
          <View style={styles.freezeHeader}>
            <Image source={FROZEN_FLAME} style={styles.freezeFlame} resizeMode="contain" />
            <View style={styles.freezeTitleRow}>
              <Image source={SNOWFLAKE_ICON} style={styles.freezeTitleIcon} resizeMode="contain" />
              <Text style={[styles.freezeTitle, { color: C.text }]}>{t.streakFreeze.title}</Text>
            </View>
            {isPremium ? null : (
              <View style={styles.premiumChip}>
                <Image source={STAR_ICON} style={styles.premiumChipIcon} resizeMode="contain" />
                <Text style={styles.premiumChipText}>{t.premium.badge}</Text>
              </View>
            )}
          </View>

          {isPremium ? (
            <>
              <Text style={[styles.freezeRemaining, { color: C.text }]}>
                {t.streakFreeze.remaining(freezesRemaining, STREAK_FREEZE_MONTHLY_QUOTA)}
              </Text>
              <Text style={[styles.freezeDetail, { color: C.textSecondary }]}>
                {freezesUsedThisMonth.length > 0
                  ? t.streakFreeze.usedOn(freezesUsedThisMonth.join(', '))
                  : t.streakFreeze.noneUsedThisMonth}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.freezeBody, { color: C.textSecondary }]}>
                {t.premium.lockStreakFreezeBody}
              </Text>
              <View style={styles.freezeCta}>
                <Text style={styles.freezeCtaText}>{t.premium.unlockCta}</Text>
              </View>
            </>
          )}
        </Pressable>
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

  // Hero
  heroCard: {
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  heroBadgeWrap: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  heroBadge: { width: 140, height: 140 },
  badgeDimmed: { opacity: 0.32 },
  heroLockChip: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLockChipText: { fontSize: 16 },
  heroLockChipIcon: { width: 17, height: 17 },
  streakCount: {
    fontSize: 46,
    fontFamily: FONTS.extraBold,
    lineHeight: 52,
    marginTop: 8,
  },
  streakLabel: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },
  heroHint: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    marginTop: 16,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    marginTop: 4,
    textAlign: 'center',
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    width: '100%',
    overflow: 'hidden',
    marginTop: 20,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#FF8C42',
  },

  // Collection strip
  sectionTitle: {
    fontSize: 12,
    fontFamily: FONTS.extraBold,
    letterSpacing: 0.96,
    marginBottom: 12,
  },
  collectionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 10,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  collectionItem: { flex: 1, alignItems: 'center' },
  collectionBadgeWrap: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  collectionBadge: { width: 54, height: 54 },
  collectionLockChip: {
    position: 'absolute',
    bottom: -2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionLockChipText: { fontSize: 11 },
  collectionLockChipIcon: { width: 12, height: 12 },
  collectionCheck: {
    position: 'absolute',
    bottom: -2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionCheckText: { color: '#fff', fontSize: 11, fontFamily: FONTS.bold },
  collectionLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.semiBold,
    marginTop: 6,
    textAlign: 'center',
  },

  // Freeze
  freezeCard: {
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  freezeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  freezeFlame: { width: 48, height: 48 },
  freezeTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  freezeTitleIcon: { width: 16, height: 16 },
  freezeTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  premiumChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3D6',
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  premiumChipIcon: { width: 11, height: 11 },
  premiumChipText: {
    color: '#9A7A12',
    fontSize: 10.5,
    fontFamily: FONTS.extraBold,
    letterSpacing: 0.5,
  },
  freezeRemaining: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    marginTop: 14,
  },
  freezeDetail: {
    fontSize: 12.5,
    fontFamily: FONTS.semiBold,
    marginTop: 3,
    lineHeight: 17,
  },
  freezeBody: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    lineHeight: 18,
    marginTop: 12,
  },
  freezeCta: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  freezeCtaText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: FONTS.bold,
    letterSpacing: 0.2,
  },
});
