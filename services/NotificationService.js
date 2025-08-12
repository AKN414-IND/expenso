import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import { supabase } from "../lib/supabase";
import { Platform } from "react-native";

// Define unique identifiers for notification categories and actions
const NOTIFICATION_CATEGORIES = {
  REMINDER_ACTIONS: "reminder_actions",
};

const NOTIFICATION_ACTIONS = {
  MARK_AS_PAID: "mark_as_paid",
  SNOOZE: "snooze_1_hour",
  VIEW_DETAILS: "view_details",
};

// --- Notification Handler (Runs when the app is in foreground) ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Sets up interactive buttons for notifications.
 * This should be called once when the app starts.
 */
export const setupNotificationCategories = async () => {
  await Notifications.setNotificationCategoryAsync(
    NOTIFICATION_CATEGORIES.REMINDER_ACTIONS,
    [
      {
        identifier: NOTIFICATION_ACTIONS.MARK_AS_PAID,
        buttonTitle: "✅ Mark as Paid",
        options: {
          opensAppToForeground: false, // Doesn't open the app
        },
      },
      {
        identifier: NOTIFICATION_ACTIONS.SNOOZE,
        buttonTitle: " snoozed for 1h",
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: NOTIFICATION_ACTIONS.VIEW_DETAILS,
        buttonTitle: "View Details",
        options: {
          opensAppToForeground: true, // Opens the app
        },
      },
    ]
  );
};

/**
 * Generates dynamic, engaging content for a notification based on the reminder's status.
 */
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
  let priority = Notifications.NotificationPriority.DEFAULT;

  if (diffDays < 0) {
    title = `🚨 OVERDUE: ${reminder.title}`;
    body = `This was due ${Math.abs(diffDays)} days ago. Pay ${amountString} now to avoid issues.`;
    priority = Notifications.NotificationPriority.MAX;
  } else if (diffDays === 0) {
    title = `⏰ Due Today: ${reminder.title}`;
    body = `Don't forget to pay ${amountString} today!`;
    priority = Notifications.NotificationPriority.HIGH;
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
    data: {
      reminderId: reminder.id,
      url: `expensetracker://reminders/${reminder.id}`, // Deep linking URI
    },
  };
};

/**
 * Schedules a single, feature-rich notification for a reminder.
 * @param {object} reminder - The reminder object from Supabase.
 * @param {number} daysBefore - Number of days before the due date to send the notification. Defaults to 0 (on the due date).
 */
export const scheduleNotification = async (reminder, daysBefore = 0) => {
  if (!reminder.notification_enabled) return null;

  // Cancel any existing notification for this reminder to avoid duplicates
  if (reminder.notification_id) {
    await Notifications.cancelScheduledNotificationAsync(reminder.notification_id);
  }

  const content = getNotificationContent(reminder);
  const reminderTime = reminder.reminder_time || "09:00";
  const [hours, minutes] = reminderTime.split(":").map(Number);
  
  const triggerDate = new Date(reminder.next_due_date);
  triggerDate.setDate(triggerDate.getDate() - daysBefore);
  triggerDate.setHours(hours, minutes, 0, 0);

  // Don't schedule notifications for the past
  if (triggerDate <= new Date()) {
    console.log(`Skipping past notification for reminder: ${reminder.title}`);
    return null;
  }

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        ...content,
        sound: content.priority > Notifications.NotificationPriority.DEFAULT ? "defaultCritical" : "default",
        vibrate: content.priority > Notifications.NotificationPriority.DEFAULT ? [0, 250, 250, 250] : undefined,
        categoryIdentifier: NOTIFICATION_CATEGORIES.REMINDER_ACTIONS,
      },
      trigger: triggerDate,
    });
    return notificationId;
  } catch (error) {
    console.error(`Failed to schedule notification for "${reminder.title}":`, error);
    return null;
  }
};

/**
 * Re-schedules a notification to be sent in 1 hour from now.
 * @param {string} reminderId - The ID of the reminder to snooze.
 */
export const snoozeNotification = async (reminderId) => {
    const { data: reminder, error } = await supabase
        .from('payment_reminders')
        .select('*')
        .eq('id', reminderId)
        .single();

    if (error || !reminder) return;
    
    await Notifications.scheduleNotificationAsync({
        content: getNotificationContent(reminder),
        trigger: { seconds: 60 * 60 }, // 1 hour from now
    });
};

/**
 * Cancels all scheduled notifications and reschedules them based on the latest data.
 * Useful for bulk updates or after initial app load.
 */
export const syncAllNotifications = async (reminders) => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const badgeCount = reminders.filter(r => r.is_active && r.notification_enabled).length;
  await Notifications.setBadgeCountAsync(badgeCount);

  for (const reminder of reminders) {
    // Schedule for the due date and also 2 days before, if applicable
    const notificationId = await scheduleNotification(reminder, 0); 
    await scheduleNotification(reminder, 2); 
    
    if (notificationId) {
      // Update the reminder with the primary notification ID
      await supabase.from('payment_reminders').update({ notification_id: notificationId }).eq('id', reminder.id);
    }
  }
};


// --- Background Task Setup ---

const BACKGROUND_FETCH_TASK = "background-reminder-check";

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const today = new Date().toISOString().split("T")[0];
    const { data: overdue, error } = await supabase
      .from("payment_reminders")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .lt("next_due_date", today);

    if (error || !overdue?.length) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    for (const reminder of overdue) {
      // Send an immediate notification for each overdue item
      await Notifications.scheduleNotificationAsync({
        content: getNotificationContent(reminder),
        trigger: null, // null trigger sends it immediately
      });
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Registers the background fetch task to run periodically.
 */
export const registerBackgroundFetchAsync = async () => {
  return BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    minimumInterval: 60 * 15, // 15 minutes
    stopOnTerminate: false,
    startOnBoot: true,
  });
};

/**
 * Requests notification permissions from the user.
 */
export const requestNotificationPermissions = async () => {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
      allowAnnouncements: true,
    },
  });
  return status;
};

export {
    NOTIFICATION_ACTIONS,
    NOTIFICATION_CATEGORIES,
    BACKGROUND_FETCH_TASK
}