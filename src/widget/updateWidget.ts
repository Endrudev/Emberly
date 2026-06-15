import React from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { MissionWidget } from './MissionWidget';
import { getCelebrationRemainingMs, getWidgetData } from './widgetData';

export async function updateMissionWidget(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const data = await getWidgetData();
    await requestWidgetUpdate({
      widgetName: 'MissionWidget',
      renderWidget: () => React.createElement(MissionWidget, { data }),
    });
    if (data.allCompletedToday) {
      const remaining = await getCelebrationRemainingMs();
      if (remaining > 0) {
        setTimeout(() => { void updateMissionWidget(); }, remaining + 300);
      }
    }
  } catch {
    // Widget not installed on home screen — ignore silently
  }
}
