import { useEffect } from 'react';
import { View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useFunnelStore } from '@/store/useFunnelStore';
import { COLORS } from '@/ui/theme';
import { useReduceMotion } from '@/ui/anim/useReduceMotion';
import { setFunnelProgress } from './funnelProgress';
import { FUNNEL_STEPS } from './steps';

/**
 * Step-machine pro onboarding funnel — drží aktuální index (persistovaný
 * přes `useFunnelStore`, takže se po zabití appky pokračuje tam, kde se
 * skončilo), a renderuje příslušnou krokovou komponentu z `FUNNEL_STEPS`.
 *
 * Poslední krok (paywall) si přechod mimo funnel řeší sám (`completeOnboarding`
 * + navigace) — `onNext` na posledním indexu je tedy no-op.
 */
export function FunnelEngine() {
  const reduceMotion = useReduceMotion();
  const hasHydrated = useFunnelStore((s) => s._hasHydrated);
  const stepIndex = useFunnelStore((s) => s.stepIndex);
  const setStepIndex = useFunnelStore((s) => s.setStepIndex);

  const total = FUNNEL_STEPS.length;
  const safeIndex = Math.max(0, Math.min(stepIndex, total - 1));

  // Po hydrataci "snapne" progress bar na krok, kde se appka při resume
  // nachází (bez animace) — jednorázově, ať nezačíná animovat odkudkoliv
  // ze staré hodnoty z předchozí relace funnelu. Animace mezi kroky uvnitř
  // jedné relace řeší FunnelScreen.
  useEffect(() => {
    if (!hasHydrated) return;
    setFunnelProgress((safeIndex + 1) / total, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  function handleNext() {
    if (safeIndex >= total - 1) return;
    setStepIndex(safeIndex + 1);
  }

  function handleBack() {
    if (safeIndex <= 0) return;
    setStepIndex(safeIndex - 1);
  }

  if (!hasHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const step = FUNNEL_STEPS[safeIndex];
  if (!step) return null;

  const Step = step.Component;
  return (
    // `key={step.key}` nutí Animated.View remountnout při každé změně kroku
    // (vpřed i zpět), ať se `entering` fade přehraje pokaždé znovu — bez
    // klíče by React jen přepsal children té samé instance a animace by se
    // spustila jen jednou, při prvním vstupu do funnelu.
    <Animated.View
      key={step.key}
      entering={reduceMotion ? undefined : FadeIn.duration(220)}
      style={{ flex: 1 }}
    >
      <Step
        progress={(safeIndex + 1) / total}
        canGoBack={safeIndex > 0}
        onNext={handleNext}
        onBack={handleBack}
      />
    </Animated.View>
  );
}
