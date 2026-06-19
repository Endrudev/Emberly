import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Single app-wide source of the OS "reduce motion" setting.
 *
 * Previously every animated component (each DayCheckbox, CircularProgress, …)
 * ran its own hook: a per-instance listener + an async setState on mount. With
 * a weekly screen full of rows that meant dozens of listeners and a re-render
 * storm right after mounting/switching. Now there's ONE module-level listener
 * and a cached value read synchronously via useSyncExternalStore — new mounts
 * pay nothing, and a real change re-renders consumers once.
 */
let current = false;
let initialized = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function set(value: boolean) {
  if (value !== current) {
    current = value;
    emit();
  }
}

function init() {
  if (initialized) return;
  initialized = true;
  AccessibilityInfo.isReduceMotionEnabled()
    .then(set)
    .catch(() => {});
  AccessibilityInfo.addEventListener('reduceMotionChanged', set);
}

function subscribe(cb: () => void): () => void {
  init();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): boolean {
  return current;
}

/** True when the OS-level "reduce motion" accessibility setting is on. */
export function useReduceMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}
