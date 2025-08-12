import React, { useEffect } from "react";
import { LogBox } from "react-native";
import { createNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import AppNavigator from "./AppNavigator";

// Create a ref for the navigation container to allow for global navigation
export const navigationRef = createNavigationContainerRef();

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  // Listener for handling user interaction with notifications
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const { screen, params } = response.notification.request.content.data || {};
      
      if (screen && navigationRef.isReady()) {
        navigationRef.navigate(screen, params);
      }
    });
  
    return () => subscription.remove();
  }, []);

  // Suppress specific logs in development for a cleaner console
  useEffect(() => {
    LogBox.ignoreLogs([
      "Non-serializable values were found in the navigation state",
    ]);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <AppNavigator />
        <Toast
          config={{
            success: (props) => (
              <BaseToast {...props} style={{ borderLeftColor: "#22c55e" }} />
            ),
            error: (props) => (
              <ErrorToast {...props} text1Style={{ fontWeight: "bold" }} />
            ),
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
