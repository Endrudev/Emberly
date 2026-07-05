import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { completionRepo } from '@/data/completionRepo';
import { EmberlyWidget, EmberlyWidget4x2, EmberlyWidgetRing } from './EmberlyWidget';
import { expireCelebration, getCachedWidgetState, getCelebrationRemainingMs, getWidgetData } from './widgetData';
import { WIDGET_PAGE_SIZE, WIDGET_PAGE_SIZE_4X2, type WidgetData } from './widgetTypes';

function getPageSize(widgetName: string): number {
  return widgetName === 'EmberlyWidget4x2' ? WIDGET_PAGE_SIZE_4X2 : WIDGET_PAGE_SIZE;
}

function applyOptimisticToggle(cached: WidgetData, activityId: number, page: number): WidgetData {
  const activities = cached.activities.map((a) =>
    a.id === activityId ? { ...a, isCompleted: !a.isCompleted } : a,
  );
  // Celebration je řízena časovačem v getWidgetData — nikdy ji nezobrazuj optimisticky
  return { ...cached, activities, page, allCompletedToday: false };
}

function getWidgetComponent(widgetName: string) {
  if (widgetName === 'EmberlyWidget4x2') return EmberlyWidget4x2;
  if (widgetName === 'EmberlyWidgetRing') return EmberlyWidgetRing;
  return EmberlyWidget;
}

async function renderAndAutoDismiss(
  renderWidget: WidgetTaskHandlerProps['renderWidget'],
  page: number,
  widgetName: string,
): Promise<void> {
  const pageSize = getPageSize(widgetName);
  const data = await getWidgetData(page, pageSize);
  const Component = getWidgetComponent(widgetName);
  renderWidget(React.createElement(Component, { data }));
  if (data.allCompletedToday) {
    const remaining = await getCelebrationRemainingMs();
    if (remaining > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, remaining + 300));
      const normalData = await getWidgetData(0, pageSize);
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
      if (props.clickAction === 'CELEBRATION_DISMISS') {
        await expireCelebration();
        await renderAndAutoDismiss(props.renderWidget, 0, widgetName);
        break;
      }

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
