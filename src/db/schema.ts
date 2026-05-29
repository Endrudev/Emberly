import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

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
    uniqActivityDate: uniqueIndex('uniq_completion_activity_date').on(
      table.activityId,
      table.date,
    ),
    dateIdx: index('completion_date_idx').on(table.date),
  }),
);

export type ActivityRow = typeof activities.$inferSelect;
export type NewActivityRow = typeof activities.$inferInsert;
export type CompletionRow = typeof completions.$inferSelect;
export type NewCompletionRow = typeof completions.$inferInsert;
