import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TAB_BAR_SPACE } from './_layout';
import { Text } from 'react-native-paper';
import { addDays } from 'date-fns';

import { useAppStore } from '@/store/useAppStore';
import { useSettingsStore, weekStartFlag } from '@/store/useSettingsStore';
import { useIsPremium } from '@/store/usePurchasesStore';
import { openPaywall } from '@/purchases/openPaywall';
import { useAppTheme } from '@/ui/useAppTheme';
import { HabitHeatmap } from '@/ui/components/HabitHeatmap';
import { PremiumLockCard } from '@/ui/components/PremiumLockCard';
import { SegmentedPill } from '@/ui/components/SegmentedPill';
import { CountUpText } from '@/ui/anim/CountUpText';
import {
  computeActivityStats,
  computeCurrentActivityStreak,
  computeCurrentDailyStreak,
  toActivityForStreak,
} from '@/domain/streaks';
import {
  computeBestWeekday,
  computeRangeStats,
  computeWeekdayBreakdown,
  computeWeeklyTrend,
  earliestCreatedIso,
} from '@/domain/insights';
import {
  diffDaysIso,
  orderedDayIndices,
  parseIsoDate,
  toIsoDate,
  todayIso as todayIsoFn,
} from '@/domain/week';
import { COLORS, FONTS } from '@/ui/theme';
import { useTranslation } from '@/i18n';

type Period = 'week' | 'month' | 'all';

/** Zlatá pro 100% (stejná rodina jako "perfect" gradient na home headeru). */
const GOLD = '#F2B01E';

/** Jedna hero dlaždice (číslo + popisek). */
function Tile({
  emoji,
  value,
  suffix,
  label,
  bg,
  textColor,
  subColor,
}: {
  emoji: string;
  value: number;
  suffix?: string;
  label: string;
  bg: string;
  textColor: string;
  subColor: string;
}) {
  return (
    <View style={[styles.tile, { backgroundColor: bg }]}>
      <Text style={styles.tileEmoji}>{emoji}</Text>
      <CountUpText value={value} suffix={suffix} style={[styles.tileValue, { color: textColor }]} />
      <Text style={[styles.tileLabel, { color: subColor }]}>{label}</Text>
    </View>
  );
}

