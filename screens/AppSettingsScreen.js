import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,  
} from "react-native";

import { ArrowLeft, Settings } from "lucide-react-native";
import * as Notifications from "expo-notifications";


export default function AppSettingsScreen({ navigation }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  useEffect(() => {
    const checkPermissions = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationsEnabled(status === "granted");
    };
  
    checkPermissions();
  }, []);
  const handleToggleNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === "granted";
    setNotificationsEnabled(granted);
  
    if (!granted) {
      Alert.alert(
        "Permission Denied",
        "You have disabled notifications. You won’t get payment reminders unless you enable them from system settings."
      );
    }
  };
    
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color="#1e293b" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.centerContent}>
        <Settings color="#06b6d4" size={48} style={{ marginBottom: 20 }} />
        <View
  style={{
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: 1,
  }}
>
  <Text style={{ fontSize: 16, fontWeight: "500" }}>Payment Reminders</Text>
  <Switch
    value={notificationsEnabled}
    onValueChange={handleToggleNotifications}
    trackColor={{ false: "#ccc", true: "#06b6d4" }}
    thumbColor={notificationsEnabled ? "#fff" : "#f4f4f4"}
  />
</View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 18,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.1)",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
    textAlign: "center",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  comingSoonText: {
    fontSize: 26,
    color: "#06b6d4",
    fontWeight: "800",
    marginBottom: 12,
  },
  desc: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 6,
  },
});
