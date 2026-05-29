import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Appbar, useTheme } from 'react-native-paper';

import { ActivityForm } from '@/ui/components/ActivityForm';
import { useAppStore } from '@/store/useAppStore';
import { activityRepo } from '@/data/activityRepo';
import type { Activity } from '@/domain/types';
import { t } from '@/i18n/cs';

export default function EditActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numericId = useMemo(() => Number(id), [id]);
  const router = useRouter();
  const theme = useTheme();
  const updateActivity = useAppStore((s) => s.updateActivity);
  const archiveActivity = useAppStore((s) => s.archiveActivity);
  const deleteActivity = useAppStore((s) => s.deleteActivity);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

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
      <Appbar.Header>
        <Appbar.Action icon="archive-outline" onPress={confirmArchive} accessibilityLabel={t.common.archive} />
        <Appbar.Action icon="delete-outline" onPress={confirmDelete} accessibilityLabel={t.common.delete} />
      </Appbar.Header>
      <ActivityForm
        initial={{
          name: activity.name,
          emoji: activity.emoji,
          color: activity.color,
          scheduledDays: activity.scheduledDays,
        }}
        submitLabel={t.common.save}
        onSubmit={async (values) => {
          await updateActivity(numericId, values);
          router.back();
        }}
        onCancel={() => router.back()}
      />
    </>
  );
}
