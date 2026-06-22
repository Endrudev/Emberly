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

/**
 * date-fns konvence: 0 = neděle začíná týden, 1 = pondělí začíná týden.
 * Výchozí hodnota (1) odpovídá historickému chování appky před tím, než
 * šel "začátek týdne" nastavit — všechny existující callery beze změny
 * dál počítají s pondělím.
 */
export type WeekAnchor = 0 | 1;

/** První den daného týdne jako Date (čas vynulovaný na 00:00 lokálně). */
export function mondayOf(date: Date, weekStartsOn: WeekAnchor = 1): Date {
  return startOfWeek(date, { weekStartsOn });
}

export function mondayOfIso(date: Date, weekStartsOn: WeekAnchor = 1): string {
  return toIsoDate(mondayOf(date, weekStartsOn));
}

/** Pole 7 ISO dat od prvního dne týdne (dle `weekStartsOn`) do posledního. */
export function weekDates(weekStart: Date, weekStartsOn: WeekAnchor = 1): string[] {
  const start = mondayOf(weekStart, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => toIsoDate(addDays(start, i)));
}

/**
 * Pořadí `DayOfWeek` (po=0..ne=6) pro zobrazení v UI podle toho, kterým dnem
 * týden začíná. Bitmaska `scheduledDaysMask` zůstává vázaná na absolutní
 * den — tahle funkce ovlivňuje jen vizuální pořadí sloupců/dnů, ne data.
 */
export function orderedDayIndices(weekStartsOn: WeekAnchor): DayOfWeek[] {
  const monStart: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];
  if (weekStartsOn === 1) return monStart;
  return [6, 0, 1, 2, 3, 4, 5];
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
