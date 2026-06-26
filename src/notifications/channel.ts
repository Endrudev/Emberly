import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/** Android notification channel pro denní/streak připomínky — oddělený od
 *  kanálu persistentní notifikace (`emberly-status`). No-op na iOS. */
export const REMINDERS_CHANNEL_ID = 'reminders';

export async function ensureReminderChannel(name = 'Reminders'): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDERS_CHANNEL_ID, {
    name,
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}
