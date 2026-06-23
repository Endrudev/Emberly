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
  // Mirrors the value actually on screen at all times (updated every tick),
  // not just on natural completion — see fix note below.
  const valueRef = useRef(value);

  useEffect(() => {
    if (reduceMotion) {
      valueRef.current = target;
      setValue(target);
      return;
    }

    // Start from wherever the animation actually is right now, not from a
    // stale "from" snapshot. The old version only updated its from-ref when
    // an animation finished naturally; interrupting it mid-flight (e.g.
    // toggling another habit before the count-up settled) re-ran this effect
    // with the ref still pointing at the *previous* start value — causing a
    // visible jump backward, or — if the new target happened to equal that
    // stale value — an early `return` that left the number frozen mid-count
    // forever, since `value` itself was never resynced.
    const from = valueRef.current;
    if (from === target) return;

    let raf: ReturnType<typeof requestAnimationFrame>;
    const start = Date.now();

    function tick() {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      const next = from + (target - from) * eased;
      valueRef.current = next;
      setValue(next);

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduceMotion]);

  return value;
}
