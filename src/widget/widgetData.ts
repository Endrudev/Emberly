import AsyncStorage from '@react-native-async-storage/async-storage';

import { activityRepo } from '@/data/activityRepo';
import { completionRepo } from '@/data/completionRepo';
import {
  computeCurrentDailyStreak,
  computeBestDailyStreak,
  toActivityForStreak,
} from '@/domain/streaks';
import { dowOf, mondayOfIso, parseIsoDate, todayIso, weekDates, isDayScheduled, daysToMask } from '@/domain/week';
import { getNextBadge } from './badgeMilestones';
import {
  WIDGET_PAGE_SIZE,
  type WidgetData,
  type WidgetActivityData,
  type WidgetWeekDay,
} from './widgetTypes';

const DAY_LABELS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'] as const;

const CELEBRATION_MS = 8_000;
const CELEBRATION_KEY = '@widget_celebration';
const STATE_CACHE_KEY = '@widget_state';

export async function getCelebrationRemainingMs(): Promise<number> {
  const raw = await AsyncStorage.getItem(CELEBRATION_KEY);
  if (!raw) return 0;
  try {
    const { expires } = JSON.parse(raw) as { expires: number; date: string };
    return Math.max(0, expires - Date.now());
  } catch {
    return 0;
  }
}

export async function getCachedWidgetState(): Promise<WidgetData | null> {
  const raw = await AsyncStorage.getItem(STATE_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WidgetData;
  } catch {
    return null;
  }
}

export async function getWidgetData(page = 0): Promise<WidgetData> {
  const today = todayIso();

  const [allActivities, allCompletions] = await Promise.all([
    activityRepo.listActive(),
    completionRepo.listAll(),
  ]);

  const activitiesForStreak = allActivities.map(toActivityForStreak);

  const currentStreak = computeCurrentDailyStreak(activitiesForStreak, allCompletions, today);
  const bestStreak = computeBestDailyStreak(activitiesForStreak, allCompletions, today);
  const isPersonalRecord = currentStreak > 0 && currentStreak >= bestStreak;

  const badge = getNextBadge(currentStreak);

  // Today's activities — only those scheduled for today's day-of-week
  const todayDow = dowOf(parseIsoDate(today));
  const completedTodayIds = new Set(
    allCompletions.filter((c) => c.date === today).map((c) => c.activityId),
  );

  const todayActivities: WidgetActivityData[] = allActivities
    .filter((a) => {
      const mask = daysToMask(a.scheduledDays);
      return isDayScheduled(mask, todayDow);
    })
    .map((a) => ({
      id: a.id,
      name: a.name,
      emoji: a.emoji,
      color: a.color,
      isCompleted: completedTodayIds.has(a.id),
    }));

  let allCompletedToday =
    todayActivities.length > 0 && todayActivities.every((a) => a.isCompleted);

  // Celebration: zobraz 8 sekund, pak normální widget po zbytek dne
  if (allCompletedToday) {
    const raw = await AsyncStorage.getItem(CELEBRATION_KEY);
    const now = Date.now();
    if (raw == null) {
      // Poprvé dnes — spusť countdown
      await AsyncStorage.setItem(CELEBRATION_KEY, JSON.stringify({ expires: now + CELEBRATION_MS, date: today }));
    } else {
      try {
        const { expires, date } = JSON.parse(raw) as { expires: number; date: string };
        if (date !== today) {
          // Nový den — nová celebration
          await AsyncStorage.setItem(CELEBRATION_KEY, JSON.stringify({ expires: now + CELEBRATION_MS, date: today }));
        } else if (now >= expires) {
          // Timer vypršel — normální widget po zbytek dne (klíč necháme aby se neopakoval)
          allCompletedToday = false;
        }
        // Jinak: timer běží → celebration
      } catch {
        await AsyncStorage.removeItem(CELEBRATION_KEY);
      }
    }
  } else {
    // Pokud uživatel odznačí aktivitu — smaž záznam aby celebration šla znovu
    const raw = await AsyncStorage.getItem(CELEBRATION_KEY);
    if (raw) {
      try {
        const { date } = JSON.parse(raw) as { date: string };
        if (date === today) await AsyncStorage.removeItem(CELEBRATION_KEY);
      } catch {
        await AsyncStorage.removeItem(CELEBRATION_KEY);
      }
    }
  }

  // Stránkování návyků (widget nemá horizontální scroll → listujeme šipkami)
  const totalPages = Math.max(1, Math.ceil(todayActivities.length / WIDGET_PAGE_SIZE));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const pageActivities = todayActivities.slice(
    safePage * WIDGET_PAGE_SIZE,
    safePage * WIDGET_PAGE_SIZE + WIDGET_PAGE_SIZE,
  );

  // Week days (Mon–Sun of current week)
  const weekStart = mondayOfIso(parseIsoDate(today));
  const days = weekDates(parseIsoDate(weekStart));

  const completionsByDate = new Map<string, Set<number>>();
  for (const c of allCompletions) {
    if (!completionsByDate.has(c.date)) completionsByDate.set(c.date, new Set());
    completionsByDate.get(c.date)!.add(c.activityId);
  }

  const weekDays: WidgetWeekDay[] = days.map((day, i) => {
    const isToday = day === today;
    const isFuture = day > today;

    const dayDow = dowOf(parseIsoDate(day));
    const scheduledForDay = activitiesForStreak.filter((a) => {
      if (a.createdAtIso > day) return false;
      const mask = daysToMask(a.scheduledDays);
      return isDayScheduled(mask, dayDow);
    });

    const completedForDay = completionsByDate.get(day) ?? new Set<number>();
    const allScheduledDone =
      scheduledForDay.length > 0 &&
      scheduledForDay.every((a) => completedForDay.has(a.id));

    return {
      label: DAY_LABELS[i]!,
      isCompleted: !isFuture && allScheduledDone,
      isToday,
      isFuture,
    };
  });

  const result: WidgetData = {
    currentStreak,
    isPersonalRecord,
    daysToNextBadge: badge.daysLeft,
    nextBadgeTarget: badge.target,
    progressToNextBadge: badge.progress,
    activities: pageActivities,
    page: safePage,
    totalPages,
    weekDays,
    todayIso: today,
    allCompletedToday,
  };

  void AsyncStorage.setItem(STATE_CACHE_KEY, JSON.stringify(result));
  return result;
}
