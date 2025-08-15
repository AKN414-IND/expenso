// screens/SecurityPrivacyScreen.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { ArrowLeft, Lock } from "lucide-react-native";
import ComingSoon from "../components/ComingSoon"; // Use your existing ComingSoon component

export default function SecurityPrivacyScreen({ navigation }) {
  const { theme } = useTheme();

  return (
    <ComingSoon
        navigation={navigation}
        title="Security & Privacy"
        message="Manage your password, two-factor authentication, and data privacy settings here. This feature is coming soon!"
        icon={<Lock color={theme.colors.primary} size={60} />}
    />
  );
}