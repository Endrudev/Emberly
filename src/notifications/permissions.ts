import * as Notifications from 'expo-notifications';

export type NotificationPermissionStatus = Notifications.PermissionStatus;

/** Aktuální stav notification permission, beze ptaní uživatele. */
export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * Vyžádá notification permission — na Androidu 13+ vyvolá systémový POST_NOTIFICATIONS
 * dialog. Pokud je oprávnění už uděleno, nic se znovu nevyžaduje. Volající rozhoduje, co
 * dál s výsledkem (např. vrátit toggle do OFF a zobrazit hlášku při zamítnutí).
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return existing.status;
  const { status } = await Notifications.requestPermissionsAsync();
  return status;
}
