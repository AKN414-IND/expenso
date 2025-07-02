import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import { supabase } from "./supabase";
import { notificationService, BACKGROUND_FETCH_TASK } from "./notificationService";

/**
 * Background task definition for checking overdue reminders
 */
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log("Background task: Checking for overdue reminders");
    
    // Check if notification service is initialized
    if (!notificationService.isInitialized) {
      await notificationService.initialize();
    }

    // Only proceed if we have notification permissions
    if (notificationService.getPermissionStatus() !== "granted") {
      console.log("Background task: No notification permissions, skipping");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Get all active reminders
    const { data: reminders, error } = await supabase
      .from("payment_reminders")
      .select("*")
      .eq("is_active", true)
      .eq("notification_enabled", true);

    if (error) {
      console.error("Background task: Error fetching reminders:", error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    if (!reminders || reminders.length === 0) {
      console.log("Background task: No active reminders found");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const today = new Date().toISOString().split("T")[0];
    let notificationsSent = 0;
    let cleanedCount = 0;

    // Check for overdue reminders
    const overdueReminders = reminders.filter(
      (reminder) =>
        reminder.next_due_date < today
    );

    console.log(`Background task: Found ${overdueReminders.length} overdue reminders`);

    // Send overdue notifications
    for (const reminder of overdueReminders) {
      try {
        await notificationService.sendOverdueNotification(reminder);
        notificationsSent++;
        
        // Update the reminder's last notification sent timestamp
        await supabase
          .from("payment_reminders")
          .update({ last_notification_sent: new Date().toISOString() })
          .eq("id", reminder.id);

      } catch (error) {
        console.error(`Background task: Error sending notification for reminder ${reminder.id}:`, error);
      }
    }

    // Clean up old notifications (run this occasionally)
    const lastCleanup = await getLastCleanupTime();
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    if (!lastCleanup || lastCleanup < oneDayAgo) {
      try {
        cleanedCount = await notificationService.cleanupNotifications();
        await setLastCleanupTime(Date.now());
        console.log(`Background task: Cleaned up ${cleanedCount} old notifications`);
      } catch (error) {
        console.error("Background task: Error during cleanup:", error);
      }
    }

    // Log summary
    console.log(`Background task completed: ${notificationsSent} notifications sent, ${cleanedCount} cleaned up`);

    // Return appropriate result
    if (notificationsSent > 0 || cleanedCount > 0) {
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

  } catch (error) {
    console.error("Background task error:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Get the last cleanup time from storage
 */
async function getLastCleanupTime() {
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "last_notification_cleanup")
      .single();
    
    return data?.value ? parseInt(data.value) : null;
  } catch (error) {
    console.error("Error getting last cleanup time:", error);
    return null;
  }
}

/**
 * Set the last cleanup time in storage
 */
async function setLastCleanupTime(timestamp) {
  try {
    await supabase
      .from("app_settings")
      .upsert({
        key: "last_notification_cleanup",
        value: timestamp.toString(),
        updated_at: new Date().toISOString(),
      });
  } catch (error) {
    console.error("Error setting last cleanup time:", error);
  }
}

/**
 * Register the background task
 */
export async function registerBackgroundTask() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    
    if (isRegistered) {
      console.log("Background task already registered");
      return true;
    }

    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 60 * 60 * 24, // 24 hours
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log("Background task registered successfully");
    return true;
  } catch (error) {
    console.error("Error registering background task:", error);
    return false;
  }
}

/**
 * Unregister the background task
 */
export async function unregisterBackgroundTask() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      console.log("Background task unregistered successfully");
    }
    
    return true;
  } catch (error) {
    console.error("Error unregistering background task:", error);
    return false;
  }
}

/**
 * Get background task status
 */
export async function getBackgroundTaskStatus() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    const status = await BackgroundFetch.getStatusAsync();
    
    return {
      isRegistered,
      status,
      statusText: getStatusText(status),
    };
  } catch (error) {
    console.error("Error getting background task status:", error);
    return {
      isRegistered: false,
      status: BackgroundFetch.BackgroundFetchStatus.Denied,
      statusText: "Error",
      error: error.message,
    };
  }
}

/**
 * Get human-readable status text
 */
function getStatusText(status) {
  switch (status) {
    case BackgroundFetch.BackgroundFetchStatus.Restricted:
      return "Restricted";
    case BackgroundFetch.BackgroundFetchStatus.Denied:
      return "Denied";
    case BackgroundFetch.BackgroundFetchStatus.Available:
      return "Available";
    default:
      return "Unknown";
  }
}