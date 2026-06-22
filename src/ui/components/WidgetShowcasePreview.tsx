import { type ComponentType, type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  WIDGET_PAGE_SIZE,
  WIDGET_PAGE_SIZE_4X2,
  type WidgetActivityData,
  type WidgetData,
} from '@/widget/widgetTypes';
import { useResolvedLanguage, useTranslation } from '@/i18n';
import { COLORS, FONTS } from '@/ui/theme';

const MOCK_ACTIVITIES: WidgetActivityData[] = [
  { id: 1, name: 'Meditace', emoji: '🧘', color: '#8B5CF6', isCompleted: true },
  { id: 2, name: 'Procházka', emoji: '🚶', color: '#3BA9F0', isCompleted: true },
  { id: 3, name: 'Program', emoji: '🤓', color: '#34C759', isCompleted: true },
  { id: 4, name: 'Běh', emoji: '🏃', color: '#FF6B5C', isCompleted: false },
  { id: 5, name: 'Voda', emoji: '💧', color: '#2BC4D4', isCompleted: false },
  { id: 6, name: 'Čtení', emoji: '📚', color: '#F59E0B', isCompleted: false },
];

const DAY_LABELS: Record<'cs' | 'en', string[]> = {
  cs: ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

const WIDTH = 360;
const HEIGHT_4X3 = 342; // Samsung buňka ≈ 114dp × 3
const HEIGHT_4X2 = 228; // Samsung buňka ≈ 114dp × 2

interface NativeWidgetModules {
  WidgetPreview: ComponentType<{
    renderWidget: () => ReactElement;
    onClick: (event: { clickAction: string; clickActionData?: Record<string, unknown> }) => void;
    width: number;
    height: number;
  }>;
  MissionWidget: ComponentType<{ data: WidgetData }>;
  MissionWidget4x2: ComponentType<{ data: WidgetData }>;
}

// undefined = ještě nezkoušeno, null = vyzkoušeno a nedostupné (Expo Go).
let cachedModules: NativeWidgetModules | null | undefined;

/**
 * `react-native-android-widget` je custom native modul — v Expo Go neexistuje
 * a na nové architektuře hodí synchronní chybu hned při requiru
 * (`TurboModuleRegistry.getEnforcing`). Lazy + try/catch, ne statický import,
 * aby tahle komponenta (a tím pád krok 10 funnelu i showcase v Nastavení)
 * v Expo Go jen zobrazila fallback, místo aby shodila celou obrazovku.
 */
function loadNativeWidgetModules(): NativeWidgetModules | null {
  if (cachedModules !== undefined) return cachedModules;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const widgetLib = require('react-native-android-widget');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mission = require('../../widget/MissionWidget');
    cachedModules = {
      WidgetPreview: widgetLib.WidgetPreview,
      MissionWidget: mission.MissionWidget,
      MissionWidget4x2: mission.MissionWidget4x2,
    };
  } catch {
    cachedModules = null;
  }
  return cachedModules;
}

interface WidgetShowcasePreviewProps {
  variant: '4x3' | '4x2';
}

/**
 * Pixel-identical widget preview reused from the dev tool (`app/widget-preview.tsx`)
 * for the user-facing showcase in Settings — same render path as the real widget
 * (`MissionWidget`/`MissionWidget4x2`) and `WidgetPreview` from
 * `react-native-android-widget`, just fed mock data instead of live store data.
 * Interactive (tap to toggle / page) so it demonstrates the actual value prop.
 */
export function WidgetShowcasePreview({ variant }: WidgetShowcasePreviewProps) {
  const lang = useResolvedLanguage();
  const t = useTranslation();
  const [page, setPage] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(
    () => new Set(MOCK_ACTIVITIES.filter((a) => a.isCompleted).map((a) => a.id)),
  );

  const pageSize = variant === '4x2' ? WIDGET_PAGE_SIZE_4X2 : WIDGET_PAGE_SIZE;
  const activities = MOCK_ACTIVITIES.map((a) => ({ ...a, isCompleted: completed.has(a.id) }));
  const totalPages = Math.max(1, Math.ceil(activities.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageActivities = activities.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const data: WidgetData = {
    currentStreak: 7,
    isPersonalRecord: false,
    daysToNextBadge: 23,
    nextBadgeTarget: 30,
    progressToNextBadge: 0.23,
    todayIso: '2026-06-14',
    weekDays: DAY_LABELS[lang].map((label, i) => ({
      label,
      isCompleted: i < 3,
      isToday: i === 3,
      isFuture: i > 3,
    })),
    activities: pageActivities,
    page: safePage,
    totalPages,
    totalTodayCount: activities.length,
    allCompletedToday: activities.length > 0 && activities.every((a) => a.isCompleted),
    lang,
  };

  function onClick({
    clickAction,
    clickActionData,
  }: {
    clickAction: string;
    clickActionData?: Record<string, unknown>;
  }) {
    if (clickAction === 'WIDGET_PAGE') {
      setPage(clickActionData?.page as number);
    } else if (clickAction === 'TOGGLE_ACTIVITY') {
      const activityId = clickActionData?.activityId as number;
      setCompleted((prev) => {
        const next = new Set(prev);
        if (next.has(activityId)) next.delete(activityId);
        else next.add(activityId);
        return next;
      });
    }
  }

  const native = loadNativeWidgetModules();
  const size = variant === '4x3' ? { width: WIDTH, height: HEIGHT_4X3 } : { width: WIDTH, height: HEIGHT_4X2 };

  if (!native) {
    return (
      <View style={[styles.fallback, size]}>
        <Text style={styles.fallbackText}>{t.widget.previewUnavailableInExpoGo}</Text>
      </View>
    );
  }

  const { WidgetPreview, MissionWidget, MissionWidget4x2 } = native;

  return variant === '4x3' ? (
    <WidgetPreview
      renderWidget={() => <MissionWidget data={data} />}
      onClick={onClick}
      width={WIDTH}
      height={HEIGHT_4X3}
    />
  ) : (
    <WidgetPreview
      renderWidget={() => <MissionWidget4x2 data={data} />}
      onClick={onClick}
      width={WIDTH}
      height={HEIGHT_4X2}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fallbackText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
