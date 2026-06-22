import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { COLORS, FONTS } from '@/ui/theme';
import { useTranslation } from '@/i18n';
import { useReduceMotion } from '@/ui/anim/useReduceMotion';
import { AnimatedPressable } from '@/ui/anim/AnimatedPressable';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '@/config/legal';
import { applyFunnelAnswers } from '../applyFunnelAnswers';
import type { FunnelStepProps } from '../types';

/**
 * Fáze 6 — Hard paywall (krok 17). PLACEHOLDER — žádná reálná platba,
 * žádné RevenueCat entitlement. CTA i zavření (X) appku stejně odemknou
 * (skutečné zamykání přijde s RevenueCat integrací).
 *
 * TODO: nahradit RevenueCat Paywall (react-native-purchases + RevenueCat
 * Paywalls, vzdálená konfigurace pro A/B test ceny/copy/layoutu).
 */

const CLOSE_DELAY_MS = 2500;

type Plan = 'yearly' | 'monthly';

export function PaywallStep(_props: FunnelStepProps) {
  const t = useTranslation();
  const p = t.funnel.paywallStep;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [plan, setPlan] = useState<Plan>('yearly');
  const [closeVisible, setCloseVisible] = useState(false);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setCloseVisible(true), CLOSE_DELAY_MS);
    return () => clearTimeout(id);
  }, []);

  // CTA i zavření (X) vedou do appky stejně — v téhle placeholder verzi
  // není žádné reálné entitlement gating, to přijde s RevenueCat.
  async function handleFinish() {
    if (finishing) return;
    setFinishing(true);
    try {
      await applyFunnelAnswers(t.funnel.categories);
    } finally {
      router.replace('/(tabs)');
    }
  }

  function handleRestore() {
    // Placeholder — bez RevenueCat není co obnovit.
    Alert.alert(p.restore, p.restoreNoneFound);
  }

  const valueItems = [
    p.valueStreakProtection,
    p.valueUnlimitedHabits,
    p.valueAllTiers,
    p.valueAdvancedStats,
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {closeVisible ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(200)}
          style={[styles.closeWrap, { top: insets.top + 12 }]}
        >
          <AnimatedPressable
            onPress={finishing ? undefined : handleFinish}
            hapticStyle="light"
            accessibilityLabel={p.closeAccessibilityLabel}
            style={styles.closeBtn}
          >
            <Text style={styles.closeText}>✕</Text>
          </AnimatedPressable>
        </Animated.View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.trialBanner}>
          <Text style={styles.trialBannerText}>{p.freeTrialBanner}</Text>
        </View>

        <Text style={styles.title}>{p.title}</Text>
        <Text style={styles.subtitle}>{p.subtitle}</Text>

        <View style={styles.valueStack}>
          {valueItems.map((label) => (
            <View key={label} style={styles.valueRow}>
              <View style={styles.valueCheck}>
                <Text style={styles.valueCheckText}>✓</Text>
              </View>
              <Text style={styles.valueLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <AnimatedPressable
          onPress={() => setPlan('yearly')}
          hapticStyle="light"
          style={[styles.planCard, plan === 'yearly' && styles.planCardSelected]}
        >
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>{p.yearlyBadge}</Text>
          </View>
          <Text style={styles.planLabel}>{p.yearlyLabel}</Text>
          <Text style={styles.planPrice}>{p.yearlyPrice}</Text>
          <Text style={styles.planPriceSub}>{p.yearlyPricePerMonth}</Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => setPlan('monthly')}
          hapticStyle="light"
          style={[styles.planCard, plan === 'monthly' && styles.planCardSelected]}
        >
          <Text style={styles.planLabel}>{p.monthlyLabel}</Text>
          <Text style={styles.planPrice}>{p.monthlyPrice}</Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={finishing ? undefined : handleFinish}
          hapticStyle="medium"
          disabled={finishing}
          style={[styles.cta, finishing && styles.ctaDisabled]}
        >
          {finishing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.ctaText}>{p.cta}</Text>
          )}
        </AnimatedPressable>

        <Text style={styles.socialProof}>
          {/* TODO social-proof: nahradit reálnými před launchem */}
          ★★★★★ {p.socialProof}
        </Text>

        <AnimatedPressable onPress={handleRestore} hapticStyle="light">
          <Text style={styles.restore}>{p.restore}</Text>
        </AnimatedPressable>

        <View style={styles.legalRow}>
          <AnimatedPressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} hapticStyle="none">
            <Text style={styles.legalLink}>{t.settings.privacyPolicy}</Text>
          </AnimatedPressable>
          <Text style={styles.legalDot}>·</Text>
          <AnimatedPressable onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)} hapticStyle="none">
            <Text style={styles.legalLink}>{t.settings.termsOfService}</Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  closeWrap: {
    // `top` se dopočítává inline z useSafeAreaInsets() — absolutně
    // umístěné děti SafeAreaView ignorují jeho padding pro inset, takže
    // pevné `top` by lezlo pod status bar/notch.
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 14, color: COLORS.textSecondary },
  content: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 32,
    gap: 14,
  },
  trialBanner: {
    alignSelf: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 4,
  },
  trialBannerText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  title: {
    fontSize: 28,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
  },
  valueStack: {
    gap: 12,
    marginBottom: 10,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  valueCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueCheckText: { color: '#fff', fontSize: 13, fontFamily: FONTS.bold },
  valueLabel: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  planCard: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  planCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  planBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  planBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: FONTS.bold,
    letterSpacing: 0.4,
  },
  planLabel: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
  },
  planPrice: {
    fontSize: 20,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
    marginTop: 2,
  },
  planPriceSub: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  cta: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  ctaDisabled: { opacity: 0.7 },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONTS.bold,
    letterSpacing: 0.2,
  },
  socialProof: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  restore: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  legalLink: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.textTertiary,
  },
  legalDot: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
});
