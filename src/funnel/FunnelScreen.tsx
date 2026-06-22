import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { COLORS, FONTS } from '@/ui/theme';
import { AnimatedPressable } from '@/ui/anim/AnimatedPressable';
import { useReduceMotion } from '@/ui/anim/useReduceMotion';
import { funnelProgressValue, setFunnelProgress } from './funnelProgress';

interface FunnelScreenProps {
  /** 0–1 */
  progress: number;
  onBack?: () => void;
  ctaLabel?: string;
  onCta?: () => void;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  /** Skryje CTA tlačítko úplně — pro čistě přechodové kroky (auto-advance, žádný tap). */
  ctaHidden?: boolean;
  children: ReactNode;
}

/**
 * Sdílená kostra každého kroku funnelu — progress bar + tlačítko zpět nahoře,
 * obsah uprostřed, primární CTA dole. Jednotlivé kroky si dovnitř dají
 * vlastní layout (text, dlaždice, grafy, …), tahle obálka jen drží společný
 * rytmus (1 tap na krok) konzistentní.
 */
export function FunnelScreen({
  progress,
  onBack,
  ctaLabel,
  onCta,
  ctaDisabled = false,
  ctaLoading = false,
  ctaHidden = false,
  children,
}: FunnelScreenProps) {
  const reduceMotion = useReduceMotion();
  const clamped = Math.max(0, Math.min(1, progress));

  // funnelProgressValue žije mimo tuto komponentu (přežije remount při
  // přechodu na další/předchozí krok), takže krok zpět plynule zmenší bar
  // z aktuální hodnoty, ne reset na 0 + naplnění odznova.
  useEffect(() => {
    setFunnelProgress(clamped, !reduceMotion);
  }, [clamped, reduceMotion]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${funnelProgressValue.value * 100}%`,
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        {onBack ? (
          <AnimatedPressable onPress={onBack} hapticStyle="light" style={styles.backBtn}>
            <Text style={styles.backChevron}>‹</Text>
          </AnimatedPressable>
        ) : (
          <View style={styles.backBtn} />
        )}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, barStyle]} />
        </View>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.content}>{children}</View>

      {ctaHidden ? null : (
        <View style={styles.footer}>
          <AnimatedPressable
            onPress={ctaDisabled || ctaLoading ? undefined : onCta}
            hapticStyle="medium"
            disabled={ctaDisabled || ctaLoading}
            style={[styles.cta, (ctaDisabled || ctaLoading) && styles.ctaDisabled]}
          >
            {ctaLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.ctaText}>{ctaLabel}</Text>
            )}
          </AnimatedPressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChevron: {
    fontSize: 24,
    color: COLORS.text,
    fontFamily: FONTS.bold,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
  },
  cta: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONTS.bold,
    letterSpacing: 0.2,
  },
});
