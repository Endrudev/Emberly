import { and, asc, between, eq, inArray } from 'drizzle-orm';

import { db } from '@/db/client';
import { completions, type CompletionRow } from '@/db/schema';
import type { Completion } from '@/domain/types';

function toDomain(row: CompletionRow): Completion {
  return {
    activityId: row.activityId,
    date: row.date,
    completedAt: row.completedAt,
  };
}

export const completionRepo = {
  async listInRange(fromIso: string, toIso: string): Promise<Completion[]> {
    const rows = await db
      .select()
      .from(completions)
      .where(between(completions.date, fromIso, toIso))
      .orderBy(asc(completions.date));
    return rows.map(toDomain);
  },

  async listAll(): Promise<Completion[]> {
    const rows = await db.select().from(completions).orderBy(asc(completions.date));
    return rows.map(toDomain);
  },

  async listForActivity(activityId: number): Promise<Completion[]> {
    const rows = await db
      .select()
      .from(completions)
      .where(eq(completions.activityId, activityId))
      .orderBy(asc(completions.date));
    return rows.map(toDomain);
  },

  async listForActivities(activityIds: readonly number[]): Promise<Completion[]> {
    if (activityIds.length === 0) return [];
    const rows = await db
      .select()
      .from(completions)
      .where(inArray(completions.activityId, activityIds as number[]))
      .orderBy(asc(completions.date));
    return rows.map(toDomain);
  },

  /**
   * Označí aktivitu jako splněnou v daný den. Idempotentní — pokud už záznam existuje, neudělá nic.
   */
  async complete(activityId: number, dateIso: string): Promise<void> {
    await db
      .insert(completions)
      .values({ activityId, date: dateIso })
      .onConflictDoNothing({ target: [completions.activityId, completions.date] });
  },

  /** Odznačí splnění aktivity v daný den. */
  async uncomplete(activityId: number, dateIso: string): Promise<void> {
    await db
      .delete(completions)
      .where(and(eq(completions.activityId, activityId), eq(completions.date, dateIso)));
  },

  async toggle(activityId: number, dateIso: string): Promise<boolean> {
    const existing = await db
      .select()
      .from(completions)
      .where(and(eq(completions.activityId, activityId), eq(completions.date, dateIso)))
      .limit(1);
    if (existing.length > 0) {
      await this.uncomplete(activityId, dateIso);
      return false;
    }
    await this.complete(activityId, dateIso);
    return true;
  },

  async deleteAll(): Promise<void> {
    await db.delete(completions);
  },
};
