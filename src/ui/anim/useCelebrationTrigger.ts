import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { success } from './haptics';

/**
 * App-side once-per-day celebration marker.
 *
 * Deliberately a SEPARATE key from the widget's `@widget_celebration`
 * (which is an 8s timer in `src/widget/widgetData.ts`). The app never writes
 * the widget key and vice versa, so the two surfaces can't fight over state —
 * each derives "all done today" from the DB independently.
 *
 * Stores just the ISO date string of the last day the app celebrated. The
 * celebration fires once when today's progress reaches 100%; unchecking
 * (progress drops below 100%) clears the marker so re-completing celebrates
 * again, per spec.
 */
const KEY = '@app_celebration_date';

export function useCelebrationTrigger(allDone: boolean, today: string) {
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  // In-memory mirror of the persisted date — a synchronous guard so the effect
  // can never double-fire while the async write is still in flight.
  const lastDate = useRef<string | null>(null);

  // Load the persisted marker once, before reacting to `allDone`.
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (!mounted) return;
        lastDate.current = v;
        setReady(true);
      })
      .catch(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    if (allDone) {
      if (lastDate.current !== today) {
        lastDate.current = today;
        void AsyncStorage.setItem(KEY, today);
        success();
        setActive(true);
      }
    } else if (lastDate.current === today) {
      // Progress fell below 100% — allow a later re-completion to celebrate.
      lastDate.current = null;
      void AsyncStorage.removeItem(KEY);
    }
  }, [ready, allDone, today]);

  const dismiss = useCallback(() => setActive(false), []);
  return { active, dismiss };
}
