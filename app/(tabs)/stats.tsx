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
  computeBestDailyStreak,
  computeCurrentActivityStreak,
  computeCurrentDailyStreak,
  toActivityForStreak,
} from '@/domain/streaks';
import {
  computeBestWeekday,
  computeRangeStats,
  computeWeekdayBreakdown,
  crossedMilestone,
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

type TileBadgeTone = 'gold' | 'up' | 'muted';

function tileBadgeColors(tone: TileBadgeTone, isDark: boolean): { bg: string; color: string } {
  if (tone === 'gold') {
    return { bg: isDark ? 'rgba(242,176,30,0.18)' : '#FFF3D6', color: isDark ? '#F2B01E' : '#9A7A12' };
  }
  if (tone === 'up') {
    return {
      bg: isDark ? 'rgba(78,204,102,0.16)' : COLORS.primaryLight,
      color: isDark ? '#6EDB89' : '#1E8A3A',
    };
  }
  return { bg: isDark ? 'rgba(255,255,255,0.08)' : '#F0F0F0', color: isDark ? '#9BA39A' : '#7A8079' };
}

/** Odznak "▲/▼ N" vs. minulé srovnatelné období; `0` se ukáže jako `=`. */
function deltaBadge(delta: number, suffix = ''): { text: string; tone: TileBadgeTone } {
  if (delta === 0) return { text: '=', tone: 'muted' };
  return { text: `${delta > 0 ? '▲' : '▼'}${Math.abs(delta)}${suffix}`, tone: delta > 0 ? 'up' : 'muted' };
}

/** Jedna hero dlaždice (číslo + popisek), volitelně s malým odznakem (delta / rekord). */
function Tile({
  emoji,
  value,
  suffix,
  label,
  bg,
  textColor,
  subColor,
  badge,
  isDark,
}: {
  emoji: string;
  value: number;
  suffix?: string;
  label: string;
  bg: string;
  textColor: string;
  subColor: string;
  badge?: { text: string; tone: TileBadgeTone } | null;
  isDark: boolean;
}) {
  const badgeColors = badge ? tileBadgeColors(badge.tone, isDark) : null;
  return (
    <View style={[styles.tile, { backgroundColor: bg }]}>
      <View style={styles.tileTopRow}>
        <Text style={styles.tileEmoji}>{emoji}</Text>
        {badge && badgeColors ? (
          <View style={[styles.tileBadge, { backgroundColor: badgeColors.bg }]}>
            <Text style={[styles.tileBadgeText, { color: badgeColors.color }]}>{badge.text}</Text>
          </View>
        ) : null}
      </View>
      <CountUpText value={value} suffix={suffix} style={[styles.tileValue, { color: textColor }]} />
      <Text style={[styles.tileLabel, { color: subColor }]}>{label}</Text>
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
  const frozenDates = useAppStore((s) => s.frozenDates);
  const isPremium = useIsPremium();
  const weekStartsOn = weekStartFlag(useSettingsStore((s) => s.weekStart));
  const today = todayIsoFn();
  const yesterdayIso = useMemo(() => toIsoDate(addDays(parseIsoDate(today), -1)), [today]);

  const [period, setPeriod] = useState<Period>('week');

  const actsForStreak = useMemo(() => activities.map(toActivityForStreak), [activities]);
  const earliestIso = useMemo(() => earliestCreatedIso(actsForStreak), [actsForStreak]);
  const frozenSet = useMemo(() => new Set(frozenDates), [frozenDates]);

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

  // Stejné okno o krok dřív — základ pro delta odznaky na dlaždicích ("Vše" nemá
  // smysluplné "minulé celé období", takže se u něj delta skrývá).
  const prevRange = useMemo(() => {
    if (period === 'all') return null;
    const prevEndIso = toIsoDate(addDays(parseIsoDate(startIso), -1));
    const prevStartIso = toIsoDate(addDays(parseIsoDate(startIso), -windowDays));
    return computeRangeStats(actsForStreak, completions, prevStartIso, prevEndIso);
  }, [period, startIso, windowDays, actsForStreak, completions]);

  const currentStreak = useMemo(
    () => computeCurrentDailyStreak(actsForStreak, completions, today, frozenSet),
    [actsForStreak, completions, today, frozenSet],
  );
  const bestStreak = useMemo(
    () => computeBestDailyStreak(actsForStreak, completions, today, frozenSet),
    [actsForStreak, completions, today, frozenSet],
  );
  // Rekord "před dneškem" — pokud dnešní běžící streak posunul rekord dál, je
  // to čerstvý osobní rekord hodný oslavy (ne jen shoda s jediným existujícím číslem).
  const previousBestStreak = useMemo(
    () => computeBestDailyStreak(actsForStreak, completions, yesterdayIso, frozenSet),
    [actsForStreak, completions, yesterdayIso, frozenSet],
  );
  const isNewStreakRecord = previousBestStreak > 0 && bestStreak > previousBestStreak;

  // Celoživotní čísla — nezávislá na přepínači období, vždy "od začátku".
  const lifetimeRange = useMemo(
    () => computeRangeStats(actsForStreak, completions, earliestIso ?? today, today),
    [actsForStreak, completions, earliestIso, today],
  );
  const daysTracked = earliestIso ? diffDaysIso(earliestIso, today) + 1 : 0;
  const yesterdayLifetimeTotal = useMemo(
    () => computeRangeStats(actsForStreak, completions, earliestIso ?? today, yesterdayIso).totalCheckins,
    [actsForStreak, completions, earliestIso, today, yesterdayIso],
  );
  const crossedCheckinMilestone = crossedMilestone(yesterdayLifetimeTotal, lifetimeRange.totalCheckins);

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

  const streakBadge =
    bestStreak > 0
      ? isNewStreakRecord
        ? { text: t.stats.recordChip, tone: 'gold' as const }
        : { text: t.stats.recordChipBest(bestStreak), tone: 'muted' as const }
      : null;
  const rateBadge = prevRange
    ? deltaBadge(Math.round(range.rate * 100) - Math.round(prevRange.rate * 100), '%')
    : null;
  const checkinsBadge = prevRange ? deltaBadge(range.totalCheckins - prevRange.totalCheckins) : null;
  const activeDaysBadge = prevRange ? deltaBadge(range.activeDays - prevRange.activeDays) : null;

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

            {/* Celoživotní pás — vždy viditelný, nezávislý na přepínači období */}
            <View style={styles.lifetimeBand}>
              <Text style={styles.lifetimeLabel}>{t.stats.sinceStart(daysTracked)}</Text>
              <View style={styles.lifetimeRow}>
                <View style={styles.lifetimeStat}>
                  <Text style={styles.lifetimeNum}>🔥{bestStreak}</Text>
                  <Text style={styles.lifetimeSub}>{t.stats.lifetimeBestStreak}</Text>
                </View>
                <View style={styles.lifetimeDivider} />
                <View style={styles.lifetimeStat}>
                  <Text style={styles.lifetimeNum}>{lifetimeRange.totalCheckins}</Text>
                  <Text style={styles.lifetimeSub}>{t.stats.lifetimeTotalCheckins}</Text>
                </View>
                <View style={styles.lifetimeDivider} />
                <View style={styles.lifetimeStat}>
                  <Text style={styles.lifetimeNum}>{lifetimeRange.activeDays}</Text>
                  <Text style={styles.lifetimeSub}>{t.stats.tileActiveDays}</Text>
                </View>
              </View>
            </View>

            {/* Oslavný moment — nový rekord streaku nebo překročený milník splnění */}
            {crossedCheckinMilestone ? (
              <View style={[styles.celebrateCard, { backgroundColor: C.circleCardBg }]}>
                <Text style={styles.celebrateEmoji}>🎉</Text>
                <Text style={[styles.celebrateTitle, { color: C.text }]}>
                  {t.stats.celebrateMilestone(crossedCheckinMilestone)}
                </Text>
              </View>
            ) : isNewStreakRecord ? (
              <View style={[styles.celebrateCard, { backgroundColor: C.circleCardBg }]}>
                <Text style={styles.celebrateEmoji}>🏆</Text>
                <View style={styles.celebrateTextWrap}>
                  <Text style={[styles.celebrateTitle, { color: C.text }]}>
                    {t.stats.celebrateRecordTitle}
                  </Text>
                  <Text style={[styles.celebrateBody, { color: C.textSecondary }]}>
                    {t.stats.celebrateRecordBody}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Hero dlaždice */}
            <View style={styles.tileGrid}>
              <Tile
                emoji="🔥"
                value={currentStreak}
                label={t.stats.tileCurrentStreak}
                bg={C.surface}
                textColor={C.text}
                subColor={C.textSecondary}
                badge={streakBadge}
                isDark={C.isDark}
              />
              <Tile
                emoji="🎯"
                value={ratePct}
                suffix="%"
                label={t.stats.tileSuccessRate}
                bg={C.surface}
                textColor={C.text}
                subColor={C.textSecondary}
                badge={rateBadge}
                isDark={C.isDark}
              />
              <Tile
                emoji="✅"
                value={range.totalCheckins}
                label={t.stats.tileCheckins}
                bg={C.surface}
                textColor={C.text}
                subColor={C.textSecondary}
                badge={checkinsBadge}
                isDark={C.isDark}
              />
              <Tile
                emoji="📅"
                value={range.activeDays}
                label={t.stats.tileActiveDays}
                bg={C.surface}
                textColor={C.text}
                subColor={C.textSecondary}
                badge={activeDaysBadge}
                isDark={C.isDark}
              />
            </View>

            {isPremium ? (
              <>
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

  // Celoživotní pás — stejné proporce jako Summary karta na home (flat zelená, bílý text)
  lifetimeBand: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    paddingVertical: 15,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  lifetimeLabel: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    letterSpacing: 0.88,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 12,
  },
  lifetimeRow: { flexDirection: 'row', alignItems: 'flex-end' },
  lifetimeStat: { flex: 1 },
  lifetimeNum: {
    fontSize: 23,
    fontFamily: FONTS.extraBold,
    letterSpacing: -0.46,
    color: '#FFFFFF',
  },
  lifetimeSub: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
  },
  lifetimeDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: 14,
  },

  // Oslavná karta — rekord streaku / překročený milník splnění (fire akcent)
  celebrateCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  celebrateEmoji: { fontSize: 22 },
  celebrateTextWrap: { flex: 1 },
  celebrateTitle: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: FONTS.bold,
    lineHeight: 19,
  },
  celebrateBody: {
    fontSize: 12.5,
    fontFamily: FONTS.semiBold,
    marginTop: 2,
    lineHeight: 17,
  },

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
  tileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tileEmoji: { fontSize: 20 },
  tileBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tileBadgeText: {
    fontSize: 10.5,
    fontFamily: FONTS.bold,
  },
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
