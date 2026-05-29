import { create } from 'zustand';

import { activityRepo } from '@/data/activityRepo';
import { completionRepo } from '@/data/completionRepo';
import type { Activity, Completion, DayOfWeek } from '@/domain/types';
import { mondayOfIso, parseIsoDate, shiftWeek, todayIso } from '@/domain/week';

interface AppState {
  activities: Activity[];
  completions: Completion[]; // all completions loaded (for v1 — pokud DB nabobtná, omezit na rolling window)
  currentWeekStart: string; // ISO pondělí aktuálně zobrazeného týdne
  loaded: boolean;

  // actions
  loadAll: () => Promise<void>;
  setWeekStart: (iso: string) => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToCurrentWeek: () => void;

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

  toggleCompletion: (activityId: number, dateIso: string) => Promise<boolean>;
}

export const useAppStore = create<AppState>((set, get) => ({
  activities: [],
  completions: [],
  currentWeekStart: mondayOfIso(parseIsoDate(todayIso())),
  loaded: false,

  async loadAll() {
    const [activities, completions] = await Promise.all([
      activityRepo.listActive(),
      completionRepo.listAll(),
    ]);
    set({ activities, completions, loaded: true });
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
  goToCurrentWeek() {
    set({ currentWeekStart: mondayOfIso(parseIsoDate(todayIso())) });
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
    return isNowCompleted;
  },
}));
