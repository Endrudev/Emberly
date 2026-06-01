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
import { TAB_BAR_SPACE } from './_layout';
import { mondayOfIso, parseIsoDate, todayIso as todayIsoFn, weekDates } from '@/domain/week';
import { computeWeekProgress, computeCurrentActivityStreak, toActivityForStreak } from '@/domain/streaks';
import { COLORS } from '@/ui/theme';
import { t } from '@/i18n/cs';

// ─── Warm off-white background matching the design ────────────────────────────
const BG = '#FAF8F5';

type ViewMode = 'today' | 'weekly' | 'monthly' | 'overall';

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: 'today',   label: t.home.viewToday   },
  { key: 'weekly',  label: t.home.viewWeekly  },
  { key: 'monthly', label: t.home.viewMonthly },
  { key: 'overall', label: t.home.viewOverall },
];

const EMPTY_SET: ReadonlySet<string> = new Set();

export default function HomeScreen() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');

  const activities      = useAppStore((s) => s.activities);
  const completions     = useAppStore((s) => s.completions);
  const currentWeekStart = useAppStore((s) => s.currentWeekStart);
  const loaded          = useAppStore((s) => s.loaded);
  const loadAll         = useAppStore((s) => s.loadAll);
  const toggleCompletion = useAppStore((s) => s.toggleCompletion);

  useEffect(() => {
    if (!loaded) void loadAll();
  }, [loaded, loadAll]);

  const today = todayIsoFn();
  const currentWeekDates = useMemo(
    () => weekDates(parseIsoDate(currentWeekStart)),
    [currentWeekStart],
  );

  // Weekly progress
  const weekProgress = useMemo(
    () => computeWeekProgress(activities.map(toActivityForStreak), completions, currentWeekStart),
    [activities, completions, currentWeekStart],
  );

  // Days left in current week
  const daysLeftInWeek = useMemo(() => {
    const isCurrentWeek = currentWeekStart === mondayOfIso(parseIsoDate(today));
    if (!isCurrentWeek) return 0;
    const dow = (new Date().getDay() + 6) % 7; // Mon=0..Sun=6
    return 6 - dow;
  }, [currentWeekStart, today]);

  const progressRatio =
    weekProgress.plannedCount > 0
      ? weekProgress.completedCount / weekProgress.plannedCount
      : 0;
  const progressPct = Math.round(progressRatio * 100);

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

  // Week label for navigation
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
        <Pressable hitSlop={12} accessibilityRole="button" accessibilityLabel="Menu">
          <MaterialCommunityIcons name="menu" size={24} color={COLORS.primary} />
        </Pressable>

        {/* Dual-colour title: "Habit" dark + "Radar" green */}
        <View style={styles.titleRow}>
          <Text style={styles.appTitleDark}>Habit </Text>
          <Text style={styles.appTitleGreen}>Radar</Text>
        </View>

        {/* Sun / theme button */}
        <Pressable hitSlop={12} accessibilityRole="button" accessibilityLabel="Nastavení tématu">
          <View style={styles.sunBtn}>
            <Text style={styles.sunIcon}>☀️</Text>
          </View>
        </Pressable>
      </View>

      {/* ── Period tabs: Today / Weekly / Monthly / Overall ── */}
      <View style={styles.modeTabsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modeTabsInner}
        >
          {VIEW_MODES.map((m) => {
            const active = m.key === viewMode;
            return (
              <Pressable
                key={m.key}
                onPress={() => setViewMode(m.key)}
                style={[styles.modeTab, active && styles.modeTabActive]}
              >
                <Text style={[styles.modeTabLabel, active && styles.modeTabLabelActive]}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={activities}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}

        ListHeaderComponent={
          <>
            {/* ── Summary card — solid green ── */}
            {weekProgress.plannedCount > 0 ? (
              <View style={styles.summaryCard}>
                {/* Circular progress — white ring on green */}
                <CircularProgress
                  size={76}
                  strokeWidth={7}
                  progress={progressRatio}
                  color="#FFFFFF"
                  trackColor="rgba(255,255,255,0.30)"
                >
                  <Text style={styles.summaryPct}>{progressPct}%</Text>
                </CircularProgress>

                {/* Stats text */}
                <View style={styles.summaryText}>
                  <Text style={styles.summaryWeekLabel}>{t.home.thisWeekLabel}</Text>
                  <View style={styles.summaryCountRow}>
                    <Text style={styles.summaryCount}>
                      {t.home.completedCount(weekProgress.completedCount, weekProgress.plannedCount)}
                    </Text>
                    <Text style={styles.summaryDone}> {t.home.completedLabel}</Text>
                  </View>
                  <Text style={styles.summaryWeekInfo}>
                    {isCurrentWeek && daysLeftInWeek > 0
                      ? `🔥 ${t.home.daysLeftShort(daysLeftInWeek)}`
                      : weekLabel}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* ── Subtle week navigation ── */}
            <View style={styles.weekNav}>
              <Pressable
                onPress={() => useAppStore.getState().goToPreviousWeek()}
                hitSlop={10}
                style={styles.navBtn}
              >
                <MaterialCommunityIcons name="chevron-left" size={18} color={COLORS.textSecondary} />
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
                <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.textSecondary} />
              </Pressable>
            </View>

            {/* ── "VAŠE NÁVYKY  X aktivní" section header ── */}
            {activities.length > 0 ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t.home.habitsSection}</Text>
                <Text style={styles.sectionCount}>
                  {t.home.activeCount(activities.length)}
                </Text>
              </View>
            ) : null}
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

      {/* ── Floating "+" FAB above tab bar ── */}
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
  safe: {
    flex: 1,
    backgroundColor: BG,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: BG,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  appTitleDark: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  appTitleGreen: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.3,
  },
  sunBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF3D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunIcon: {
    fontSize: 18,
  },

  // ── Period tabs ──────────────────────────────────────────────────────────────
  modeTabsWrap: {
    backgroundColor: BG,
    paddingBottom: 8,
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
    color: '#AAAAAA',
  },
  modeTabLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // ── FlatList content ─────────────────────────────────────────────────────────
  listContent: {
    paddingBottom: TAB_BAR_SPACE + 70,
    paddingTop: 4,
  },

  // ── Summary card — SOLID GREEN ───────────────────────────────────────────────
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 20,
    padding: 20,
    gap: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.30,
    shadowRadius: 14,
    elevation: 8,
  },
  summaryPct: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summaryText: {
    flex: 1,
  },
  summaryWeekLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  summaryCount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  summaryDone: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.90)',
  },
  summaryWeekInfo: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },

  // ── Week navigation ──────────────────────────────────────────────────────────
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  weekNavLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  navBtn: {
    padding: 4,
  },

  // ── "VAŠE NÁVYKY / X aktivní" ─────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#AAAAAA',
    letterSpacing: 1.2,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#AAAAAA',
  },

  // ── Empty state ──────────────────────────────────────────────────────────────
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyBody: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },

  // ── FAB ──────────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    right: 24,
    bottom: TAB_BAR_SPACE + 10,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 10,
  },
});
