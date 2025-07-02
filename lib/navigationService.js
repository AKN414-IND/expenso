import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/**
 * Navigate to a screen from anywhere in the app
 */
export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

/**
 * Go back in navigation
 */
export function goBack() {
  if (navigationRef.isReady()) {
    navigationRef.goBack();
  }
}

/**
 * Reset navigation state
 */
export function reset(state) {
  if (navigationRef.isReady()) {
    navigationRef.reset(state);
  }
}

/**
 * Get current route name
 */
export function getCurrentRoute() {
  if (navigationRef.isReady()) {
    return navigationRef.getCurrentRoute();
  }
  return null;
}

/**
 * Handle deep linking from notifications
 */
export function handleNotificationNavigation(notificationData) {
  const { screen, params } = notificationData;
  
  if (navigationRef.isReady()) {
    switch (screen) {
      case 'PaymentReminders':
        navigate('PaymentReminders', params);
        break;
      case 'Dashboard':
        navigate('Dashboard', params);
        break;
      default:
        navigate('Dashboard', params);
    }
  } else {
    // If navigation is not ready, store the navigation intent
    console.log('Navigation not ready, storing intent:', notificationData);
  }
}