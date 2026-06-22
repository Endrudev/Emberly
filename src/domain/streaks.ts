import {
  ISO_DATE_FORMAT,
  diffDaysIso,
  dowOf,
  isDayScheduled,
  mondayOfIso,
  parseIsoDate,
  shiftWeek,
  toIsoDate,
  weekDates,
  type WeekAnchor,
} from './week';
import type { Activity, Completion, DayOfWeek, Streak, WeekProgress } from './types';
import { daysToMask } from './week';

/**
 * "Minimální" zobrazení aktivity, které streak logika potřebuje. Umožňuje
 * pracovat s archivovanými i živými aktivitami (archivované neresetují streak,
 * pokud nikdy nebyly naplánované na daný den).
 */
export interface ActivityForStreak {
  id: number;
  scheduledDays: readonly DayOfWeek[];
  /**
   * Datum vytvoření jako lokální ISO. Den před vytvořením nelze splnit;
   * streak za historií se nemá kvůli tomu lámat.
   */
  createdAtIso: string;
}

interface CompletionsIndex {
  /** Set "activityId|date" pro rychlou lookup. */
  set: Set<string>;
}

function indexCompletions(completions: readonly Completion[]): CompletionsIndex {
  const set = new Set<string>();
  for (const c of completions) {
    set.add(`${c.activityId}|${c.date}`);
  }
  return { set };
}

function isCompleted(index: CompletionsIndex, activityId: number, dateIso: string): boolean {
  return index.set.has(`${activityId}|${dateIso}`);
}

/**
 * Které aktivity jsou naplánované na daný den a v daný den už existují (created <= day).
 */
function scheduledActivitiesOnDay(
  activities: readonly ActivityForStreak[],
  dateIso: string,
): ActivityForStreak[] {
  const day = dowOf(parseIsoDate(dateIso));
  return activities.filter((a) => {
    if (a.createdAtIso > dateIso) return false;
    return a.scheduledDays.includes(day);
  });
}

export interface DayStatus {
  date: string;
  scheduledIds: number[];
  completedScheduledIds: number[];
  /**
   * `true` pokud na den nebylo nic naplánováno (= úspěšný den, streak neláme),
   * nebo pokud všechny naplánované aktivity byly splněny.
   */
  isSuccessful: boolean;
  /** Existuje aspoň jedna naplánovaná aktivita na tento den. */
  hasScheduled: boolean;
}

export function evaluateDay(
  activities: readonly ActivityForStreak[],
  completionsIndex: CompletionsIndex,
  dateIso: string,
): DayStatus {
  const scheduled = scheduledActivitiesOnDay(activities, dateIso);
  const scheduledIds = scheduled.map((a) => a.id);
  const completedScheduledIds = scheduledIds.filter((id) =>
    isCompleted(completionsIndex, id, dateIso),
  );
  const allDone = scheduled.length === 0 || completedScheduledIds.length === scheduled.length;
  return {
    date: dateIso,
    scheduledIds,
    completedScheduledIds,
    isSuccessful: allDone,
    hasScheduled: scheduled.length > 0,
  };
}

/**
 * Spočítá denní streak (počet po sobě jdoucích úspěšných dnů) až k `todayIso`.
 *
 * Pravidla:
 *  - "Úspěšný den" = den, kdy byly splněny všechny naplánované aktivity (nebo žádné nebyly).
 *  - Dnešní den se do streaku NEpočítá, dokud není uzavřený — pokud dnes není
 *    všechno splněné, dnešek streak neresetuje (dokud trvá den). Streak měříme od včerejška.
 *  - Pokud je dnešek už splněný, počítá se i on.
 *  - Streak se nemůže rozšiřovat před datum vytvoření jakékoli aktivity (kotva = createdAt nejstarší aktivity).
 */
