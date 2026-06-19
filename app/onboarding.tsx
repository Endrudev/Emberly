import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { COLORS, activityPalette } from '@/ui/theme';
import { useTranslation } from '@/i18n';
import type { Translation } from '@/i18n';

type PresetHabitKey = keyof Translation['onboarding']['presetHabits'];

// Preset habits users can pick during onboarding — name resolved per-language
// at render time via `presetHabits[key]` so the saved Activity.name matches
// the active app language, not just the UI label.
const PRESET_HABITS: { key: PresetHabitKey; emoji: string; color: string }[] = [
  { key: 'walk', emoji: '🚶', color: activityPalette[0]!.accent },
  { key: 'run', emoji: '🏃', color: activityPalette[2]!.accent },
  { key: 'water', emoji: '💧', color: activityPalette[10]!.accent },
  { key: 'exercise', emoji: '💪', color: activityPalette[1]!.accent },
  { key: 'reading', emoji: '📚', color: activityPalette[4]!.accent },
  { key: 'meditation', emoji: '🧘', color: activityPalette[3]!.accent },
  { key: 'sleep', emoji: '😴', color: activityPalette[9]!.accent },
  { key: 'healthyFood', emoji: '🥗', color: activityPalette[5]!.accent },
];

// Mock week preview data for step 2 — display-only, never saved.
const MOCK_ACTIVITIES: { key: PresetHabitKey; emoji: string; color: string; done: boolean[] }[] = [
  { key: 'walk', emoji: '🚶', color: activityPalette[0]!.accent, done: [true, true, true, true, true, true, false] },
  { key: 'exercise', emoji: '💪', color: activityPalette[1]!.accent, done: [true, true, true, true, true, true, false] },
  { key: 'meditation', emoji: '🧘', color: activityPalette[3]!.accent, done: [true, true, true, true, false, false, false] },
];

export default function OnboardingScreen() {
  const t = useTranslation();
  const router = useRouter();
  const createActivity = useAppStore((s) => s.createActivity);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0); // 0, 1, 2
  const [selected, setSelected] = useState<Set<number>>(new Set([0, 1, 3])); // pre-select 3
  const [saving, setSaving] = useState(false);

  function toggleHabit(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  async function handleFinish() {
    setSaving(true);
    try {
      for (const idx of selected) {
        const h = PRESET_HABITS[idx];
        if (!h) continue;
        await createActivity({
          name: t.onboarding.presetHabits[h.key],
          emoji: h.emoji,
          color: h.color,
          scheduledDays: [0, 1, 2, 3, 4, 5, 6], // every day
        });
      }
      completeOnboarding();
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    completeOnboarding();
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        {/* Step dots */}
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.dot, i === step ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
        <Pressable onPress={handleSkip} hitSlop={12}>
          <Text style={styles.skipText}>{t.onboarding.skip}</Text>
        </Pressable>
      </View>

      {/* Step 0 – Welcome */}
      {step === 0 ? (
        <View style={styles.stepContent}>
          <View style={styles.illustrationWrap}>
            <View style={styles.illustrationCircle}>
              <Text style={styles.illustrationEmoji}>🎯</Text>
            </View>
          </View>
          <Text style={styles.step1Title}>{t.onboarding.step1Title}</Text>
          <Text style={styles.subtitle}>{t.onboarding.step1Subtitle}</Text>
          <View style={{ flex: 1 }} />
          <Pressable style={styles.primaryBtn} onPress={() => setStep(1)}>
            <Text style={styles.primaryBtnText}>{t.onboarding.step1Button}</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Step 1 – Week preview */}
      {step === 1 ? (
        <View style={styles.stepContent}>
          <Text style={styles.step2Title}>{t.onboarding.step2Title}</Text>
          <Text style={styles.subtitle}>{t.onboarding.step2Subtitle}</Text>
          <View style={styles.mockActivities}>
            {MOCK_ACTIVITIES.map((a) => (
              <View key={a.key} style={[styles.mockCard, { backgroundColor: `${a.color}18` }]}>
                <View style={styles.mockCardHeader}>
                  <View style={[styles.mockEmojiBubble, { backgroundColor: `${a.color}28` }]}>
                    <Text style={{ fontSize: 20 }}>{a.emoji}</Text>
                  </View>
                  <Text style={styles.mockCardName}>{t.onboarding.presetHabits[a.key]}</Text>
                </View>
                <View style={styles.mockDays}>
                  {a.done.map((done, i) => (
                    <View
                      key={i}
                      style={[
                        styles.mockCircle,
                        done
                          ? { backgroundColor: a.color }
                          : { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#DDD' },
                      ]}
                    >
                      {done ? <Text style={styles.checkMark}>✓</Text> : null}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }} />
          <Pressable style={styles.primaryBtn} onPress={() => setStep(2)}>
            <Text style={styles.primaryBtnText}>{t.onboarding.step2Button}</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Step 2 – Pick habits */}
      {step === 2 ? (
        <View style={styles.stepContent}>
          <Text style={styles.step2Title}>{t.onboarding.step3Title}</Text>
          <Text style={styles.subtitle}>{t.onboarding.step3Subtitle}</Text>
          <ScrollView
            style={styles.habitsScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.habitsGrid}>
              {PRESET_HABITS.map((h, idx) => {
                const isSelected = selected.has(idx);
                return (
                  <Pressable
                    key={h.key}
                    onPress={() => toggleHabit(idx)}
                    style={[
                      styles.habitChip,
                      isSelected && { backgroundColor: `${h.color}22`, borderColor: h.color },
                    ]}
                  >
                    <Text style={styles.habitChipEmoji}>{h.emoji}</Text>
                    <Text style={[styles.habitChipName, isSelected && { color: h.color }]}>
                      {t.onboarding.presetHabits[h.key]}
                    </Text>
                    {isSelected ? (
                      <View style={[styles.chipCheck, { backgroundColor: h.color }]}>
                        <Text style={styles.chipCheckText}>✓</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <Text style={styles.selectedCount}>
            {t.onboarding.step3Counter(selected.size)}
          </Text>
          <Pressable
            style={[styles.primaryBtn, selected.size === 0 && styles.primaryBtnDisabled]}
            onPress={selected.size > 0 ? handleFinish : undefined}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>{t.onboarding.step3Button}</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: COLORS.primary },
  dotInactive: { backgroundColor: '#DDD' },
  skipText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 32,
    paddingTop: 16,
  },
  illustrationWrap: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 36,
  },
  illustrationCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: `${COLORS.primary}30`,
    borderStyle: 'dashed',
  },
  illustrationEmoji: { fontSize: 80 },
  step1Title: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.text,
    lineHeight: 40,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  step2Title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    lineHeight: 34,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Step 2 mocks
  mockActivities: { gap: 10 },
  mockCard: {
    borderRadius: 14,
    padding: 14,
  },
  mockCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  mockEmojiBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  mockDays: {
    flexDirection: 'row',
    gap: 6,
  },
  mockCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Step 3 habit grid
  habitsScroll: { flex: 1 },
  habitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 12,
  },
  habitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    backgroundColor: '#F7F7F7',
  },
  habitChipEmoji: { fontSize: 18 },
  habitChipName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  chipCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCheckText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  selectedCount: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
});
