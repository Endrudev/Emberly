import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { COLORS } from '@/ui/theme';
import { AnimatedPressable } from '@/ui/anim/AnimatedPressable';
import { useReduceMotion } from '@/ui/anim/useReduceMotion';

const SIZE = 24;
const GAP = 10;

interface EditMinusButtonProps {
  editMode: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}

/**
 * Red "remove" control that reveals itself (width-clip, not a layout jump)
 * to the left of a row when list edit mode is active — the iOS
 * Reminders/Settings convention for deleting from a list.
 */
export function EditMinusButton({ editMode, onPress, accessibilityLabel }: EditMinusButtonProps) {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(editMode ? 1 : 0);

  useEffect(() => {
    progress.value = reduceMotion
      ? editMode ? 1 : 0
      : withTiming(editMode ? 1 : 0, { duration: 200 });
  }, [editMode, reduceMotion, progress]);

  const containerStyle = useAnimatedStyle(() => ({
    width: progress.value * SIZE,
    marginRight: progress.value * GAP,
    opacity: progress.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents={editMode ? 'auto' : 'none'}>
      <AnimatedPressable
        style={styles.button}
        hapticStyle="light"
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <MaterialCommunityIcons name="minus" size={16} color="#FFFFFF" />
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
