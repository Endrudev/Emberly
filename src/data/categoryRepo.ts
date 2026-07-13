import { asc, eq, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { categories, type CategoryRow } from '@/db/schema';
import type { Category } from '@/domain/types';

function toDomain(row: CategoryRow): Category {
  return { id: row.id, name: row.name, sortOrder: row.sortOrder, createdAt: row.createdAt };
}

export const categoryRepo = {
  async listAll(): Promise<Category[]> {
    const rows = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.createdAt));
    return rows.map(toDomain);
  },

  async create(name: string): Promise<Category> {
    // Appends to the end — count of existing categories is the next index.
    const countRows = await db.select({ count: sql<number>`count(*)` }).from(categories);
    const [row] = await db
      .insert(categories)
      .values({ name, sortOrder: countRows[0]?.count ?? 0 })
      .returning();
    if (!row) throw new Error('Failed to insert category');
    return toDomain(row);
  },

  /** Přepíše `sortOrder` podle pořadí v `orderedIds` (index = nová hodnota). */
  async reorder(orderedIds: readonly number[]): Promise<void> {
    await Promise.all(
      orderedIds.map((id, index) =>
        db.update(categories).set({ sortOrder: index }).where(eq(categories.id, id)),
      ),
    );
  },

  async deleteAll(): Promise<void> {
    await db.delete(categories);
  },
};
