import * as Notifications from "expo-notifications";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { handleNotificationNavigation } from "./navigationService";

// Notification Categories
export const NOTIFICATION_CATEGORIES = {
  PAYMENT_DUE: {
    id: "payment_due",
    name: "Payment Due",
    description: "Payment due today",
    priority: "high",
    sound: "default",
    badge: true,
  },
  OVERDUE: {
    id: "overdue",
    name: "Overdue Payment",
    description: "Payment is overdue",
    priority: "max",
    sound: "default",
    badge: true,
  },
  REMINDER: {
    id: "reminder",
    name: "Payment Reminder",
    description: "Upcoming payment reminder",
    priority: "default",
    sound: "default",
    badge: true,
  },
};

// Background task constant
export const BACKGROUND_FETCH_TASK = "background-fetch-reminders";

class NotificationService {
  constructor() {
    this.permissionStatus = null;
    this.isInitialized = false;
    this.notificationResponseListener = null;
    this.notificationReceivedListener = null;
  }

  /**
   * Initialize the notification service
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Set notification handler
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const category = notification.request.content.categoryIdentifier;
          const categoryConfig = Object.values(NOTIFICATION_CATEGORIES).find(
            (cat) => cat.id === category
          );

          return {
            shouldShowAlert: true,
            shouldPlaySound: categoryConfig?.sound !== "none",
            shouldSetBadge: categoryConfig?.badge !== false,
          };
        },
      });

      // Set up notification categories
      await this.setupNotificationCategories();

      // Check and request permissions
      await this.checkPermissions();

      // Set up response handlers
      this.setupNotificationHandlers();

      // Register background task
      await this.registerBackgroundTask();

      this.isInitialized = true;
      console.log("NotificationService initialized successfully");
    } catch (error) {
      console.error("Failed to initialize NotificationService:", error);
      throw error;
    }
  }

  /**
   * Setup notification categories for different types of notifications
   */
  async setupNotificationCategories() {
    try {
      const categories = Object.values(NOTIFICATION_CATEGORIES).map((cat) => ({
        identifier: cat.id,
        actions: [
          {
            identifier: "view",
            buttonTitle: "View",
            options: {
              opensAppToForeground: true,
            },
          },
          {
            identifier: "dismiss",
            buttonTitle: "Dismiss",
            options: {
              opensAppToForeground: false,
            },
          },
        ],
        options: {
          categorySummaryFormat: cat.description,
        },
      }));

      await Notifications.setNotificationCategoryAsync(
        NOTIFICATION_CATEGORIES.PAYMENT_DUE.id,
        categories.find((c) => c.identifier === NOTIFICATION_CATEGORIES.PAYMENT_DUE.id)
      );
      
      await Notifications.setNotificationCategoryAsync(
        NOTIFICATION_CATEGORIES.OVERDUE.id,
        categories.find((c) => c.identifier === NOTIFICATION_CATEGORIES.OVERDUE.id)
      );
      
      await Notifications.setNotificationCategoryAsync(
        NOTIFICATION_CATEGORIES.REMINDER.id,
        categories.find((c) => c.identifier === NOTIFICATION_CATEGORIES.REMINDER.id)
      );

      console.log("Notification categories set up successfully");
    } catch (error) {
      console.error("Failed to setup notification categories:", error);
    }
  }

