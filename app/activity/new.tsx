import { useRef, useState } from 'react';
import { Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ActivityForm, type ActivityFormHandle } from '@/ui/components/ActivityForm';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from '@/i18n';

export default function NewActivityScreen() {
  const t = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const createActivity = useAppStore((s) => s.createActivity);
  const formRef = useRef<ActivityFormHandle>(null);
  const [saving, setSaving] = useState(false);

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
              accessibilityLabel={t.common.save}
              style={{ paddingHorizontal: 12 }}
            >
              {saving ? (
                <ActivityIndicator size={20} />
              ) : (
                <MaterialCommunityIcons name="check" size={24} color={theme.colors.primary} />
              )}
            </Pressable>
          ),
        }}
      />
      <ActivityForm
        ref={formRef}
        onSubmittingChange={setSaving}
        onSubmit={async (values) => {
          await createActivity(values);
          router.back();
        }}
      />
    </>
  );
}
