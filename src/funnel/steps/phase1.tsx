import { Image, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { COLORS, FONTS } from '@/ui/theme';
import { useTranslation } from '@/i18n';
import { EMBERLY } from '../emberly';
import { FunnelScreen } from '../FunnelScreen';
import type { FunnelStepProps } from '../types';

/** Fáze 1 — Hook: 1. Uvítání · 2. Slib + social proof. */

export function WelcomeStep({ progress, canGoBack, onNext, onBack }: FunnelStepProps) {
  const t = useTranslation();
  return (
    <FunnelScreen
      progress={progress}
      onBack={canGoBack ? onBack : undefined}
      ctaLabel={t.funnel.welcome.cta}
      onCta={onNext}
    >
      <View style={styles.center}>
        <Image source={EMBERLY.wave} style={styles.mascotLarge} resizeMode="contain" />
        <Text style={styles.title}>{t.funnel.welcome.title}</Text>
        <Text style={styles.subtitle}>{t.funnel.welcome.subtitle}</Text>
      </View>
    </FunnelScreen>
  );
}

export function PromiseStep({ progress, canGoBack, onNext, onBack }: FunnelStepProps) {
  const t = useTranslation();
  return (
    <FunnelScreen
      progress={progress}
      onBack={canGoBack ? onBack : undefined}
      ctaLabel={t.funnel.promise.cta}
      onCta={onNext}
    >
      <View style={styles.center}>
        <Image source={EMBERLY.happy} style={styles.mascotMedium} resizeMode="contain" />
        <Text style={styles.title}>{t.funnel.promise.title}</Text>
        <View style={styles.socialProofCard}>
          <Text style={styles.subtitle}>{t.funnel.promise.subtitle}</Text>
        </View>
      </View>
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
  mascotLarge: {
    width: 400,
    height: 400,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  mascotMedium: {
    width: 280,
    height: 280,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 26,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  socialProofCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
});
