import { Alert, Pressable, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ActivityForm, type ActivityFormHandle } from '@/ui/components/ActivityForm';
import { useAppStore } from '@/store/useAppStore';
import { activityRepo } from '@/data/activityRepo';
import type { Activity } from '@/domain/types';
import { useTranslation } from '@/i18n';

export default function EditActivityScreen() {
  const t = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const numericId = useMemo(() => Number(id), [id]);
  const router = useRouter();
  const theme = useTheme();
  const updateActivity = useAppStore((s) => s.updateActivity);
  const archiveActivity = useAppStore((s) => s.archiveActivity);
  const deleteActivity = useAppStore((s) => s.deleteActivity);
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

  function confirmArchive() {
    Alert.alert(t.activity.archiveConfirmTitle, t.activity.archiveConfirmBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.archive,
        onPress: async () => {
          await archiveActivity(numericId);
          router.back();
        },
      },
    ]);
  }

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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable
                onPress={confirmArchive}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t.common.archive}
                style={{ paddingHorizontal: 8 }}
              >
                <MaterialCommunityIcons name="archive-outline" size={22} color={theme.colors.onSurface} />
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t.common.delete}
                style={{ paddingHorizontal: 8 }}
              >
                <MaterialCommunityIcons name="delete-outline" size={22} color={theme.colors.error} />
              </Pressable>
              <Pressable
                onPress={() => formRef.current?.submit()}
                disabled={saving}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t.common.save}
                style={{ paddingHorizontal: 8, marginRight: 4 }}
              >
                {saving ? (
                  <ActivityIndicator size={20} />
                ) : (
                  <MaterialCommunityIcons name="check" size={24} color={theme.colors.primary} />
                )}
              </Pressable>
            </View>
          ),
        }}
      />
      <ActivityForm
        ref={formRef}
        initial={{
          name: activity.name,
          emoji: activity.emoji,
          color: activity.color,
          scheduledDays: activity.scheduledDays,
        }}
        onSubmittingChange={setSaving}
        onSubmit={async (values) => {
          await updateActivity(numericId, values);
          router.back();
        }}
      />
    </>
  );
}
