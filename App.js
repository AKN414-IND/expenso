import React, { useEffect } from "react";
import { LogBox } from "react-native";
import * as SecureStore from "expo-secure-store";
import AppNavigator from "./AppNavigator";
import { AuthProvider } from "./context/AuthContext";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";
import * as Notifications from 'expo-notifications';


export default function App() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const { screen, params } = response.notification.request.content.data || {};
      
      if (screen && navigationRef.current) {
        navigationRef.current.navigate(screen, params);
      }
    });
  
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    // Optional: reset onboarding for testing (DEV ONLY)
    if (__DEV__) {
      SecureStore.deleteItemAsync("onboardingComplete");
    }

    // Suppress common warnings you’ve already handled (optional)
    LogBox.ignoreLogs([
      "Non-serializable values were found in the navigation state",
    ]);
  }, []);

  return (
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
  );
}
