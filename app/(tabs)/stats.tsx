import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TAB_BAR_SPACE } from './_layout';
import { Text } from 'react-native-paper';

import { useAppStore } from '@/store/useAppStore';
import { useAppTheme } from '@/ui/useAppTheme';
import { CircularProgress } from '@/ui/components/CircularProgress';
import { HabitHeatmap } from '@/ui/components/HabitHeatmap';
import {
  computeWeekProgress,
  computeActivityStats,
  toActivityForStreak,
} from '@/domain/streaks';
import { mondayOfIso, parseIsoDate, todayIso as todayIsoFn } from '@/domain/week';
import { COLORS } from '@/ui/theme';
import { t } from '@/i18n/cs';

export default function StatsScreen() {
  const C = useAppTheme();

  const activities = useAppStore((s) => s.activities);
  const completions = useAppStore((s) => s.completions);
  const today = todayIsoFn();
  const currentWeekStart = mondayOfIso(parseIsoDate(today));

  const weekProgress = useMemo(
    () => computeWeekProgress(activities.map(toActivityForStreak), completions, currentWeekStart),
    [activities, completions, currentWeekStart],
  );

  const progressRatio =
    weekProgress.plannedCount > 0
      ? weekProgress.completedCount / weekProgress.plannedCount
      : 0;
  const progressPct = Math.round(progressRatio * 100);

  const daysLeftInWeek = useMemo(() => {
    const dow = (new Date().getDay() + 6) % 7;
    return 6 - dow;
  }, []);

  const summaryLabel = useMemo(() => {
    if (progressPct >= 100) return t.stats.greatWeek;
    if (progressPct >= 75)  return t.stats.goodWeek;
    if (progressPct >= 50)  return t.stats.okWeek;
    return t.stats.badWeek;
  }, [progressPct]);

  const activityStats = useMemo(
    () => activities.map((a) => computeActivityStats(toActivityForStreak(a), completions, today)),
    [activities, completions, today],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.BG }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={[styles.pageTitle, { color: C.text }]}>{t.stats.title}</Text>

        {/* Weekly summary card */}
        {weekProgress.plannedCount > 0 ? (
          <View style={[styles.summaryCard, { backgroundColor: C.summaryCardBg }]}>
            <CircularProgress
              size={80}
              strokeWidth={8}
              progress={progressRatio}
              color={COLORS.primary}
              trackColor={C.isDark ? 'rgba(45,181,74,0.25)' : '#D4EED9'}
            >
              <Text style={styles.summaryPct}>{progressPct}%</Text>
            </CircularProgress>
            <View style={styles.summaryText}>
              <Text style={[styles.summaryTitle, { color: C.text }]}>{summaryLabel}</Text>
              <Text style={[styles.summaryDetail, { color: C.textSecondary }]}>
                {t.stats.checkInsDetail(
                  weekProgress.completedCount,
                  weekProgress.plannedCount,
                  daysLeftInWeek,
                )}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Heatmap */}
        <View style={[styles.card, { backgroundColor: C.surface }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: C.text }]}>{t.stats.last15Weeks}</Text>
          </View>
          <HabitHeatmap activities={activities} completions={completions} todayIso={today} />
        </View>

        {/* By habit */}
        {activityStats.length > 0 ? (
          <View style={[styles.card, { backgroundColor: C.surface }]}>
            <Text style={[styles.cardTitle, { color: C.text }]}>{t.stats.byHabit}</Text>
            {activityStats.map((stat, i) => {
              const activity = activities[i];
              if (!activity) return null;
              const pct = Math.round(stat.completionRate * 100);
              return (
                <View key={stat.activityId} style={styles.habitRow}>
                  <Text style={styles.habitEmoji}>{activity.emoji}</Text>
                  <View style={styles.habitInfo}>
                    <View style={styles.habitLabelRow}>
                      <Text style={[styles.habitName, { color: C.text }]}>{activity.name}</Text>
                      <Text style={[styles.habitPct, { color: activity.color }]}>{pct}%</Text>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: C.progressTrack }]}>
                      <View
                        style={[styles.progressFill, { width: `${pct}%`, backgroundColor: activity.color }]}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: C.textTertiary }]}>{t.stats.noData}</Text>
          </View>
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
    fontWeight: '800',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  summaryPct: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  summaryText: { flex: 1 },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryDetail: {
    fontSize: 13,
    lineHeight: 18,
  },
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
  cardHeader: { marginBottom: 12 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
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
    marginBottom: 5,
  },
  habitName: { fontSize: 14, fontWeight: '600' },
  habitPct:  { fontSize: 14, fontWeight: '700' },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 15 },
});
