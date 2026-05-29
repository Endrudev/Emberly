import {
  computeBestDailyStreak,
  computeBestWeeklyStreak,
  computeCurrentDailyStreak,
  computeCurrentWeeklyStreak,
  computeWeekProgress,
  type ActivityForStreak,
} from '@/domain/streaks';
import type { Completion, DayOfWeek } from '@/domain/types';

// ---- Test fixtures helpers ----

const MON: DayOfWeek = 0;
const TUE: DayOfWeek = 1;
const WED: DayOfWeek = 2;
const THU: DayOfWeek = 3;
const FRI: DayOfWeek = 4;
const SAT: DayOfWeek = 5;
const SUN: DayOfWeek = 6;

function act(
  id: number,
  scheduledDays: DayOfWeek[],
  createdAtIso = '2026-01-01',
): ActivityForStreak {
  return { id, scheduledDays, createdAtIso };
}

function done(activityId: number, dates: string[]): Completion[] {
  return dates.map((date) => ({ activityId, date, completedAt: Date.parse(date) }));
}

// Reference: 2026-05-25 = pondělí, 2026-05-31 = neděle
// 2026-05-18 = pondělí, 2026-05-24 = neděle (předchozí týden)

describe('computeCurrentDailyStreak', () => {
  test('returns 0 for no activities', () => {
    expect(computeCurrentDailyStreak([], [], '2026-05-28')).toBe(0);
  });

  test('streak counts back from today when today is complete', () => {
    // Aktivita každý den (po..ne)
    const activities = [act(1, [MON, TUE, WED, THU, FRI, SAT, SUN])];
    const completions = done(1, [
      '2026-05-25',
      '2026-05-26',
      '2026-05-27',
      '2026-05-28', // dnes
    ]);
    expect(computeCurrentDailyStreak(activities, completions, '2026-05-28')).toBe(4);
  });

  test('unfinished today does not break streak measured from yesterday', () => {
    const activities = [act(1, [MON, TUE, WED, THU, FRI, SAT, SUN])];
    const completions = done(1, [
      '2026-05-25',
      '2026-05-26',
      '2026-05-27', // včera ok
      // dnes 2026-05-28 chybí
    ]);
    expect(computeCurrentDailyStreak(activities, completions, '2026-05-28')).toBe(3);
  });

  test('unfinished yesterday breaks streak (current = 0 / today not complete either)', () => {
    const activities = [act(1, [MON, TUE, WED, THU, FRI, SAT, SUN])];
    const completions = done(1, [
      '2026-05-25',
      '2026-05-26',
      // 2026-05-27 chybí → streak se láme
    ]);
    expect(computeCurrentDailyStreak(activities, completions, '2026-05-28')).toBe(0);
  });

  test('unscheduled days do not break the streak', () => {
    // Aktivita jen po, st, pá; vytvořená nedávno, takže nemáme historii před daty splnění
    const activities = [act(1, [MON, WED, FRI], '2026-05-25')];
    const completions = done(1, [
      '2026-05-25', // po — scheduled, done
      '2026-05-27', // st — scheduled, done
    ]);
    // today=čt (2026-05-28) nenaplánováno → +1 (success)
    // 2026-05-27 (st) scheduled+done → +1
    // 2026-05-26 (út) nenaplánováno → +1
    // 2026-05-25 (po) scheduled+done → +1
    // 2026-05-24 < createdAt → stop. Streak = 4.
    expect(computeCurrentDailyStreak(activities, completions, '2026-05-28')).toBe(4);
  });

  test('only counts back to earliest createdAt', () => {
    const activities = [act(1, [MON, TUE, WED, THU, FRI, SAT, SUN], '2026-05-27')];
    const completions = done(1, ['2026-05-27', '2026-05-28']);
    expect(computeCurrentDailyStreak(activities, completions, '2026-05-28')).toBe(2);
  });

  test('multiple activities: must complete ALL scheduled on each day', () => {
    // both vytvořené v po 2026-05-25, takže streak nemůže utéct za pondělí
    const activities = [act(1, [MON, TUE], '2026-05-25'), act(2, [TUE], '2026-05-25')];
    const completions = [
      ...done(1, ['2026-05-25', '2026-05-26']), // act1: po + út
      // act 2 v útery 2026-05-26 nesplněno → 2026-05-26 NENÍ úspěšný den
    ];
    // today=st (2026-05-27): žádná aktivita nemá scheduled středu → success → +1
    // út (2026-05-26): act 2 scheduled, nesplněno → break.
    expect(computeCurrentDailyStreak(activities, completions, '2026-05-27')).toBe(1);
  });
});

describe('computeBestDailyStreak', () => {
  test('returns longest historical run', () => {
    const activities = [act(1, [MON, TUE, WED, THU, FRI, SAT, SUN])];
    const completions = done(1, [
      '2026-01-05',
      '2026-01-06',
      '2026-01-07', // 3 dny
      // pauza
      '2026-02-01',
      '2026-02-02',
      '2026-02-03',
      '2026-02-04',
      '2026-02-05', // 5 dnů → best
    ]);
    expect(computeBestDailyStreak(activities, completions, '2026-02-10')).toBeGreaterThanOrEqual(5);
  });

  test('treats unscheduled days as non-breaking when computing history', () => {
    // Activity created 2026-05-02 (sobota) — první scheduled den je po 2026-05-04
    const activities = [act(1, [MON, WED, FRI], '2026-05-02')];
    const completions = done(1, [
      '2026-05-04', // po
      '2026-05-06', // st
      '2026-05-08', // pá
      '2026-05-11', // po
    ]);
    // 2026-05-02 (so, unscheduled) +1
    // 2026-05-03 (ne, unscheduled) +1
    // 2026-05-04 (po, scheduled+done) +1
    // 2026-05-05 (út, unscheduled) +1
    // 2026-05-06 (st, scheduled+done) +1
    // 2026-05-07 (čt, unscheduled) +1
    // 2026-05-08 (pá, scheduled+done) +1
    // 2026-05-09 (so, unscheduled) +1
    // 2026-05-10 (ne, unscheduled) +1
    // 2026-05-11 (po, scheduled+done) +1
    // 2026-05-12 (today=út, unscheduled) +1 → total 11
    expect(computeBestDailyStreak(activities, completions, '2026-05-12')).toBe(11);
  });
});

