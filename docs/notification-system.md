# Notification System Documentation

This document describes the enhanced notification system implemented for the Expenso app.

## Overview

The notification system has been completely refactored to provide better reliability, user experience, and maintainability. The new system includes:

- Centralized notification service
- Enhanced background task implementation
- Deep linking support
- Notification categories
- Batch operations
- Automatic cleanup

## Architecture

### Core Components

1. **NotificationService** (`lib/notificationService.js`)
   - Centralized notification management
   - Permission handling
   - Notification scheduling and cancellation
   - Response handling and deep linking

2. **Background Tasks** (`lib/backgroundTasks.js`)
   - Background task definition and registration
   - Overdue reminder checking
   - Automatic cleanup

3. **Navigation Service** (`lib/navigationService.js`)
   - Global navigation reference
   - Deep linking from notifications

## Features

### Notification Categories

The system supports three notification categories:

- **PAYMENT_DUE**: Regular payment due notifications
- **OVERDUE**: Urgent overdue payment notifications
- **REMINDER**: General reminder notifications

Each category has its own configuration for priority, sound, and badge settings.

### Permission Management

- Graceful permission handling with user-friendly prompts
- Fallback behavior when permissions are denied
- Automatic permission status checking

### Deep Linking

- Notifications navigate users to specific screens
- Support for highlighting specific reminders
- Fallback storage for navigation when app is not ready

### Batch Operations

- Efficient scheduling of multiple notifications
- Rate limiting to prevent system overload
- Comprehensive error handling

### Automatic Cleanup

- Periodic cleanup of old notifications
- Configurable cleanup intervals
- Database tracking of cleanup operations

## Usage

### Initialization

```javascript
import { notificationService } from '../lib/notificationService';

// Initialize the service (call once in app lifecycle)
await notificationService.initialize();
```

### Scheduling Notifications

```javascript
// Schedule a payment due notification
const notificationId = await notificationService.scheduleNotification(
  reminder,
  NOTIFICATION_CATEGORIES.PAYMENT_DUE
);

// Send immediate overdue notification
await notificationService.sendOverdueNotification(reminder);

// Batch schedule multiple notifications
const result = await notificationService.scheduleBatchNotifications(reminders);
```

### Permission Handling

```javascript
// Check current permission status
const status = notificationService.getPermissionStatus();

// Request permissions with user-friendly handling
const result = await notificationService.requestPermissions();
if (result.granted) {
  // Notifications enabled
} else {
  // Handle denied permissions
}
```

### Background Tasks

```javascript
import { registerBackgroundTask } from '../lib/backgroundTasks';

// Register background task for overdue checking
await registerBackgroundTask();
```

## Database Schema

### app_settings Table

```sql
CREATE TABLE app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### payment_reminders Updates

```sql
ALTER TABLE payment_reminders 
ADD COLUMN last_notification_sent TIMESTAMPTZ DEFAULT NULL;
```

## Configuration

### Notification Categories

Each category can be configured with:
- `id`: Unique identifier
- `name`: Display name
- `description`: Category description
- `priority`: Notification priority (default, high, max)
- `sound`: Sound configuration
- `badge`: Badge configuration

### Background Task Settings

- **Minimum Interval**: 24 hours
- **Stop on Terminate**: false
- **Start on Boot**: true

### Cleanup Settings

- **Cleanup Interval**: 24 hours
- **Retention Period**: 30 days
- **Batch Size**: 5 notifications per batch

## Error Handling

The system includes comprehensive error handling:

- Permission denied scenarios
- Network failures
- Database errors
- Invalid notification data
- Background task failures

All errors are logged with appropriate context for debugging.

## Testing

### Manual Testing

Use the test script to validate functionality:

```javascript
import { runNotificationTests } from './tests/notificationTest';

// Run all tests
const results = await runNotificationTests();
console.log(results);
```

### Test Coverage

The test script covers:
- Service initialization
- Permission handling
- Notification scheduling
- Overdue notifications
- Batch operations
- Cleanup functionality

## Migration Guide

### From Old System

1. **Remove old notification code** from PaymentReminderScreen
2. **Import new service**: `import { notificationService } from '../lib/notificationService'`
3. **Initialize service**: Call `notificationService.initialize()` on app start
4. **Update scheduling calls**: Replace direct Expo Notifications calls with service methods
5. **Run database migrations**: Execute the SQL scripts in `database/migrations/`

### Breaking Changes

- Screen name changed from "PaymentReminder" to "PaymentReminders"
- Direct Expo Notifications API calls should be replaced with service calls
- Background task definition moved to separate file

## Best Practices

1. **Always initialize** the notification service before use
2. **Handle permissions gracefully** with user-friendly messages
3. **Use batch operations** for multiple notifications
4. **Check permission status** before scheduling notifications
5. **Clean up resources** when components unmount
6. **Test thoroughly** on different devices and permission states

## Troubleshooting

### Common Issues

1. **Notifications not showing**
   - Check permission status
   - Verify notification is not in the past
   - Check device notification settings

2. **Background task not running**
   - Verify task is registered
   - Check background refresh settings
   - Review device power management settings

3. **Deep linking not working**
   - Ensure navigation service is properly initialized
   - Check navigation ref is connected
   - Verify screen names match

### Debug Tools

- Enable console logging for detailed information
- Use notification test script for validation
- Check Expo dev tools for notification logs

## Future Enhancements

Potential improvements for the notification system:

1. **Rich notifications** with images and actions
2. **Quiet hours** functionality
3. **User preference controls**
4. **Notification analytics**
5. **Smart retry logic**
6. **Localization support**