import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { ArrowLeft, Lock } from "lucide-react-native";
import ComingSoon from "../components/ComingSoon";

export default function SecurityScreen({ navigation }) {
  const { theme } = useTheme();

  return (
    <ComingSoon
        navigation={navigation}
        title="Security"
        message="Manage your password, two-factor authentication, and security settings here. (Coming soon!)"
        icon={<Lock color={theme.colors.primary} size={60} />}
    />
  );
}