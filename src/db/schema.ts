import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

/**
 * Kategorie pro vizuální seskupení návyků (Habits view) — čistě organizační,
 * bez vlastní logiky/pravidel. Smazání kategorie neodstraní aktivity, jen je
 * odkategorizuje (ON DELETE SET NULL na activities.categoryId).
 */
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  /** Pořadí kategorií (Manage Habits Mode) — přeřaditelné tažením. */
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/**
 * Aktivity, které uživatel sleduje.
 *
 * scheduledDaysMask — bitmaska 7 dní; bit 0 = pondělí, bit 6 = neděle.
 * Příklad: út+čt+so = (1<<1) | (1<<3) | (1<<5) = 42.
 */
export const activities = sqliteTable('activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  emoji: text('emoji').notNull(),
  color: text('color').notNull(),
  scheduledDaysMask: integer('scheduled_days_mask').notNull().default(0),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  /** Pořadí uvnitř kategorie (nebo uvnitř "bez kategorie") — Manage Habits Mode. */
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
});

/**
 * Záznamy splnění aktivit v konkrétní dny.
 *
 * date — lokální datum ve formátu ISO "yyyy-MM-dd" (NE UTC timestamp).
 * UNIQUE (activityId, date) — jedna aktivita lze za den splnit max jednou.
 */
export const completions = sqliteTable(
  'completions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    activityId: integer('activity_id')
      .notNull()
      .references(() => activities.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    completedAt: integer('completed_at')
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    uniqActivityDate: uniqueIndex('uniq_completion_activity_date').on(table.activityId, table.date),
    dateIdx: index('completion_date_idx').on(table.date),
  }),
);

/**
 * Dny, na které byla automaticky uplatněna premium "ochrana série" (streak freeze).
 * Jeden záznam = jeden zmrazený lokální ISO den. Kvóta (kolik/měsíc) se nepočítá
 * jako mutable counter, ale odvozuje z počtu záznamů v daném kalendářním měsíci.
 */
export const streakFreezes = sqliteTable(
  'streak_freezes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: text('date').notNull(),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    uniqDate: uniqueIndex('uniq_streak_freeze_date').on(table.date),
  }),
);

export type ActivityRow = typeof activities.$inferSelect;
export type NewActivityRow = typeof activities.$inferInsert;
export type CompletionRow = typeof completions.$inferSelect;
export type NewCompletionRow = typeof completions.$inferInsert;
export type StreakFreezeRow = typeof streakFreezes.$inferSelect;
export type NewStreakFreezeRow = typeof streakFreezes.$inferInsert;
export type CategoryRow = typeof categories.$inferSelect;
export type NewCategoryRow = typeof categories.$inferInsert;
