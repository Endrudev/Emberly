import * as Notifications from 'expo-notifications';

import type { Activity, Completion } from '@/domain/types';
import { computeCurrentDailyStreak, toActivityForStreak } from '@/domain/streaks';
import { daysToMask, dowOf, isDayScheduled, parseIsoDate, todayIso } from '@/domain/week';
import { getTranslation } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { REMINDERS_CHANNEL_ID } from './channel';

const DAILY_REMINDER_ID = 'reminder-daily';
const STREAK_RISK_REMINDER_ID = 'reminder-streak-risk';
const ALL_DONE_NOTIFICATION_ID = 'reminder-all-done';

/** Pevný čas L2 (streak-at-risk) — nezávislý na uživatelově L1 čase. */
const STREAK_RISK_HOUR = 20;
const STREAK_RISK_MINUTE = 30;

/**
 * Quick-complete tlačítka přímo v L2 notifikaci — viz vault
 * `thinking/backlog.md` "Quick-add z notifikace". Nad 2 chybějícími návyky
 * appka nezkouší vybírat "nejdůležitější" — jen obecný text, beze tlačítek,
 * ať výběr není arbitrary a matoucí.
 */
const MAX_QUICK_COMPLETE_ACTIONS = 2;
const QUICK_COMPLETE_CATEGORY_ID = 'emberly-quick-complete';
export const QUICK_COMPLETE_ACTION_PREFIX = 'QUICK_COMPLETE_';

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

/** Dnes naplánované aktivity, které ještě nejsou splněné. */
export function getRemainingTodayActivities(
  activities: readonly Activity[],
  completions: readonly Completion[],
): Activity[] {
  const today = todayIso();
  const todayDow = dowOf(parseIsoDate(today));
  const scheduledToday = activities.filter((a) =>
    isDayScheduled(daysToMask(a.scheduledDays), todayDow),
  );
  const completedTodayIds = new Set(
    completions.filter((c) => c.date === today).map((c) => c.activityId),
  );
  return scheduledToday.filter((a) => !completedTodayIds.has(a.id));
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
  return getRemainingTodayActivities(activities, completions).length === 0;
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
 * Registruje (přepíše) kategorii s tlačítky pojmenovanými podle konkrétních
 * návyků — `setNotificationCategoryAsync` jde volat znovu s jiným obsahem
 * kdykoli, žádná pevná sada akcí od startu appky. `opensAppToForeground:
 * false` je to klíčové nastavení, díky kterému tap na tlačítko appku
 * neotevře — jen doběhne `addNotificationResponseReceivedListener` na pozadí.
 */
async function registerQuickCompleteCategory(habitNames: readonly string[]): Promise<string> {
  await Notifications.setNotificationCategoryAsync(
    QUICK_COMPLETE_CATEGORY_ID,
    habitNames.map((name, i) => ({
      identifier: `${QUICK_COMPLETE_ACTION_PREFIX}${i}`,
      buttonTitle: `✓ ${name}`,
      options: { opensAppToForeground: false },
    })),
  );
  return QUICK_COMPLETE_CATEGORY_ID;
}

interface QuickCompleteContent {
  body: string;
  categoryIdentifier?: string;
  data?: Record<string, unknown>;
}

/**
 * Sestaví tělo + (pokud 1–2 návyky chybí) quick-complete tlačítka. Sdílené
 * mezi skutečným večerním naplánováním (`scheduleStreakRiskReminder`) a
 * dev testovacím tlačítkem (`presentTestQuickCompleteNotification`), ať
 * obě cesty vždy vygenerují identický obsah.
 */
async function buildQuickCompleteContent(
  remaining: readonly Activity[],
): Promise<QuickCompleteContent> {
  const t = getTranslation();
  if (remaining.length === 0 || remaining.length > MAX_QUICK_COMPLETE_ACTIONS) {
    return { body: pickRandom(t.reminders.streakRisk) };
  }
  const categoryIdentifier = await registerQuickCompleteCategory(remaining.map((a) => a.name));
  return {
    body:
      remaining.length === 1
        ? t.reminders.oneLeft(remaining[0]!.name)
        : t.reminders.fewLeft(remaining.map((a) => a.name)),
    categoryIdentifier,
    data: { habitIds: remaining.map((a) => a.id) },
  };
}

/**
 * L2 — one-shot na dnešní večer, jen pokud je zapnutý, streak žije a dnešek
 * ještě není hotový. Jinak (nebo když dnešní okno už proběhlo) zruší.
 *
 * Když chybí 1–2 návyky, obsahuje "quick complete" tlačítka pojmenovaná podle
 * konkrétních návyků (viz `registerQuickCompleteCategory`) — tap označí návyk
 * splněný bez otevření appky (`completeHabitFromNotification` v
 * `app/_layout.tsx`). Nad 2 chybějícími se vrací k obecnému textu, ať appka
 * nemusí arbitrárně vybírat, které 2 z více zobrazit.
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
  const remaining = getRemainingTodayActivities(activities, completions);
  const content = await buildQuickCompleteContent(remaining);

  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_RISK_REMINDER_ID,
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
      channelId: REMINDERS_CHANNEL_ID,
    },
  });
}

export async function cancelStreakRiskReminder(): Promise<void> {
  // `cancelScheduledNotificationAsync` only stops a FUTURE trigger from
  // firing — it does nothing to a notification that's already showing in
  // the tray. `dismissNotificationAsync` is the one that actually removes
  // an already-delivered notification. We call both because the caller
  // doesn't know (or care) which state the L2 notification is currently in.
  await Notifications.cancelScheduledNotificationAsync(STREAK_RISK_REMINDER_ID);
  await Notifications.dismissNotificationAsync(STREAK_RISK_REMINDER_ID);
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

/**
 * Dev-only: pošle skutečnou quick-complete notifikaci HNED, nad živými daty
 * appky (žádná fixní testovací data) — obchází čas 20:30 i podmínku "streak
 * musí žít", ať jde ověřit reálné tlačítko/tap-flow bez čekání na večer.
 * Volané z tlačítka v Nastavení → Data (__DEV__ gated).
 */
export async function presentTestQuickCompleteNotification(
  state: ReminderActivityState,
): Promise<void> {
  const remaining = getRemainingTodayActivities(state.activities, state.completions);
  if (remaining.length === 0) {
    await presentAllDoneNotification();
    return;
  }
  const content = await buildQuickCompleteContent(remaining);
  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_RISK_REMINDER_ID,
    content,
    trigger: null,
  });
}

