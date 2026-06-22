import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAppStore } from '@/store/useAppStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { rescheduleAll } from './scheduler';

/**
 * Jediné místo, které drží naplánované připomínky v souladu se stavem appky:
 * - poběží při startu appky (jakmile se aktivity dotáhnou z DB),
 * - při změně nastavení (zapnutí/vypnutí, čas, streak pod-toggle),
 * - při jakékoli změně completions/activities (toggle splnění odkudkoli v appce),
 * - při návratu appky do popředí (např. nový den po přespání appky v pozadí).
 *
 * L1 zůstává evergreen denní opakovaná notifikace beze suprese podle toho,
 * jestli je dnešek hotový — záměr, ne opomenutí. L1 musí spolehlivě pálit, i
 * když appka dlouho neběží (viz `scheduler.ts`); nativní recurring trigger
 * nejde bezpečně pozastavit "jen na dnešek" bez rizika, že se zapomene znovu
 * zapnout, pokud appka zůstane zavřená. Suprese podle živého stavu se proto
 * týká jen L2 (`scheduleStreakRiskReminder` uvnitř `rescheduleAll`).
 */
export function useReminderSync(): void {
  const remindersEnabled = useSettingsStore((s) => s.remindersEnabled);
  const reminderTime = useSettingsStore((s) => s.reminderTime);
  const streakReminderEnabled = useSettingsStore((s) => s.streakReminderEnabled);
  const loaded = useAppStore((s) => s.loaded);
  const activities = useAppStore((s) => s.activities);
  const completions = useAppStore((s) => s.completions);

  // Ref holds the latest sync closure so the AppState listener (registered
  // once) always reads current state without needing to re-subscribe.
  const syncRef = useRef(() => {});
  syncRef.current = () => {
    if (!loaded) return;
    void rescheduleAll(
      { remindersEnabled, reminderTime, streakReminderEnabled },
      { activities, completions },
    );
  };

  useEffect(() => {
    syncRef.current();
  }, [loaded, remindersEnabled, reminderTime, streakReminderEnabled, activities, completions]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncRef.current();
    });
    return () => subscription.remove();
  }, []);
}
