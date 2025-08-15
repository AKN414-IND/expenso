import React, { useEffect } from "react";
import { LogBox } from "react-native";
import * as Notifications from "expo-notifications";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import AppNavigator from "./AppNavigator";
import { navigationRef } from "./navigation"; 

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { screen, params } =
          response.notification.request.content.data || {};
        if (screen && navigationRef.isReady()) {
          navigationRef.navigate(screen, params);
        }
      }
    );
    return () => subscription.remove();
  }, []);

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
