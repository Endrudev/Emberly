import { useEffect } from 'react';

import { useAppStore } from '@/store/useAppStore';
import { useIsPremium } from '@/store/usePurchasesStore';
import { decideAutoFreeze } from '@/domain/streakFreeze';
import { shiftDateIso, toActivityForStreak } from '@/domain/streaks';
import { todayIso } from '@/domain/week';

/**
 * Premium "ochrana série" (streak freeze) — automaticky, beze zásahu uživatele.
 * Při každém spuštění/foregroundu appky ověří jen VČEREJŠEK (den, který se právě
 * uzavřel) a pokud byl zmeškaný a kvóta (`STREAK_FREEZE_MONTHLY_QUOTA`/měsíc) to
 * dovolí, tiše ho zmrazí. Vědomě nedohledává starší zmeškané dny po delší pauze —
 * viz `decideAutoFreeze` v `src/domain/streakFreeze.ts`.
 *
 * Žádný native modul — čistý JS/SQLite, funguje i v Expo Go.
 */
export function useStreakFreezeSync(): void {
  const isPremium = useIsPremium();
  const loaded = useAppStore((s) => s.loaded);
  const activities = useAppStore((s) => s.activities);
  const completions = useAppStore((s) => s.completions);
  const frozenDates = useAppStore((s) => s.frozenDates);
  const addFreeze = useAppStore((s) => s.addFreeze);

  useEffect(() => {
    if (!loaded || !isPremium) return;
    const yesterday = shiftDateIso(todayIso(), -1);
    const shouldFreeze = decideAutoFreeze(
      activities.map(toActivityForStreak),
      completions,
      frozenDates,
      yesterday,
    );
    if (shouldFreeze) {
      void addFreeze(yesterday);
    }
  }, [loaded, isPremium, activities, completions, frozenDates, addFreeze]);
}