describe('computeCurrentWeeklyStreak', () => {
  test('returns 0 with no activities', () => {
    expect(computeCurrentWeeklyStreak([], [], '2026-05-28')).toBe(0);
  });

  test('counts perfect closed weeks ending at last full week', () => {
    // 2026-05-18..2026-05-24 (po..ne) perfektní; 2026-05-11..2026-05-17 perfektní
    // 2026-05-04..2026-05-10 NEperfektní → break
    const activities = [act(1, [MON, WED, FRI], '2026-05-01')];
    const completions = done(1, [
      // 2026-05-04..05-10
      '2026-05-04', // po
      '2026-05-06', // st
      // pá chybí
      // 2026-05-11..05-17
      '2026-05-11',
      '2026-05-13',
      '2026-05-15',
      // 2026-05-18..05-24
      '2026-05-18',
      '2026-05-20',
      '2026-05-22',
    ]);
    // aktuální týden 2026-05-25.. ještě není uzavřený, today=2026-05-28
    // partial v aktuálním týdnu: po 25 splněno? NE → partial = false → streak začne od 5-18..5-24 nazpět
    // 5-18..5-24 = perfect → +1
    // 5-11..5-17 = perfect → +1
    // 5-04..5-10 = NEperfect → stop
    expect(computeCurrentWeeklyStreak(activities, completions, '2026-05-28')).toBe(2);
  });

  test('current partial week counts only if all elapsed scheduled days are complete', () => {
    const activities = [act(1, [MON, TUE, WED, THU, FRI, SAT, SUN], '2026-05-01')];
    const completions = done(1, [
      // poslední plný týden (5-18..5-24) perfekt
      '2026-05-18',
      '2026-05-19',
      '2026-05-20',
      '2026-05-21',
      '2026-05-22',
      '2026-05-23',
      '2026-05-24',
      // aktuální týden: po(5-25)..čt(5-28) ano
      '2026-05-25',
      '2026-05-26',
      '2026-05-27',
      '2026-05-28',
    ]);
    // partial OK → +1, předchozí perfekt → +1 → 2
    expect(computeCurrentWeeklyStreak(activities, completions, '2026-05-28')).toBe(2);
  });

  test('weeks with no scheduled activities do not break streak (neutral)', () => {
    // Aktivita naplánovaná jen na pondělí, createdAt měsíc nazpět
    const activities = [act(1, [MON], '2026-04-01')];
    const completions = done(1, [
      '2026-04-06',
      '2026-04-13',
      '2026-04-20',
      '2026-04-27',
      '2026-05-04',
      '2026-05-11',
      '2026-05-18',
    ]);
    // Týdny 04-06..04-13... atd vše perfekt. Aktuální týden 5-25, today=5-28: nemá splněno → partial=false → start od 5-18 nazpět
    // všechny týdny po sobě perfekt = 7
    expect(computeCurrentWeeklyStreak(activities, completions, '2026-05-28')).toBe(7);
  });
});

describe('computeBestWeeklyStreak', () => {
  test('returns longest historical run of perfect weeks', () => {
    const activities = [act(1, [MON], '2026-04-01')];
    const completions = done(1, [
      '2026-04-06',
      '2026-04-13',
      // pauza 04-20 chybí
      '2026-04-27',
      '2026-05-04',
      '2026-05-11',
      '2026-05-18',
    ]);
    // Best by mělo být 4 (4-27, 5-04, 5-11, 5-18)
    expect(computeBestWeeklyStreak(activities, completions, '2026-05-28')).toBe(4);
  });
});

describe('computeWeekProgress', () => {
  test('counts planned and completed across all days of week', () => {
    const activities = [act(1, [MON, WED, FRI]), act(2, [TUE, THU])];
    const completions = [
      ...done(1, ['2026-05-25', '2026-05-27']), // po + st (chybí pá)
      ...done(2, ['2026-05-26']), // út (chybí čt)
    ];
    const progress = computeWeekProgress(activities, completions, '2026-05-25');
    expect(progress.plannedCount).toBe(5); // 3 + 2
    expect(progress.completedCount).toBe(3); // 2 + 1
    expect(progress.isPerfect).toBe(false);
  });

  test('isPerfect when all scheduled are complete', () => {
    const activities = [act(1, [MON, WED, FRI])];
    const completions = done(1, ['2026-05-25', '2026-05-27', '2026-05-29']);
    const progress = computeWeekProgress(activities, completions, '2026-05-25');
    expect(progress.plannedCount).toBe(3);
    expect(progress.completedCount).toBe(3);
    expect(progress.isPerfect).toBe(true);
  });

  test('handles year boundary', () => {
    const activities = [act(1, [MON, TUE, WED, THU, FRI, SAT, SUN], '2025-12-01')];
    const completions = done(1, [
      '2025-12-29',
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
    ]);
    // 2025-12-29 je pondělí
    const progress = computeWeekProgress(activities, completions, '2025-12-29');
    expect(progress.plannedCount).toBe(7);
    expect(progress.completedCount).toBe(7);
    expect(progress.isPerfect).toBe(true);
  });
});
