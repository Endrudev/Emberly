import { Alert, Pressable, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

import { ActivityForm, type ActivityFormHandle } from '@/ui/components/ActivityForm';
import { useAppStore } from '@/store/useAppStore';
import { useSettingsStore, weekStartFlag } from '@/store/useSettingsStore';
import { activityRepo } from '@/data/activityRepo';
import type { Activity } from '@/domain/types';
import { useTranslation } from '@/i18n';
import { mondayOfIso, parseIsoDate, todayIso as todayIsoFn, weekDates } from '@/domain/week';
import { computeCurrentActivityStreak, toActivityForStreak } from '@/domain/streaks';
import { COLORS, FONTS } from '@/ui/theme';

export default function EditActivityScreen() {
  const t = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const numericId = useMemo(() => Number(id), [id]);
  const router = useRouter();
  const theme = useTheme();
  const updateActivity = useAppStore((s) => s.updateActivity);
  const deleteActivity = useAppStore((s) => s.deleteActivity);
  const completions = useAppStore((s) => s.completions);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const formRef = useRef<ActivityFormHandle>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const found = await activityRepo.getById(numericId);
      if (!cancelled) {
        setActivity(found);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [numericId]);

  const weekStartsOn = weekStartFlag(useSettingsStore((s) => s.weekStart));
  const today = todayIsoFn();
  const currentWeekDates = useMemo(
    () => weekDates(parseIsoDate(mondayOfIso(parseIsoDate(today), weekStartsOn)), weekStartsOn),
    [today, weekStartsOn],
  );

  const ownCompletions = useMemo(
    () => completions.filter((c) => c.activityId === numericId),
    [completions, numericId],
  );
  const completedByDate = useMemo(
    () => new Set(ownCompletions.map((c) => c.date)),
    [ownCompletions],
  );
  const currentStreak = useMemo(
    () =>
      activity
        ? computeCurrentActivityStreak(toActivityForStreak(activity), ownCompletions, today)
        : 0,
    [activity, ownCompletions, today],
  );

  function confirmDelete() {
    Alert.alert(t.activity.deleteConfirmTitle, t.activity.deleteConfirmBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          await deleteActivity(numericId);
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  if (!activity) {
    return null;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t.activity.editTitle,
          headerRight: () => (
            <Pressable
              onPress={() => formRef.current?.submit()}
              disabled={saving}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t.common.done}
              style={{ paddingHorizontal: 12 }}
            >
              {saving ? (
                <ActivityIndicator size={18} color={COLORS.primary} />
              ) : (
                <Text style={{ color: COLORS.primary, fontFamily: FONTS.bold, fontSize: 16 }}>
                  {t.common.done}
                </Text>
              )}
            </Pressable>
          ),
        }}
      />
      <ActivityForm
        ref={formRef}
        weekStartsOn={weekStartsOn}
        activityId={activity.id}
        initial={{
          name: activity.name,
          emoji: activity.emoji,
          color: activity.color,
          scheduledDays: activity.scheduledDays,
          categoryId: activity.categoryId,
        }}
        preview={{
          weekDates: currentWeekDates,
          todayIso: today,
          completedByDate,
          currentStreak,
        }}
        onSubmittingChange={setSaving}
        onSubmit={async (values) => {
          await updateActivity(numericId, values);
          router.back();
        }}
        onDelete={confirmDelete}
      />
    </>
  );
}
