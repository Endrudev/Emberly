import type { FunnelStepConfig } from '../types';
import { WelcomeStep, PromiseStep } from './phase1';
import {
  CategoriesStep,
  BlockerStep,
  TimeStep,
  HabitCountStep,
  GoalStep,
} from './phase2';
import { HowItWorksStep, TierStep, WidgetStep, ScienceStep } from './phase3';
import { ProjectionStep, PledgeStep, NotificationsStep } from './phase4';
import { BuildingPlanStep } from './phase5';
import { PaywallStep } from './phase6';

/**
 * Centrální seznam kroků funnelu, v pořadí zobrazení. Každý úkol z
 * `onboarding-funnel.md` přidá svou fázi sem (vlastní soubor ve
 * `src/funnel/steps/`).
 */
export const FUNNEL_STEPS: FunnelStepConfig[] = [
  // Fáze 1 — Hook
  { key: 'welcome', Component: WelcomeStep },
  { key: 'promise', Component: PromiseStep },
  // Fáze 2 — Personalizace
  { key: 'categories', Component: CategoriesStep },
  { key: 'blocker', Component: BlockerStep },
  { key: 'time', Component: TimeStep },
  { key: 'habitCount', Component: HabitCountStep },
  { key: 'goal', Component: GoalStep },
  // Fáze 3 — Edukace & hodnota
  { key: 'howItWorks', Component: HowItWorksStep },
  { key: 'tier', Component: TierStep },
  { key: 'widget', Component: WidgetStep },
  { key: 'science', Component: ScienceStep },
  // Fáze 4 — Závazek + projekce
  { key: 'projection', Component: ProjectionStep },
  { key: 'pledge', Component: PledgeStep },
  { key: 'notifications', Component: NotificationsStep },
  // Fáze 5 — "Stavíme plán"
  { key: 'buildingPlan', Component: BuildingPlanStep },
  // Fáze 6 — Hard paywall (placeholder)
  { key: 'paywall', Component: PaywallStep },
];
