import { useEffect, useRef, useState } from 'react';

import { useReduceMotion } from './useReduceMotion';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Animates a displayed number from its previous value to `target` whenever
 * target changes (including the first mount, where it starts from 0).
 * Plain JS/rAF — Text content isn't a native-driven prop, so there's nothing
 * to put on the UI thread here.
 */
export function useCountUp(target: number, duration = 400): number {
  const reduceMotion = useReduceMotion();
  const [value, setValue] = useState(reduceMotion ? target : 0);
  const fromRef = useRef(reduceMotion ? target : 0);

  useEffect(() => {
    if (reduceMotion) {
      fromRef.current = target;
      setValue(target);
      return;
    }

    const from = fromRef.current;
    if (from === target) return;

    let raf: ReturnType<typeof requestAnimationFrame>;
    const start = Date.now();

    function tick() {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      setValue(from + (target - from) * eased);

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduceMotion]);

  return value;
}
