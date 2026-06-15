export interface WidgetActivityData {
  id: number;
  name: string;
  emoji: string;
  color: string;
  isCompleted: boolean;
}

export interface WidgetWeekDay {
  label: string;
  isCompleted: boolean;
  isToday: boolean;
  isFuture: boolean;
}

/** Kolik návyků se vejde na jednu stránku (řádek čtvercových dlaždic). */
export const WIDGET_PAGE_SIZE = 5;

export interface WidgetData {
  currentStreak: number;
  isPersonalRecord: boolean;
  daysToNextBadge: number;
  nextBadgeTarget: number;
  progressToNextBadge: number;
  /** Návyky pro AKTUÁLNÍ stránku (max WIDGET_PAGE_SIZE). */
  activities: WidgetActivityData[];
  /** Aktuální stránka (0-based). */
  page: number;
  /** Celkový počet stránek návyků. */
  totalPages: number;
  weekDays: WidgetWeekDay[];
  todayIso: string;
  allCompletedToday: boolean;
}
