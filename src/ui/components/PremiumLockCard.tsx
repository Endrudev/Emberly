import { Image, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { COLORS, FONTS } from '@/ui/theme';
import { useAppTheme } from '@/ui/useAppTheme';
import { AnimatedPressable } from '@/ui/anim/AnimatedPressable';

// Vlastní ikona (assets/icons/lock.png) nahrazující 🔒 — viz vault design/visual-assets.md.
const LOCK_ICON = require('../../../assets/icons/lock.png');

interface PremiumLockCardProps {
  title: string;
  body: string;
  ctaLabel: string;
  onUnlock: () => void;
}

/**
 * Čistá zamykací karta pro premium-only sekce. Žádný teaser obsah pod tím
 * (dřív se zobrazoval ztmavený živý komponent — působilo to zabugovaně kvůli
 * prolínání animací). Jen zámek, popis a CTA na paywall. Theme-aware.
 */
export function PremiumLockCard({ title, body, ctaLabel, onUnlock }: PremiumLockCardProps) {
  const C = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: C.surface }]}>
      <Image source={LOCK_ICON} style={styles.lockImage} resizeMode="contain" />
      <Text style={[styles.title, { color: C.text }]}>{title}</Text>
      <Text style={[styles.body, { color: C.textSecondary }]}>{body}</Text>
      <AnimatedPressable onPress={onUnlock} hapticStyle="medium" style={styles.cta}>
        <Text style={styles.ctaText}>{ctaLabel}</Text>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  lockIcon: { fontSize: 30, marginBottom: 10 },
  lockImage: { width: 32, height: 32, marginBottom: 10 },
  title: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    textAlign: 'center',
  },
  body: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 18,
  },
  cta: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  ctaText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: FONTS.bold,
    letterSpacing: 0.2,
  },
});
