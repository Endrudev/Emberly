import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppTheme = 'system' | 'light' | 'dark';
export type WeekStart = 'monday' | 'sunday';

interface SettingsState {
  /** Hydration flag — false until AsyncStorage rehydration finishes. */
  _hasHydrated: boolean;
  onboardingCompleted: boolean;
  theme: AppTheme;
  weekStart: WeekStart;
  /** User display name (initials shown in profile). */
  userName: string;
  /** epoch ms when user first launched (for "tracking since"). */
  trackingSinceMs: number | null;
  streakGoalDays: number;

  // actions
  setHasHydrated: (v: boolean) => void;
  completeOnboarding: () => void;
  setTheme: (t: AppTheme) => void;
  setWeekStart: (w: WeekStart) => void;
  setUserName: (name: string) => void;
  setTrackingSince: (ms: number) => void;
  setStreakGoalDays: (n: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      _hasHydrated: false,
      onboardingCompleted: false,
      theme: 'system',
      weekStart: 'monday',
      userName: '',
      trackingSinceMs: null,
      streakGoalDays: 90,

      setHasHydrated: (v) => set({ _hasHydrated: v }),
      completeOnboarding: () =>
        set({ onboardingCompleted: true, trackingSinceMs: Date.now() }),
      setTheme: (t) => set({ theme: t }),
      setWeekStart: (w) => set({ weekStart: w }),
      setUserName: (name) => set({ userName: name }),
      setTrackingSince: (ms) => set({ trackingSinceMs: ms }),
      setStreakGoalDays: (n) => set({ streakGoalDays: n }),
    }),
    {
      name: 'mission-tracker-settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