/** Okamžitá gratulační notifikace — appka není otevřená, takže nejde ukázat
 *  normální celebration animaci; tohle zachová aspoň kus pocitu odměny. */
async function presentAllDoneNotification(): Promise<void> {
  const t = getTranslation();
  await Notifications.scheduleNotificationAsync({
    identifier: ALL_DONE_NOTIFICATION_ID,
    content: { body: t.reminders.allDone },
    trigger: null,
  });
}

/**
 * Volané z `addNotificationResponseReceivedListener` (registrovaného na
 * modulové úrovni v `app/_layout.tsx`, ne uvnitř React komponenty — reaguje i
 * když appku vzbudí na pozadí, ne jen když běží v popředí) po tapu na
 * quick-complete tlačítko. Čte/zapisuje store přímo přes `getState()` (mimo
 * React strom, stejný vzor jako widget task handler zapisující do DB napřímo).
 *
 * ⚠️ **Ověřeno na reálném zařízení (2026-07-14): funguje, dokud appka běží
 * (na pozadí i v popředí). NEfunguje, pokud je proces appky úplně killnutý**
 * (swipe z multitaskingu) — `expo-notifications` na Androidu umí notifikaci
 * zobrazit čistě nativně bez JS, ale na REAKCI na tap tlačítka (spuštění JS
 * na pozadí) nemá zabudovaný headless mechanismus jako widget
 * (`registerWidgetTaskHandler` + `HeadlessJsTaskService`). Oprava by
 * vyžadovala vlastní `BroadcastReceiver` + `HeadlessJsTaskService` (nový
 * nativní modul, podobný rozsah práce jako widget) — vědomě NEimplementováno,
 * považováno za přijatelné omezení (viz vault `thinking/backlog.md`).
 */
export async function completeHabitFromNotification(habitId: number): Promise<void> {
  // ⚠️ Confirmed by on-device testing (2026-07-14, Samsung/Android): the
  // completion write MUST fully finish before this function touches the
  // Notifications API at all (dismiss/cancel/present) — calling those
  // first, OR even racing them concurrently via Promise.all, reliably
  // dropped the write with no thrown error anywhere (the process seems to
  // get reclaimed as soon as Android considers the notification interaction
  // "handled", independent of what else our JS is still awaiting). Only
  // write-then-notify (this order) was reliable across repeated tests.
  await useAppStore.getState().toggleCompletion(habitId, todayIso());

  const { activities, completions } = useAppStore.getState();
  const remaining = getRemainingTodayActivities(activities, completions);

  if (__DEV__) console.log('[quick-complete] write done, remaining =', remaining.length);

  try {
    if (remaining.length === 0) {
      // Whole day just got finished by this tap — replace with the congrats
      // notification instead of leaving the (now stale) quick-complete one up.
      await cancelStreakRiskReminder();
      if (__DEV__) console.log('[quick-complete] dismissed, presenting all-done');
      await presentAllDoneNotification();
      if (__DEV__) console.log('[quick-complete] all-done presented');
    } else if (remaining.length <= MAX_QUICK_COMPLETE_ACTIONS) {
      // Still 1–2 habits left (e.g. tapped one of two) — cancel the old
      // notification explicitly (matching the proven-reliable branch above)
      // THEN present a fresh one with a button set for what's left, rather
      // than scheduling straight over the same identifier in one step.
      await cancelStreakRiskReminder();
      if (__DEV__) console.log('[quick-complete] dismissed, building updated content');
      const content = await buildQuickCompleteContent(remaining);
      if (__DEV__) console.log('[quick-complete] content built, scheduling', content.body);
      await Notifications.scheduleNotificationAsync({
        identifier: STREAK_RISK_REMINDER_ID,
        content,
        trigger: null,
      });
      if (__DEV__) console.log('[quick-complete] updated notification scheduled');
    } else {
      await cancelStreakRiskReminder();
    }
  } catch (err) {
    if (__DEV__) console.warn('[quick-complete] failed to update notification', err);
  }
}
