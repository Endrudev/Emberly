import {
  decideAutoFreeze,
  freezesRemainingInMonth,
  freezesUsedInMonth,
} from '@/domain/streakFreeze';
import type { ActivityForStreak } from '@/domain/streaks';
import type { Completion, DayOfWeek } from '@/domain/types';

const MON: DayOfWeek = 0;
const TUE: DayOfWeek = 1;
const WED: DayOfWeek = 2;
const THU: DayOfWeek = 3;
const FRI: DayOfWeek = 4;
const SAT: DayOfWeek = 5;
const SUN: DayOfWeek = 6;
const EVERY_DAY: DayOfWeek[] = [MON, TUE, WED, THU, FRI, SAT, SUN];

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

describe('freezesUsedInMonth / freezesRemainingInMonth', () => {
  test('counts only dates within the given month', () => {
    const frozen = ['2026-05-03', '2026-05-20', '2026-06-01'];
    expect(freezesUsedInMonth(frozen, '2026-05')).toBe(2);
    expect(freezesUsedInMonth(frozen, '2026-06')).toBe(1);
    expect(freezesUsedInMonth(frozen, '2026-07')).toBe(0);
  });

  test('remaining is quota minus used, floored at 0', () => {
    expect(freezesRemainingInMonth(['2026-05-03'], '2026-05', 2)).toBe(1);
    expect(freezesRemainingInMonth(['2026-05-03', '2026-05-20'], '2026-05', 2)).toBe(0);
    const frozenThree = ['2026-05-03', '2026-05-20', '2026-05-21'];
    expect(freezesRemainingInMonth(frozenThree, '2026-05', 2)).toBe(0);
  });

  test('quota resets in a new month regardless of prior usage', () => {
    const frozen = ['2026-05-03', '2026-05-20'];
    expect(freezesRemainingInMonth(frozen, '2026-06', 2)).toBe(2);
  });
});

describe('decideAutoFreeze', () => {
  // 2026-05-27 = středa
  test('does not freeze an already-protected day', () => {
    const activities = [act(1, EVERY_DAY)];
    const completions = done(1, ['2026-05-26']); // 27. zmeškáno
    expect(decideAutoFreeze(activities, completions, ['2026-05-27'], '2026-05-27')).toBe(false);
  });

  test('does not freeze a day that was naturally successful', () => {
    const activities = [act(1, EVERY_DAY)];
    const completions = done(1, ['2026-05-27']);
    expect(decideAutoFreeze(activities, completions, [], '2026-05-27')).toBe(false);
  });

  test('freezes a missed day when quota is available', () => {
    const activities = [act(1, EVERY_DAY)];
    const completions = done(1, ['2026-05-26']); // 27. zmeškáno
    expect(decideAutoFreeze(activities, completions, [], '2026-05-27')).toBe(true);
  });

  test('does not freeze when the monthly quota is exhausted', () => {
    const activities = [act(1, EVERY_DAY)];
    const completions = done(1, []);
    const frozen = ['2026-05-10', '2026-05-20']; // kvóta 2/měsíc už vyčerpaná
    expect(decideAutoFreeze(activities, completions, frozen, '2026-05-27')).toBe(false);
  });

  test('quota is scoped per calendar month', () => {
    const activities = [act(1, EVERY_DAY)];
    const completions = done(1, []);
    const frozen = ['2026-04-10', '2026-04-20']; // vyčerpáno v dubnu, ne v květnu
    expect(decideAutoFreeze(activities, completions, frozen, '2026-05-27')).toBe(true);
  });

  test('unscheduled day does not need (or get) a freeze', () => {
    const activities = [act(1, [MON, WED, FRI])];
    const completions = done(1, []);
    // 2026-05-26 = úterý, není naplánováno → den je úspěšný sám o sobě
    expect(decideAutoFreeze(activities, completions, [], '2026-05-26')).toBe(false);
  });
});
