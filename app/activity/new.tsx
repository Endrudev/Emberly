import { useMemo, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, Text } from 'react-native-paper';

import { ActivityForm, type ActivityFormHandle } from '@/ui/components/ActivityForm';
import { useAppStore } from '@/store/useAppStore';
import { useSettingsStore, weekStartFlag } from '@/store/useSettingsStore';
import { useTranslation } from '@/i18n';
import { mondayOfIso, parseIsoDate, todayIso as todayIsoFn, weekDates } from '@/domain/week';
import { COLORS, FONTS } from '@/ui/theme';

const EMPTY_SET: ReadonlySet<string> = new Set();

export default function NewActivityScreen() {
  const t = useTranslation();
  const router = useRouter();
  const createActivity = useAppStore((s) => s.createActivity);
  const formRef = useRef<ActivityFormHandle>(null);
  const [saving, setSaving] = useState(false);

  const weekStartsOn = weekStartFlag(useSettingsStore((s) => s.weekStart));
  const today = todayIsoFn();
  const currentWeekDates = useMemo(
    () => weekDates(parseIsoDate(mondayOfIso(parseIsoDate(today), weekStartsOn)), weekStartsOn),
    [today, weekStartsOn],
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: t.activity.newTitle,
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
        preview={{
          weekDates: currentWeekDates,
          todayIso: today,
          completedByDate: EMPTY_SET,
          currentStreak: 0,
        }}
        onSubmittingChange={setSaving}
        onSubmit={async (values) => {
          await createActivity(values);
          router.back();
        }}
      />
    </>
  );
}
