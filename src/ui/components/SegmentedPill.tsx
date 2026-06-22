import { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { COLORS, FONTS } from '@/ui/theme';
import { tapLight } from '@/ui/anim/haptics';
import { useReduceMotion } from '@/ui/anim/useReduceMotion';

const PILL_SPRING = { damping: 18, stiffness: 220, mass: 0.8 };

type Frame = { x: number; width: number };

interface SegmentedPillProps<T extends string> {
  options: ReadonlyArray<{ key: T; label: string }>;
  value: T;
  onChange: (key: T) => void;
  isDark?: boolean;
}

/** Small inline two-(or more-)way switcher — a sliding pill behind the
 *  selected label, same visual language as the Today/Weekly tab on Home. */
export function SegmentedPill<T extends string>({
  options,
  value,
  onChange,
  isDark = false,
}: SegmentedPillProps<T>) {
  const reduceMotion = useReduceMotion();
  const [frames, setFrames] = useState<Record<string, Frame>>({});
  const ready = useRef(false);

  const tx = useSharedValue(0);
  const tw = useSharedValue(0);
  const opacity = useSharedValue(0);

  const setFrame = (key: string) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setFrames((prev) => {
      const existing = prev[key];
      if (existing && existing.x === x && existing.width === width) return prev;
      return { ...prev, [key]: { x, width } };
    });
  };

  useEffect(() => {
    const target = frames[value];
    if (!target) return;
    opacity.value = 1;
    if (!ready.current || reduceMotion) {
      tx.value = target.x;
      tw.value = target.width;
      ready.current = true;
      return;
    }
    tx.value = withSpring(target.x, PILL_SPRING);
    tw.value = withSpring(target.width, PILL_SPRING);
  }, [value, frames, reduceMotion, tx, tw, opacity]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    width: tw.value,
    transform: [{ translateX: tx.value }],
  }));

  const trackBg = isDark ? '#1C1C1E' : '#F0F0F0';
  const inactiveText = isDark ? '#ABABAB' : '#8A8A8E';

  return (
    <View style={[styles.track, { backgroundColor: trackBg }]}>
      <Animated.View style={[styles.indicator, indicatorStyle]} />
      {options.map((opt) => {
        const selected = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onLayout={setFrame(opt.key)}
            onPress={() => {
              if (selected) return;
              tapLight();
              onChange(opt.key);
            }}
            style={styles.segment}
          >
            <Text
              style={[
                styles.segmentText,
                { color: selected ? '#FFFFFF' : inactiveText },
                selected && styles.segmentTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    alignSelf: 'flex-start',
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 0,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  segment: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },
  segmentTextActive: {
    fontFamily: FONTS.bold,
  },
});
