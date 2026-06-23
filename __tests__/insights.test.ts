import {
  computeRangeStats,
  computeWeeklyTrend,
  computeBestWeekday,
  computeWeekdayBreakdown,
  earliestCreatedIso,
} from '@/domain/insights';
import type { ActivityForStreak } from '@/domain/streaks';
import type { Completion, DayOfWeek } from '@/domain/types';

const EVERYDAY: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

function activity(id: number, createdAtIso: string, days = EVERYDAY): ActivityForStreak {
  return { id, scheduledDays: days, createdAtIso };
}
function done(activityId: number, date: string): Completion {
  return { activityId, date, completedAt: 0 };
}

describe('computeRangeStats', () => {
  const acts = [activity(1, '2026-01-01')];

  it('počítá scheduled/completed/rate za rozsah', () => {
    // 7 dní, splněno 3
    const comps = [done(1, '2026-01-02'), done(1, '2026-01-04'), done(1, '2026-01-06')];
    const s = computeRangeStats(acts, comps, '2026-01-01', '2026-01-07');
    expect(s.scheduled).toBe(7);
    expect(s.completed).toBe(3);
    expect(s.rate).toBeCloseTo(3 / 7);
    expect(s.totalCheckins).toBe(3);
    expect(s.activeDays).toBe(3);
  });

  it('ignoruje dny před vytvořením aktivity', () => {
    const late = [activity(2, '2026-01-05')];
    const s = computeRangeStats(late, [], '2026-01-01', '2026-01-07');
    expect(s.scheduled).toBe(3); // jen 5.,6.,7.
  });

  it('rate je 0 když nic naplánováno', () => {
    const s = computeRangeStats([], [], '2026-01-01', '2026-01-07');
    expect(s.rate).toBe(0);
    expect(s.scheduled).toBe(0);
  });

  it('totalCheckins počítá i splnění mimo rozsah jen v rozsahu', () => {
    const comps = [done(1, '2025-12-31'), done(1, '2026-01-03'), done(1, '2026-01-09')];
    const s = computeRangeStats(acts, comps, '2026-01-01', '2026-01-07');
    expect(s.totalCheckins).toBe(1);
  });
});

describe('computeWeeklyTrend', () => {
  it('vrací požadovaný počet týdnů v pořadí (nejstarší → aktuální)', () => {
    const acts = [activity(1, '2025-01-01')];
    const trend = computeWeeklyTrend(acts, [], '2026-01-15', 8, 1);
    expect(trend).toHaveLength(8);
    // poslední bod je aktuální týden
    expect(trend[7]!.weekStartIso <= '2026-01-15').toBe(true);
    // seřazeno vzestupně podle data
    for (let i = 1; i < trend.length; i++) {
      expect(trend[i]!.weekStartIso > trend[i - 1]!.weekStartIso).toBe(true);
    }
  });
});

describe('computeBestWeekday', () => {
  it('najde den s nejvyšší úspěšností', () => {
    // pondělí 2026-01-05, splněno; ostatní naplánované dny nesplněné
    const acts = [activity(1, '2026-01-05')];
    const comps = [done(1, '2026-01-05')]; // pondělí
    const best = computeBestWeekday(acts, comps, '2026-01-11');
    expect(best).not.toBeNull();
    expect(best!.dow).toBe(0); // pondělí
    expect(best!.rate).toBe(1);
  });

  it('null bez aktivit', () => {
    expect(computeBestWeekday([], [], '2026-01-11')).toBeNull();
  });
});

describe('computeWeekdayBreakdown', () => {
  it('vrací 7 dní, scheduled=0 kde nejsou data', () => {
    const acts = [activity(1, '2026-01-05', [0])]; // jen pondělí
    const b = computeWeekdayBreakdown(acts, [done(1, '2026-01-05')], '2026-01-11');
    expect(b).toHaveLength(7);
    expect(b[0]!.scheduled).toBeGreaterThan(0);
    expect(b[0]!.rate).toBe(1);
    expect(b[1]!.scheduled).toBe(0); // úterý — nenaplánováno
  });
});

describe('earliestCreatedIso', () => {
  it('vrátí nejstarší datum vytvoření', () => {
    expect(earliestCreatedIso([activity(1, '2026-02-01'), activity(2, '2026-01-10')])).toBe(
      '2026-01-10',
    );
  });
  it('null pro prázdné', () => {
    expect(earliestCreatedIso([])).toBeNull();
  });
});
