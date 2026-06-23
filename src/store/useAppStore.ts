import { create } from 'zustand';

import { activityRepo } from '@/data/activityRepo';
import { completionRepo } from '@/data/completionRepo';
import { streakFreezeRepo } from '@/data/streakFreezeRepo';
import type { Activity, Completion, DayOfWeek } from '@/domain/types';
import { mondayOfIso, parseIsoDate, shiftWeek, todayIso, type WeekAnchor } from '@/domain/week';

interface AppState {
  activities: Activity[];
  completions: Completion[]; // all completions loaded (for v1 — pokud DB nabobtná, omezit na rolling window)
  /** ISO dny, na které byla uplatněna premium "ochrana série" (streak freeze). */
  frozenDates: string[];
  currentWeekStart: string; // ISO pondělí aktuálně zobrazeného týdne
  loaded: boolean;

  // actions
  loadAll: () => Promise<void>;
  setWeekStart: (iso: string) => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  /** Přeskočí na aktuální týden, zarovnaný podle `weekStartsOn` (1=pondělí, 0=neděle). */
  goToCurrentWeek: (weekStartsOn?: WeekAnchor) => void;

  createActivity: (input: {
    name: string;
    emoji: string;
    color: string;
    scheduledDays: readonly DayOfWeek[];
  }) => Promise<Activity>;
  updateActivity: (
    id: number,
    input: {
      name: string;
      emoji: string;
      color: string;
      scheduledDays: readonly DayOfWeek[];
    },
  ) => Promise<Activity>;
  archiveActivity: (id: number) => Promise<void>;
  deleteActivity: (id: number) => Promise<void>;
  resetAllData: () => Promise<void>;

  toggleCompletion: (activityId: number, dateIso: string) => Promise<boolean>;
  /** Zaznamená zmrazený den (volá se z `useStreakFreezeSync`). Idempotentní. */
  addFreeze: (dateIso: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  activities: [],
  completions: [],
  frozenDates: [],
  currentWeekStart: mondayOfIso(parseIsoDate(todayIso())),
  loaded: false,

  async loadAll() {
    const [activities, completions, frozenDates] = await Promise.all([
      activityRepo.listActive(),
      completionRepo.listAll(),
      streakFreezeRepo.listAll(),
    ]);
    set({ activities, completions, frozenDates, loaded: true });
  },

  setWeekStart(iso) {
    set({ currentWeekStart: iso });
  },
  goToPreviousWeek() {
    set({ currentWeekStart: shiftWeek(get().currentWeekStart, -1) });
  },
  goToNextWeek() {
    set({ currentWeekStart: shiftWeek(get().currentWeekStart, 1) });
  },
  goToCurrentWeek(weekStartsOn = 1) {
    set({ currentWeekStart: mondayOfIso(parseIsoDate(todayIso()), weekStartsOn) });
  },

  async createActivity(input) {
    const created = await activityRepo.create(input);
    set({ activities: [...get().activities, created] });
    return created;
  },

  async updateActivity(id, input) {
    const updated = await activityRepo.update(id, input);
    set({
      activities: get().activities.map((a) => (a.id === id ? updated : a)),
    });
    return updated;
  },

  async archiveActivity(id) {
    await activityRepo.archive(id);
    set({ activities: get().activities.filter((a) => a.id !== id) });
  },

  async deleteActivity(id) {
    await activityRepo.delete(id);
    set({
      activities: get().activities.filter((a) => a.id !== id),
      completions: get().completions.filter((c) => c.activityId !== id),
    });
  },

  async resetAllData() {
    await completionRepo.deleteAll();
    await activityRepo.deleteAll();
    await streakFreezeRepo.deleteAll();
    set({ activities: [], completions: [], frozenDates: [] });
    // .catch — v Expo Go react-native-android-widget neexistuje, import() samotný odmítne.
    import('@/widget/updateWidget')
      .then(({ updateMissionWidget }) => updateMissionWidget())
      .catch(() => {});
  },

  async toggleCompletion(activityId, dateIso) {
    const isNowCompleted = await completionRepo.toggle(activityId, dateIso);
    const current = get().completions;
    if (isNowCompleted) {
      set({
        completions: [
          ...current,
          { activityId, date: dateIso, completedAt: Date.now() },
        ],
      });
    } else {
      set({
        completions: current.filter(
          (c) => !(c.activityId === activityId && c.date === dateIso),
        ),
      });
    }
    // Fire-and-forget — widget update runs async after store is updated.
    // .catch — v Expo Go react-native-android-widget neexistuje, import() samotný odmítne.
    import('@/widget/updateWidget')
      .then(({ updateMissionWidget }) => updateMissionWidget())
      .catch(() => {});
    return isNowCompleted;
  },

  async addFreeze(dateIso) {
    if (get().frozenDates.includes(dateIso)) return;
    await streakFreezeRepo.create(dateIso);
    set({ frozenDates: [...get().frozenDates, dateIso] });
  },
}));