/** Sloupcový trend graf: % uprostřed baru, 100% bar zlatý. */
function TrendChart({ data, trackColor }: { data: number[]; trackColor: string }) {
  return (
    <View style={styles.trendRow}>
      {data.map((rate, i) => {
        const pct = Math.round(rate * 100);
        const perfect = rate >= 0.999;
        const isLast = i === data.length - 1;
        const fillColor = perfect ? GOLD : isLast ? COLORS.primary : '#A6DDB4';
        return (
          <View key={i} style={styles.trendBarSlot}>
            <View style={[styles.trendBarTrack, { backgroundColor: trackColor }]}>
              <View
                style={[
                  styles.trendBarFill,
                  { height: `${Math.max(8, pct)}%`, backgroundColor: fillColor },
                ]}
              />
            </View>
            <View style={styles.trendLabelWrap} pointerEvents="none">
              <Text style={styles.trendLabel}>{pct}%</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Mini rozpad úspěšnosti po dnech v týdnu (Po–Ne), nejlepší den zvýrazněný. */
function WeekdayBars({
  rates,
  bestDow,
  order,
  dayLabels,
  trackColor,
  labelColor,
}: {
  rates: { rate: number; scheduled: number }[];
  bestDow: number | null;
  order: number[];
  dayLabels: readonly string[];
  trackColor: string;
  labelColor: string;
}) {
  return (
    <View style={styles.weekdayRow}>
      {order.map((dow) => {
        const w = rates[dow] ?? { rate: 0, scheduled: 0 };
        const pct = Math.round(w.rate * 100);
        const isBest = dow === bestDow && w.scheduled > 0;
        const noData = w.scheduled === 0;
        return (
          <View key={dow} style={styles.weekdaySlot}>
            <View style={[styles.weekdayTrack, { backgroundColor: trackColor }]}>
              <View
                style={[
                  styles.weekdayFill,
                  {
                    height: `${Math.max(noData ? 0 : 6, pct)}%`,
                    backgroundColor: isBest ? GOLD : '#A6DDB4',
                  },
                ]}
              />
            </View>
            <Text style={[styles.weekdayLabel, { color: isBest ? GOLD : labelColor }]}>
              {dayLabels[dow]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function StatsScreen() {
  const t = useTranslation();
  const C = useAppTheme();

  const activities = useAppStore((s) => s.activities);
  const completions = useAppStore((s) => s.completions);
  const isPremium = useIsPremium();
  const weekStartsOn = weekStartFlag(useSettingsStore((s) => s.weekStart));
  const today = todayIsoFn();

  const [period, setPeriod] = useState<Period>('week');

  const actsForStreak = useMemo(() => activities.map(toActivityForStreak), [activities]);
  const earliestIso = useMemo(() => earliestCreatedIso(actsForStreak), [actsForStreak]);

  const hasData = activities.length > 0;

  // Rozsah a šířka okna pro vybrané období.
  const { startIso, windowDays } = useMemo(() => {
    if (period === 'week') {
      return { startIso: toIsoDate(addDays(parseIsoDate(today), -6)), windowDays: 7 };
    }
    if (period === 'month') {
      return { startIso: toIsoDate(addDays(parseIsoDate(today), -29)), windowDays: 30 };
    }
    const start = earliestIso ?? today;
    return { startIso: start, windowDays: Math.max(1, diffDaysIso(start, today) + 1) };
  }, [period, today, earliestIso]);

  const range = useMemo(
    () => computeRangeStats(actsForStreak, completions, startIso, today),
    [actsForStreak, completions, startIso, today],
  );

  const currentStreak = useMemo(
    () => computeCurrentDailyStreak(actsForStreak, completions, today),
    [actsForStreak, completions, today],
  );

  const trend = useMemo(
    () => computeWeeklyTrend(actsForStreak, completions, today, 8, weekStartsOn),
    [actsForStreak, completions, today, weekStartsOn],
  );

  const bestWeekday = useMemo(
    () => computeBestWeekday(actsForStreak, completions, today),
    [actsForStreak, completions, today],
  );

  const weekdayBreakdown = useMemo(
    () => computeWeekdayBreakdown(actsForStreak, completions, today),
    [actsForStreak, completions, today],
  );

  const dayOrder = useMemo(() => orderedDayIndices(weekStartsOn), [weekStartsOn]);

  const byHabit = useMemo(
    () =>
      activities
        .map((a) => ({
          activity: a,
          stats: computeActivityStats(toActivityForStreak(a), completions, today, windowDays),
          streak: computeCurrentActivityStreak(toActivityForStreak(a), completions, today),
        }))
        .sort((x, y) => y.stats.completionRate - x.stats.completionRate),
    [activities, completions, today, windowDays],
  );

  const periodOptions: { key: Period; label: string }[] = [
    { key: 'week', label: t.stats.periodWeek },
    { key: 'month', label: t.stats.periodMonth },
    { key: 'all', label: t.stats.periodAll },
  ];

  const ratePct = Math.round(range.rate * 100);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.BG }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { color: C.text }]}>{t.stats.title}</Text>

        {!hasData ? (
          <View style={[styles.emptyCard, { backgroundColor: C.surface }]}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={[styles.emptyTitle, { color: C.text }]}>{t.stats.emptyTitle}</Text>
            <Text style={[styles.emptyBody, { color: C.textSecondary }]}>{t.stats.emptyBody}</Text>
          </View>
        ) : (
          <>
            {/* Přepínač období */}
            <View style={styles.periodRow}>
              <SegmentedPill
                options={periodOptions}
                value={period}
                onChange={setPeriod}
                isDark={C.isDark}
              />
            </View>

            {/* Hero dlaždice */}
            <View style={styles.tileGrid}>
              <Tile
                emoji="🔥"
                value={currentStreak}
                label={t.stats.tileCurrentStreak}
                bg={C.surface}
                textColor={C.text}
                subColor={C.textSecondary}
              />
              <Tile
                emoji="🎯"
                value={ratePct}
                suffix="%"
                label={t.stats.tileSuccessRate}
                bg={C.surface}
                textColor={C.text}
                subColor={C.textSecondary}
              />
              <Tile
                emoji="✅"
                value={range.totalCheckins}
                label={t.stats.tileCheckins}
                bg={C.surface}
                textColor={C.text}
                subColor={C.textSecondary}
              />
              <Tile
                emoji="📅"
                value={range.activeDays}
                label={t.stats.tileActiveDays}
                bg={C.surface}
                textColor={C.text}
                subColor={C.textSecondary}
              />
            </View>

            {isPremium ? (
              <>
                {/* Trend */}
                <View style={[styles.card, { backgroundColor: C.surface }]}>
                  <Text style={[styles.cardTitle, { color: C.text }]}>{t.stats.trendTitle}</Text>
                  <TrendChart
                    data={trend.map((p) => p.rate)}
                    trackColor={C.isDark ? '#2A2A2C' : '#F0F0F0'}
                  />
                </View>

                {/* Konzistence (heatmapa) */}
                <View style={[styles.card, { backgroundColor: C.surface }]}>
                  <Text style={[styles.cardTitle, { color: C.text }]}>
                    {t.stats.consistencyTitle}
                  </Text>
                  <HabitHeatmap
                    activities={activities}
                    completions={completions}
                    todayIso={today}
                    weekStartsOn={weekStartsOn}
                  />
                </View>

                {/* Dle návyku (seřazeno dle úspěšnosti) */}
                {byHabit.length > 0 ? (
                  <View style={[styles.card, { backgroundColor: C.surface }]}>
                    <Text style={[styles.cardTitle, { color: C.text }]}>{t.stats.byHabitTitle}</Text>
                    {byHabit.map(({ activity, stats, streak }) => {
                      const pct = Math.round(stats.completionRate * 100);
                      return (
                        <View key={activity.id} style={styles.habitRow}>
                          <Text style={styles.habitEmoji}>{activity.emoji}</Text>
                          <View style={styles.habitInfo}>
                            <View style={styles.habitLabelRow}>
                              <Text style={[styles.habitName, { color: C.text }]} numberOfLines={1}>
                                {activity.name}
                              </Text>
                              <View style={styles.habitMeta}>
                                {streak > 0 ? (
                                  <Text style={[styles.habitStreak, { color: C.textSecondary }]}>
                                    🔥{streak}
                                  </Text>
                                ) : null}
                                <Text style={[styles.habitPct, { color: activity.color }]}>
                                  {pct}%
                                </Text>
                              </View>
                            </View>
                            <View style={[styles.progressTrack, { backgroundColor: C.progressTrack }]}>
                              <View
                                style={[
                                  styles.progressFill,
                                  { backgroundColor: activity.color, width: `${pct}%` },
                                ]}
                              />
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                {/* Dny v týdnu — vizuální rozpad úspěšnosti + nejlepší den */}
                {bestWeekday ? (
                  <View style={[styles.card, { backgroundColor: C.surface }]}>
                    <Text style={[styles.cardTitle, { color: C.text }]}>{t.stats.weekdayTitle}</Text>
                    <WeekdayBars
                      rates={weekdayBreakdown}
                      bestDow={bestWeekday.dow}
                      order={dayOrder}
                      dayLabels={t.days.short}
                      trackColor={C.isDark ? '#2A2A2C' : '#F0F0F0'}
                      labelColor={C.textSecondary}
                    />
                    <View style={styles.insightRow}>
                      <Text style={styles.insightEmoji}>💡</Text>
                      <Text style={[styles.insightText, { color: C.text }]}>
                        {t.stats.bestDayInsight(t.days.long[bestWeekday.dow])}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </>
            ) : (
              <PremiumLockCard
                title={t.premium.lockStatsTitle}
                body={t.premium.lockStatsBody}
                ctaLabel={t.premium.unlockCta}
                onUnlock={() => void openPaywall()}
              />
            )}
          </>
        )}
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

  periodRow: { marginBottom: 16 },

  // Hero tiles
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 16,
  },
  tile: {
    width: '48.5%',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tileEmoji: { fontSize: 20, marginBottom: 6 },
  tileValue: {
    fontSize: 30,
    fontFamily: FONTS.extraBold,
    letterSpacing: -0.6,
  },
  tileLabel: {
    fontSize: 12.5,
    fontFamily: FONTS.semiBold,
    marginTop: 2,
  },

  // Generic card
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    marginBottom: 14,
  },

  // Trend chart
  trendRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 76,
    gap: 8,
  },
  trendBarSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  trendBarTrack: {
    height: '100%',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  trendBarFill: {
    width: '100%',
    borderRadius: 6,
  },
  trendLabelWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendLabel: {
    fontSize: 9.5,
    fontFamily: FONTS.bold,
    color: '#2A2A2A',
  },

  // Weekday breakdown
  weekdayRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 72,
    gap: 8,
  },
  weekdaySlot: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  weekdayTrack: {
    width: '100%',
    flex: 1,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  weekdayFill: { width: '100%', borderRadius: 6 },
  weekdayLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.semiBold,
    marginTop: 6,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },

  // By habit
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  habitEmoji: { fontSize: 22 },
  habitInfo: { flex: 1 },
  habitLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  habitName: { fontSize: 14, fontFamily: FONTS.semiBold, flex: 1, marginRight: 8 },
  habitMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  habitStreak: { fontSize: 12.5, fontFamily: FONTS.semiBold },
  habitPct: { fontSize: 14, fontFamily: FONTS.bold },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Insight
  insightEmoji: { fontSize: 22 },
  insightText: { flex: 1, fontSize: 14, fontFamily: FONTS.semiBold, lineHeight: 19 },

  // Empty
  emptyCard: {
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyEmoji: { fontSize: 32, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontFamily: FONTS.bold, textAlign: 'center' },
  emptyBody: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
