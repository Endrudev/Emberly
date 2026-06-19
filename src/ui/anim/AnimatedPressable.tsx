import type { ReactNode } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { success, tapLight, tapMedium } from './haptics';

type HapticStyle = 'light' | 'medium' | 'success' | 'none';

const HAPTIC_FNS: Record<Exclude<HapticStyle, 'none'>, () => void> = {
  light: tapLight,
  medium: tapMedium,
  success,
};

interface AnimatedPressableProps
  extends Omit<PressableProps, 'style' | 'onPress' | 'onPressIn' | 'onPressOut' | 'disabled'> {
  onPress?: (e: GestureResponderEvent) => void;
  onPressIn?: (e: GestureResponderEvent) => void;
  onPressOut?: (e: GestureResponderEvent) => void;
  /** Haptic fired on a successful press. Default 'light'. */
  hapticStyle?: HapticStyle;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * Pressable wrapper with a subtle press-in/press-out scale (rule 1: spring
 * for touch feedback). The scale lives on an inner Animated.View, not on
 * Pressable itself, so touch/hit-testing and ScrollView gesture handling
 * are unaffected.
 */
export function AnimatedPressable({
  onPress,
  onPressIn,
  onPressOut,
  hapticStyle = 'light',
  disabled = false,
  style,
  children,
  ...rest
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn(e: GestureResponderEvent) {
    scale.value = withTiming(0.97, { duration: 100 });
    onPressIn?.(e);
  }

  function handlePressOut(e: GestureResponderEvent) {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    onPressOut?.(e);
  }

  function handlePress(e: GestureResponderEvent) {
    if (disabled) return;
    if (hapticStyle !== 'none') HAPTIC_FNS[hapticStyle]();
    onPress?.(e);
  }

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
