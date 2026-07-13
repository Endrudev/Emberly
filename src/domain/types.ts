// pondělí = 0, neděle = 6
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const ALL_DAYS: readonly DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6] as const;

export interface Activity {
  id: number;
  name: string;
  emoji: string;
  color: string;
  scheduledDays: DayOfWeek[];
  archived: boolean;
  createdAt: number;
  /** Volitelné vizuální seskupení (Habits view) — null = nezařazeno. */
  categoryId: number | null;
  /** Pořadí uvnitř kategorie (nebo uvnitř "bez kategorie") — Manage Habits Mode. */
  sortOrder: number;
}

/** Čistě vizuální seskupení návyků — žádná vlastní logika/pravidla. */
export interface Category {
  id: number;
  name: string;
  /** Pořadí kategorií samotných — Manage Habits Mode. */
  sortOrder: number;
  createdAt: number;
}

export interface Completion {
  activityId: number;
  date: string; // ISO local "yyyy-MM-dd"
  completedAt: number;
}

export interface WeekProgress {
  weekStart: string; // ISO local "yyyy-MM-dd" (pondělí)
  plannedCount: number;
  completedCount: number;
  isPerfect: boolean;
}

export interface Streak {
  currentDays: number;
  bestDays: number;
  currentWeeks: number;
  bestWeeks: number;
}