export function computeCurrentDailyStreak(
  activities: readonly ActivityForStreak[],
  completions: readonly Completion[],
  todayIso: string,
): number {
  if (activities.length === 0) return 0;
  const index = indexCompletions(completions);

  const earliestCreatedAt = activities.reduce(
    (min, a) => (a.createdAtIso < min ? a.createdAtIso : min),
    activities[0]!.createdAtIso,
  );

  // Pokud je dnešek úspěšný, začínáme od dnešku, jinak od včerejška.
  const todayStatus = evaluateDay(activities, index, todayIso);
  let cursorIso = todayStatus.isSuccessful ? todayIso : shiftDateIso(todayIso, -1);

  let streak = 0;
  while (cursorIso >= earliestCreatedAt) {
    const status = evaluateDay(activities, index, cursorIso);
    if (!status.isSuccessful) break;
    streak += 1;
    cursorIso = shiftDateIso(cursorIso, -1);
  }
  return streak;
}

/**
 * Nejlepší denní streak v historii (nejdelší souvislá série úspěšných dnů
 * od data vytvoření nejstarší aktivity až do `todayIso`).
 */
export function computeBestDailyStreak(
  activities: readonly ActivityForStreak[],
  completions: readonly Completion[],
  todayIso: string,
): number {
  if (activities.length === 0) return 0;
  const index = indexCompletions(completions);

  const earliestCreatedAt = activities.reduce(
    (min, a) => (a.createdAtIso < min ? a.createdAtIso : min),
    activities[0]!.createdAtIso,
  );

  let best = 0;
  let current = 0;
  let cursorIso = earliestCreatedAt;
  // Iterujeme den po dni. Pro výkon: pokud >365 dnů, mohlo by se to v budoucnu
  // optimalizovat (řadit completions a iterovat jen přes "důležité" dny), pro v1 OK.
  while (cursorIso <= todayIso) {
    const status = evaluateDay(activities, index, cursorIso);
    // Dnešní nedokončený den nelámeme — nepočítáme ho ale ani do current.
    if (cursorIso === todayIso && !status.isSuccessful) {
      // ukončit běh bez resetu
      best = Math.max(best, current);
      break;
    }
    if (status.isSuccessful) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
    cursorIso = shiftDateIso(cursorIso, 1);
  }
  best = Math.max(best, current);
  return best;
}

// ---- Týdenní streaky ----

/**
 * Týden je úspěšný, pokud byly splněné všechny naplánované aktivity ve všech
 * naplánovaných dnech daného týdne. Den bez naplánovaných aktivit týden neláme.
 *
 * Týden, ve kterém ještě nebyla žádná aktivita vytvořená (created > sunday), se nepočítá.
 */
export function isWeekPerfect(
  activities: readonly ActivityForStreak[],
  completionsIndex: CompletionsIndex,
  weekStartIso: string,
  weekStartsOn: WeekAnchor = 1,
): { perfect: boolean; hasAnyPlanned: boolean } {
  const days = weekDates(parseIsoDate(weekStartIso), weekStartsOn);
  let hasAnyPlanned = false;
  for (const day of days) {
    const status = evaluateDay(activities, completionsIndex, day);
    if (status.hasScheduled) {
      hasAnyPlanned = true;
      if (!status.isSuccessful) {
        return { perfect: false, hasAnyPlanned };
      }
    }
  }
  return { perfect: hasAnyPlanned, hasAnyPlanned };
}

export function computeCurrentWeeklyStreak(
  activities: readonly ActivityForStreak[],
  completions: readonly Completion[],
  todayIso: string,
  weekStartsOn: WeekAnchor = 1,
): number {
  if (activities.length === 0) return 0;
  const index = indexCompletions(completions);
  const earliestCreatedAt = activities.reduce(
    (min, a) => (a.createdAtIso < min ? a.createdAtIso : min),
    activities[0]!.createdAtIso,
  );
  const earliestMonday = mondayOfIso(parseIsoDate(earliestCreatedAt), weekStartsOn);

  // Aktuální týden: pokud ještě není uzavřený (poslední den týdne ještě
  // nenastal), bereme předchozí týden jako poslední uzavřený. Pokud je
  // aktuální týden už dnes-perfektní (všechny dosavadní dny ok), počítáme ho taky.
  const currentMonday = mondayOfIso(parseIsoDate(todayIso), weekStartsOn);

  // Pokud je aktuální týden už dokonalý (všechny PROŠLÉ naplánované dny ok), počítej ho.
  // Jinak začni od minulého týdne.
  const currentWeekPartial = isPartialWeekStillOk(activities, index, currentMonday, todayIso, weekStartsOn);
  let cursorIso = currentWeekPartial ? currentMonday : shiftWeek(currentMonday, -1);

  let streak = 0;
  while (cursorIso >= earliestMonday) {
    if (cursorIso === currentMonday) {
      if (currentWeekPartial) streak += 1;
    } else {
      const { perfect, hasAnyPlanned } = isWeekPerfect(activities, index, cursorIso, weekStartsOn);
      if (!hasAnyPlanned) {
        // Týden bez žádné naplánované aktivity neláme streak, ale ani ho neprodlužuje.
        cursorIso = shiftWeek(cursorIso, -1);
        continue;
      }
      if (!perfect) break;
      streak += 1;
    }
    cursorIso = shiftWeek(cursorIso, -1);
  }
  return streak;
}

