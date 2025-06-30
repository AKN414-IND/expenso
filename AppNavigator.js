import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import * as SecureStore from 'expo-secure-store';

import { useAuth } from "./context/AuthContext";
import OnboardingScreen from './screens/OnboardingScreen';
import AuthScreen from "./screens/AuthScreen";
import DashboardScreen from "./screens/DashboardScreen";
import AIExpenseScreen from './screens/AIExpenseScreen';
import AllExpenses from './screens/AllExpenses';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';

import Toast from 'react-native-toast-message';



const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { session, loading } = useAuth();
  const [onboardingComplete, setOnboardingComplete] = useState(null);

  // Check onboarding status once on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const value = await SecureStore.getItemAsync('onboardingComplete');
        setOnboardingComplete(value === 'true');
      } catch (error) {
        console.log('Error checking onboarding status:', error);
        setOnboardingComplete(false);
      }
    };
    checkStatus();
  }, []);

  // Mark onboarding as complete
  const handleOnboardingFinish = async () => {
    try {
      await SecureStore.setItemAsync('onboardingComplete', 'true');
      setOnboardingComplete(true);
    } catch (error) {
      console.log('Error saving onboarding status:', error);
    }
  };

  // Show loader while checking auth and onboarding status
  if (loading || onboardingComplete === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    
    <NavigationContainer>
      <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!onboardingComplete ? (
          <Stack.Screen name="Onboarding">
            {(props) => (
              <OnboardingScreen
                {...props}
                onFinish={handleOnboardingFinish}
              />
            )}
          </Stack.Screen>
        ) : session ? (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            
            <Stack.Screen name="AddExpense" component={AIExpenseScreen} />
            <Stack.Screen name="AllExpenses" component={AllExpenses} />
          </>
        ) : (
          <>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
      <Toast />
      </>
    </NavigationContainer>
    
    
  );
  
}
