import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfWeek,
} from 'date-fns';

import type { DayOfWeek } from './types';

export const ISO_DATE_FORMAT = 'yyyy-MM-dd';

/**
 * Vrátí lokální datum (ne UTC) jako ISO řetězec "yyyy-MM-dd".
 * Předpoklad: vstup je už v lokální timezone (date-fns pracuje s lokálem).
 */
export function toIsoDate(date: Date): string {
  return format(date, ISO_DATE_FORMAT);
}

export function parseIsoDate(iso: string): Date {
  return parseISO(iso);
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

/**
 * Převede JS getDay() (neděle=0..sobota=6) na náš DayOfWeek (pondělí=0..neděle=6).
 */
export function jsDayToDow(jsDay: number): DayOfWeek {
  return (((jsDay + 6) % 7) as DayOfWeek);
}

export function dowOf(date: Date): DayOfWeek {
  return jsDayToDow(date.getDay());
}

/** Pondělí daného týdne jako Date (čas vynulovaný na 00:00 lokálně). */
export function mondayOf(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function mondayOfIso(date: Date): string {
  return toIsoDate(mondayOf(date));
}

/** Pole 7 ISO dat pondělí–neděle pro daný týden. */
export function weekDates(weekStart: Date): string[] {
  const monday = mondayOf(weekStart);
  return Array.from({ length: 7 }, (_, i) => toIsoDate(addDays(monday, i)));
}

export function shiftWeek(weekStartIso: string, delta: number): string {
  return toIsoDate(addWeeks(parseIsoDate(weekStartIso), delta));
}

/** Počet dní mezi dvěma ISO daty (b - a). Kladný = b je po a. */
export function diffDaysIso(aIso: string, bIso: string): number {
  return differenceInCalendarDays(parseIsoDate(bIso), parseIsoDate(aIso));
}

// ---- Bitmask helpers ----

/** Převede bitmasku na seznam DayOfWeek (po=0..ne=6). */
export function maskToDays(mask: number): DayOfWeek[] {
  const out: DayOfWeek[] = [];
  for (let i = 0; i < 7; i++) {
    if ((mask & (1 << i)) !== 0) {
      out.push(i as DayOfWeek);
    }
  }
  return out;
}

/** Převede seznam DayOfWeek na bitmasku. */
export function daysToMask(days: readonly DayOfWeek[]): number {
  let mask = 0;
  for (const d of days) {
    mask |= 1 << d;
  }
  return mask;
}

export function isDayScheduled(mask: number, day: DayOfWeek): boolean {
  return (mask & (1 << day)) !== 0;
}
