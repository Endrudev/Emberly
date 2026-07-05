import React from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { EmberlyWidget, EmberlyWidget4x2, EmberlyWidgetRing } from './EmberlyWidget';
import { getCelebrationRemainingMs, getWidgetData } from './widgetData';

const WIDGETS = [
  { widgetName: 'EmberlyWidget', Component: EmberlyWidget },
  { widgetName: 'EmberlyWidget4x2', Component: EmberlyWidget4x2 },
  { widgetName: 'EmberlyWidgetRing', Component: EmberlyWidgetRing },
] as const;

export async function updateEmberlyWidget(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const data = await getWidgetData();
    await Promise.all(
      WIDGETS.map(({ widgetName, Component }) =>
        requestWidgetUpdate({
          widgetName,
          renderWidget: () => React.createElement(Component, { data }),
        }),
      ),
    );
    if (data.allCompletedToday) {
      const remaining = await getCelebrationRemainingMs();
      if (remaining > 0) {
        setTimeout(() => { void updateEmberlyWidget(); }, remaining + 300);
      }
    }
  } catch {
    // Widget not installed on home screen — ignore silently
  }
}
