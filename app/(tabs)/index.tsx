import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { Activity } from '@/domain/types';
import { useAppStore } from '@/store/useAppStore';
import { ActivityRow } from '@/ui/components/ActivityRow';
import { TodayActivityRow } from '@/ui/components/TodayActivityRow';
import { CircularProgress } from '@/ui/components/CircularProgress';
import { ActivityActionSheet } from '@/ui/components/ActivityActionSheet';
import { TAB_BAR_SPACE } from './_layout';
import { dowOf, parseIsoDate, todayIso as todayIsoFn, weekDates } from '@/domain/week';
import { computeWeekProgress, computeCurrentActivityStreak, toActivityForStreak } from '@/domain/streaks';
import { COLORS, FONTS } from '@/ui/theme';
import { useTranslation } from '@/i18n';
import { CountUpText } from '@/ui/anim/CountUpText';
import { Celebration } from '@/ui/anim/Celebration';
import { useCelebrationTrigger } from '@/ui/anim/useCelebrationTrigger';
import { useReduceMotion } from '@/ui/anim/useReduceMotion';
import ReAnimated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { tapLight } from '@/ui/anim/haptics';
import { AnimatedPressable } from '@/ui/anim/AnimatedPressable';

// ── Header height constants (dp) ─────────────────────────────────────────────
// Circle card: paddingVertical 15×2 + content ~62 ≈ 92, round up
const CIRCLE_H = 96;
// Bar card: paddingVertical 12×2 + (label 13 + gap 10 + bar 6) ≈ 51, round up
const BAR_H    = 56;
// How far the header slides up as it collapses (= height it gives back).
const COLLAPSE = CIRCLE_H - BAR_H;
// Gap below the header before the list content starts.
const HEADER_GAP = 8;

// ─────────────────────────────────────────────────────────────────────────────

type ViewMode = 'today' | 'weekly';

const EMPTY_SET: ReadonlySet<string> = new Set();

/** Spring for the Today/Weekly segment pill — gentle, no overshoot. */
const MODE_SPRING = { damping: 18, stiffness: 200, mass: 0.9 };

type ModeFrame = { x: number; width: number; height: number };

