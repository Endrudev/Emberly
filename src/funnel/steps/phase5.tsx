import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import Animated, { FadeIn } from 'react-native-reanimated';

import { COLORS, FONTS } from '@/ui/theme';
import { useTranslation } from '@/i18n';
import { useReduceMotion } from '@/ui/anim/useReduceMotion';
import { EMBERLY } from '../emberly';
import { FunnelScreen } from '../FunnelScreen';
import type { FunnelStepProps } from '../types';

const BUILDING_MS = 1800;
const READY_MS = 1300;

/**
 * Fáze 5 — "Stavíme plán": krok 16. Čistě přechodová obrazovka — žádný tap,
 * po ~2-3 s celkem (building → ready) automaticky pokračuje (`onNext`).
 */
export function BuildingPlanStep({ progress, onNext }: FunnelStepProps) {
  const t = useTranslation();
  const reduceMotion = useReduceMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const toReady = setTimeout(() => setReady(true), BUILDING_MS);
    const toNext = setTimeout(onNext, BUILDING_MS + READY_MS);
    return () => {
      clearTimeout(toReady);
      clearTimeout(toNext);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FunnelScreen progress={progress} ctaHidden>
      {ready ? (
        <Animated.View
          key="ready"
          entering={reduceMotion ? undefined : FadeIn.duration(250)}
          style={styles.center}
        >
          <Image source={EMBERLY.celebrate} style={styles.mascot} resizeMode="contain" />
          <Text style={styles.title}>{t.funnel.buildingStep.ready}</Text>
        </Animated.View>
      ) : (
        <View style={styles.center}>
          <Image source={EMBERLY.think} style={styles.mascot} resizeMode="contain" />
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.title}>{t.funnel.buildingStep.building}</Text>
        </View>
      )}
    </FunnelScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  mascot: { width: 320, height: 320, backgroundColor: 'transparent' },
  title: {
    fontSize: 20,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
    textAlign: 'center',
  },
});
