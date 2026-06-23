import { STREAK_FREEZE_MONTHLY_QUOTA } from '@/purchases/gating';
import type { Completion } from './types';
import { evaluateDay, indexCompletions, type ActivityForStreak } from './streaks';

function monthOf(dateIso: string): string {
  return dateIso.slice(0, 7);
}

export function freezesUsedInMonth(frozenDates: readonly string[], monthIso: string): number {
  return frozenDates.filter((d) => monthOf(d) === monthIso).length;
}

export function freezesRemainingInMonth(
  frozenDates: readonly string[],
  monthIso: string,
  quota: number = STREAK_FREEZE_MONTHLY_QUOTA,
): number {
  return Math.max(0, quota - freezesUsedInMonth(frozenDates, monthIso));
}

/**
 * Rozhodne, jestli se má automaticky zmrazit `yesterdayIso` (premium "ochrana série").
 * Kontroluje se vždy jen včerejšek — den, který se právě uzavřel — ne celá historie,
 * ať appka nezačne dohledávat a dohánět staré zmeškané dny po delší pauze.
 */
export function decideAutoFreeze(
  activities: readonly ActivityForStreak[],
  completions: readonly Completion[],
  frozenDates: readonly string[],
  yesterdayIso: string,
): boolean {
  if (frozenDates.includes(yesterdayIso)) return false;

  const index = indexCompletions(completions);
  const status = evaluateDay(activities, index, yesterdayIso);
  if (status.isSuccessful) return false;

  return freezesRemainingInMonth(frozenDates, monthOf(yesterdayIso)) > 0;
}
