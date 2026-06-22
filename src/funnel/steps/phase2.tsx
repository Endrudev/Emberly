import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import { COLORS, FONTS } from '@/ui/theme';
import { useTranslation } from '@/i18n';
import { useFunnelStore, type FunnelHabitCount, type FunnelTimeOfDay } from '@/store/useFunnelStore';
import { FUNNEL_CATEGORIES } from '../categories';
import { ChoiceGroup } from '../ChoiceGroup';
import { FunnelScreen } from '../FunnelScreen';
import type { FunnelStepProps } from '../types';

/** Fáze 2 — Personalizace (data capture): 3. Co budovat · 4. Co zastavilo ·
 *  5. Kdy čas · 6. Kolik návyků · 7. Hlavní cíl. */

type FunnelBlockerKey =
  | 'forget'
  | 'loseMotivation'
  | 'tooComplicated'
  | 'stoppedTracking'
  | 'noTime'
  | 'noProgress'
  | 'gaveUpFast';
const BLOCKER_KEYS: FunnelBlockerKey[] = [
  'forget',
  'loseMotivation',
  'tooComplicated',
  'stoppedTracking',
  'noTime',
  'noProgress',
  'gaveUpFast',
];

const TIME_KEYS: FunnelTimeOfDay[] = ['morning', 'afternoon', 'evening'];

const HABIT_COUNT_KEYS: FunnelHabitCount[] = ['1-2', '3-4', '5+'];

type FunnelGoalKey =
  | 'healthier'
  | 'disciplined'
  | 'calmer'
  | 'productive'
  | 'fitness'
  | 'betterRoutine'
  | 'feelBetter';
const GOAL_KEYS: FunnelGoalKey[] = [
  'healthier',
  'disciplined',
  'calmer',
  'productive',
  'fitness',
  'betterRoutine',
  'feelBetter',
];

export function CategoriesStep({ progress, canGoBack, onNext, onBack }: FunnelStepProps) {
  const t = useTranslation();
  const categories = useFunnelStore((s) => s.answers.categories);
  const setAnswer = useFunnelStore((s) => s.setAnswer);

  function toggle(key: string) {
    const next = new Set(categories);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setAnswer('categories', Array.from(next));
  }

  return (
    <FunnelScreen
      progress={progress}
      onBack={canGoBack ? onBack : undefined}
      ctaLabel={t.funnel.categoriesStep.cta}
      onCta={onNext}
      ctaDisabled={categories.length === 0}
    >
      <Text style={styles.title}>{t.funnel.categoriesStep.title}</Text>
      <Text style={styles.subtitle}>{t.funnel.categoriesStep.subtitle}</Text>
      <ChoiceGroup
        options={FUNNEL_CATEGORIES.map((c) => ({
          key: c.key,
          label: t.funnel.categories[c.key],
          emoji: c.emoji,
        }))}
        isSelected={(key) => categories.includes(key)}
        onPress={toggle}
      />
    </FunnelScreen>
  );
}

export function BlockerStep({ progress, canGoBack, onNext, onBack }: FunnelStepProps) {
  const t = useTranslation();
  const blocker = useFunnelStore((s) => s.answers.blocker);
  const setAnswer = useFunnelStore((s) => s.setAnswer);

  return (
    <FunnelScreen
      progress={progress}
      onBack={canGoBack ? onBack : undefined}
      ctaLabel={t.funnel.blockerStep.cta}
      onCta={onNext}
      ctaDisabled={!blocker}
    >
      <Text style={styles.title}>{t.funnel.blockerStep.title}</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ChoiceGroup
          options={BLOCKER_KEYS.map((key) => ({ key, label: t.funnel.blockers[key] }))}
          isSelected={(key) => blocker === key}
          onPress={(key) => setAnswer('blocker', key)}
        />
      </ScrollView>
    </FunnelScreen>
  );
}

export function TimeStep({ progress, canGoBack, onNext, onBack }: FunnelStepProps) {
  const t = useTranslation();
  const timeOfDay = useFunnelStore((s) => s.answers.timeOfDay);
  const setAnswer = useFunnelStore((s) => s.setAnswer);

  return (
    <FunnelScreen
      progress={progress}
      onBack={canGoBack ? onBack : undefined}
      ctaLabel={t.funnel.timeStep.cta}
      onCta={onNext}
      ctaDisabled={!timeOfDay}
    >
      <Text style={styles.title}>{t.funnel.timeStep.title}</Text>
      <ChoiceGroup
        options={TIME_KEYS.map((key) => ({ key, label: t.funnel.timeOptions[key] }))}
        isSelected={(key) => timeOfDay === key}
        onPress={(key) => setAnswer('timeOfDay', key)}
      />
    </FunnelScreen>
  );
}

export function HabitCountStep({ progress, canGoBack, onNext, onBack }: FunnelStepProps) {
  const t = useTranslation();
  const habitCount = useFunnelStore((s) => s.answers.habitCount);
  const setAnswer = useFunnelStore((s) => s.setAnswer);

  return (
    <FunnelScreen
      progress={progress}
      onBack={canGoBack ? onBack : undefined}
      ctaLabel={t.funnel.habitCountStep.cta}
      onCta={onNext}
      ctaDisabled={!habitCount}
    >
      <Text style={styles.title}>{t.funnel.habitCountStep.title}</Text>
      <ChoiceGroup
        options={HABIT_COUNT_KEYS.map((key) => ({ key, label: t.funnel.habitCountOptions[key] }))}
        isSelected={(key) => habitCount === key}
        onPress={(key) => setAnswer('habitCount', key)}
      />
    </FunnelScreen>
  );
}

export function GoalStep({ progress, canGoBack, onNext, onBack }: FunnelStepProps) {
  const t = useTranslation();
  const goals = useFunnelStore((s) => s.answers.goals);
  const setAnswer = useFunnelStore((s) => s.setAnswer);

  function toggle(key: string) {
    const next = new Set(goals);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setAnswer('goals', Array.from(next));
  }

  return (
    <FunnelScreen
      progress={progress}
      onBack={canGoBack ? onBack : undefined}
      ctaLabel={t.funnel.goalStep.cta}
      onCta={onNext}
      ctaDisabled={goals.length === 0}
    >
      <Text style={styles.title}>{t.funnel.goalStep.title}</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ChoiceGroup
          options={GOAL_KEYS.map((key) => ({ key, label: t.funnel.goals[key] }))}
          isSelected={(key) => goals.includes(key)}
          onPress={toggle}
        />
      </ScrollView>
    </FunnelScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
    lineHeight: 30,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    lineHeight: 21,
    marginBottom: 20,
  },
});
