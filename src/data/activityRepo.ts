import { asc, eq, isNull, sql } from 'drizzle-orm';

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
    categoryId: row.categoryId,
    sortOrder: row.sortOrder,
  };
}

/** Null-safe "same group" comparison — `eq()` never matches NULL == NULL. */
function sameCategory(categoryId: number | null) {
  return categoryId == null ? isNull(activities.categoryId) : eq(activities.categoryId, categoryId);
}

/** Next append-to-end sortOrder for a group (category, or "uncategorized"). */
async function nextSortOrderInGroup(categoryId: number | null): Promise<number> {
  const countRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(activities)
    .where(sameCategory(categoryId));
  return countRows[0]?.count ?? 0;
}

export const activityRepo = {
  async listActive(): Promise<Activity[]> {
    const rows = await db
      .select()
      .from(activities)
      .where(eq(activities.archived, false))
      .orderBy(asc(activities.sortOrder), asc(activities.createdAt));
    return rows.map(toDomain);
  },

  async listAll(): Promise<Activity[]> {
    const rows = await db
      .select()
      .from(activities)
      .orderBy(asc(activities.sortOrder), asc(activities.createdAt));
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
    categoryId?: number | null;
  }): Promise<Activity> {
    const categoryId = input.categoryId ?? null;
    const [row] = await db
      .insert(activities)
      .values({
        name: input.name,
        emoji: input.emoji,
        color: input.color,
        scheduledDaysMask: daysToMask(input.scheduledDays),
        categoryId,
        sortOrder: await nextSortOrderInGroup(categoryId),
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
      categoryId?: number | null;
    },
  ): Promise<Activity> {
    const nextCategoryId = input.categoryId ?? null;
    const existing = await db
      .select({ categoryId: activities.categoryId })
      .from(activities)
      .where(eq(activities.id, id))
      .limit(1);
    // Only re-append to the end of the (new) group's order when the category
    // actually changed — otherwise a plain name/emoji/etc. edit would shove
    // the activity to the bottom of its own group on every save.
    const categoryChanged = (existing[0]?.categoryId ?? null) !== nextCategoryId;
    const [row] = await db
      .update(activities)
      .set({
        name: input.name,
        emoji: input.emoji,
        color: input.color,
        scheduledDaysMask: daysToMask(input.scheduledDays),
        categoryId: nextCategoryId,
        ...(categoryChanged ? { sortOrder: await nextSortOrderInGroup(nextCategoryId) } : {}),
      })
      .where(eq(activities.id, id))
      .returning();
    if (!row) throw new Error(`Activity ${id} not found`);
    return toDomain(row);
  },

  /** Rychlá změna kategorie (edit-mode tlačítko) — vždy appendne na konec nové skupiny. */
  async setCategory(id: number, categoryId: number | null): Promise<void> {
    await db
      .update(activities)
      .set({ categoryId, sortOrder: await nextSortOrderInGroup(categoryId) })
      .where(eq(activities.id, id));
  },

  /**
   * Přepíše `sortOrder` podle pořadí v `orderedIds` (index = nová hodnota).
   * Volané po dragu v rámci JEDNÉ skupiny (kategorie, nebo "bez kategorie") —
   * nepřesouvá mezi kategoriemi, na to slouží `setCategory`.
   */
  async reorder(orderedIds: readonly number[]): Promise<void> {
    await Promise.all(
      orderedIds.map((id, index) =>
        db.update(activities).set({ sortOrder: index }).where(eq(activities.id, id)),
      ),
    );
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
