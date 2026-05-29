import { useRouter } from 'expo-router';

import { ActivityForm } from '@/ui/components/ActivityForm';
import { useAppStore } from '@/store/useAppStore';
import { t } from '@/i18n/cs';

export default function NewActivityScreen() {
  const router = useRouter();
  const createActivity = useAppStore((s) => s.createActivity);

  return (
    <ActivityForm
      submitLabel={t.common.save}
      onSubmit={async (values) => {
        await createActivity(values);
        router.back();
      }}
      onCancel={() => router.back()}
    />
  );
}
