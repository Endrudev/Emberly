import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/ui/anim/useReduceMotion';
import { tapLight } from '@/ui/anim/haptics';

const REORDER_SPRING = { damping: 20, stiffness: 220, mass: 0.7 };

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

// `positions.value` only gets resized/reset by ReorderableGroup's effect
// AFTER a render where `items` has grown/shrunk — on the very first paint of
// a newly-added row, `positions.value[originalIndex]` is out of bounds
// (`undefined`). `undefined * itemHeight` is NaN, and once a `withSpring`
// animation is fed NaN as its starting value it stays NaN forever (spring
// physics never recovers from a non-finite input) — the row would then sit
// invisibly stuck until some OTHER gesture directly overwrote the value.
// Falling back to `originalIndex` sidesteps the timing gap entirely: it's
// also the semantically correct resting slot whenever no drag is honestly
// reordering things (identity mapping is exactly what the resync effect
// would set anyway), so this isn't just a safety net, it's the right value.
function slotOf(positions: number[], originalIndex: number): number {
  'worklet';
  return positions[originalIndex] ?? originalIndex;
}

interface RowProps {
  originalIndex: number;
  count: number;
  itemHeight: number;
  positions: SharedValue<number[]>;
  activeIndex: SharedValue<number>;
  onDragEnd: (finalPositions: number[]) => void;
  children: (dragHandleGesture: GestureType) => React.ReactNode;
}

function ReorderableRow({
  originalIndex,
  count,
  itemHeight,
  positions,
  activeIndex,
  onDragEnd,
  children,
}: RowProps) {
  const dragTranslateY = useSharedValue(0);
  // Fixed baseline captured once at gesture start — `event.translationY` is
  // cumulative from the start of the gesture, so the offset must be added to
  // a STABLE starting Y, not to `positions.value[originalIndex]` re-read live
  // (that value changes as other rows shift out of the way mid-drag, which
  // was compounding on every update and rocketing the target slot straight
  // to the end of the list regardless of where the finger actually was).
  const startY = useSharedValue(0);
  const reduceMotion = useReduceMotion();

  const pan = Gesture.Pan()
    .onStart(() => {
      activeIndex.value = originalIndex;
      startY.value = slotOf(positions.value, originalIndex) * itemHeight;
      dragTranslateY.value = startY.value;
      runOnJS(tapLight)();
    })
    .onUpdate((event) => {
      dragTranslateY.value = startY.value + event.translationY;
      const targetSlot = clamp(Math.round(dragTranslateY.value / itemHeight), 0, count - 1);
      const currentSlot = slotOf(positions.value, originalIndex);
      if (targetSlot === currentSlot) return;
      // Shift every row between the old and new slot by one to make room —
      // absolute-position + index-driven `top` (not re-sorting the rendered
      // list) is what keeps this jank-free: no remount, just a `top` change.
      const next = positions.value.slice();
      for (let i = 0; i < next.length; i++) {
        const slot = slotOf(next, i);
        if (i === originalIndex) continue;
        if (currentSlot < targetSlot && slot > currentSlot && slot <= targetSlot) {
          next[i] = slot - 1;
        } else if (currentSlot > targetSlot && slot >= targetSlot && slot < currentSlot) {
          next[i] = slot + 1;
        }
      }
      next[originalIndex] = targetSlot;
      positions.value = next;
    })
    .onEnd(() => {
      dragTranslateY.value = withSpring(
        slotOf(positions.value, originalIndex) * itemHeight,
        REORDER_SPRING,
      );
      activeIndex.value = -1;
      runOnJS(onDragEnd)(positions.value);
    });

  const style = useAnimatedStyle(() => {
    const isActive = activeIndex.value === originalIndex;
    const top = isActive
      ? dragTranslateY.value
      : reduceMotion
        ? slotOf(positions.value, originalIndex) * itemHeight
        : withSpring(slotOf(positions.value, originalIndex) * itemHeight, REORDER_SPRING);
    return {
      position: 'absolute',
      top,
      left: 0,
      right: 0,
      zIndex: isActive ? 10 : 0,
      elevation: isActive ? 10 : 0,
      shadowOpacity: isActive ? 0.15 : 0,
    };
  });

  return <Animated.View style={style}>{children(pan)}</Animated.View>;
}

export interface ReorderableGroupProps<T> {
  items: readonly T[];
  keyExtractor: (item: T) => string;
  itemHeight: number;
  /** Called once per drag gesture end, with the items in their new order. */
  onReorder: (items: T[]) => void;
  /** Receives the drag-handle gesture — wrap the actual handle icon in a
   *  `<GestureDetector gesture={dragHandleGesture}>` inside your row content. */
  renderItem: (item: T, dragHandleGesture: GestureType) => React.ReactNode;
}

/**
 * Non-virtualized, absolute-position reorderable list — every row keeps its
 * React identity/position in the render tree (mapped over `items` in their
 * ORIGINAL order); only each row's animated `top` changes during a drag.
 * That's what avoids remount flicker, unlike re-sorting a `.map()`.
 *
 * Deliberately NOT virtualized: Manage mode only ever shows a handful of
 * habits/categories at once (free tier caps at a few habits anyway), so the
 * performance cost of always mounting every row is negligible — trading it
 * away buys a much simpler drag implementation than making a virtualized
 * FlatList drag-aware.
 */
export function ReorderableGroup<T>({
  items,
  keyExtractor,
  itemHeight,
  onReorder,
  renderItem,
}: ReorderableGroupProps<T>) {
  const positions = useSharedValue<number[]>(items.map((_, i) => i));
  const activeIndex = useSharedValue(-1);

  // Re-sync positions whenever the underlying item set changes from outside
  // (habit added/removed/moved to another group) — a stale mapping here
  // would silently misplace rows on next render.
  const fingerprint = items.map(keyExtractor).join('|');
  const prevFingerprint = useRef(fingerprint);
  useEffect(() => {
    if (prevFingerprint.current !== fingerprint) {
      prevFingerprint.current = fingerprint;
      positions.value = items.map((_, i) => i);
    }
  }, [fingerprint, items, positions]);

  function handleDragEnd(finalPositions: number[]) {
    const ordered = [...items].sort(
      (a, b) => finalPositions[items.indexOf(a)]! - finalPositions[items.indexOf(b)]!,
    );
    onReorder(ordered);
  }

  return (
    <View style={[styles.container, { height: items.length * itemHeight }]}>
      {items.map((item, index) => (
        <ReorderableRow
          key={keyExtractor(item)}
          originalIndex={index}
          count={items.length}
          itemHeight={itemHeight}
          positions={positions}
          activeIndex={activeIndex}
          onDragEnd={handleDragEnd}
        >
          {(gesture) => renderItem(item, gesture)}
        </ReorderableRow>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
