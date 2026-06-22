import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Notifications from 'expo-notifications';

import { COLORS, FONTS } from '@/ui/theme';
import { useTranslation } from '@/i18n';
import { useReduceMotion } from '@/ui/anim/useReduceMotion';
import { requestNotificationPermission } from '@/notifications/permissions';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useFunnelStore } from '@/store/useFunnelStore';
import { TIME_OF_DAY_REMINDER } from '../reminderTime';
import { EMBERLY } from '../emberly';
import { FunnelScreen } from '../FunnelScreen';
import type { FunnelStepProps } from '../types';

/** Fáze 4 — Závazek + projekce: 13. Projekční graf · 14. Pledge ·
 *  15. Opt-in notifikací. (Krok 12 "Nastav cíl" je v spec vynechán.) */

const GRAPH_WIDTH = 300;
const GRAPH_HEIGHT = 160;
const GRAPH_BASELINE = 150;

// Body kubické Bézierovy křivky — milníky se POČÍTAJÍ z týchž bodů (ne
// odhadem na očích), takže tečky vždy leží přesně na vykreslené čáře.
const CURVE_P0: [number, number] = [10, GRAPH_BASELINE];
const CURVE_P1: [number, number] = [100, GRAPH_BASELINE];
const CURVE_P2: [number, number] = [120, 60];
const CURVE_P3: [number, number] = [290, 20];

function cubicBezierPoint(
  t: number,
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
): { x: number; y: number } {
  const mt = 1 - t;
  const a = mt ** 3;
  const b = 3 * mt ** 2 * t;
  const c = 3 * mt * t ** 2;
  const d = t ** 3;
  return {
    x: a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    y: a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  };
}

// Jemně zrychlující vzestupná křivka — vizualizace "malé kroky se sčítají".
const GRAPH_PATH = `M${CURVE_P0[0]},${CURVE_P0[1]} C${CURVE_P1[0]},${CURVE_P1[1]} ${CURVE_P2[0]},${CURVE_P2[1]} ${CURVE_P3[0]},${CURVE_P3[1]}`;
const AREA_PATH = `${GRAPH_PATH} L${CURVE_P3[0]},${GRAPH_BASELINE} L${CURVE_P0[0]},${GRAPH_BASELINE} Z`;

const MILESTONE_KEYS = ['today', 'day30', 'day60', 'day90'] as const;
const MILESTONES = MILESTONE_KEYS.map((key, i) => ({
  key,
  ...cubicBezierPoint(i / (MILESTONE_KEYS.length - 1), CURVE_P0, CURVE_P1, CURVE_P2, CURVE_P3),
}));

export function ProjectionStep({ progress, canGoBack, onNext, onBack }: FunnelStepProps) {
  const t = useTranslation();
  const reduceMotion = useReduceMotion();
  const reveal = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    reveal.value = reduceMotion ? 1 : withTiming(1, { duration: 1100 });
  }, [reduceMotion, reveal]);

  const revealStyle = useAnimatedStyle(() => ({
    width: `${reveal.value * 100}%`,
  }));

  return (
    <FunnelScreen
      progress={progress}
      onBack={canGoBack ? onBack : undefined}
      ctaLabel={t.funnel.continueButton}
      onCta={onNext}
    >
      <View style={styles.center}>
        <Text style={styles.title}>{t.funnel.projectionStep.title}</Text>
        <Text style={styles.subtitle}>{t.funnel.projectionStep.subtitle}</Text>
        <View style={styles.bigNumberPill}>
          <Text style={styles.bigNumberText}>{t.funnel.projectionStep.bigNumber}</Text>
        </View>
        <Text style={styles.projectionCaption}>{t.funnel.projectionStep.caption}</Text>
      </View>
      <View style={styles.graphWrap}>
        <Animated.View style={[styles.graphClip, revealStyle]}>
          <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT} viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}>
            <Defs>
              <LinearGradient id="projectionFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={COLORS.primary} stopOpacity={0.35} />
                <Stop offset="1" stopColor={COLORS.primary} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d={AREA_PATH} fill="url(#projectionFill)" stroke="none" />
            <Path
              d={GRAPH_PATH}
              stroke={COLORS.primary}
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
            />
            {MILESTONES.map((m) => (
              <Circle key={m.key} cx={m.x} cy={m.y} r={5} fill={COLORS.primary} stroke="#fff" strokeWidth={2} />
            ))}
          </Svg>
        </Animated.View>
        <Text style={[styles.graphLabel, { left: MILESTONES[0]!.x - 6 }]}>{t.funnel.projectionStep.today}</Text>
        <Text style={[styles.graphLabel, { left: MILESTONES[1]!.x - 24 }]}>{t.funnel.projectionStep.day30}</Text>
        <Text style={[styles.graphLabel, { left: MILESTONES[2]!.x - 24 }]}>{t.funnel.projectionStep.day60}</Text>
        <Text style={[styles.graphLabel, { left: MILESTONES[3]!.x - 40 }]}>{t.funnel.projectionStep.day90}</Text>
      </View>
    </FunnelScreen>
  );
}

