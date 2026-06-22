import { asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { activities, type ActivityRow } from '@/db/schema';
import type { Activity, DayOfWeek } from '@/domain/types';
import { daysToMask, maskToDays } from '@/domain/week';

function toDomain(row: ActivityRow): Activity {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    color: row.color,
    scheduledDays: maskToDays(row.scheduledDaysMask),
    archived: row.archived,
    createdAt: row.createdAt,
  };
}

export const activityRepo = {
  async listActive(): Promise<Activity[]> {
    const rows = await db
      .select()
      .from(activities)
      .where(eq(activities.archived, false))
      .orderBy(asc(activities.createdAt));
    return rows.map(toDomain);
  },

  async listAll(): Promise<Activity[]> {
    const rows = await db.select().from(activities).orderBy(asc(activities.createdAt));
    return rows.map(toDomain);
  },

  async getById(id: number): Promise<Activity | null> {
    const rows = await db.select().from(activities).where(eq(activities.id, id)).limit(1);
    const row = rows[0];
    return row ? toDomain(row) : null;
  },

  async create(input: {
    name: string;
    emoji: string;
    color: string;
    scheduledDays: readonly DayOfWeek[];
  }): Promise<Activity> {
    const [row] = await db
      .insert(activities)
      .values({
        name: input.name,
        emoji: input.emoji,
        color: input.color,
        scheduledDaysMask: daysToMask(input.scheduledDays),
      })
      .returning();
    if (!row) throw new Error('Failed to insert activity');
    return toDomain(row);
  },

  async update(
    id: number,
    input: {
      name: string;
      emoji: string;
      color: string;
      scheduledDays: readonly DayOfWeek[];
    },
  ): Promise<Activity> {
    const [row] = await db
      .update(activities)
      .set({
        name: input.name,
        emoji: input.emoji,
        color: input.color,
        scheduledDaysMask: daysToMask(input.scheduledDays),
      })
      .where(eq(activities.id, id))
      .returning();
    if (!row) throw new Error(`Activity ${id} not found`);
    return toDomain(row);
  },

  async archive(id: number): Promise<void> {
    await db.update(activities).set({ archived: true }).where(eq(activities.id, id));
  },

  async unarchive(id: number): Promise<void> {
    await db.update(activities).set({ archived: false }).where(eq(activities.id, id));
  },

  async delete(id: number): Promise<void> {
    await db.delete(activities).where(eq(activities.id, id));
  },

  async deleteAll(): Promise<void> {
    await db.delete(activities);
  },
};
