import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "./context/AuthContext";
import { navigationRef } from "./navigation";

// Core Screens
import OnboardingScreen from "./screens/OnboardingScreen";
import AuthScreen from "./screens/AuthScreen";
import DashboardScreen from "./screens/DashboardScreen";
import AIExpenseScreen from "./screens/AIExpenseScreen";
import AllExpenses from "./screens/TransactionsScreen.js";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import BudgetScreen from "./screens/BudgetScreen";
import ProfileScreen from "./screens/ProfileScreen";
import PaymentReminderScreen from "./screens/PaymentReminderScreen";
import SmartInsightsScreen from "./screens/SmartInsightsScreen";
import InvestmentsScreen from "./screens/InvestmentsScreen.js";
import SettingsScreen from "./screens/SettingsScreen";
import AppearanceScreen from "./screens/AppearanceScreen";
import DataManagementScreen from "./screens/DataManagementScreen";
import SecurityPrivacyScreen from "./screens/SecurityPrivacyScreen";



const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { session, loading } = useAuth();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const value = await AsyncStorage.getItem("hasCompletedOnboarding");
        setHasCompletedOnboarding(value === "true");
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        setHasCompletedOnboarding(false); 
      }
    };
    checkOnboardingStatus();
  }, []);

  const handleOnboardingFinish = () => {
    setHasCompletedOnboarding(true);
  };
  
  // Display a loading indicator while checking auth or onboarding status
  if (loading || hasCompletedOnboarding === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!hasCompletedOnboarding ? (
          // Onboarding Flow
          <Stack.Screen name="Onboarding">
            {(props) => <OnboardingScreen {...props} onFinish={handleOnboardingFinish} />}
          </Stack.Screen>
        ) : session ? (
          <>
            
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="AddExpense" component={AIExpenseScreen} />
            <Stack.Screen name="AllExpenses" component={AllExpenses} />
            <Stack.Screen name="BudgetScreen" component={BudgetScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="SmartInsights" component={SmartInsightsScreen} />
            <Stack.Screen name="InvestmentsScreen" component={InvestmentsScreen} />
            <Stack.Screen name="PaymentReminder" component={PaymentReminderScreen} />
            
            
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Appearance" component={AppearanceScreen} />
            <Stack.Screen name="DataManagement" component={DataManagementScreen} />
            <Stack.Screen name="SecurityPrivacy" component={SecurityPrivacyScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}