import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { ArrowLeft, Lock } from "lucide-react-native";
import ComingSoon from "../components/ComingSoon"; // Assuming ComingSoon is in the components folder

export default function PrivacySecurityScreen({ navigation }) {
  const { theme } = useTheme();

  return (
    <ComingSoon
        navigation={navigation}
        title="Privacy & Security"
        message="Your privacy and data security settings will be available here soon."
        icon={<Lock color={theme.colors.primary} size={60} />}
    />
  );
}