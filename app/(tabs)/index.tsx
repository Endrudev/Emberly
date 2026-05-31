import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { cs as dateFnsCs } from 'date-fns/locale';

import { useAppStore } from '@/store/useAppStore';
import { ActivityRow } from '@/ui/components/ActivityRow';
import { CircularProgress } from '@/ui/components/CircularProgress';
import { mondayOfIso, parseIsoDate, todayIso as todayIsoFn, weekDates } from '@/domain/week';
import { computeWeekProgress, computeCurrentActivityStreak, toActivityForStreak } from '@/domain/streaks';
import { COLORS } from '@/ui/theme';
import { t } from '@/i18n/cs';

type ViewMode = 'today' | 'weekly' | 'monthly' | 'overall';

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: 'today', label: t.home.viewToday },
  { key: 'weekly', label: t.home.viewWeekly },
  { key: 'monthly', label: t.home.viewMonthly },
  { key: 'overall', label: t.home.viewOverall },
];

const EMPTY_SET: ReadonlySet<string> = new Set();

export default function HomeScreen() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');

  const activities = useAppStore((s) => s.activities);
  const completions = useAppStore((s) => s.completions);
  const currentWeekStart = useAppStore((s) => s.currentWeekStart);
  const loaded = useAppStore((s) => s.loaded);
  const loadAll = useAppStore((s) => s.loadAll);
  const toggleCompletion = useAppStore((s) => s.toggleCompletion);

  useEffect(() => {
    if (!loaded) void loadAll();
  }, [loaded, loadAll]);

  const today = todayIsoFn();
  const currentWeekDates = useMemo(
    () => weekDates(parseIsoDate(currentWeekStart)),
    [currentWeekStart],
  );

  // Weekly progress summary
  const weekProgress = useMemo(
    () => computeWeekProgress(activities.map(toActivityForStreak), completions, currentWeekStart),
    [activities, completions, currentWeekStart],
  );

  // Days left in current week (0 = Sunday, max 6 = Monday)
  const daysLeftInWeek = useMemo(() => {
    const isCurrentWeek = currentWeekStart === mondayOfIso(parseIsoDate(today));
    if (!isCurrentWeek) return 0;
    const dow = ((new Date().getDay() + 6) % 7); // Mon=0..Sun=6
    return 6 - dow;
  }, [currentWeekStart, today]);

  const progressRatio =
    weekProgress.plannedCount > 0
      ? weekProgress.completedCount / weekProgress.plannedCount
      : 0;

  const progressPct = Math.round(progressRatio * 100);

  const summaryLabel = useMemo(() => {
    if (progressPct >= 100) return t.home.greatWeek;
    if (progressPct >= 75) return t.home.goodWeek;
    if (progressPct >= 50) return t.home.okWeek;
    return t.home.badWeek;
  }, [progressPct]);

  // Per-activity streak
  const activityStreaks = useMemo(() => {
    const map = new Map<number, number>();
    for (const a of activities) {
      const streak = computeCurrentActivityStreak(toActivityForStreak(a), completions, today);
      map.set(a.id, streak);
    }
    return map;
  }, [activities, completions, today]);

  // Completions indexed by activity
  const completionsByActivity = useMemo(() => {
    const map = new Map<number, Set<string>>();
    for (const c of completions) {
      let set = map.get(c.activityId);
      if (!set) { set = new Set(); map.set(c.activityId, set); }
      set.add(c.date);
    }
    return map;
  }, [completions]);

  // Week label for header
  const weekLabel = useMemo(() => {
    const start = parseIsoDate(currentWeekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${format(start, 'd. MMM', { locale: dateFnsCs })} – ${format(end, 'd. MMM', { locale: dateFnsCs })}`;
  }, [currentWeekStart]);

  const isCurrentWeek = currentWeekStart === mondayOfIso(parseIsoDate(today));

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── App header ── */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="menu" size={24} color={COLORS.text} />
        <Text style={styles.appTitle}>{t.home.appTitle}</Text>
        {/* spacer — + button moved to FAB above tab bar */}
        <View style={{ width: 26 }} />
      </View>

      {/* ── View mode tabs ── */}
      <View style={styles.modeTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeTabsInner}>
          {VIEW_MODES.map((m) => (
            <Pressable
              key={m.key}
              onPress={() => setViewMode(m.key)}
              style={[styles.modeTab, m.key === viewMode && styles.modeTabActive]}
            >
              <Text style={[styles.modeTabLabel, m.key === viewMode && styles.modeTabLabelActive]}>
                {m.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={activities}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* ── Weekly summary card ── */}
            {weekProgress.plannedCount > 0 ? (
              <View style={styles.summaryCard}>
                <CircularProgress
                  size={72}
                  strokeWidth={7}
                  progress={progressRatio}
                  color={COLORS.primary}
                  trackColor="#D4EED9"
                >
                  <Text style={styles.summaryPct}>{progressPct}%</Text>
                </CircularProgress>
                <View style={styles.summaryText}>
                  <Text style={styles.summaryWeekLabel}>{t.home.weeklyLabel}</Text>
                  <Text style={styles.summaryMain}>
                    {t.home.completedThisWeek(weekProgress.completedCount, weekProgress.plannedCount)}
                  </Text>
                  <Text style={styles.summaryWeekInfo}>
                    {isCurrentWeek && daysLeftInWeek > 0
                      ? `🔥 ${t.home.daysLeftThisWeek(daysLeftInWeek)}`
                      : weekLabel}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* ── Week navigation ── */}
            <View style={styles.weekNav}>
              <Pressable
                onPress={() => useAppStore.getState().goToPreviousWeek()}
                hitSlop={10}
                style={styles.navBtn}
              >
                <MaterialCommunityIcons name="chevron-left" size={20} color={COLORS.textSecondary} />
              </Pressable>
              <Pressable onPress={() => useAppStore.getState().goToCurrentWeek()} hitSlop={10}>
                <Text style={styles.weekNavLabel}>
                  {isCurrentWeek ? t.home.thisWeek : weekLabel}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => useAppStore.getState().goToNextWeek()}
                hitSlop={10}
                style={styles.navBtn}
              >
                <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
              </Pressable>
            </View>
          </>
        }
        ListEmptyComponent={
          loaded ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎯</Text>
              <Text style={styles.emptyTitle}>{t.home.appTitle}</Text>
              <Text style={styles.emptyBody}>{t.home.empty}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <ActivityRow
            activity={item}
            weekDates={currentWeekDates}
            todayIso={today}
            completedByDate={completionsByActivity.get(item.id) ?? EMPTY_SET}
            currentStreak={activityStreaks.get(item.id) ?? 0}
            onTogglePress={(dateIso) => { void toggleCompletion(item.id, dateIso); }}
            onLongPress={() => router.push(`/activity/${item.id}`)}
          />
        )}
      />

      {/* ── Floating "+" button above tab bar ── */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/activity/new')}
        accessibilityLabel={t.home.addActivity}
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: COLORS.background,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  modeTabs: {
    backgroundColor: COLORS.background,
    paddingBottom: 4,
  },
  modeTabsInner: {
    paddingHorizontal: 16,
    gap: 4,
    flexDirection: 'row',
  },
  modeTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modeTabActive: {
    backgroundColor: COLORS.primaryLight,
  },
  modeTabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  modeTabLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 100,
    paddingTop: 4,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryPct: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  summaryText: { flex: 1 },
  summaryWeekLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  summaryMain: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  summaryWeekInfo: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  weekNavLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  navBtn: {
    padding: 4,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyBody: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
