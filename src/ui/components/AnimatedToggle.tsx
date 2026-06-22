import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { COLORS } from '@/ui/theme';
import { tapLight } from '@/ui/anim/haptics';
import { useReduceMotion } from '@/ui/anim/useReduceMotion';

const TRACK_W = 50;
const TRACK_H = 30;
const KNOB = 24;
const PAD = 3;
const TRAVEL = TRACK_W - KNOB - PAD * 2;

interface AnimatedToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Track colour when off. Defaults to a neutral gray. */
  trackOffColor?: string;
}

/**
 * Drop-in replacement for Paper's <Switch> — knob slide and track colour
 * both cross-fade on the same timing curve, no spring/bounce. Haptic Light
 * on toggle (rule 4).
 */
export function AnimatedToggle({
  value,
  onValueChange,
  disabled = false,
  trackOffColor = '#D9D9D9',
}: AnimatedToggleProps) {
  const reduceMotion = useReduceMotion();
  const colorProgress = useSharedValue(value ? 1 : 0);
  const knobX = useSharedValue(value ? TRAVEL : 0);

  useEffect(() => {
    const targetColor = value ? 1 : 0;
    const targetX = value ? TRAVEL : 0;
    if (reduceMotion) {
      colorProgress.value = targetColor;
      knobX.value = targetX;
    } else {
      colorProgress.value = withTiming(targetColor, { duration: 180 });
      knobX.value = withTiming(targetX, { duration: 180, easing: Easing.out(Easing.cubic) });
    }
  }, [value, reduceMotion, colorProgress, knobX]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(colorProgress.value, [0, 1], [trackOffColor, COLORS.primary]),
  }));
  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: knobX.value }],
  }));

  function handlePress() {
    if (disabled) return;
    tapLight();
    onValueChange(!value);
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    >
      <Animated.View style={[styles.track, trackStyle, disabled && styles.disabled]}>
        <Animated.View style={[styles.knob, knobStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    padding: PAD,
    justifyContent: 'center',
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  disabled: {
    opacity: 0.5,
  },
});
