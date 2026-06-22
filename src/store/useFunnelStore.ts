import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FunnelTimeOfDay = 'morning' | 'afternoon' | 'evening';
export type FunnelHabitCount = '1-2' | '3-4' | '5+';

/** Dočasné odpovědi z funnelu — aplikují se na appku (seed návyků, reminderTime, …)
 *  až na konci, v Úkolu 7 (`applyFunnelAnswers`). Do té doby žijí jen tady. */
export interface FunnelAnswers {
  /** Krok 3 — kategorie návyků (klíče z `t.funnel.categories`). */
  categories: string[];
  /** Krok 4 — co uživatele dřív zastavilo. */
  blocker: string | null;
  /** Krok 5 — kdy má čas → mapuje se na `reminderTime`. */
  timeOfDay: FunnelTimeOfDay | null;
  /** Krok 6 — kolik návyků chce začít sledovat. */
  habitCount: FunnelHabitCount | null;
  /** Krok 7 — hlavní cíl/cíle (motivace), multi-select. */
  goals: string[];
  /** Krok 15 — výsledek notification permission promptu. */
  notificationsGranted: boolean;
}

const EMPTY_ANSWERS: FunnelAnswers = {
  categories: [],
  blocker: null,
  timeOfDay: null,
  habitCount: null,
  goals: [],
  notificationsGranted: false,
};

interface FunnelState {
  _hasHydrated: boolean;
  stepIndex: number;
  answers: FunnelAnswers;

  setHasHydrated: (v: boolean) => void;
  setStepIndex: (i: number) => void;
  setAnswer: <K extends keyof FunnelAnswers>(key: K, value: FunnelAnswers[K]) => void;
  /** Vyčistí krok + odpovědi — po aplikování (Úkol 7) nebo při restartu funnelu. */
  reset: () => void;
}

export const useFunnelStore = create<FunnelState>()(
  persist(
    (set) => ({
      _hasHydrated: false,
      stepIndex: 0,
      answers: EMPTY_ANSWERS,

      setHasHydrated: (v) => set({ _hasHydrated: v }),
      setStepIndex: (i) => set({ stepIndex: i }),
      setAnswer: (key, value) =>
        set((s) => ({ answers: { ...s.answers, [key]: value } })),
      reset: () => set({ stepIndex: 0, answers: EMPTY_ANSWERS }),
    }),
    {
      name: 'mission-tracker-funnel',
      storage: createJSONStorage(() => AsyncStorage),
      // Vlastní merge — zustand persist defaultně nahradí `answers` jako
      // celek persistovanou hodnotou (shallow merge jen na top-level klíčích
      // store, ne do vnořených objektů). Pokud appka dřív běžela se starším
      // tvarem `FunnelAnswers` (např. před přejmenováním `goal` → `goals`),
      // staré uložené odpovědi by chyběly nové klíče → `undefined.length`
      // crash v krocích, co na ně sahají. Tady se chybějící klíče doplní
      // z `EMPTY_ANSWERS`, ať starý záznam nikdy nerozbije nový kód.
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<FunnelState> | undefined;
        return {
          ...currentState,
          ...persisted,
          answers: { ...EMPTY_ANSWERS, ...persisted?.answers },
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
