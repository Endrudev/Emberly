import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

import * as schema from './schema';

const DB_NAME = 'emberly.db';

const sqlite = SQLite.openDatabaseSync(DB_NAME, { enableChangeListener: true });

export const db = drizzle(sqlite, { schema });

export type DbClient = typeof db;

export { schema };

/**
 * Otevřená handle pro raw SQL operace, např. PRAGMA nebo manuální migrace
 * v dev módu (reset databáze).
 */
export const rawSqlite = sqlite;
