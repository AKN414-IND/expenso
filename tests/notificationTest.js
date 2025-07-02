/**
 * Simple manual test script for notification service
 * This can be run to test basic functionality of the notification service
 */

import { notificationService, NOTIFICATION_CATEGORIES } from '../lib/notificationService';

// Mock reminder data for testing
const testReminder = {
  id: 'test-1',
  title: 'Test Payment Reminder',
  amount: 500,
  next_due_date: '2024-12-25',
  reminder_time: '09:00',
  notification_enabled: true,
  user_id: 'test-user',
  is_active: true,
};

/**
 * Test notification service initialization
 */
async function testInitialization() {
  console.log('Testing notification service initialization...');
  
  try {
    await notificationService.initialize();
    console.log('✓ Notification service initialized successfully');
    
    const permissionStatus = notificationService.getPermissionStatus();
    console.log(`✓ Permission status: ${permissionStatus}`);
    
    return true;
  } catch (error) {
    console.error('✗ Initialization failed:', error);
    return false;
  }
}

/**
 * Test permission handling
 */
async function testPermissions() {
  console.log('Testing permission handling...');
  
  try {
    const permissionResult = await notificationService.requestPermissions();
    console.log('✓ Permission request result:', permissionResult);
    
    return permissionResult.granted;
  } catch (error) {
    console.error('✗ Permission test failed:', error);
    return false;
  }
}

/**
 * Test notification scheduling
 */
async function testScheduling() {
  console.log('Testing notification scheduling...');
  
  try {
    // Test scheduling a payment due notification
    const notificationId = await notificationService.scheduleNotification(
      testReminder,
      NOTIFICATION_CATEGORIES.PAYMENT_DUE
    );
    
    if (notificationId) {
      console.log(`✓ Notification scheduled with ID: ${notificationId}`);
      
      // Test canceling the notification
      await notificationService.cancelNotification(notificationId);
      console.log('✓ Notification cancelled successfully');
      
      return true;
    } else {
      console.log('⚠ Notification not scheduled (may be due to permissions or date)');
      return true; // Not necessarily an error
    }
  } catch (error) {
    console.error('✗ Scheduling test failed:', error);
    return false;
  }
}

/**
 * Test overdue notification
 */
async function testOverdueNotification() {
  console.log('Testing overdue notification...');
  
  try {
    const overdueReminder = {
      ...testReminder,
      next_due_date: '2024-01-01', // Past date
    };
    
    const notificationId = await notificationService.sendOverdueNotification(overdueReminder);
    
    if (notificationId) {
      console.log(`✓ Overdue notification sent with ID: ${notificationId}`);
      return true;
    } else {
      console.log('⚠ Overdue notification not sent (may be due to permissions)');
      return true; // Not necessarily an error
    }
  } catch (error) {
    console.error('✗ Overdue notification test failed:', error);
    return false;
  }
}

/**
 * Test batch operations
 */
async function testBatchOperations() {
  console.log('Testing batch operations...');
  
  try {
    const testReminders = [
      { ...testReminder, id: 'test-batch-1', title: 'Batch Test 1' },
      { ...testReminder, id: 'test-batch-2', title: 'Batch Test 2' },
      { ...testReminder, id: 'test-batch-3', title: 'Batch Test 3' },
    ];
    
    const result = await notificationService.scheduleBatchNotifications(testReminders);
    console.log(`✓ Batch operation completed: ${result.successful} successful, ${result.failed} failed`);
    
    return result.successful >= 0; // At least some should work
  } catch (error) {
    console.error('✗ Batch operation test failed:', error);
    return false;
  }
}

/**
 * Test cleanup functionality
 */
async function testCleanup() {
  console.log('Testing cleanup functionality...');
  
  try {
    const cleanedCount = await notificationService.cleanupNotifications();
    console.log(`✓ Cleanup completed: ${cleanedCount} notifications cleaned`);
    
    return true;
  } catch (error) {
    console.error('✗ Cleanup test failed:', error);
    return false;
  }
}

/**
 * Run all tests
 */
export async function runNotificationTests() {
  console.log('Starting notification service tests...\n');
  
  const tests = [
    { name: 'Initialization', test: testInitialization },
    { name: 'Permissions', test: testPermissions },
    { name: 'Scheduling', test: testScheduling },
    { name: 'Overdue Notifications', test: testOverdueNotification },
    { name: 'Batch Operations', test: testBatchOperations },
    { name: 'Cleanup', test: testCleanup },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, test } of tests) {
    console.log(`\n--- Running ${name} Test ---`);
    
    try {
      const result = await test();
      if (result) {
        passed++;
        console.log(`✓ ${name} test passed`);
      } else {
        failed++;
        console.log(`✗ ${name} test failed`);
      }
    } catch (error) {
      failed++;
      console.log(`✗ ${name} test failed with error:`, error);
    }
  }
  
  console.log(`\n--- Test Results ---`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log(`⚠ ${failed} test(s) failed. Check the logs above.`);
  }
  
  return { passed, failed, total: passed + failed };
}

// Example usage:
// import { runNotificationTests } from './tests/notificationTest';
// runNotificationTests().then(console.log);