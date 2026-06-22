import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { format, subDays } from 'date-fns';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { COLORS, FONTS } from '@/ui/theme';
import { useTranslation } from '@/i18n';
import type { Activity, Completion } from '@/domain/types';
import { mondayOf, todayIso as getTodayIso, weekDates } from '@/domain/week';
import { ActivityRow } from '@/ui/components/ActivityRow';
import { HabitHeatmap } from '@/ui/components/HabitHeatmap';
import { WidgetShowcasePreview } from '@/ui/components/WidgetShowcasePreview';
import { useReduceMotion } from '@/ui/anim/useReduceMotion';
import { EMBERLY } from '../emberly';
import { FunnelScreen } from '../FunnelScreen';
import type { FunnelStepProps } from '../types';

/** Fáze 3 — Edukace & hodnota: 8. Jak to funguje · 9. Tier systém ·
 *  10. Widget + heatmapa · 11. Věda/důvěra. */

// Mock data pro krok 8 — ukázka skutečné ActivityRow, žádná reálná uživatelská
// data v tomto bodě funnelu ještě neexistují.
const HOW_IT_WORKS_TODAY = getTodayIso();
const HOW_IT_WORKS_WEEK = weekDates(mondayOf(new Date()));
const HOW_IT_WORKS_ACTIVITY: Activity = {
  id: -1,
  name: 'Meditace',
  emoji: '🧘',
  color: COLORS.primary,
  scheduledDays: [0, 1, 2, 3, 4, 5, 6],
  archived: false,
  createdAt: subDays(new Date(), 30).getTime(),
};
const HOW_IT_WORKS_INITIAL_DONE = new Set(
  HOW_IT_WORKS_WEEK.filter((d) => d < HOW_IT_WORKS_TODAY).slice(-2),
);

/** Mini sloupcový graf — vizuální zkratka pro "série roste". */
function StreakGrowthBars() {
  const reduceMotion = useReduceMotion();
  const heights = [14, 20, 27, 35, 45];
  return (
    <View style={styles.growthBarsRow}>
      {heights.map((h, i) => (
        <GrowthBar key={i} targetHeight={h} delay={i * 90} reduceMotion={reduceMotion} />
      ))}
      <Text style={styles.growthFlame}>🔥</Text>
    </View>
  );
}

function GrowthBar({
  targetHeight,
  delay,
  reduceMotion,
}: {
  targetHeight: number;
  delay: number;
  reduceMotion: boolean;
}) {
  const height = useSharedValue(reduceMotion ? targetHeight : 4);

  useEffect(() => {
    height.value = reduceMotion ? targetHeight : withDelay(delay, withTiming(targetHeight, { duration: 380 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({ height: height.value }));
  return <Animated.View style={[styles.growthBar, style]} />;
}

// Badge_lvl5 zatím neexistuje (assets/emberly má jen lvl1–4) — poslední tier
// (Legendární) recykluje lvl4, dokud nepřibude 5. badge. Viz assets/emberly/README.md.
const TIER_BADGES = [
  require('../../../assets/emberly/Badge_lvl1.png'),
  require('../../../assets/emberly/Badge_lvl2.png'),
  require('../../../assets/emberly/Badge_lvl3.png'),
  require('../../../assets/emberly/Badge_lvl4.png'),
  require('../../../assets/emberly/Badge_lvl4.png'),
];

export function HowItWorksStep({ progress, canGoBack, onNext, onBack }: FunnelStepProps) {
  const t = useTranslation();
  const [done, setDone] = useState(HOW_IT_WORKS_INITIAL_DONE);

  function toggleDemo(_activityId: number, dateIso: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(dateIso)) next.delete(dateIso);
      else next.add(dateIso);
      return next;
    });
  }

  return (
    <FunnelScreen
      progress={progress}
      onBack={canGoBack ? onBack : undefined}
      ctaLabel={t.funnel.continueButton}
      onCta={onNext}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t.funnel.howItWorksStep.title}</Text>
        <Text style={styles.subtitle}>{t.funnel.howItWorksStep.subtitle}</Text>

        <View style={styles.demoItem}>
          <ActivityRow
            activity={HOW_IT_WORKS_ACTIVITY}
            weekDates={HOW_IT_WORKS_WEEK}
            todayIso={HOW_IT_WORKS_TODAY}
            completedByDate={done}
            currentStreak={done.size}
            onToggle={toggleDemo}
            style={styles.demoActivityRow}
          />
          <Text style={styles.demoCaption}>{t.funnel.howItWorksStep.step1}</Text>
        </View>

        <View style={styles.demoItem}>
          <StreakGrowthBars />
          <Text style={styles.demoCaption}>{t.funnel.howItWorksStep.step2}</Text>
        </View>

        <View style={styles.demoItem}>
          <Image
            source={TIER_BADGES[TIER_BADGES.length - 1]}
            style={styles.howItWorksBadge}
            resizeMode="contain"
          />
          <Text style={styles.demoCaption}>{t.funnel.howItWorksStep.step3}</Text>
        </View>
      </ScrollView>
    </FunnelScreen>
  );
}

