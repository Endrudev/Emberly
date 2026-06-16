import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { completionRepo } from '@/data/completionRepo';
import { MissionWidget, MissionWidget4x2 } from './MissionWidget';
import { getCachedWidgetState, getCelebrationRemainingMs, getWidgetData } from './widgetData';
import type { WidgetData } from './widgetTypes';

function applyOptimisticToggle(cached: WidgetData, activityId: number, page: number): WidgetData {
  const activities = cached.activities.map((a) =>
    a.id === activityId ? { ...a, isCompleted: !a.isCompleted } : a,
  );
  const allCompletedToday = activities.length > 0 && activities.every((a) => a.isCompleted);
  return { ...cached, activities, page, allCompletedToday };
}

function getWidgetComponent(widgetName: string) {
  return widgetName === 'MissionWidget4x2' ? MissionWidget4x2 : MissionWidget;
}

async function renderAndAutoDismiss(
  renderWidget: WidgetTaskHandlerProps['renderWidget'],
  page: number,
  widgetName: string,
): Promise<void> {
  const data = await getWidgetData(page);
  const Component = getWidgetComponent(widgetName);
  renderWidget(React.createElement(Component, { data }));
  if (data.allCompletedToday) {
    const remaining = await getCelebrationRemainingMs();
    if (remaining > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, remaining + 300));
      const normalData = await getWidgetData(0);
      const Component = getWidgetComponent(widgetName);
      renderWidget(React.createElement(Component, { data: normalData }));
    }
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const widgetName = props.widgetInfo.widgetName;
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      await renderAndAutoDismiss(props.renderWidget, 0, widgetName);
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
          const Component = getWidgetComponent(widgetName);
          props.renderWidget(React.createElement(Component, { data: optimistic }));
        }
        await completionRepo.toggle(clickData.activityId, clickData.date);
      }
      // Finální re-render s přesnými daty z DB (aktualizuje i streak, cache, celebration timer)
      await renderAndAutoDismiss(props.renderWidget, page, widgetName);
      break;
    }

    default:
      break;
  }
}
