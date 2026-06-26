import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { rawSqlite } from './client';

/**
 * Checkpointuje WAL log při přechodu appky do pozadí. `expo-sqlite` běží
 * v WAL módu — bez checkpointu by čerstvé zápisy mohly žít jen v
 * `emberly.db-wal`/`-shm`, ne v hlavním `.db` souboru. Android Auto
 * Backup zálohuje jen `.db` (výchozí fileset), takže bez tohoto checkpointu
 * by záloha mohla obsahovat starý/nekompletní stav. `TRUNCATE` varianta navíc
 * po zápisu WAL soubor vyprázdní, ne jen ho nechá růst.
 */
export function useWalCheckpoint(): void {
  useEffect(() => {
    function handleAppStateChange(status: AppStateStatus) {
      if (status !== 'background') return;
      try {
        rawSqlite.execSync('PRAGMA wal_checkpoint(TRUNCATE);');
      } catch {
        // Best-effort — appka pokračuje dál i když checkpoint selže
        // (např. DB uprostřed jiné operace).
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);
}
