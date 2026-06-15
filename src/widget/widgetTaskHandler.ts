import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { completionRepo } from '@/data/completionRepo';
import { MissionWidget } from './MissionWidget';
import { getCachedWidgetState, getCelebrationRemainingMs, getWidgetData } from './widgetData';
import type { WidgetData } from './widgetTypes';

function applyOptimisticToggle(cached: WidgetData, activityId: number, page: number): WidgetData {
  const activities = cached.activities.map((a) =>
    a.id === activityId ? { ...a, isCompleted: !a.isCompleted } : a,
  );
  const allCompletedToday = activities.length > 0 && activities.every((a) => a.isCompleted);
  return { ...cached, activities, page, allCompletedToday };
}

async function renderAndAutoDismiss(
  renderWidget: WidgetTaskHandlerProps['renderWidget'],
  page: number,
): Promise<void> {
  const data = await getWidgetData(page);
  renderWidget(React.createElement(MissionWidget, { data }));
  if (data.allCompletedToday) {
    const remaining = await getCelebrationRemainingMs();
    if (remaining > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, remaining + 300));
      const normalData = await getWidgetData(0);
      renderWidget(React.createElement(MissionWidget, { data: normalData }));
    }
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      await renderAndAutoDismiss(props.renderWidget, 0);
      break;
    }

    case 'WIDGET_DELETED':
      break;

    case 'WIDGET_CLICK': {
      const clickData = (props.clickActionData ?? {}) as {
        activityId?: number;
        date?: string;
        page?: number;
      };
      const page = clickData.page ?? 0;

      if (props.clickAction === 'TOGGLE_ACTIVITY' && clickData.activityId != null && clickData.date) {
        // Optimistický render: zobraz překlopený stav okamžitě z cache, bez čekání na DB
        const cached = await getCachedWidgetState();
        if (cached && cached.todayIso === clickData.date) {
          const optimistic = applyOptimisticToggle(cached, clickData.activityId, page);
          props.renderWidget(React.createElement(MissionWidget, { data: optimistic }));
        }
        await completionRepo.toggle(clickData.activityId, clickData.date);
      }
      // Finální re-render s přesnými daty z DB (aktualizuje i streak, cache, celebration timer)
      await renderAndAutoDismiss(props.renderWidget, page);
      break;
    }

    default:
      break;
  }
}
