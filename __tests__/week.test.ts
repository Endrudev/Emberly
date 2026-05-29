import {
  daysToMask,
  dowOf,
  isDayScheduled,
  jsDayToDow,
  maskToDays,
  mondayOfIso,
  parseIsoDate,
  shiftWeek,
  toIsoDate,
  weekDates,
} from '@/domain/week';
import type { DayOfWeek } from '@/domain/types';

describe('week helpers', () => {
  test('jsDayToDow maps Sunday=0..Saturday=6 to Mon=0..Sun=6', () => {
    expect(jsDayToDow(1)).toBe(0); // Monday → 0
    expect(jsDayToDow(2)).toBe(1); // Tuesday → 1
    expect(jsDayToDow(0)).toBe(6); // Sunday → 6
    expect(jsDayToDow(6)).toBe(5); // Saturday → 5
  });

  test('dowOf returns Monday=0 for a known Monday', () => {
    const monday = parseIsoDate('2026-05-25'); // pondělí
    expect(dowOf(monday)).toBe(0);
    const sunday = parseIsoDate('2026-05-31'); // neděle
    expect(dowOf(sunday)).toBe(6);
  });

  test('mondayOfIso returns Monday for any day in week', () => {
    // 2026-05-28 = čtvrtek, pondělí toho týdne = 2026-05-25
    expect(mondayOfIso(parseIsoDate('2026-05-28'))).toBe('2026-05-25');
    expect(mondayOfIso(parseIsoDate('2026-05-25'))).toBe('2026-05-25');
    expect(mondayOfIso(parseIsoDate('2026-05-31'))).toBe('2026-05-25');
  });

  test('weekDates returns 7 ISO dates Mon..Sun', () => {
    const days = weekDates(parseIsoDate('2026-05-28'));
    expect(days).toEqual([
      '2026-05-25',
      '2026-05-26',
      '2026-05-27',
      '2026-05-28',
      '2026-05-29',
      '2026-05-30',
      '2026-05-31',
    ]);
  });

  test('shiftWeek moves by N weeks', () => {
    expect(shiftWeek('2026-05-25', 1)).toBe('2026-06-01');
    expect(shiftWeek('2026-05-25', -1)).toBe('2026-05-18');
  });

  test('mask roundtrip (mask → days → mask)', () => {
    const days: DayOfWeek[] = [0, 2, 5]; // po, st, so
    const mask = daysToMask(days);
    expect(mask).toBe(0b0100101); // 1 + 4 + 32 = 37
    expect(maskToDays(mask)).toEqual(days);
  });

  test('isDayScheduled checks bitmask membership', () => {
    const mask = daysToMask([1, 3, 5]); // út, čt, so
    expect(isDayScheduled(mask, 1)).toBe(true);
    expect(isDayScheduled(mask, 3)).toBe(true);
    expect(isDayScheduled(mask, 0)).toBe(false);
    expect(isDayScheduled(mask, 6)).toBe(false);
  });

  test('toIsoDate handles year boundary', () => {
    expect(toIsoDate(parseIsoDate('2025-12-31'))).toBe('2025-12-31');
    expect(toIsoDate(parseIsoDate('2026-01-01'))).toBe('2026-01-01');
  });
});