  /**
   * Check and request notification permissions
   */
  async checkPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      this.permissionStatus = finalStatus;
      return finalStatus;
    } catch (error) {
      console.error("Error checking notification permissions:", error);
      this.permissionStatus = "denied";
      return "denied";
    }
  }

  /**
   * Get current permission status
   */
  getPermissionStatus() {
    return this.permissionStatus;
  }

  /**
   * Request permissions with user-friendly handling
   */
  async requestPermissions() {
    try {
      const status = await this.checkPermissions();
      return {
        granted: status === "granted",
        status,
        canAskAgain: status !== "denied",
      };
    } catch (error) {
      console.error("Error requesting permissions:", error);
      return {
        granted: false,
        status: "error",
        canAskAgain: false,
        error: error.message,
      };
    }
  }

  /**
   * Setup notification response handlers
   */
  setupNotificationHandlers() {
    // Handle notification received while app is foregrounded
    this.notificationReceivedListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notification received:", notification);
        // Add any additional handling for received notifications
      }
    );

    // Handle notification response (user tapped notification)
    this.notificationResponseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        this.handleNotificationResponse(response);
      }
    );
  }

  /**
   * Handle notification tap/response
   */
  handleNotificationResponse(response) {
    try {
      const { notification, actionIdentifier } = response;
      const { data } = notification.request.content;

      console.log("Notification response:", { actionIdentifier, data });

      if (actionIdentifier === "dismiss") {
        return; // User dismissed the notification
      }

      // Handle deep linking based on notification data
      this.handleDeepLink(data);
    } catch (error) {
      console.error("Error handling notification response:", error);
    }
  }

  /**
   * Handle deep linking from notifications
   */
  handleDeepLink(data) {
    try {
      const { type, reminderId, screen } = data;

      // Use navigation service for immediate navigation
      const navigationData = {
        screen: screen || "PaymentReminders",
        params: { reminderId, highlightId: reminderId },
      };

      handleNotificationNavigation(navigationData);

      // Also store in AsyncStorage as fallback
      AsyncStorage.setItem(
        "pendingNavigation",
        JSON.stringify({
          ...navigationData,
          timestamp: Date.now(),
        })
      );

      console.log("Deep link handled:", data);
    } catch (error) {
      console.error("Error handling deep link:", error);
    }
  }

  /**
   * Get pending navigation from deep link
   */
  async getPendingNavigation() {
    try {
      const pendingNav = await AsyncStorage.getItem("pendingNavigation");
      if (pendingNav) {
        const navData = JSON.parse(pendingNav);
        // Clear the pending navigation
        await AsyncStorage.removeItem("pendingNavigation");
        
        // Only return if not too old (max 5 minutes)
        if (Date.now() - navData.timestamp < 5 * 60 * 1000) {
          return navData;
        }
      }
      return null;
    } catch (error) {
      console.error("Error getting pending navigation:", error);
      return null;
    }
  }

  /**
   * Schedule a notification for a payment reminder
   */
  async scheduleNotification(reminder, category = NOTIFICATION_CATEGORIES.PAYMENT_DUE) {
    try {
      if (this.permissionStatus !== "granted" || !reminder.notification_enabled) {
        return null;
      }

      // Cancel existing notification if updating
      if (reminder.notification_id) {
        await this.cancelNotification(reminder.notification_id);
      }

      const triggerDate = new Date(reminder.next_due_date);
      const [hours, minutes] = (reminder.reminder_time || "09:00").split(":");
      triggerDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Don't schedule if date is in the past
      if (triggerDate <= new Date()) {
        console.log("Skipping notification - trigger date is in the past");
        return null;
      }

      const notificationContent = {
        title: this.getNotificationTitle(category, reminder),
        body: this.getNotificationBody(category, reminder),
        data: {
          reminderId: reminder.id,
          type: category.id,
          screen: "PaymentReminders",
        },
        categoryIdentifier: category.id,
        sound: category.sound,
        badge: 1,
      };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: triggerDate,
      });

      console.log(`Notification scheduled with ID: ${notificationId} for ${triggerDate}`);
      return notificationId;
    } catch (error) {
      console.error("Error scheduling notification:", error);
      return null;
    }
  }

  /**
   * Schedule batch notifications
   */
  async scheduleBatchNotifications(reminders) {
    const results = [];
    const batchSize = 5; // Process in batches to avoid overwhelming the system

    for (let i = 0; i < reminders.length; i += batchSize) {
      const batch = reminders.slice(i, i + batchSize);
      const batchPromises = batch.map((reminder) => this.scheduleNotification(reminder));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches
        if (i + batchSize < reminders.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error processing notification batch ${i / batchSize + 1}:`, error);
      }
    }

    const successful = results.filter((r) => r.status === "fulfilled" && r.value).length;
    const failed = results.length - successful;

    console.log(`Batch notification scheduling completed: ${successful} successful, ${failed} failed`);
    return { successful, failed, results };
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`Notification ${notificationId} cancelled`);
    } catch (error) {
      console.error(`Error cancelling notification ${notificationId}:`, error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log("All notifications cancelled");
    } catch (error) {
      console.error("Error cancelling all notifications:", error);
    }
  }

  /**
   * Send immediate notification for overdue reminders
   */
  async sendOverdueNotification(reminder) {
    try {
      if (this.permissionStatus !== "granted") {
        return null;
      }

      const daysPast = Math.floor(
        (new Date() - new Date(reminder.next_due_date)) / (1000 * 60 * 60 * 24)
      );

      const notificationContent = {
        title: "⚠️ Overdue Payment Reminder",
        body: `${reminder.title} was due ${daysPast} day(s) ago. Amount: ₹${
          reminder.amount || "Not specified"
        }`,
        data: {
          reminderId: reminder.id,
          type: NOTIFICATION_CATEGORIES.OVERDUE.id,
          screen: "PaymentReminders",
        },
        categoryIdentifier: NOTIFICATION_CATEGORIES.OVERDUE.id,
        sound: "default",
        badge: 1,
      };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Send immediately
      });

      console.log(`Overdue notification sent with ID: ${notificationId}`);
      return notificationId;
    } catch (error) {
      console.error("Error sending overdue notification:", error);
      return null;
    }
  }

  /**
   * Clean up old notifications
   */
  async cleanupNotifications() {
    try {
      // Get all scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      // Cancel notifications that are more than 30 days old or invalid
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      let cleanedCount = 0;
      for (const notification of scheduledNotifications) {
        const triggerDate = notification.trigger?.date || notification.trigger?.dateComponents;
        if (triggerDate && new Date(triggerDate) < cutoffDate) {
          await this.cancelNotification(notification.identifier);
          cleanedCount++;
        }
      }

      console.log(`Cleaned up ${cleanedCount} old notifications`);
      return cleanedCount;
    } catch (error) {
      console.error("Error cleaning up notifications:", error);
      return 0;
    }
  }

  /**
   * Register background task for checking overdue reminders
   */
  async registerBackgroundTask() {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
          minimumInterval: 60 * 60 * 24, // 24 hours
          stopOnTerminate: false,
          startOnBoot: true,
        });
        console.log("Background task registered successfully");
      } else {
        console.log("Background task already registered");
      }
    } catch (error) {
      console.error("Error registering background task:", error);
    }
  }

  /**
   * Get notification title based on category and reminder
   */
  getNotificationTitle(category, reminder) {
    switch (category.id) {
      case NOTIFICATION_CATEGORIES.OVERDUE.id:
        return "⚠️ Overdue Payment Reminder";
      case NOTIFICATION_CATEGORIES.REMINDER.id:
        return "🔔 Upcoming Payment Reminder";
      case NOTIFICATION_CATEGORIES.PAYMENT_DUE.id:
      default:
        return "💰 Payment Due Today";
    }
  }

  /**
   * Get notification body based on category and reminder
   */
  getNotificationBody(category, reminder) {
    const amount = reminder.amount ? ` Amount: ₹${reminder.amount}` : "";
    
    switch (category.id) {
      case NOTIFICATION_CATEGORIES.OVERDUE.id:
        const daysPast = Math.floor(
          (new Date() - new Date(reminder.next_due_date)) / (1000 * 60 * 60 * 24)
        );
        return `${reminder.title} was due ${daysPast} day(s) ago.${amount}`;
      case NOTIFICATION_CATEGORIES.REMINDER.id:
        return `${reminder.title} is due soon.${amount}`;
      case NOTIFICATION_CATEGORIES.PAYMENT_DUE.id:
      default:
        return `${reminder.title} is due today!${amount}`;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.notificationResponseListener) {
      this.notificationResponseListener.remove();
      this.notificationResponseListener = null;
    }
    if (this.notificationReceivedListener) {
      this.notificationReceivedListener.remove();
      this.notificationReceivedListener = null;
    }
    this.isInitialized = false;
  }
}

// Create and export singleton instance
export const notificationService = new NotificationService();

// Export the class for testing
export { NotificationService };