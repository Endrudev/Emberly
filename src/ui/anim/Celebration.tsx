import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { COLORS, FONTS } from '@/ui/theme';
import { useReduceMotion } from './useReduceMotion';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/** Total overlay lifetime — parent unmounts us after this (spec: ≤ 1.5s). */
const DURATION = 1500;
const PIECE_COUNT = 80;
const FALLBACK_PALETTE = ['#2DB54A', '#FF8C42', '#4AABF5', '#F5C04A', '#E85D9E'];

interface CelebrationProps {
  /** Activity colours used to tint the confetti. */
  colors: string[];
  /** Banner text, e.g. "Vše dnes splněno! 🎉". */
  message: string;
  /** Called once the celebration has run its course. */
  onDone: () => void;
}

interface Piece {
  key: number;
  x: number;
  color: string;
  size: number;
  delay: number;
  drift: number;
  spin: number;
  duration: number;
}

// ── Single falling confetti piece ───────────────────────────────────────────
function ConfettiPiece({ piece }: { piece: Piece }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      piece.delay,
      withTiming(1, { duration: piece.duration, easing: Easing.out(Easing.quad) }),
    );
  }, [progress, piece]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    // Fall from above the top edge to just past the bottom.
    const translateY = -40 + p * (SCREEN_H + 80);
    const translateX = p * piece.drift;
    const rotate = p * piece.spin;
    // Fade out over the last 15% of the fall.
    const opacity = p < 0.85 ? 1 : Math.max(0, 1 - (p - 0.85) / 0.15);
    return {
      opacity,
      transform: [{ translateX }, { translateY }, { rotate: `${rotate}deg` }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: piece.x,
          top: 0,
          width: piece.size,
          height: piece.size * 0.55,
          borderRadius: 2,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  );
}

// ── Celebration overlay ──────────────────────────────────────────────────────
export function Celebration({ colors, message, onDone }: CelebrationProps) {
  const reduceMotion = useReduceMotion();

  const pieces = useMemo<Piece[]>(() => {
    if (reduceMotion) return [];
    const palette = colors.length > 0 ? colors : FALLBACK_PALETTE;
    return Array.from({ length: PIECE_COUNT }, (_, i) => ({
      key: i,
      x: Math.random() * SCREEN_W,
      color: palette[i % palette.length]!,
      size: 8 + Math.random() * 8,
      delay: Math.random() * 250,
      drift: (Math.random() - 0.5) * 160,
      spin: (Math.random() - 0.5) * 720,
      duration: DURATION - 250 + Math.random() * 200,
    }));
  }, [colors, reduceMotion]);

  // Banner: slide+fade in, hold, fade out — driven manually so timing is
  // independent of mount/unmount.
  const bannerY = useSharedValue(-40);
  const bannerOpacity = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      bannerY.value = 0;
      bannerOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withDelay(900, withTiming(0, { duration: 300 })),
      );
    } else {
      bannerY.value = withSequence(
        withSpring(0, { damping: 16, stiffness: 160 }),
        withDelay(700, withTiming(-20, { duration: 300 })),
      );
      bannerOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(800, withTiming(0, { duration: 300 })),
      );
    }

    const id = setTimeout(onDone, DURATION);
    return () => clearTimeout(id);
  }, [reduceMotion, onDone, bannerY, bannerOpacity]);

  const bannerStyle = useAnimatedStyle(() => ({
    opacity: bannerOpacity.value,
    transform: [{ translateY: bannerY.value }],
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p) => (
        <ConfettiPiece key={p.key} piece={p} />
      ))}

      <Animated.View style={[styles.bannerWrap, bannerStyle]}>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{message}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 64,
  },
  banner: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 22,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontFamily: FONTS.bold,
    letterSpacing: -0.2,
  },
});
