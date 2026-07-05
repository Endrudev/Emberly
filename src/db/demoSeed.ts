import { addDays } from 'date-fns';

import { db } from './client';
import { activities, completions, streakFreezes } from './schema';
import type { DayOfWeek } from '@/domain/types';
import { daysToMask, dowOf, parseIsoDate, toIsoDate, todayIso } from '@/domain/week';

/**
 * Dev-only demo dataset pro marketingové screenshoty (Reddit, App Store apod.).
 * Vytváří ~100denní historii: prvních 25 dní "neumytá" (realistická, ~78%
 * úspěšnost), posledních 75 dní dokonalých — dá to solidní denní streak přesně
 * ve druhé nejvyšší tier kategorii (Inferno, 60-99 dní), aniž by dosáhl maxima.
 * Nezávisí na `activityRepo`/`completionRepo`, protože potřebuje zpětně datovaný
 * `createdAt` (repo vrstva ho nastavuje jen na "teď").
 */

interface DemoActivityDef {
  name: string;
  emoji: string;
  color: string;
  scheduledDays: DayOfWeek[];
}

const EVERY_DAY: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

const DEMO_ACTIVITIES: DemoActivityDef[] = [
  { name: 'Běh', emoji: '🏃', color: '#4D8FC0', scheduledDays: [0, 2, 4, 6] }, // Po, St, Pá, Ne
  { name: 'Čtení', emoji: '📚', color: '#D97038', scheduledDays: EVERY_DAY },
  { name: 'Meditace', emoji: '🧘', color: '#7862C8', scheduledDays: EVERY_DAY },
  { name: 'Pití vody', emoji: '💧', color: '#2DB54A', scheduledDays: EVERY_DAY },
  { name: 'Posilovna', emoji: '🏋️', color: '#C89020', scheduledDays: [0, 2, 4] }, // Po, St, Pá
  { name: 'Deník vděčnosti', emoji: '✍️', color: '#2A9882', scheduledDays: EVERY_DAY },
];

/** Celkem dní historie (včetně dneška). */
const TOTAL_DAYS_TRACKED = 100;
/** Posledních N dní je dokonalých -> přesně tak dlouhý denní streak. Inferno = 60-99. */
const STREAK_DAYS = 75;
/** Úspěšnost v "neumyté" úvodní části historie. */
const MESSY_COMPLETION_RATE = 0.78;

const COMPLETION_INSERT_BATCH = 200;

export async function seedDemoData(): Promise<void> {
  await db.delete(completions);
  await db.delete(streakFreezes);
  await db.delete(activities);

  const today = todayIso();
  const todayDate = parseIsoDate(today);
  const earliestCreatedAt = addDays(todayDate, -(TOTAL_DAYS_TRACKED - 1)).getTime();

  const insertedActivities = await db
    .insert(activities)
    .values(
      DEMO_ACTIVITIES.map((def) => ({
        name: def.name,
        emoji: def.emoji,
        color: def.color,
        scheduledDaysMask: daysToMask(def.scheduledDays),
        createdAt: earliestCreatedAt,
      })),
    )
    .returning();

  const completionRows: { activityId: number; date: string }[] = [];

  for (let offset = TOTAL_DAYS_TRACKED - 1; offset >= 0; offset--) {
    const dateIso = toIsoDate(addDays(todayDate, -offset));
    const dow = dowOf(parseIsoDate(dateIso));
    const isPerfectPeriod = offset < STREAK_DAYS;

    insertedActivities.forEach((row, i) => {
      const def = DEMO_ACTIVITIES[i]!;
      if (!def.scheduledDays.includes(dow)) return;
      const isComplete = isPerfectPeriod || Math.random() < MESSY_COMPLETION_RATE;
      if (isComplete) completionRows.push({ activityId: row.id, date: dateIso });
    });
  }

  for (let i = 0; i < completionRows.length; i += COMPLETION_INSERT_BATCH) {
    await db.insert(completions).values(completionRows.slice(i, i + COMPLETION_INSERT_BATCH));
  }
}
