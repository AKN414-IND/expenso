import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import { supabase } from "../lib/supabase";

// Notification categories
const NOTIFICATION_CATEGORIES = {
  PAYMENT_DUE: "payment_due",
  PAYMENT_OVERDUE: "payment_overdue",
  REMINDER: "reminder"
};

// Configure notification handler with enhanced settings
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const { type } = notification.request.content.data || {};
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: type === "overdue" ? "high" : "normal"
    };
  },
});

// Set up notification categories with actions
const setupNotificationCategories = async () => {
  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.PAYMENT_DUE, [
    {
      identifier: 'mark_paid',
      buttonTitle: 'Mark as Paid',
      options: { opensAppToForeground: false }
    },
    {
      identifier: 'view_details',
      buttonTitle: 'View Details',
      options: { opensAppToForeground: true }
    }
  ]);

  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.PAYMENT_OVERDUE, [
    {
      identifier: 'urgent_pay',
      buttonTitle: 'Pay Now',
      options: { opensAppToForeground: true }
    },
    {
      identifier: 'snooze',
      buttonTitle: 'Remind Later',
      options: { opensAppToForeground: false }
    }
  ]);
};

// Enhanced notification scheduling
const scheduleNotification = async (reminder, customTime = null) => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted" || !reminder.notification_enabled) {
      return null;
    }

    // Cancel existing notification if updating
    if (reminder.notification_id) {
      await Notifications.cancelScheduledNotificationAsync(reminder.notification_id);
    }

    const triggerDate = new Date(reminder.next_due_date);
    const reminderTime = customTime || reminder.reminder_time || "09:00";
    const [hours, minutes] = reminderTime.split(":").map(Number);
    triggerDate.setHours(hours, minutes, 0, 0);

    // Don't schedule if date is in the past
    if (triggerDate <= new Date()) {
      return null;
    }

    const isOverdue = new Date(reminder.next_due_date) < new Date();
    const categoryIdentifier = isOverdue ? NOTIFICATION_CATEGORIES.PAYMENT_OVERDUE : NOTIFICATION_CATEGORIES.PAYMENT_DUE;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: isOverdue ? "⚠️ Overdue Payment" : "💰 Payment Reminder",
        body: `${reminder.title} ${isOverdue ? 'is overdue' : 'is due today'}!${
          reminder.amount ? ` Amount: ₹${reminder.amount}` : ""
        }`,
        data: {
          reminderId: reminder.id,
          type: isOverdue ? "overdue" : "due_today",
          screen: "PaymentReminder",
          params: { reminderId: reminder.id }
        },
        categoryIdentifier,
        sound: 'default',
        badge: 1
      },
      trigger: triggerDate,
    });

    return notificationId;
  } catch (error) {
    console.error("Error scheduling notification:", error);
    return null;
  }
};

// Batch notification operations
const scheduleMultipleNotifications = async (reminders) => {
  const results = [];
  
  for (const reminder of reminders) {
    try {
      const notificationId = await scheduleNotification(reminder);
      results.push({ reminderId: reminder.id, notificationId, success: true });
    } catch (error) {
      results.push({ reminderId: reminder.id, error: error.message, success: false });
    }
  }
  
  return results;
};

// Clean up old notifications
const cleanupNotifications = async (userReminders = []) => {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const activeReminderIds = userReminders.map(r => r.id.toString());
    
    for (const notification of scheduledNotifications) {
      const { reminderId } = notification.content.data || {};
      if (reminderId && !activeReminderIds.includes(reminderId.toString())) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch (error) {
    console.error("Error cleaning up notifications:", error);
  }
};

// Background task for checking overdue reminders
const BACKGROUND_FETCH_TASK = "background-fetch-reminders";

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log("Background task: Checking for overdue reminders");
    
    // Get current user session from storage
    const session = await getStoredSession();
    if (!session?.user?.id) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Fetch overdue reminders
    const today = new Date().toISOString().split("T")[0];
    const { data: overdueReminders, error } = await supabase
      .from("payment_reminders")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .eq("notification_enabled", true)
      .lt("next_due_date", today);

    if (error || !overdueReminders?.length) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Send overdue notifications
    for (const reminder of overdueReminders) {
      await sendOverdueNotification(reminder);
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("Background task error:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Helper function to get stored session
const getStoredSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error("Error getting stored session:", error);
    return null;
  }
};

// Send overdue notification
const sendOverdueNotification = async (reminder) => {
  try {
    const daysPast = Math.floor(
      (new Date() - new Date(reminder.next_due_date)) / (1000 * 60 * 60 * 24)
    );

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⚠️ Overdue Payment Reminder",
        body: `${reminder.title} was due ${daysPast} day(s) ago. Amount: ₹${
          reminder.amount || "Not specified"
        }`,
        data: {
          reminderId: reminder.id,
          type: "overdue",
          screen: "PaymentReminder",
          params: { reminderId: reminder.id }
        },
        categoryIdentifier: NOTIFICATION_CATEGORIES.PAYMENT_OVERDUE,
        sound: 'default',
        badge: 1
      },
      trigger: null, // Send immediately
    });
  } catch (error) {
    console.error("Error sending overdue notification:", error);
  }
};

// Permission management
const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });
      return status;
    }
    
    return existingStatus;
  } catch (error) {
    console.error("Error requesting notification permissions:", error);
    return "denied";
  }
};

export {
  setupNotificationCategories,
  scheduleNotification,
  scheduleMultipleNotifications,
  cleanupNotifications,
  requestNotificationPermissions,
  BACKGROUND_FETCH_TASK,
  NOTIFICATION_CATEGORIES
};