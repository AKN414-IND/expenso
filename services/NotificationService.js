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
  // ✅ FIX: Use string literals for priority instead of the deprecated enum
  let priority = "default";

  if (diffDays < 0) {
    title = `🚨 OVERDUE: ${reminder.title}`;
    body = `This was due ${Math.abs(
      diffDays
    )} days ago. Pay ${amountString} now to avoid issues.`;
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
    priority, // Pass the priority string in the content
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
  if (!reminder.notification_enabled || !reminder.is_active) return null;

  const content = getNotificationContent(reminder);
  const reminderTime = reminder.reminder_time || "09:00";
  const [hours, minutes] = reminderTime.split(":").map(Number);

  const triggerDate = new Date(reminder.next_due_date);
  triggerDate.setDate(triggerDate.getDate() - daysBefore);
  triggerDate.setHours(hours, minutes, 0, 0);

  const now = new Date();
  const secondsUntilTrigger = (triggerDate.getTime() - now.getTime()) / 1000;

  if (secondsUntilTrigger <= 0) {
    
    return null;
  }

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        ...content,
        sound:
          content.priority === "high" || content.priority === "max"
            ? "defaultCritical"
            : "default",
        vibrate:
          content.priority === "high" || content.priority === "max"
            ? [0, 250, 250, 250]
            : undefined,
        categoryIdentifier: NOTIFICATION_CATEGORIES.REMINDER_ACTIONS,
      },
      trigger: {
        seconds: secondsUntilTrigger,
      },
    });
    return notificationId;
  } catch (error) {
    console.error(
      `Failed to schedule notification for "${reminder.title}":`,
      error
    );
    return null;
  }
};

export const cancelNotification = async (notificationId) => {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
};

/**
 * Re-schedules a notification to be sent in 1 hour from now.
 * @param {string} reminderId - The ID of the reminder to snooze.
 */
export const snoozeNotification = async (reminderId) => {
  const { data: reminder, error } = await supabase
    .from("payment_reminders")
    .select("*")
    .eq("id", reminderId)
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
  // 1. Start with a clean slate
  await Notifications.cancelAllScheduledNotificationsAsync();

  const activeReminders = reminders.filter(
    (r) => r.is_active && r.notification_enabled
  );

  // 2. Set the badge count
  await Notifications.setBadgeCountAsync(activeReminders.length);

  // 3. Schedule all necessary notifications
  for (const reminder of activeReminders) {
    // Schedule primary notification for the due date
    const primaryNotificationId = await scheduleNotification(reminder, 0);

    // Update the database with the ID of the primary notification.
    // This is important for individual cancellations (e.g., when marking as paid).
    if (primaryNotificationId) {
      await supabase
        .from("payment_reminders")
        .update({ notification_id: primaryNotificationId })
        .eq("id", reminder.id);
    }
    
    // Also schedule a notification for 2 days before, if applicable.
    // We don't store the ID for this one; it will be wiped in the next full sync.
    const dueDate = new Date(reminder.next_due_date);
    const now = new Date();
    if (dueDate.getTime() - now.getTime() > 2 * 24 * 60 * 60 * 1000) {
      await scheduleNotification(reminder, 2);
    }
  }
};

// --- Background Task Setup ---

const BACKGROUND_FETCH_TASK = "background-reminder-check";

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
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

export { NOTIFICATION_ACTIONS, NOTIFICATION_CATEGORIES, BACKGROUND_FETCH_TASK };
