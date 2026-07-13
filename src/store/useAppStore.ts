import { create } from 'zustand';

import { activityRepo } from '@/data/activityRepo';
import { categoryRepo } from '@/data/categoryRepo';
import { completionRepo } from '@/data/completionRepo';
import { streakFreezeRepo } from '@/data/streakFreezeRepo';
import type { Activity, Category, Completion, DayOfWeek } from '@/domain/types';
import { mondayOfIso, parseIsoDate, shiftWeek, todayIso, type WeekAnchor } from '@/domain/week';

interface AppState {
  activities: Activity[];
  /** Čistě vizuální seskupení návyků (Habits view) — žádná vlastní logika. */
  categories: Category[];
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
    categoryId?: number | null;
  }) => Promise<Activity>;
  updateActivity: (
    id: number,
    input: {
      name: string;
      emoji: string;
      color: string;
      scheduledDays: readonly DayOfWeek[];
      categoryId?: number | null;
    },
  ) => Promise<Activity>;
  archiveActivity: (id: number) => Promise<void>;
  deleteActivity: (id: number) => Promise<void>;
  resetAllData: () => Promise<void>;

  /** Vytvoří novou kategorii (inline z ActivityFormu i quick pickeru). */
  createCategory: (name: string) => Promise<Category>;
  /** Rychlá změna kategorie u existující aktivity (edit-mode tlačítko). */
  setActivityCategory: (activityId: number, categoryId: number | null) => Promise<void>;
  /** Přeřadí návyky v rámci JEDNÉ skupiny (kategorie, nebo "bez kategorie"). */
  reorderActivities: (orderedIds: readonly number[]) => Promise<void>;
  /** Přeřadí kategorie samotné (Manage Habits Mode). */
  reorderCategories: (orderedIds: readonly number[]) => Promise<void>;

  toggleCompletion: (activityId: number, dateIso: string) => Promise<boolean>;
  /** Zaznamená zmrazený den (volá se z `useStreakFreezeSync`). Idempotentní. */
  addFreeze: (dateIso: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  activities: [],
  categories: [],
  completions: [],
  frozenDates: [],
  currentWeekStart: mondayOfIso(parseIsoDate(todayIso())),
  loaded: false,

  async loadAll() {
    const [activities, categories, completions, frozenDates] = await Promise.all([
      activityRepo.listActive(),
      categoryRepo.listAll(),
      completionRepo.listAll(),
      streakFreezeRepo.listAll(),
    ]);
    set({ activities, categories, completions, frozenDates, loaded: true });
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

  async createCategory(name) {
    const created = await categoryRepo.create(name);
    set({ categories: [...get().categories, created] });
    return created;
  },

  async setActivityCategory(activityId, categoryId) {
    await activityRepo.setCategory(activityId, categoryId);
    // Mirrors the repo's own "append to end of the new group" behavior, so
    // the local list order stays correct without waiting for a reload.
    const nextSortOrder = get().activities.filter((a) => a.categoryId === categoryId).length;
    set({
      activities: get().activities.map((a) =>
        a.id === activityId ? { ...a, categoryId, sortOrder: nextSortOrder } : a,
      ),
    });
  },

  async reorderActivities(orderedIds) {
    await activityRepo.reorder(orderedIds);
    const order = new Map(orderedIds.map((id, index) => [id, index]));
    const patched = get().activities.map((a) =>
      order.has(a.id) ? { ...a, sortOrder: order.get(a.id)! } : a,
    );
    // Global sort by sortOrder is safe even though it's only unique WITHIN a
    // group — cross-group interleaving doesn't matter, since consumers filter
    // by categoryId first and just need correct relative order inside that filter.
    patched.sort((a, b) => a.sortOrder - b.sortOrder);
    set({ activities: patched });
  },

  async reorderCategories(orderedIds) {
    await categoryRepo.reorder(orderedIds);
    const order = new Map(orderedIds.map((id, index) => [id, index]));
    const patched = get().categories.map((c) =>
      order.has(c.id) ? { ...c, sortOrder: order.get(c.id)! } : c,
    );
    patched.sort((a, b) => a.sortOrder - b.sortOrder);
    set({ categories: patched });
  },

  async resetAllData() {
    await completionRepo.deleteAll();
    await activityRepo.deleteAll();
    await categoryRepo.deleteAll();
    await streakFreezeRepo.deleteAll();
    set({ activities: [], categories: [], completions: [], frozenDates: [] });
    // .catch — v Expo Go react-native-android-widget neexistuje, import() samotný odmítne.
    import('@/widget/updateWidget')
      .then(({ updateEmberlyWidget }) => updateEmberlyWidget())
      .catch(() => {});
  },

  async toggleCompletion(activityId, dateIso) {
    const isNowCompleted = await completionRepo.toggle(activityId, dateIso);
    const current = get().completions;
    if (isNowCompleted) {
      set({
        completions: [...current, { activityId, date: dateIso, completedAt: Date.now() }],
      });
    } else {
      set({
        completions: current.filter((c) => !(c.activityId === activityId && c.date === dateIso)),
      });
    }
    // Fire-and-forget — widget update runs async after store is updated.
    // .catch — v Expo Go react-native-android-widget neexistuje, import() samotný odmítne.
    import('@/widget/updateWidget')
      .then(({ updateEmberlyWidget }) => updateEmberlyWidget())
      .catch(() => {});
    return isNowCompleted;
  },

  async addFreeze(dateIso) {
    if (get().frozenDates.includes(dateIso)) return;
    await streakFreezeRepo.create(dateIso);
    set({ frozenDates: [...get().frozenDates, dateIso] });
  },
}));
