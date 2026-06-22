import * as Notifications from 'expo-notifications';

import type { Activity, Completion } from '@/domain/types';
import { computeCurrentDailyStreak, toActivityForStreak } from '@/domain/streaks';
import { daysToMask, dowOf, isDayScheduled, parseIsoDate, todayIso } from '@/domain/week';
import { getTranslation } from '@/i18n';
import { REMINDERS_CHANNEL_ID } from './channel';

const DAILY_REMINDER_ID = 'reminder-daily';
const STREAK_RISK_REMINDER_ID = 'reminder-streak-risk';

/** Pevný čas L2 (streak-at-risk) — nezávislý na uživatelově L1 čase. */
const STREAK_RISK_HOUR = 20;
const STREAK_RISK_MINUTE = 30;

export interface ReminderActivityState {
  activities: readonly Activity[];
  completions: readonly Completion[];
}

export interface ReminderSettingsInput {
  remindersEnabled: boolean;
  /** "HH:mm" lokální čas. */
  reminderTime: string;
  streakReminderEnabled: boolean;
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function parseTime(time: string): { hour: number; minute: number } {
  const [hourStr, minuteStr] = time.split(':');
  return { hour: Number(hourStr) || 0, minute: Number(minuteStr) || 0 };
}

/**
 * Je dnešek hotový? — všechny dnes naplánované aktivity jsou splněné.
 * Žádná naplánovaná aktivita na dnešek = den se počítá jako hotový (nic
 * nehrozí). Stejné pravidlo jako `evaluateDay` v `domain/streaks.ts`, jen
 * nad živými daty místo jednoho dne v historii — žádná nová streak logika.
 */
export function isTodayDone(
  activities: readonly Activity[],
  completions: readonly Completion[],
): boolean {
  const today = todayIso();
  const todayDow = dowOf(parseIsoDate(today));
  const scheduledToday = activities.filter((a) => isDayScheduled(daysToMask(a.scheduledDays), todayDow));
  if (scheduledToday.length === 0) return true;

  const completedTodayIds = new Set(
    completions.filter((c) => c.date === today).map((c) => c.activityId),
  );
  return scheduledToday.every((a) => completedTodayIds.has(a.id));
}

/** Aktuální denní streak — tenký wrapper nad `computeCurrentDailyStreak`. */
export function getCurrentDailyStreak(
  activities: readonly Activity[],
  completions: readonly Completion[],
): number {
  return computeCurrentDailyStreak(activities.map(toActivityForStreak), completions, todayIso());
}

/** L1 — denní opakovaná připomínka. Zruší starou (stejný identifier) a naplánuje novou. */
export async function scheduleDailyReminder(time: string): Promise<void> {
  await cancelDailyReminder();
  const { hour, minute } = parseTime(time);
  const t = getTranslation();
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      body: pickRandom(t.reminders.daily),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: REMINDERS_CHANNEL_ID,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
}

/**
 * L2 — one-shot na dnešní večer, jen pokud je zapnutý, streak žije a dnešek
 * ještě není hotový. Jinak (nebo když dnešní okno už proběhlo) zruší.
 */
export async function scheduleStreakRiskReminder(
  enabled: boolean,
  { activities, completions }: ReminderActivityState,
): Promise<void> {
  if (!enabled || isTodayDone(activities, completions)) {
    await cancelStreakRiskReminder();
    return;
  }

  const streak = getCurrentDailyStreak(activities, completions);
  if (streak <= 0) {
    await cancelStreakRiskReminder();
    return;
  }

  const fireAt = new Date();
  fireAt.setHours(STREAK_RISK_HOUR, STREAK_RISK_MINUTE, 0, 0);
  if (fireAt.getTime() <= Date.now()) {
    // Dnešní okno už proběhlo (appka běží po 20:30) — nic neplánuj na dnešek.
    await cancelStreakRiskReminder();
    return;
  }

  await cancelStreakRiskReminder();
  const t = getTranslation();
  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_RISK_REMINDER_ID,
    content: {
      body: pickRandom(t.reminders.streakRisk),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
      channelId: REMINDERS_CHANNEL_ID,
    },
  });
}

export async function cancelStreakRiskReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(STREAK_RISK_REMINDER_ID);
}

export async function cancelAll(): Promise<void> {
  await Promise.all([cancelDailyReminder(), cancelStreakRiskReminder()]);
}

/** Přepočítá L1 + L2 podle aktuálního nastavení a živého stavu (aktivity/completions). */
export async function rescheduleAll(
  settings: ReminderSettingsInput,
  state: ReminderActivityState,
): Promise<void> {
  if (!settings.remindersEnabled) {
    await cancelAll();
    return;
  }
  await scheduleDailyReminder(settings.reminderTime);
  await scheduleStreakRiskReminder(settings.streakReminderEnabled, state);
}
