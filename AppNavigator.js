import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import * as SecureStore from "expo-secure-store";

import { useAuth } from "./context/AuthContext";
import { navigationRef } from "./App";

// Import all your screens
import OnboardingScreen from "./screens/OnboardingScreen";
import AuthScreen from "./screens/AuthScreen";
import DashboardScreen from "./screens/DashboardScreen";
import AIExpenseScreen from "./screens/AIExpenseScreen";
import AllExpenses from "./screens/AllExpenses";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import BudgetScreen from "./screens/BudgetScreen";
import ProfileScreen from "./screens/ProfileScreen";
import AppSettingsScreen from "./screens/AppSettingsScreen";
import PrivacySecurityScreen from "./screens/PrivacySecurityScreen";
import PaymentReminderScreen from "./screens/PaymentReminderScreen";
import SmartInsightsScreen from "./screens/SmartInsightsScreen";
import IncomeManagement from "./screens/IncomeManagement.js";
import InvestmentsScreen from "./screens/InvestmentsScreen.js";
import NotificationsScreen from "./screens/NotificationsScreen";
import SecurityScreen from "./screens/SecurityScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { session, loading } = useAuth();
  const [onboardingComplete, setOnboardingComplete] = useState(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const value = await SecureStore.getItemAsync("onboardingComplete");
        setOnboardingComplete(value === "true");
      } catch (error) {
        console.log("Error checking onboarding status:", error);
        setOnboardingComplete(false);
      }
    };
    checkStatus();
  }, []);

  const handleOnboardingFinish = async () => {
    try {
      await SecureStore.setItemAsync("onboardingComplete", "true");
      setOnboardingComplete(true);
    } catch (error) {
      console.log("Error saving onboarding status:", error);
    }
  };

  if (loading || onboardingComplete === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!onboardingComplete ? (
          <Stack.Screen name="Onboarding">
            {(props) => (
              <OnboardingScreen {...props} onFinish={handleOnboardingFinish} />
            )}
          </Stack.Screen>
        ) : session ? (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="AddExpense" component={AIExpenseScreen} />
            <Stack.Screen name="AllExpenses" component={AllExpenses} />
            <Stack.Screen name="BudgetScreen" component={BudgetScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="AppSettings" component={AppSettingsScreen} />
            <Stack.Screen
              name="SmartInsights"
              component={SmartInsightsScreen}
            />
            <Stack.Screen
              name="IncomeManagement"
              component={IncomeManagement}
            />
            <Stack.Screen
              name="InvestmentsScreen"
              component={InvestmentsScreen}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
            />
            <Stack.Screen name="Security" component={SecurityScreen} />
            <Stack.Screen
              name="PaymentReminder"
              component={PaymentReminderScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PrivacySecurity"
              component={PrivacySecurityScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
