/**
 * Local notification helpers for refill reminders.
 * Uses expo-notifications — no server needed.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { SavedMedicine } from './storage';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request notification permissions (call once, early in app lifecycle).
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule a refill reminder notification.
 */
export async function scheduleRefillReminder(
  medicine: SavedMedicine
): Promise<string | null> {
  if (!medicine.refill_reminder_days) return null;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  // Cancel any existing reminder for this medicine
  await cancelRefillReminder(medicine.id);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '💊 Refill Reminder',
      body: `Time to refill ${medicine.name}. Ask your pharmacist for the cheapest salt-equivalent brand!`,
      data: { medicineId: medicine.id, type: 'refill' },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: medicine.refill_reminder_days * 24 * 60 * 60,
      repeats: true,
    },
  });

  return id;
}

/**
 * Cancel a refill reminder.
 */
export async function cancelRefillReminder(medicineId: number): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of all) {
    if (
      notif.content.data?.medicineId === medicineId &&
      notif.content.data?.type === 'refill'
    ) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
