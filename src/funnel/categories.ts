import { activityPalette } from '@/ui/theme';

export type FunnelCategoryKey = 'walking' | 'running' | 'reading' | 'meditate' | 'workout';

export interface FunnelCategoryDef {
  key: FunnelCategoryKey;
  emoji: string;
  color: string;
}

/** Krok 3 — kategorie návyků nabízené ve funnelu. `emoji`/`color` se použijí
 *  i při seedování návyků na konci funnelu (Úkol 7). */
export const FUNNEL_CATEGORIES: FunnelCategoryDef[] = [
  { key: 'walking', emoji: '🚶', color: activityPalette[0]!.accent },
  { key: 'running', emoji: '🏃', color: activityPalette[2]!.accent },
  { key: 'reading', emoji: '📚', color: activityPalette[4]!.accent },
  { key: 'meditate', emoji: '🧘', color: activityPalette[3]!.accent },
  { key: 'workout', emoji: '💪', color: activityPalette[1]!.accent },
];