export function computeBestWeeklyStreak(
  activities: readonly ActivityForStreak[],
  completions: readonly Completion[],
  todayIso: string,
  weekStartsOn: WeekAnchor = 1,
): number {
  if (activities.length === 0) return 0;
  const index = indexCompletions(completions);
  const earliestCreatedAt = activities.reduce(
    (min, a) => (a.createdAtIso < min ? a.createdAtIso : min),
    activities[0]!.createdAtIso,
  );
  const earliestMonday = mondayOfIso(parseIsoDate(earliestCreatedAt), weekStartsOn);
  const currentMonday = mondayOfIso(parseIsoDate(todayIso), weekStartsOn);

  let best = 0;
  let current = 0;
  let cursorIso = earliestMonday;

  while (cursorIso < currentMonday) {
    const { perfect, hasAnyPlanned } = isWeekPerfect(activities, index, cursorIso, weekStartsOn);
    if (!hasAnyPlanned) {
      // Neutral — neresetuje, neprodlužuje.
      cursorIso = shiftWeek(cursorIso, 1);
      continue;
    }
    if (perfect) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
    cursorIso = shiftWeek(cursorIso, 1);
  }
  // Případně přidat aktuální týden, pokud je už teď perfektní v rámci uplynulých dnů.
  if (isPartialWeekStillOk(activities, index, currentMonday, todayIso, weekStartsOn)) {
    current += 1;
    best = Math.max(best, current);
  }
  return best;
}

/**
 * Aktuální týden je "zatím v pořádku", pokud všechny naplánované dny od pondělí
 * až po dnešek (včetně) jsou splněné. Dny v budoucnu tohoto týdne se ignorují.
 */
function isPartialWeekStillOk(
  activities: readonly ActivityForStreak[],
  index: CompletionsIndex,
  weekStartIso: string,
  todayIso: string,
  weekStartsOn: WeekAnchor = 1,
): boolean {
  const days = weekDates(parseIsoDate(weekStartIso), weekStartsOn);
  let hasAnyPlanned = false;
  for (const day of days) {
    if (day > todayIso) break;
    const status = evaluateDay(activities, index, day);
    if (status.hasScheduled) hasAnyPlanned = true;
    if (status.hasScheduled && !status.isSuccessful) return false;
  }
  return hasAnyPlanned;
}

// ---- Pomocné ----

function shiftDateIso(iso: string, deltaDays: number): string {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + deltaDays);
  return toIsoDate(d);
}

// ---- Aggregated streak struct ----

export function computeStreaks(
  activities: readonly ActivityForStreak[],
  completions: readonly Completion[],
  todayIso: string,
  weekStartsOn: WeekAnchor = 1,
): Streak {
  return {
    currentDays: computeCurrentDailyStreak(activities, completions, todayIso),
    bestDays: computeBestDailyStreak(activities, completions, todayIso),
    currentWeeks: computeCurrentWeeklyStreak(activities, completions, todayIso, weekStartsOn),
    bestWeeks: computeBestWeeklyStreak(activities, completions, todayIso, weekStartsOn),
  };
}

// ---- Per-activity stats ----

export interface ActivityStats {
  activityId: number;
  completionsLast30Days: number;
  scheduledLast30Days: number;
  completionRate: number; // 0..1
  longestStreak: number;
}

