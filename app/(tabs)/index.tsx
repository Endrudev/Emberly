import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppStore } from '@/store/useAppStore';
import { ActivityRow } from '@/ui/components/ActivityRow';
import { CircularProgress } from '@/ui/components/CircularProgress';
import { TAB_BAR_SPACE } from './_layout';
import { parseIsoDate, todayIso as todayIsoFn, weekDates } from '@/domain/week';
import { computeWeekProgress, computeCurrentActivityStreak, toActivityForStreak } from '@/domain/streaks';
import { COLORS, FONTS } from '@/ui/theme';
import { t } from '@/i18n/cs';

// ── Header height constants (dp) ─────────────────────────────────────────────
// Circle card: paddingVertical 15×2 + content ~62 ≈ 92, round up
const CIRCLE_H = 96;
// Bar card: paddingVertical 12×2 + (label 13 + gap 10 + bar 6) ≈ 51, round up
const BAR_H    = 56;
// Over how many scroll-px the transition runs
const TRANS    = 70;

// ─────────────────────────────────────────────────────────────────────────────

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

  // ── Scroll-driven header animation ────────────────────────────────────────
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerH = scrollY.interpolate({
    inputRange:  [0, TRANS],
    outputRange: [CIRCLE_H, BAR_H],
    extrapolate: 'clamp',
  });
  // Circle fades out in the first 70% of the transition
  const circleOpacity = scrollY.interpolate({
    inputRange:  [0, TRANS * 0.65],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  // Bar fades in from 30% to 100% of the transition
  const barOpacity = scrollY.interpolate({
    inputRange:  [TRANS * 0.3, TRANS],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // ── Theme ─────────────────────────────────────────────────────────────────
  const paperTheme = useTheme();
  const isDark = paperTheme.dark;

  const BG          = isDark ? '#1C1C1E' : '#ECEDE8';
  const textPrimary = isDark ? '#F2F2F7' : '#1A1A1A';
  const textMuted   = isDark ? '#8E8E93' : '#999999';
  const textSec     = isDark ? '#ABABAB' : '#666666';
  const cardBg      = isDark ? 'rgba(45,181,74,0.22)' : COLORS.primary;

  // ── Store ─────────────────────────────────────────────────────────────────
  const activities       = useAppStore((s) => s.activities);
  const completions      = useAppStore((s) => s.completions);
  const currentWeekStart = useAppStore((s) => s.currentWeekStart);
  const loaded           = useAppStore((s) => s.loaded);
  const loadAll          = useAppStore((s) => s.loadAll);
  const toggleCompletion = useAppStore((s) => s.toggleCompletion);

  useEffect(() => {
    if (!loaded) void loadAll();
  }, [loaded, loadAll]);

  const today = todayIsoFn();
  const currentWeekDates = useMemo(
    () => weekDates(parseIsoDate(currentWeekStart)),
    [currentWeekStart],
  );

  const weekProgress = useMemo(
    () => computeWeekProgress(activities.map(toActivityForStreak), completions, currentWeekStart),
    [activities, completions, currentWeekStart],
  );

  const progressRatio =
    weekProgress.plannedCount > 0
      ? weekProgress.completedCount / weekProgress.plannedCount
      : 0;
  const progressPct = Math.round(progressRatio * 100);

  const activityStreaks = useMemo(() => {
    const map = new Map<number, number>();
    for (const a of activities) {
      const streak = computeCurrentActivityStreak(toActivityForStreak(a), completions, today);
      map.set(a.id, streak);
    }
    return map;
  }, [activities, completions, today]);

  const completionsByActivity = useMemo(() => {
    const map = new Map<number, Set<string>>();
    for (const c of completions) {
      let set = map.get(c.activityId);
      if (!set) { set = new Set(); map.set(c.activityId, set); }
      set.add(c.date);
    }
    return map;
  }, [completions]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: BG }]}>

      {/* ── Page title ── */}
      <Text style={[styles.pageTitle, { color: textPrimary }]}>{t.tabs.habits}</Text>

      {/* ── Period filter tabs ── */}
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
                <Text style={[
                  styles.modeTabLabel,
                  { color: active ? COLORS.primary : textMuted },
                  active && styles.modeTabLabelActive,
                ]}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Animated header zone ────────────────────────────────────────────────
        *  Both cards are position:absolute inside this Animated.View.
        *  Height shrinks from CIRCLE_H → BAR_H as the user scrolls down.
        *  overflow:hidden clips the taller circle card once height < CIRCLE_H.
        ─────────────────────────────────────────────────────────────────────── */}
      {weekProgress.plannedCount > 0 && (
        // headerZone is always green — both child cards are transparent.
        // This prevents the white flash that occurs when two semi-transparent
        // coloured layers are composited on top of the page background.
        <Animated.View style={[
          styles.headerZone,
          { height: headerH, backgroundColor: cardBg },
          isDark && { elevation: 0, shadowOpacity: 0 },
        ]}>

          {/* ── State A: big circle progress card ── */}
          <Animated.View style={[styles.card, styles.circleCard, { opacity: circleOpacity }]}>
            <CircularProgress
              size={56}
              strokeWidth={6}
              progress={progressRatio}
              color="#FFFFFF"
              trackColor="rgba(255,255,255,0.30)"
            >
              <Text style={styles.circlePct}>{progressPct}%</Text>
            </CircularProgress>

            <View style={styles.circleText}>
              <Text style={styles.heroLabel}>{t.home.thisWeekLabel}</Text>
              <Text style={styles.heroCount}>
                {t.home.completedCount(weekProgress.completedCount, weekProgress.plannedCount)}
              </Text>
              <Text style={styles.heroMeta}>{t.home.completedLabel}</Text>
            </View>
          </Animated.View>

          {/* ── State B: compact bar ── */}
          <Animated.View style={[styles.card, styles.barCard, { opacity: barOpacity }]}>
            <View style={styles.barHeader}>
              <Text style={styles.heroLabel}>{t.home.thisWeekLabel}</Text>
              {/* Sibling Texts — avoids nested-Text rendering quirks in RN */}
              <View style={styles.barRight}>
                <Text style={styles.barCount}>
                  {t.home.completedCount(weekProgress.completedCount, weekProgress.plannedCount)}
                </Text>
                <Text style={styles.barPct}>{progressPct}%</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              {/* No borderRadius on fill — at 1–4% width the rounded ends overlap
                  and the fill disappears. Parent overflow:hidden provides the clip. */}
              <View style={[styles.progressFill, { width: `${progressPct}%` as `${number}%` }]} />
            </View>
          </Animated.View>

        </Animated.View>
      )}

      {/* ── Scrollable activities ── */}
      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        style={{ flex: 1, backgroundColor: BG }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {activities.length > 0 ? (
          <>
            {/* ── Section header ── */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: textMuted }]}>
                {t.home.habitsSection}
              </Text>
              <Text style={[styles.sectionCount, { color: textMuted }]}>
                {t.home.activeCount(activities.length)}
              </Text>
            </View>

            {/* ── Individual activity cards ── */}
            {activities.map((item) => (
              <ActivityRow
                key={item.id}
                activity={item}
                weekDates={currentWeekDates}
                todayIso={today}
                completedByDate={completionsByActivity.get(item.id) ?? EMPTY_SET}
                currentStreak={activityStreaks.get(item.id) ?? 0}
                onTogglePress={(dateIso) => { void toggleCompletion(item.id, dateIso); }}
                onLongPress={() => router.push(`/activity/${item.id}`)}
                isDark={isDark}
              />
            ))}
          </>
        ) : loaded ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎯</Text>
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>{t.home.appTitle}</Text>
            <Text style={[styles.emptyBody, { color: textSec }]}>{t.home.empty}</Text>
          </View>
        ) : null}
      </Animated.ScrollView>

      {/* ── FAB ── */}
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
  safe: { flex: 1 },

  // ── Page title ─────────────────────────────────────────────────────────────
  pageTitle: {
    fontSize: 28,
    fontFamily: FONTS.extraBold,
    letterSpacing: -0.56,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },

  // ── Period filter tabs ──────────────────────────────────────────────────────
  modeTabsWrap: { paddingBottom: 8 },
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
  modeTabActive: { backgroundColor: COLORS.primaryLight },
  modeTabLabel: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
  },
  modeTabLabelActive: {
    fontFamily: FONTS.bold,
  },

  // ── Animated header zone ───────────────────────────────────────────────────
  // This View owns the green background + shadow so child cards can be
  // transparent — eliminating the white flash during the crossfade.
  headerZone: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },

  // Base card — no background/shadow, those are on headerZone
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },

  // State A: circle layout (row)
  circleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 18,
    gap: 16,
  },
  circleText: { flex: 1 },
  circlePct: {
    fontSize: 15,
    fontFamily: FONTS.extraBold,
    color: '#FFFFFF',
    letterSpacing: -0.30,
  },
  heroLabel: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.88,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  heroCount: {
    fontSize: 23,
    fontFamily: FONTS.extraBold,
    color: '#FFFFFF',
    letterSpacing: -0.46,
    lineHeight: 27,
  },
  heroMeta: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: 'rgba(255,255,255,0.68)',
    marginTop: 2,
  },

  // State B: bar layout (column)
  barCard: {
    flexDirection: 'column',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  barHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  barCount: {
    fontSize: 14,
    fontFamily: FONTS.extraBold,
    color: '#FFFFFF',
    letterSpacing: -0.28,
  },
  barPct: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: 'rgba(255,255,255,0.70)',
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    // No borderRadius — at 1–4 % the rounded ends overlap and the fill
    // visually disappears. The parent's overflow:hidden + borderRadius
    // already clips the left edge cleanly.
  },

  // ── ScrollView content ──────────────────────────────────────────────────────
  listContent: {
    paddingTop: 4,
    paddingBottom: TAB_BAR_SPACE + 70,
  },

  // ── Section header ─────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: FONTS.extraBold,
    letterSpacing: 0.96,
    textTransform: 'uppercase',
  },
  sectionCount: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.bold, marginBottom: 8 },
  emptyBody:  { fontSize: 14, fontFamily: FONTS.semiBold, textAlign: 'center' },

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
