import { type ReactNode, useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withSpring } from 'react-native-reanimated';

import { useReduceMotion } from '@/ui/anim/useReduceMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
  size: number;
  strokeWidth: number;
  /** 0–1 */
  progress: number;
  color: string;
  trackColor?: string;
  children?: ReactNode;
}

export function CircularProgress({
  size,
  strokeWidth,
  progress,
  color,
  trackColor = '#E5E5E5',
  children,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const center = size / 2;
  const reduceMotion = useReduceMotion();

  // Starts at 0 so the very first mount also fills in, not just later updates.
  const animatedProgress = useSharedValue(reduceMotion ? clampedProgress : 0);

  useEffect(() => {
    animatedProgress.value = reduceMotion
      ? clampedProgress
      : withSpring(clampedProgress, { damping: 15, stiffness: 90, overshootClamping: true });
  }, [clampedProgress, reduceMotion, animatedProgress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute' }}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* progress arc — rotated so it starts at the top */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
          animatedProps={animatedProps}
        />
      </Svg>
      {children}
    </View>
  );
}
