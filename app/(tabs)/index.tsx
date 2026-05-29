import { useEffect, useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { FAB, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';
import { ActivityRow } from '@/ui/components/ActivityRow';
import { WeekHeader } from '@/ui/components/WeekHeader';
import { mondayOfIso, parseIsoDate, todayIso as todayIsoFn, weekDates } from '@/domain/week';
import { t } from '@/i18n/cs';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();

  const activities = useAppStore((s) => s.activities);
  const completions = useAppStore((s) => s.completions);
  const currentWeekStart = useAppStore((s) => s.currentWeekStart);
  const loaded = useAppStore((s) => s.loaded);
  const loadAll = useAppStore((s) => s.loadAll);
  const goToPreviousWeek = useAppStore((s) => s.goToPreviousWeek);
  const goToNextWeek = useAppStore((s) => s.goToNextWeek);
  const goToCurrentWeek = useAppStore((s) => s.goToCurrentWeek);
  const toggleCompletion = useAppStore((s) => s.toggleCompletion);

  useEffect(() => {
    if (!loaded) {
      void loadAll();
    }
  }, [loaded, loadAll]);

  const today = todayIsoFn();
  const currentWeekDates = useMemo(
    () => weekDates(parseIsoDate(currentWeekStart)),
    [currentWeekStart],
  );
  const isCurrentWeek = currentWeekStart === mondayOfIso(parseIsoDate(today));

  // Index completions: activityId -> Set<dateIso>
  const completionsByActivity = useMemo(() => {
    const map = new Map<number, Set<string>>();
    for (const c of completions) {
      let set = map.get(c.activityId);
      if (!set) {
        set = new Set();
        map.set(c.activityId, set);
      }
      set.add(c.date);
    }
    return map;
  }, [completions]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <WeekHeader
        weekStartIso={currentWeekStart}
        isCurrentWeek={isCurrentWeek}
        onPrev={goToPreviousWeek}
        onNext={goToNextWeek}
        onJumpToToday={goToCurrentWeek}
      />

      {activities.length === 0 && loaded ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🎯</Text>
          <Text variant="titleMedium" style={{ textAlign: 'center', marginBottom: 8 }}>
            {t.home.title}
          </Text>
          <Text variant="bodyMedium" style={{ textAlign: 'center', opacity: 0.7 }}>
            {t.home.empty}
          </Text>
        </View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 96, paddingTop: 4 }}
          renderItem={({ item }) => (
            <ActivityRow
              activity={item}
              weekDates={currentWeekDates}
              todayIso={today}
              completedByDate={completionsByActivity.get(item.id) ?? EMPTY_SET}
              onTogglePress={(dateIso) => {
                void toggleCompletion(item.id, dateIso);
              }}
              onLongPress={() => router.push(`/activity/${item.id}`)}
            />
          )}
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/activity/new')}
        accessibilityLabel={t.home.addActivity}
      />
    </View>
  );
}

const EMPTY_SET: ReadonlySet<string> = new Set();

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
