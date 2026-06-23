import { asc } from 'drizzle-orm';

import { db } from '@/db/client';
import { streakFreezes } from '@/db/schema';

export const streakFreezeRepo = {
  async listAll(): Promise<string[]> {
    const rows = await db
      .select()
      .from(streakFreezes)
      .orderBy(asc(streakFreezes.date));
    return rows.map((r) => r.date);
  },

  /** Zaznamená zmrazený den. Idempotentní — pokud už pro to datum existuje, neudělá nic. */
  async create(dateIso: string): Promise<void> {
    await db
      .insert(streakFreezes)
      .values({ date: dateIso })
      .onConflictDoNothing({ target: streakFreezes.date });
  },

  async deleteAll(): Promise<void> {
    await db.delete(streakFreezes);
  },
};
