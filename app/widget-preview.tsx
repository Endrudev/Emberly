import React, { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { WidgetPreview } from 'react-native-android-widget';

import { MissionWidget, MissionWidget4x2 } from '@/widget/MissionWidget';
import {
  WIDGET_PAGE_SIZE,
  WIDGET_PAGE_SIZE_4X2,
  type WidgetActivityData,
  type WidgetData,
} from '@/widget/widgetTypes';

const ALL_ACTIVITIES: WidgetActivityData[] = [
  { id: 1, name: 'Meditace', emoji: '🧘', color: '#8B5CF6', isCompleted: true },
  { id: 2, name: 'Procházka', emoji: '🚶', color: '#3BA9F0', isCompleted: true },
  { id: 3, name: 'Program', emoji: '🤓', color: '#34C759', isCompleted: true },
  { id: 4, name: 'Běh', emoji: '🏃', color: '#FF6B5C', isCompleted: false },
  { id: 5, name: 'Voda', emoji: '💧', color: '#2BC4D4', isCompleted: false },
  { id: 6, name: 'Čtení', emoji: '📚', color: '#F59E0B', isCompleted: false },
  { id: 7, name: 'Spánek', emoji: '😴', color: '#6366F1', isCompleted: false },
  { id: 8, name: 'Vitamíny', emoji: '💊', color: '#EC4899', isCompleted: false },
];

const BASE = {
  currentStreak: 47,
  isPersonalRecord: true,
  daysToNextBadge: 3,
  nextBadgeTarget: 50,
  progressToNextBadge: 0.78,
  todayIso: '2026-06-14',
  weekDays: [
    { label: 'Po', isCompleted: true, isToday: false, isFuture: false },
    { label: 'Út', isCompleted: true, isToday: false, isFuture: false },
    { label: 'St', isCompleted: true, isToday: false, isFuture: false },
    { label: 'Čt', isCompleted: false, isToday: true, isFuture: false },
    { label: 'Pá', isCompleted: false, isToday: false, isFuture: true },
    { label: 'So', isCompleted: false, isToday: false, isFuture: true },
    { label: 'Ne', isCompleted: false, isToday: false, isFuture: true },
  ],
};

const W = 360;
const H = 342; // 4×3 widget — Samsung buňka ≈ 114dp × 3 = 342dp
const H2 = 228; // 4×2 widget — Samsung buňka ≈ 114dp × 2 = 228dp

function usePreviewState(activities: WidgetActivityData[], pageSize: number = WIDGET_PAGE_SIZE) {
  const [page, setPage] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(
    () => new Set(activities.filter((a) => a.isCompleted).map((a) => a.id)),
  );

  const acts = activities.map((a) => ({ ...a, isCompleted: completed.has(a.id) }));
  const totalPages = Math.max(1, Math.ceil(acts.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageActivities = acts.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const data: WidgetData = {
    ...BASE,
    activities: pageActivities,
    page: safePage,
    totalPages,
    totalTodayCount: acts.length,
    allCompletedToday: acts.length > 0 && acts.every((a) => a.isCompleted),
    lang: 'cs',
  };

  const onClick = ({ clickAction, clickActionData }: { clickAction: string; clickActionData?: any }) => {
    if (clickAction === 'WIDGET_PAGE') setPage(clickActionData.page);
    else if (clickAction === 'TOGGLE_ACTIVITY') {
      setCompleted((prev) => {
        const next = new Set(prev);
        if (next.has(clickActionData.activityId)) next.delete(clickActionData.activityId);
        else next.add(clickActionData.activityId);
        return next;
      });
    }
  };

  return { data, onClick };
}

function PreviewBlock({ label, activities }: { label: string; activities: WidgetActivityData[] }) {
  const { data, onClick } = usePreviewState(activities);
  return (
    <>
      <Text style={{ color: '#fff', fontSize: 12, marginTop: 8 }}>{label}</Text>
      <WidgetPreview renderWidget={() => <MissionWidget data={data} />} onClick={onClick} width={W} height={H} showBorder />
    </>
  );
}

function PreviewBlock4x2({ label, activities }: { label: string; activities: WidgetActivityData[] }) {
  const { data, onClick } = usePreviewState(activities, WIDGET_PAGE_SIZE_4X2);
  return (
    <>
      <Text style={{ color: '#fff', fontSize: 12, marginTop: 8 }}>{label}</Text>
      <WidgetPreview renderWidget={() => <MissionWidget4x2 data={data} />} onClick={onClick} width={W} height={H2} showBorder />
    </>
  );
}

export default function WidgetPreviewScreen() {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#3A3A4A' }}
      contentContainerStyle={{ padding: 16, gap: 8, alignItems: 'center' }}
    >
      <PreviewBlock label="8 návyků @ 4×3 (stránkování)" activities={ALL_ACTIVITIES} />
      <PreviewBlock label="5 návyků @ 4×3 (běžné)" activities={ALL_ACTIVITIES.slice(0, 5)} />
      <PreviewBlock4x2 label="8 návyků @ 4×2 (stránkování)" activities={ALL_ACTIVITIES} />
      <PreviewBlock4x2 label="5 návyků @ 4×2 (běžné)" activities={ALL_ACTIVITIES.slice(0, 5)} />
    </ScrollView>
  );
}
