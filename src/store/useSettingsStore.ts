import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppTheme = 'system' | 'light' | 'dark';
export type WeekStart = 'monday' | 'sunday';
export type AppLanguage = 'auto' | 'cs' | 'en';

/** date-fns `weekStartsOn` konvence (0=neděle, 1=pondělí) odpovídající nastavení. */
export function weekStartFlag(weekStart: WeekStart): 0 | 1 {
  return weekStart === 'sunday' ? 0 : 1;
}

interface SettingsState {
  /** Hydration flag — false until AsyncStorage rehydration finishes. */
  _hasHydrated: boolean;
  onboardingCompleted: boolean;
  theme: AppTheme;
  language: AppLanguage;
  weekStart: WeekStart;
  /** User display name (initials shown in profile). */
  userName: string;
  /** epoch ms when user first launched (for "tracking since"). */
  trackingSinceMs: number | null;
  streakGoalDays: number;
  /** Master switch for local reminder notifications (L1 + L2). */
  remindersEnabled: boolean;
  /** Denní čas L1 připomínky, "HH:mm" (lokální čas zařízení). */
  reminderTime: string;
  /** Pod-toggle L2 — streak-at-risk one-shot, jen pokud remindersEnabled. */
  streakReminderEnabled: boolean;
  /** One-time nudge na Home (přidat widget) — true jakmile uživatel zavře/proklikne. */
  widgetNudgeDismissed: boolean;

  // actions
  setHasHydrated: (v: boolean) => void;
  completeOnboarding: () => void;
  /** Dev-only — vrátí onboardingCompleted na false, ať lze znovu projít funnel bez mazání celé appky. */
  resetOnboarding: () => void;
  setTheme: (t: AppTheme) => void;
  setLanguage: (l: AppLanguage) => void;
  setWeekStart: (w: WeekStart) => void;
  setUserName: (name: string) => void;
  setTrackingSince: (ms: number) => void;
  setStreakGoalDays: (n: number) => void;
  setRemindersEnabled: (v: boolean) => void;
  setReminderTime: (time: string) => void;
  setStreakReminderEnabled: (v: boolean) => void;
  setWidgetNudgeDismissed: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      _hasHydrated: false,
      onboardingCompleted: false,
      theme: 'light',
      language: 'auto',
      weekStart: 'monday',
      userName: '',
      trackingSinceMs: null,
      streakGoalDays: 90,
      remindersEnabled: false,
      reminderTime: '19:00',
      streakReminderEnabled: true,
      widgetNudgeDismissed: false,

      setHasHydrated: (v) => set({ _hasHydrated: v }),
      completeOnboarding: () =>
        set({ onboardingCompleted: true, trackingSinceMs: Date.now() }),
      resetOnboarding: () => set({ onboardingCompleted: false }),
      setTheme: (t) => set({ theme: t }),
      setLanguage: (l) => set({ language: l }),
      setWeekStart: (w) => set({ weekStart: w }),
      setUserName: (name) => set({ userName: name }),
      setTrackingSince: (ms) => set({ trackingSinceMs: ms }),
      setStreakGoalDays: (n) => set({ streakGoalDays: n }),
      setRemindersEnabled: (v) => set({ remindersEnabled: v }),
      setReminderTime: (time) => set({ reminderTime: time }),
      setStreakReminderEnabled: (v) => set({ streakReminderEnabled: v }),
      setWidgetNudgeDismissed: (v) => set({ widgetNudgeDismissed: v }),
    }),
    {
      name: 'emberly-settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
