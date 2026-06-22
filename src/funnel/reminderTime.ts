import type { FunnelTimeOfDay } from '@/store/useFunnelStore';

/** Krok 5 ("Kdy máš čas?") → `reminderTime` — baked-in mapování ze spec
 *  (`onboarding-funnel.md`). */
export const TIME_OF_DAY_REMINDER: Record<FunnelTimeOfDay, string> = {
  morning: '08:00',
  afternoon: '13:00',
  evening: '19:00',
};
