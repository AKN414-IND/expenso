import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTIFICATION_CATEGORIES = { REMINDER_ACTIONS: "reminder_actions" };
const NOTIFICATION_ACTIONS = {
  MARK_AS_PAID: "mark_as_paid",
  SNOOZE: "snooze_1_hour",
  VIEW_DETAILS: "view_details",
};
const LOCAL_REMINDERS_KEY = "local_payment_reminders";
const BACKGROUND_FETCH_TASK = "background-reminder-check";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const setupNotificationCategories = async () => {
  await Notifications.setNotificationCategoryAsync(
    NOTIFICATION_CATEGORIES.REMINDER_ACTIONS,
    [
      {
        identifier: NOTIFICATION_ACTIONS.MARK_AS_PAID,
        buttonTitle: "✅ Mark as Paid",
        options: { opensAppToForeground: false },
      },
      {
        identifier: NOTIFICATION_ACTIONS.SNOOZE,
        buttonTitle: " Snooze 1h",
        options: { opensAppToForeground: false },
      },
      {
        identifier: NOTIFICATION_ACTIONS.VIEW_DETAILS,
        buttonTitle: "View Details",
        options: { opensAppToForeground: true },
      },
    ]
  );
};

const getNotificationContent = (reminder) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(reminder.next_due_date);
  dueDate.setHours(0, 0, 0, 0);
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const amountString = `₹${parseFloat(reminder.amount || 0).toLocaleString()}`;
  let title = `💰 Payment Reminder: ${reminder.title}`;
  let body = `Your payment of ${amountString} is due soon.`;
  let priority = "default";
  if (diffDays < 0) {
    title = `🚨 OVERDUE: ${reminder.title}`;
    body = `This was due ${Math.abs(diffDays)} days ago. Pay ${amountString} now.`;
    priority = "max";
  } else if (diffDays === 0) {
    title = `⏰ Due Today: ${reminder.title}`;
    body = `Don't forget to pay ${amountString} today!`;
    priority = "high";
  } else if (diffDays === 1) {
    title = `🗓️ Due Tomorrow: ${reminder.title}`;
    body = `Your payment of ${amountString} is due tomorrow.`;
  } else {
    body = `Your payment of ${amountString} is due in ${diffDays} days.`;
  }
  return {
    title,
    body,
    priority,
    data: { reminderId: reminder.id, url: `expensetracker://reminders/${reminder.id}` },
  };
};

export const scheduleNotification = async (reminder, daysBefore = 0) => {
  if (!reminder.notification_enabled || !reminder.is_active) return null;
  const content = getNotificationContent(reminder);
  const reminderTime = reminder.reminder_time || "09:00";
  const [hours, minutes] = reminderTime.split(":").map(Number);
  const triggerDate = new Date(reminder.next_due_date);
  triggerDate.setDate(triggerDate.getDate() - daysBefore);
  triggerDate.setHours(hours, minutes, 0, 0);
  const now = new Date();
  const secondsUntilTrigger = (triggerDate.getTime() - now.getTime()) / 1000;
  if (secondsUntilTrigger <= 0) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        ...content,
        sound: content.priority === "high" || content.priority === "max" ? "defaultCritical" : "default",
        vibrate: content.priority === "high" || content.priority === "max" ? [0, 250, 250, 250] : undefined,
        categoryIdentifier: NOTIFICATION_CATEGORIES.REMINDER_ACTIONS,
      },
      trigger: { seconds: secondsUntilTrigger },
    });
  } catch {
    return null;
  }
};

export const cancelNotification = async (notificationId) => {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
};

export const snoozeNotification = async (reminder) => {
  if (!reminder) return;
  await Notifications.scheduleNotificationAsync({
    content: getNotificationContent(reminder),
    trigger: { seconds: 60 * 60 },
  });
};

export const syncAllNotifications = async (reminders) => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const activeReminders = reminders.filter((r) => r.is_active && r.notification_enabled);
  await Notifications.setBadgeCountAsync(activeReminders.length);
  for (const reminder of activeReminders) {
    const primaryNotificationId = await scheduleNotification(reminder, 0);
    if (primaryNotificationId) {
      await saveLocalReminder({ ...reminder, notification_id: primaryNotificationId });
      try {
        await supabase.from("payment_reminders").update({ notification_id: primaryNotificationId }).eq("id", reminder.id);
      } catch {}
    }
    const dueDate = new Date(reminder.next_due_date);
    const now = new Date();
    if (dueDate.getTime() - now.getTime() > 2 * 24 * 60 * 60 * 1000) {
      await scheduleNotification(reminder, 2);
    }
  }
};

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const localReminders = await getLocalReminders();
    const overdue = localReminders.filter((r) => r.is_active && new Date(r.next_due_date) < new Date());
    for (const reminder of overdue) {
      await Notifications.scheduleNotificationAsync({ content: getNotificationContent(reminder), trigger: null });
    }
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const registerBackgroundFetchAsync = async () => {
  return BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    minimumInterval: 60 * 15,
    stopOnTerminate: false,
    startOnBoot: true,
  });
};

export const requestNotificationPermissions = async () => {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true, allowAnnouncements: true },
  });
  return status;
};

export async function saveLocalReminder(reminder) {
  const existing = JSON.parse(await AsyncStorage.getItem(LOCAL_REMINDERS_KEY)) || [];
  const updated = [...existing.filter((r) => r.id !== reminder.id), reminder];
  await AsyncStorage.setItem(LOCAL_REMINDERS_KEY, JSON.stringify(updated));
}

export async function getLocalReminders() {
  return JSON.parse(await AsyncStorage.getItem(LOCAL_REMINDERS_KEY)) || [];
}

export { NOTIFICATION_ACTIONS, NOTIFICATION_CATEGORIES, BACKGROUND_FETCH_TASK };
