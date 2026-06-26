import React from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { EmberlyWidget } from './EmberlyWidget';
import { getCelebrationRemainingMs, getWidgetData } from './widgetData';

export async function updateEmberlyWidget(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const data = await getWidgetData();
    await requestWidgetUpdate({
      widgetName: 'EmberlyWidget',
      renderWidget: () => React.createElement(EmberlyWidget, { data }),
    });
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