export function TierStep({ progress, canGoBack, onNext, onBack }: FunnelStepProps) {
  const t = useTranslation();
  const tiers = t.streakScreen.tiers;
  return (
    <FunnelScreen
      progress={progress}
      onBack={canGoBack ? onBack : undefined}
      ctaLabel={t.funnel.continueButton}
      onCta={onNext}
    >
      <Text style={styles.title}>{t.funnel.tierStep.title}</Text>
      <Text style={styles.subtitle}>{t.funnel.tierStep.subtitle}</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tierColumn}>
        {tiers.map((tier, i) => (
          <View key={tier.key} style={styles.tierRowVertical}>
            <Image source={TIER_BADGES[i]} style={styles.tierBadge} resizeMode="contain" />
            <View style={styles.tierTextCol}>
              <Text style={styles.tierName}>{tier.name}</Text>
              <Text style={styles.tierLabel}>{tier.label}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </FunnelScreen>
  );
}

// Mock data jen pro náhled heatmapy (krok 10) — žádná reálná uživatelská data
// v tomto bodě funnelu ještě neexistují.
const HEATMAP_TODAY = format(new Date(), 'yyyy-MM-dd');
const HEATMAP_ACTIVITIES: Activity[] = [
  {
    id: -1,
    name: 'Mock A',
    emoji: '🚶',
    color: COLORS.primary,
    scheduledDays: [0, 1, 2, 3, 4, 5, 6],
    archived: false,
    createdAt: subDays(new Date(), 100).getTime(),
  },
  {
    id: -2,
    name: 'Mock B',
    emoji: '🧘',
    color: COLORS.orange,
    scheduledDays: [0, 1, 2, 3, 4, 5, 6],
    archived: false,
    createdAt: subDays(new Date(), 100).getTime(),
  },
];
const HEATMAP_COMPLETIONS: Completion[] = Array.from({ length: 100 }, (_, i) => i)
  .flatMap((daysAgo) => {
    const date = format(subDays(new Date(), daysAgo), 'yyyy-MM-dd');
    const out: Completion[] = [];
    if (daysAgo % 3 !== 0) out.push({ activityId: -1, date, completedAt: 0 });
    if (daysAgo % 4 !== 0) out.push({ activityId: -2, date, completedAt: 0 });
    return out;
  });

export function WidgetStep({ progress, canGoBack, onNext, onBack }: FunnelStepProps) {
  const t = useTranslation();
  return (
    <FunnelScreen
      progress={progress}
      onBack={canGoBack ? onBack : undefined}
      ctaLabel={t.funnel.continueButton}
      onCta={onNext}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t.funnel.widgetStep.title}</Text>
        <Text style={styles.subtitle}>{t.funnel.widgetStep.subtitle}</Text>
        <View style={styles.widgetPreviewWrap}>
          <WidgetShowcasePreview variant="4x3" />
        </View>
        <HabitHeatmap
          activities={HEATMAP_ACTIVITIES}
          completions={HEATMAP_COMPLETIONS}
          todayIso={HEATMAP_TODAY}
        />
      </ScrollView>
    </FunnelScreen>
  );
}

export function ScienceStep({ progress, canGoBack, onNext, onBack }: FunnelStepProps) {
  const t = useTranslation();
  return (
    <FunnelScreen
      progress={progress}
      onBack={canGoBack ? onBack : undefined}
      ctaLabel={t.funnel.continueButton}
      onCta={onNext}
    >
      <View style={styles.center}>
        <Image source={EMBERLY.happy} style={styles.mascotMedium} resizeMode="contain" />
        <Text style={styles.title}>{t.funnel.scienceStep.title}</Text>
        <Text style={styles.subtitle}>{t.funnel.scienceStep.subtitle}</Text>
        <View style={styles.reviewCard}>
          <Text style={styles.stars}>★★★★★</Text>
          <Text style={styles.reviewCount}>{t.funnel.scienceStep.reviewCount}</Text>
        </View>
      </View>
    </FunnelScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  scrollContent: {
    paddingBottom: 16,
    gap: 16,
  },
  mascotMedium: {
    width: 280,
    height: 280,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 26,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Krok 8 — ukázky reálných prvků appky (žádné emoji).
  demoItem: {
    alignItems: 'center',
    gap: 8,
  },
  demoActivityRow: {
    marginHorizontal: 0,
    width: '100%',
  },
  demoCaption: {
    fontSize: 13.5,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  growthBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 56,
    paddingHorizontal: 8,
  },
  growthBar: {
    width: 16,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  growthFlame: {
    fontSize: 22,
    marginLeft: 6,
    marginBottom: 2,
  },
  tierColumn: {
    gap: 14,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tierRowVertical: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    padding: 10,
  },
  tierTextCol: {
    flex: 1,
  },
  tierBadge: { width: 56, height: 56 },
  // Samostatný styl od `tierBadge` — krok 8 ukazuje jen jeden (nejvyšší)
  // badge zvětšený 2×, zatímco krok 9 (evoluce tierů) zůstává v původní
  // velikosti, ať se vejde celý seznam 5 tierů.
  howItWorksBadge: { width: 112, height: 112 },
  tierName: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  tierLabel: {
    fontSize: 12.5,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  widgetPreviewWrap: {
    alignItems: 'center',
  },
  reviewCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  stars: {
    fontSize: 18,
    color: COLORS.orange,
  },
  reviewCount: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
});
