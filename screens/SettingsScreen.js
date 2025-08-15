// screens/SettingsScreen.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Platform } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { ArrowLeft, ChevronRight, Palette, Bell, FileText, Lock, HelpCircle } from "lucide-react-native";

// Reusable component for each settings item
const SettingsItem = ({ icon, title, description, onPress, theme }) => (
  <TouchableOpacity style={styles(theme).itemContainer} onPress={onPress}>
    <View style={[styles(theme).iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
      {icon}
    </View>
    <View style={styles(theme).textContainer}>
      <Text style={styles(theme).itemTitle}>{title}</Text>
      <Text style={styles(theme).itemDescription}>{description}</Text>
    </View>
    <ChevronRight color={theme.colors.textTertiary} size={20} />
  </TouchableOpacity>
);

export default function SettingsScreen({ navigation }) {
  const { theme } = useTheme();
  const s = styles(theme);

  const openDeviceSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };
  
  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent}>
        <SettingsItem
          theme={theme}
          icon={<Palette color={theme.colors.primary} size={22} />}
          title="Appearance"
          description="Change the app's theme and look."
          onPress={() => navigation.navigate("Appearance")}
        />
        <SettingsItem
          theme={theme}
          icon={<Bell color={theme.colors.primary} size={22} />}
          title="Notifications"
          description="Manage your notification preferences."
          onPress={openDeviceSettings}
        />
        <SettingsItem
          theme={theme}
          icon={<FileText color={theme.colors.primary} size={22} />}
          title="Data Management"
          description="Export or delete your application data."
          onPress={() => navigation.navigate("DataManagement")}
        />
        <SettingsItem
          theme={theme}
          icon={<Lock color={theme.colors.primary} size={22} />}
          title="Security & Privacy"
          description="Password, 2FA, and privacy settings."
          onPress={() => navigation.navigate("SecurityPrivacy")}
        />
         <SettingsItem
          theme={theme}
          icon={<HelpCircle color={theme.colors.primary} size={22} />}
          title="Help & Support"
          description="Replay the app tour or get help."
          onPress={() => navigation.navigate("Dashboard", { showOnboarding: true })}
        />
      </ScrollView>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  backButton: {
    padding: 8,
  },
  scrollContent: {
    padding: 16,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  iconContainer: {
    padding: 12,
    borderRadius: 12,
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
});