export function PledgeStep({ progress, canGoBack, onNext, onBack }: FunnelStepProps) {
  const t = useTranslation();
  return (
    <FunnelScreen
      progress={progress}
      onBack={canGoBack ? onBack : undefined}
      ctaLabel={t.funnel.pledgeStep.cta}
      onCta={onNext}
    >
      <View style={styles.center}>
        <Image source={EMBERLY.cheer} style={styles.mascotMedium} resizeMode="contain" />
        <Text style={styles.title}>{t.funnel.pledgeStep.title}</Text>
        <Text style={styles.subtitle}>{t.funnel.pledgeStep.subtitle}</Text>
      </View>
    </FunnelScreen>
  );
}

export function NotificationsStep({ progress, canGoBack, onNext, onBack }: FunnelStepProps) {
  const t = useTranslation();
  const timeOfDay = useFunnelStore((s) => s.answers.timeOfDay);
  const setAnswer = useFunnelStore((s) => s.setAnswer);
  const setRemindersEnabled = useSettingsStore((s) => s.setRemindersEnabled);
  const setReminderTime = useSettingsStore((s) => s.setReminderTime);
  const [loading, setLoading] = useState(false);

  const reminderTime = timeOfDay ? TIME_OF_DAY_REMINDER[timeOfDay] : useSettingsStore.getState().reminderTime;

  async function handleEnable() {
    setLoading(true);
    try {
      setReminderTime(reminderTime);
      const status = await requestNotificationPermission();
      const granted = status === Notifications.PermissionStatus.GRANTED;
      setRemindersEnabled(granted);
      setAnswer('notificationsGranted', granted);
    } catch {
      // Graceful — appka pokračuje dál i bez notification permission.
      setAnswer('notificationsGranted', false);
    } finally {
      setLoading(false);
      onNext();
    }
  }

  return (
    <FunnelScreen
      progress={progress}
      onBack={canGoBack ? onBack : undefined}
      ctaLabel={t.funnel.notificationsStep.cta}
      onCta={handleEnable}
      ctaLoading={loading}
    >
      <View style={styles.center}>
        <Image source={EMBERLY.cheer} style={styles.mascotMedium} resizeMode="contain" />
        <Text style={styles.title}>{t.funnel.notificationsStep.title}</Text>
        <Text style={styles.subtitle}>{t.funnel.notificationsStep.subtitle(reminderTime)}</Text>
      </View>
    </FunnelScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  mascotMedium: {
    width: 280,
    height: 280,
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
  bigNumberPill: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 6,
  },
  bigNumberText: {
    fontSize: 30,
    fontFamily: FONTS.extraBold,
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  projectionCaption: {
    fontSize: 13.5,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  graphWrap: {
    width: GRAPH_WIDTH,
    height: GRAPH_HEIGHT + 24,
    alignSelf: 'center',
    marginTop: 16,
  },
  graphClip: {
    height: GRAPH_HEIGHT,
    overflow: 'hidden',
  },
  graphLabel: {
    position: 'absolute',
    top: GRAPH_HEIGHT + 4,
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.textTertiary,
  },
});
