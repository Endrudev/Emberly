import type { ActivityForStreak } from './streaks';
import type { Completion, DayOfWeek } from './types';
import {
  dowOf,
  parseIsoDate,
  toIsoDate,
  mondayOfIso,
  weekDates,
  shiftWeek,
  type WeekAnchor,
} from './week';

/**
 * Čisté agregace pro dashboard Přehledu — žádné UI ani native importy, plně
 * testovatelné. Staví na `ActivityForStreak` (id + scheduledDays + createdAtIso)
 * stejně jako `streaks.ts`, takže pracuje i s archivovanými aktivitami.
 */

export interface RangeStats {
  /** Počet naplánovaných výskytů (aktivita × naplánovaný den) v rozsahu. */
  scheduled: number;
  /** Z toho splněných. */
  completed: number;
  /** completed / scheduled (0..1); 0 pokud nic naplánováno. */
  rate: number;
  /** Všechna splnění v rozsahu (i mimo plán / bonus). */
  totalCheckins: number;
  /** Počet různých dní s aspoň jedním splněním. */
  activeDays: number;
}

function shiftDateIso(iso: string, deltaDays: number): string {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + deltaDays);
  return toIsoDate(d);
}

function completionSet(completions: readonly Completion[]): Set<string> {
  const s = new Set<string>();
  for (const c of completions) s.add(`${c.activityId}|${c.date}`);
  return s;
}

/** Nejstarší `createdAtIso` napříč aktivitami (nebo null pokud žádná). */
export function earliestCreatedIso(activities: readonly ActivityForStreak[]): string | null {
  if (activities.length === 0) return null;
  return activities.reduce(
    (min, a) => (a.createdAtIso < min ? a.createdAtIso : min),
    activities[0]!.createdAtIso,
  );
}

/**
 * Statistiky za uzavřený rozsah [startIso, endIso] (oba včetně).
 * Naplánované výskyty počítají jen dny, kdy aktivita už existovala.
 */
export function computeRangeStats(
  activities: readonly ActivityForStreak[],
  completions: readonly Completion[],
  startIso: string,
  endIso: string,
): RangeStats {
  const set = completionSet(completions);

  let scheduled = 0;
  let completed = 0;
  if (startIso <= endIso) {
    let cursor = startIso;
    while (cursor <= endIso) {
      const dow = dowOf(parseIsoDate(cursor));
      for (const a of activities) {
        if (a.createdAtIso > cursor) continue;
        if (!a.scheduledDays.includes(dow)) continue;
        scheduled += 1;
        if (set.has(`${a.id}|${cursor}`)) completed += 1;
      }
      cursor = shiftDateIso(cursor, 1);
    }
  }

  let totalCheckins = 0;
  const activeDateSet = new Set<string>();
  for (const c of completions) {
    if (c.date >= startIso && c.date <= endIso) {
      totalCheckins += 1;
      activeDateSet.add(c.date);
    }
  }

  return {
    scheduled,
    completed,
    rate: scheduled === 0 ? 0 : completed / scheduled,
    totalCheckins,
    activeDays: activeDateSet.size,
  };
}

export interface WeeklyTrendPoint {
  weekStartIso: string;
  rate: number;
}

/**
 * Completion rate za posledních `weeks` týdnů (od nejstaršího po aktuální).
 * Aktuální (neuzavřený) týden se počítá jen po dnešek (budoucí dny se ignorují).
 */
export function computeWeeklyTrend(
  activities: readonly ActivityForStreak[],
  completions: readonly Completion[],
  todayIso: string,
  weeks = 8,
  weekStartsOn: WeekAnchor = 1,
): WeeklyTrendPoint[] {
  const currentMonday = mondayOfIso(parseIsoDate(todayIso), weekStartsOn);
  const out: WeeklyTrendPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = shiftWeek(currentMonday, -i);
    const days = weekDates(parseIsoDate(ws), weekStartsOn);
    const last = days[6]!;
    const endIso = last < todayIso ? last : todayIso;
    const { rate } = computeRangeStats(activities, completions, ws, endIso);
    out.push({ weekStartIso: ws, rate });
  }
  return out;
}

export interface WeekdayStat {
  /** completed / scheduled (0..1) pro daný den v týdnu. */
  rate: number;
  /** Počet naplánovaných výskytů pro tento den (0 = žádná data). */
  scheduled: number;
}

export interface BestWeekday {
  dow: DayOfWeek;
  rate: number;
}

/**
 * Úspěšnost pro každý den v týdnu (index 0=Po..6=Ne) napříč celou historií
 * (od vytvoření nejstarší aktivity po dnešek). Den bez naplánovaných výskytů
 * má `scheduled: 0` (žádná data). Vždy vrací pole délky 7.
 */
export function computeWeekdayBreakdown(
  activities: readonly ActivityForStreak[],
  completions: readonly Completion[],
  todayIso: string,
): WeekdayStat[] {
  const empty: WeekdayStat[] = Array.from({ length: 7 }, () => ({ rate: 0, scheduled: 0 }));
  const earliest = earliestCreatedIso(activities);
  if (!earliest) return empty;
  const set = completionSet(completions);

  const scheduled = [0, 0, 0, 0, 0, 0, 0];
  const completed = [0, 0, 0, 0, 0, 0, 0];

  let cursor = earliest;
  while (cursor <= todayIso) {
    const dow = dowOf(parseIsoDate(cursor));
    for (const a of activities) {
      if (a.createdAtIso > cursor) continue;
      if (!a.scheduledDays.includes(dow)) continue;
      scheduled[dow] = (scheduled[dow] ?? 0) + 1;
      if (set.has(`${a.id}|${cursor}`)) completed[dow] = (completed[dow] ?? 0) + 1;
    }
    cursor = shiftDateIso(cursor, 1);
  }

  return Array.from({ length: 7 }, (_, d) => {
    const s = scheduled[d] ?? 0;
    return { scheduled: s, rate: s === 0 ? 0 : (completed[d] ?? 0) / s };
  });
}

/**
 * Den v týdnu s nejvyšší úspěšností. `null` pokud není dost dat.
 */
export function computeBestWeekday(
  activities: readonly ActivityForStreak[],
  completions: readonly Completion[],
  todayIso: string,
): BestWeekday | null {
  const breakdown = computeWeekdayBreakdown(activities, completions, todayIso);
  let best: BestWeekday | null = null;
  for (let d = 0; d < 7; d++) {
    const w = breakdown[d]!;
    if (w.scheduled === 0) continue;
    if (!best || w.rate > best.rate) best = { dow: d as DayOfWeek, rate: w.rate };
  }
  return best;
}

/** Zaokrouhlené celkové-počty-splnění milníky, které stojí za oslavu na dashboardu. */
export const CHECKIN_MILESTONES = [50, 100, 250, 500, 1000, 2000, 5000] as const;

/**
 * Milník z `CHECKIN_MILESTONES` překročený mezi `before` (např. včerejší celkový
 * počet splnění) a `after` (dnešní), nebo `null` pokud žádný nepadl. Používá se pro
 * jednorázovou oslavnou kartu na dashboardu Statistik.
 */
export function crossedMilestone(before: number, after: number): number | null {
  for (const m of CHECKIN_MILESTONES) {
    if (before < m && after >= m) return m;
  }
  return null;
}
