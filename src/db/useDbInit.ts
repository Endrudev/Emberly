import { useEffect, useState } from 'react';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import { db } from './client';
import migrations from './migrations/migrations';
import { seedIfEmpty } from './seed';

export interface DbInitState {
  ready: boolean;
  error: Error | null;
}

/**
 * Spouští Drizzle migrace a (v dev módu) seed nad expo-sqlite databází.
 * Vrací stav, který může root layout použít pro splash / loading screen.
 */
export function useDbInit(): DbInitState {
  const { success, error } = useMigrations(db, migrations);
  const [seedDone, setSeedDone] = useState(false);
  const [seedError, setSeedError] = useState<Error | null>(null);

  useEffect(() => {
    if (!success) return;
    if (!__DEV__) {
      setSeedDone(true);
      return;
    }
    seedIfEmpty()
      .then(() => setSeedDone(true))
      .catch((err) => setSeedError(err instanceof Error ? err : new Error(String(err))));
  }, [success]);

  return {
    ready: success && seedDone,
    error: error ?? seedError,
  };
}