export default function HomeScreen() {
  const t = useTranslation();
  const router = useRouter();

  const VIEW_MODES: { key: ViewMode; label: string }[] = [
    { key: 'today',  label: t.home.viewToday  },
    { key: 'weekly', label: t.home.viewWeekly },
  ];
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  // The list mode is deferred: tapping a tab updates `viewMode` immediately
  // (pill slides, haptic fires, header updates), while the expensive list
  // remount (heavy week rows) runs at low priority via concurrent rendering —
  // it no longer blocks the frame, so the switch feels instant.
  const listMode = useDeferredValue(viewMode);
  const isListToday = listMode === 'today';

  // ── Scroll-driven header animation (UI thread via Reanimated) ─────────────
  // The scroll position lives in a shared value updated by an animated scroll
  // handler, and the header collapse is interpolated inside useAnimatedStyle —
  // all on the UI thread, so scrolling never pays per-frame JS/relayout cost.
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  // Header collapses by sliding up (transform only — never animates layout,
  // so scrolling pays zero per-frame layout cost).
  const headerZoneAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -interpolate(scrollY.value, [0, COLLAPSE], [0, COLLAPSE], Extrapolation.CLAMP) },
    ],
  }));
  // Circle fades out in the first 65% of the collapse.
  const circleCardAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, COLLAPSE * 0.65], [1, 0], Extrapolation.CLAMP),
  }));
  // Bar fades in from 30% to 100% of the collapse.
  const barCardAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [COLLAPSE * 0.3, COLLAPSE], [0, 1], Extrapolation.CLAMP),
  }));

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
  const deleteActivity   = useAppStore((s) => s.deleteActivity);

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

  // ── Today-mode data ──────────────────────────────────────────────────────
  const todayDow = useMemo(() => dowOf(new Date()), []);

  const todayActivities = useMemo(
    () => activities.filter((a) => a.scheduledDays.includes(todayDow)),
    [activities, todayDow],
  );

  const todayCompletedCount = useMemo(
    () =>
      todayActivities.reduce(
        (n, a) => n + ((completionsByActivity.get(a.id)?.has(today) ?? false) ? 1 : 0),
        0,
      ),
    [todayActivities, completionsByActivity, today],
  );

  const todayPlannedCount = todayActivities.length;
  const todayRatio =
    todayPlannedCount > 0 ? todayCompletedCount / todayPlannedCount : 0;
  const todayPct = Math.round(todayRatio * 100);
  const todayLeft = Math.max(0, todayPlannedCount - todayCompletedCount);

  // ── Header data (mode-dependent) ──────────────────────────────────────────
  const isToday = viewMode === 'today';
  const headerVisible = isToday ? todayPlannedCount > 0 : weekProgress.plannedCount > 0;
  const headerLabel  = isToday ? t.home.todayLabel : t.home.thisWeekLabel;
  const headerCount  = isToday
    ? t.home.completedCount(todayCompletedCount, todayPlannedCount)
    : t.home.completedCount(weekProgress.completedCount, weekProgress.plannedCount);
  const headerRatio  = isToday ? todayRatio : progressRatio;
  const headerPct    = isToday ? todayPct   : progressPct;
  const headerMeta   = isToday
    ? (todayLeft > 0 ? `🔥 ${t.home.habitsLeftToday(todayLeft)}` : t.home.allDoneToday)
    : t.home.completedLabel;

  // Stable row callbacks — id is passed as an argument so a single function
  // serves every row. Keeps React.memo on the rows effective: unrelated
  // re-renders of this screen (onLayout measuring, celebration state, etc.)
  // no longer re-render the whole list.
  const handleToggle = useCallback(
    (activityId: number, dateIso: string) => { void toggleCompletion(activityId, dateIso); },
    [toggleCompletion],
  );
  const handleToggleToday = useCallback(
    (activityId: number) => { void toggleCompletion(activityId, today); },
    [toggleCompletion, today],
  );
  // ── Activity action sheet (Edit / Delete) ──────────────────────────────────
  const [actionSheetActivityId, setActionSheetActivityId] = useState<number | null>(null);
  const actionSheetActivity = useMemo(
    () => activities.find((a) => a.id === actionSheetActivityId) ?? null,
    [activities, actionSheetActivityId],
  );

  const handleOpenActivity = useCallback(
    (activityId: number) => { setActionSheetActivityId(activityId); },
    [],
  );
  const handleCloseActionSheet = useCallback(() => setActionSheetActivityId(null), []);
  const handleEditActivity = useCallback(
    (activityId: number) => {
      setActionSheetActivityId(null);
      router.push(`/activity/${activityId}`);
    },
    [router],
  );
  const handleDeleteActivity = useCallback(
    (activityId: number) => {
      setActionSheetActivityId(null);
      Alert.alert(t.activity.deleteConfirmTitle, t.activity.deleteConfirmBody, [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete,
          style: 'destructive',
          onPress: () => { void deleteActivity(activityId); },
        },
      ]);
    },
    [deleteActivity, t],
  );

  // ── List edit mode (toggled from the section header) ───────────────────────
  const [editMode, setEditMode] = useState(false);
  const handleToggleEditMode = useCallback(() => {
    tapLight();
    setEditMode((v) => !v);
  }, []);

  // ── 100% celebration ───────────────────────────────────────────────────────
  const reduceMotion = useReduceMotion();
  const allDoneToday = todayPlannedCount > 0 && todayCompletedCount === todayPlannedCount;
  const { active: celebrating, dismiss: dismissCelebration } = useCelebrationTrigger(
    allDoneToday,
    today,
  );

  // Ring + "100 %" pop when the celebration fires.
  const ringPop = useSharedValue(1);
  useEffect(() => {
    if (celebrating && !reduceMotion) {
      ringPop.value = withSequence(
        withTiming(1.18, { duration: 160 }),
        withTiming(1, { duration: 220 }),
      );
    }
  }, [celebrating, reduceMotion, ringPop]);
  const ringPopStyle = useAnimatedStyle(() => ({ transform: [{ scale: ringPop.value }] }));

  const celebrationColors = useMemo(
    () => todayActivities.map((a) => a.color),
    [todayActivities],
  );

  // ── Today/Weekly segment pill (slides between tabs) ────────────────────────
  const [modeFrames, setModeFrames] = useState<Record<string, ModeFrame>>({});
  const modePillReady = useRef(false);
  const modePillX = useSharedValue(0);
  const modePillW = useSharedValue(0);
  const modePillH = useSharedValue(0);
  const modePillOpacity = useSharedValue(0);

  const setModeFrame = (key: string) => (e: LayoutChangeEvent) => {
    const { x, width, height } = e.nativeEvent.layout;
    setModeFrames((prev) => {
      const existing = prev[key];
      if (existing && existing.x === x && existing.width === width && existing.height === height) {
        return prev;
      }
      return { ...prev, [key]: { x, width, height } };
    });
  };

  useEffect(() => {
    const target = modeFrames[viewMode];
    if (!target) return;
    modePillOpacity.value = 1;
    if (!modePillReady.current || reduceMotion) {
      modePillX.value = target.x;
      modePillW.value = target.width;
      modePillH.value = target.height;
      modePillReady.current = true;
      return;
    }
    modePillX.value = withSpring(target.x, MODE_SPRING);
    modePillW.value = withSpring(target.width, MODE_SPRING);
    modePillH.value = withSpring(target.height, MODE_SPRING);
  }, [viewMode, modeFrames, reduceMotion, modePillX, modePillW, modePillH, modePillOpacity]);

  const modePillStyle = useAnimatedStyle(() => ({
    opacity: modePillOpacity.value,
    width: modePillW.value,
    height: modePillH.value,
    transform: [{ translateX: modePillX.value }],
  }));

  // ── List content transition: cross-fade + small directional shift ─────────
  const contentTx = useSharedValue(0);
  const contentOpacity = useSharedValue(1);
  const prevModeIdx = useRef(0);
  const firstModeRun = useRef(true);

  useEffect(() => {
    // Driven by listMode (the deferred value) so the fade fires when the
    // content actually swaps, not when the tab is tapped.
    const idx = listMode === 'today' ? 0 : 1;
    if (firstModeRun.current) {
      firstModeRun.current = false;
      prevModeIdx.current = idx;
      return;
    }
    const dir = idx > prevModeIdx.current ? 1 : -1;
    prevModeIdx.current = idx;

    if (reduceMotion) {
      contentTx.value = 0;
      contentOpacity.value = 1;
      return;
    }
    // New content starts shifted ~12px in the switch direction, then settles.
    contentTx.value = dir * 12;
    contentOpacity.value = 0;
    contentTx.value = withTiming(0, { duration: 220 });
    contentOpacity.value = withTiming(1, { duration: 220 });
  }, [listMode, reduceMotion, contentTx, contentOpacity]);

  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateX: contentTx.value }],
  }));

  const handleSetMode = (key: ViewMode) => {
    if (key === viewMode) return;
    tapLight();
    setViewMode(key);
  };

  // ── List data + virtualized renderers ─────────────────────────────────────
  // Driven by the DEFERRED listMode so the heavy remount stays low-priority.
  const listData = activities.length > 0 ? (isListToday ? todayActivities : activities) : [];

  const keyExtractor = useCallback((item: Activity) => String(item.id), []);

  // Stable renderItem (deps only change when the underlying data does) so
  // FlatList cells aren't re-rendered on unrelated screen re-renders.
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Activity>) => {
      if (isListToday) {
        return (
          <TodayActivityRow
            activity={item}
            completed={completionsByActivity.get(item.id)?.has(today) ?? false}
            currentStreak={activityStreaks.get(item.id) ?? 0}
            onToggle={handleToggleToday}
            onOpen={handleOpenActivity}
            editMode={editMode}
            onEdit={handleEditActivity}
            onDelete={handleDeleteActivity}
            isDark={isDark}
          />
        );
      }
      return (
        <ActivityRow
          activity={item}
          weekDates={currentWeekDates}
          todayIso={today}
          completedByDate={completionsByActivity.get(item.id) ?? EMPTY_SET}
          currentStreak={activityStreaks.get(item.id) ?? 0}
          onToggle={handleToggle}
          onOpen={handleOpenActivity}
          editMode={editMode}
          onEdit={handleEditActivity}
          onDelete={handleDeleteActivity}
          isDark={isDark}
        />
      );
    },
    [
      isListToday,
      completionsByActivity,
      activityStreaks,
      today,
      currentWeekDates,
      handleToggle,
      handleToggleToday,
      handleOpenActivity,
      editMode,
      handleEditActivity,
      handleDeleteActivity,
      isDark,
    ],
  );

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
          {/* Sliding green segment — sits behind the labels. */}
          <ReAnimated.View
            pointerEvents="none"
            style={[styles.modeTabPill, modePillStyle]}
          />
          {VIEW_MODES.map((m) => {
            const active = m.key === viewMode;
            return (
              <Pressable
                key={m.key}
                onLayout={setModeFrame(m.key)}
                onPress={() => handleSetMode(m.key)}
                style={styles.modeTab}
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

      {/* ── Body: scrollable list + collapsing header overlay ──────────────────
        *  The header is an ABSOLUTE overlay that slides up (transform only) as
        *  the user scrolls — it never animates a layout prop, so scrolling pays
        *  no per-frame layout cost. The list reserves space via paddingTop and
        *  scrolls beneath the (opaque) header.
        ─────────────────────────────────────────────────────────────────────── */}
      <View style={styles.bodyWrap}>
        <ReAnimated.FlatList
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={
            activities.length > 0 ? (
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: textMuted }]}>
                  {t.home.habitsSection}
                </Text>
                <View style={styles.sectionRight}>
                  <Text style={[styles.sectionCount, { color: textMuted }]}>
                    {t.home.activeCount(isListToday ? todayPlannedCount : activities.length)}
                  </Text>
                  <AnimatedPressable hapticStyle="none" hitSlop={8} onPress={handleToggleEditMode}>
                    <Text style={[styles.editToggle, { color: COLORS.primary }]}>
                      {editMode ? t.common.done : t.common.edit}
                    </Text>
                  </AnimatedPressable>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !loaded ? null : activities.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🎯</Text>
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>{t.home.appTitle}</Text>
                <Text style={[styles.emptyBody, { color: textSec }]}>{t.home.empty}</Text>
              </View>
            ) : isListToday ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🌤️</Text>
                <Text style={[styles.emptyBody, { color: textSec }]}>{t.home.noHabitsToday}</Text>
              </View>
            ) : null
          }
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          // contentAnimStyle (mode-switch fade/shift) lives on the OUTER,
          // viewport-sized container — not on a content-sized wrapper — so the
          // transform never promotes the whole list to a giant GPU layer.
          style={[styles.list, { backgroundColor: BG }, contentAnimStyle]}
          contentContainerStyle={[
            styles.listContent,
            headerVisible && { paddingTop: CIRCLE_H + HEADER_GAP + 4 },
          ]}
          showsVerticalScrollIndicator={false}
          // Switching Today→Weekly remounts the heavier week rows. Mounting a
          // small first batch and spreading the rest across frames keeps the
          // switch from blocking a single frame (the hitch).
          initialNumToRender={5}
          maxToRenderPerBatch={4}
          updateCellsBatchingPeriod={50}
          windowSize={9}
        />

        {/* ── Collapsing header overlay (absolute, transform-only) ──────────────
          *  Rendered after the ScrollView so it paints on top. Slides up via
          *  translateY; circle card anchored top, bar card anchored bottom, so
          *  the bar is what remains visible once collapsed.
          ──────────────────────────────────────────────────────────────────── */}
        {headerVisible && (
          <ReAnimated.View style={[
            styles.headerZone,
            { backgroundColor: cardBg },
            isDark && { elevation: 0, shadowOpacity: 0 },
            headerZoneAnimStyle,
          ]}>

            {/* ── State A: big circle progress card (anchored top) ── */}
            <ReAnimated.View style={[styles.card, styles.circleCard, circleCardAnimStyle]}>
              <ReAnimated.View style={ringPopStyle}>
                <CircularProgress
                  size={56}
                  strokeWidth={6}
                  progress={headerRatio}
                  color="#FFFFFF"
                  trackColor="rgba(255,255,255,0.30)"
                >
                  <CountUpText value={headerPct} suffix="%" style={styles.circlePct} />
                </CircularProgress>
              </ReAnimated.View>

              <View style={styles.circleText}>
                <Text style={styles.heroLabel}>{headerLabel}</Text>
                <Text style={styles.heroCount}>{headerCount}</Text>
                <Text style={styles.heroMeta}>{headerMeta}</Text>
              </View>
            </ReAnimated.View>

            {/* ── State B: compact bar (anchored bottom) ── */}
            <ReAnimated.View style={[styles.barCard, barCardAnimStyle]}>
              <View style={styles.barHeader}>
                <Text style={styles.heroLabel}>{headerLabel}</Text>
                {/* Sibling Texts — avoids nested-Text rendering quirks in RN */}
                <View style={styles.barRight}>
                  <Text style={styles.barCount}>{headerCount}</Text>
                  <CountUpText value={headerPct} suffix="%" style={styles.barPct} />
                </View>
              </View>
              <View style={styles.progressTrack}>
                {/* No borderRadius on fill — at 1–4% width the rounded ends overlap
                    and the fill disappears. Parent overflow:hidden provides the clip. */}
                <View style={[styles.progressFill, { width: `${headerPct}%` as `${number}%` }]} />
              </View>
            </ReAnimated.View>

          </ReAnimated.View>
        )}
      </View>

      {/* ── FAB ── */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/activity/new')}
        accessibilityLabel={t.home.addActivity}
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </Pressable>

      {/* ── 100% celebration overlay (taps pass through) ── */}
      {celebrating && (
        <Celebration
          colors={celebrationColors}
          message={t.home.allDoneToday}
          onDone={dismissCelebration}
        />
      )}

      {/* ── Edit/Delete action sheet (kebab + long-press) ── */}
      <ActivityActionSheet
        visible={actionSheetActivityId !== null}
        activity={actionSheetActivity}
        onClose={handleCloseActionSheet}
        onEdit={handleEditActivity}
        onDelete={handleDeleteActivity}
      />

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
  // Sliding green segment — its frame is driven by a spring toward the
  // active tab's measured layout.
  modeTabPill: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
  },
  modeTabLabel: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
  },
  modeTabLabelActive: {
    fontFamily: FONTS.bold,
  },

  // Body wrapper — clips the header overlay as it slides up past the top edge.
  bodyWrap: {
    flex: 1,
    overflow: 'hidden',
  },

  // ── Header zone (absolute overlay) ─────────────────────────────────────────
  // Fixed height (CIRCLE_H), pinned to the top of bodyWrap; collapse is a pure
  // translateY so scrolling never triggers layout. Owns the green background +
  // shadow so the child cards can be transparent (no white-flash crossfade).
  headerZone: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: CIRCLE_H,
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

  // State B: bar layout (column) — anchored to the BOTTOM of the header so it
  // stays visible once the header has slid up to its collapsed height.
  barCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
  list: { flex: 1 },
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
  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  editToggle: {
    fontSize: 12,
    fontFamily: FONTS.extraBold,
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
    bottom: TAB_BAR_SPACE + 22,
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