export function computeActivityStats(
  activity: ActivityForStreak,
  completions: readonly Completion[],
  todayIso: string,
  windowDays = 30,
): ActivityStats {
  const activityCompletions = completions.filter((c) => c.activityId === activity.id);
  const completedSet = new Set(activityCompletions.map((c) => c.date));
  const scheduledMask = daysToMask(activity.scheduledDays);

  const startIso = shiftDateIso(todayIso, -(windowDays - 1));
  let scheduledCount = 0;
  let completedCount = 0;
  let cursorIso = startIso < activity.createdAtIso ? activity.createdAtIso : startIso;
  while (cursorIso <= todayIso) {
    const day = dowOf(parseIsoDate(cursorIso));
    if (isDayScheduled(scheduledMask, day)) {
      scheduledCount += 1;
      if (completedSet.has(cursorIso)) completedCount += 1;
    }
    cursorIso = shiftDateIso(cursorIso, 1);
  }

  // Longest streak per-activity: po sobě jdoucí naplánované splněné dny (jen scheduled).
  let longest = 0;
  let current = 0;
  cursorIso = activity.createdAtIso;
  while (cursorIso <= todayIso) {
    const day = dowOf(parseIsoDate(cursorIso));
    if (isDayScheduled(scheduledMask, day)) {
      if (completedSet.has(cursorIso)) {
        current += 1;
        longest = Math.max(longest, current);
      } else if (cursorIso < todayIso) {
        current = 0;
      }
      // dnešní nedokončený scheduled den se neresetuje, jen ukončí
    }
    cursorIso = shiftDateIso(cursorIso, 1);
  }

  return {
    activityId: activity.id,
    completionsLast30Days: completedCount,
    scheduledLast30Days: scheduledCount,
    completionRate: scheduledCount === 0 ? 0 : completedCount / scheduledCount,
    longestStreak: longest,
  };
}

// ---- Week progress ----

export function computeWeekProgress(
  activities: readonly ActivityForStreak[],
  completions: readonly Completion[],
  weekStartIso: string,
  weekStartsOn: WeekAnchor = 1,
): WeekProgress {
  const index = indexCompletions(completions);
  const days = weekDates(parseIsoDate(weekStartIso), weekStartsOn);
  let planned = 0;
  let completed = 0;
  for (const day of days) {
    const status = evaluateDay(activities, index, day);
    planned += status.scheduledIds.length;
    completed += status.completedScheduledIds.length;
  }
  return {
    weekStart: weekStartIso,
    plannedCount: planned,
    completedCount: completed,
    isPerfect: planned > 0 && planned === completed,
  };
}

// ---- Per-activity current streak ----

/**
 * Aktuální streak pro jednu aktivitu: počet po sobě jdoucích naplánovaných dní
 * (od dneška zpět), kdy byla aktivita splněna.
 * Dny, na které aktivita není naplánovaná, se přeskakují (nelapají streak).
 * Dnešní ještě nesplněný naplánovaný den streak neresetuje.
 */
export function computeCurrentActivityStreak(
  activity: ActivityForStreak,
  completions: readonly Completion[],
  todayIso: string,
): number {
  const mask = daysToMask(activity.scheduledDays);
  if (mask === 0) return 0;

  const completedSet = new Set(
    completions.filter((c) => c.activityId === activity.id).map((c) => c.date),
  );

  let streak = 0;
  let cursorIso = todayIso;

  while (cursorIso >= activity.createdAtIso) {
    const dow = dowOf(parseIsoDate(cursorIso));

    if (isDayScheduled(mask, dow)) {
      if (completedSet.has(cursorIso)) {
        streak += 1;
      } else if (cursorIso < todayIso) {
        // Minulý naplánovaný den byl vynechán — konec streaku.
        break;
      }
      // Dnešní nenaplnění ještě neruší streak — pokračujeme zpět.
    }

    cursorIso = shiftDateIso(cursorIso, -1);
  }

  return streak;
}

// Expose for tests
export const _internals = { indexCompletions, evaluateDay };

// Re-export for convenience
export { ISO_DATE_FORMAT };

// Helper to convert full Activity → ActivityForStreak
export function toActivityForStreak(a: Activity): ActivityForStreak {
  return {
    id: a.id,
    scheduledDays: a.scheduledDays,
    createdAtIso: toIsoDate(new Date(a.createdAt)),
  };
}
