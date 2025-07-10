import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  User,
  Mail,
  Calendar,
  Edit3,
  Save,
  X,
  Camera,
  Settings,
  Shield,
  HelpCircle,
  LogOut,
  ArrowLeft,
} from "lucide-react-native";
import { Linking } from "react-native";

const Avatar = ({ name, email, size = 80, style }) => {
  const getInitials = (name, email) => {
    if (name && name.trim()) {
      return name
        .trim()
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const getAvatarColor = (text) => {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FECA57",
      "#FF9FF3",
      "#54A0FF",
      "#5F27CD",
    ];
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const initials = getInitials(name, email);
  const backgroundColor = getAvatarColor(name || email || "User");

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          alignItems: "center",
          justifyContent: "center",
          elevation: 4,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: "white",
          fontSize: size * 0.4,
          fontWeight: "bold",
          letterSpacing: 1,
        }}
      >
        {initials}
      </Text>
    </View>
  );
};

export default function ProfileScreen({ navigation }) {
  const { session } = useAuth();
  const { theme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    username: "",
    monthly_income: "",
    total_investments: "",
  });

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
      } else if (data) {
        setProfile(data);
        setEditForm({
          full_name: data.full_name || "",
          username: data.username || "",
          monthly_income: data.monthly_income?.toString() || "",
          total_investments: data.total_investments?.toString() || "",
          monthly_budget: data.monthly_budget?.toString() || "",
        });
      } else {
        await createInitialProfile();
      }
    } catch (err) {
      console.error("Exception fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    if (!editForm.full_name.trim()) {
      Alert.alert("Error", "Please enter your full name");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name,
          username: editForm.username,
          monthly_income: editForm.monthly_income
            ? parseFloat(editForm.monthly_income)
            : null,
          total_investments: editForm.total_investments
            ? parseFloat(editForm.total_investments)
            : null,
          monthly_budget: editForm.monthly_budget
            ? parseFloat(editForm.monthly_budget)
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id)
        .select()
        .single();

      if (!error && data) {
        setProfile(data);
        setEditModalVisible(false);
        Alert.alert("Success", "Profile updated successfully!");
      } else {
        console.error("Error updating profile:", error);
        Alert.alert("Error", "Failed to update profile");
      }
    } catch (err) {
      console.error("Exception updating profile:", err);
      Alert.alert("Error", "Failed to update profile");
    }
  };

  const createInitialProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (!error && data) {
        setProfile(data);
        setEditForm({
          full_name: data.full_name || "",
          username: data.username || "",
        });
      }
    } catch (err) {
      console.error("Error creating profile:", err);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await supabase.auth.signOut();
          } catch (error) {
            console.error("Logout error:", error);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text
          style={[styles.loadingText, { color: theme.colors.textSecondary }]}
        >
          Loading profile...
        </Text>
      </View>
    );
  }

  const userEmail = session?.user?.email || "";
  const userName = profile?.full_name || "";
  const joinDate = new Date(
    session?.user?.created_at || Date.now()
  ).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {/* Header */}
        <View
          style={[styles.header, { backgroundColor: theme.colors.surface }]}
        >
          <TouchableOpacity
            style={[
              styles.backButton,
              { backgroundColor: theme.colors.buttonSecondary },
            ]}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Profile
          </Text>
          <TouchableOpacity
            style={[
              styles.editButton,
              { backgroundColor: theme.colors.buttonSecondary },
            ]}
            onPress={() => setEditModalVisible(true)}
          >
            <Edit3 color={theme.colors.primary} size={24} />
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View
          style={[
            styles.profileSection,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <View style={styles.avatarContainer}>
            <Avatar name={userName} email={userEmail} size={120} />
            <TouchableOpacity
              style={[
                styles.cameraButton,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Camera color="white" size={20} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.userName, { color: theme.colors.text }]}>
            {userName || "User"}
          </Text>
          <Text
            style={[styles.userEmail, { color: theme.colors.textSecondary }]}
          >
            {userEmail}
          </Text>
          <Text style={[styles.joinDate, { color: theme.colors.textTertiary }]}>
            Member since {joinDate}
          </Text>
        </View>

        {/* Profile Info Cards */}
        <View style={styles.infoSection}>
          <View
            style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}
          >
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <User color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.infoContent}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.textTertiary },
                  ]}
                >
                  Full Name
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {userName || "Not set"}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}
          >
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Mail color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.infoContent}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.textTertiary },
                  ]}
                >
                  Email
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {userEmail}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}
          >
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Calendar color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.infoContent}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.textTertiary },
                  ]}
                >
                  Username
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {profile?.username || "Not set"}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}
          >
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Text style={{ fontSize: 18, color: theme.colors.primary }}>
                  💰
                </Text>
              </View>
              <View style={styles.infoContent}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.textTertiary },
                  ]}
                >
                  Monthly Income
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {profile?.monthly_income
                    ? `₹${profile.monthly_income}`
                    : "Not set"}
                </Text>
              </View>
            </View>
          </View>
          <View
            style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}
          >
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Text style={{ fontSize: 18, color: theme.colors.primary }}>
                  📈
                </Text>
              </View>
              <View style={styles.infoContent}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.textTertiary },
                  ]}
                >
                  Total Investments
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {profile?.total_investments
                    ? `₹${profile.total_investments}`
                    : "Not set"}
                </Text>
              </View>
            </View>
          </View>
          <View
            style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}
          >
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Text style={{ fontSize: 18, color: theme.colors.primary }}>
                  💰
                </Text>
              </View>
              <View style={styles.infoContent}>
                <Text
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.textTertiary },
                  ]}
                >
                  Total Budget
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {profile?.monthly_budget
                    ? `₹${profile.monthly_budget}`
                    : "Not set"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Settings
          </Text>

          {/* App Settings */}
          <TouchableOpacity
            style={[
              styles.settingItem,
              { backgroundColor: theme.colors.surface },
            ]}
            onPress={() => navigation.navigate("AppSettings")}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingIconContainer}>
                <Settings color={theme.colors.textTertiary} size={20} />
              </View>
              <Text
                style={[
                  styles.settingText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                App Settings
              </Text>
            </View>
          </TouchableOpacity>

          {/* Privacy & Security */}
          <TouchableOpacity
            style={[
              styles.settingItem,
              { backgroundColor: theme.colors.surface },
            ]}
            onPress={() => navigation.navigate("PrivacySecurity")}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingIconContainer}>
                <Shield color={theme.colors.textTertiary} size={20} />
              </View>
              <Text
                style={[
                  styles.settingText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Privacy & Security
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.settingItem,
              { backgroundColor: theme.colors.surface },
            ]}
            onPress={() =>
              navigation.navigate("Dashboard", { showOnboarding: true })
            }
          >
            <View style={styles.settingRow}>
              <View style={styles.settingIconContainer}>
                <Text style={{ fontSize: 20 }}>🎓</Text>
              </View>
              <Text
                style={[
                  styles.settingText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Start App Tutorial
              </Text>
            </View>
          </TouchableOpacity>

          {/* Help & Support */}
          <TouchableOpacity
            style={[
              styles.settingItem,
              { backgroundColor: theme.colors.surface },
            ]}
            onPress={() =>
              Linking.openURL(
                "https://wa.me/918075648949?text=Hi%2C%20I%20need%20help%20with%20Expense%20Tracker"
              )
            }
          >
            <View style={styles.settingRow}>
              <View style={styles.settingIconContainer}>
                <HelpCircle color={theme.colors.textTertiary} size={20} />
              </View>
              <Text
                style={[
                  styles.settingText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Help & Support (will be by what's app)
              </Text>
            </View>
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity
            style={[
              styles.settingItem,
              styles.logoutItem,
              { backgroundColor: theme.colors.surface },
            ]}
            onPress={handleLogout}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingIconContainer}>
                <LogOut color={theme.colors.error} size={20} />
              </View>
              <Text
                style={[
                  styles.settingText,
                  styles.logoutText,
                  { color: theme.colors.error },
                ]}
              >
                Logout
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[
            styles.modalOverlay,
            { backgroundColor: theme.colors.overlay },
          ]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: theme.colors.border },
              ]}
            >
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Edit Profile
              </Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.closeButton}
              >
                <X color={theme.colors.textTertiary} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Full Name
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.buttonSecondary,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="Enter your full name"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={editForm.full_name}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, full_name: text })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Username
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.buttonSecondary,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="Enter your username"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={editForm.username}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, username: text })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Monthly Income (₹)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.buttonSecondary,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="Enter your monthly income"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={editForm.monthly_income}
                  keyboardType="numeric"
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, monthly_income: text })
                  }
                />
              </View>
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Total Investments (₹)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.buttonSecondary,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="Enter your total investments"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={editForm.total_investments}
                  keyboardType="numeric"
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, total_investments: text })
                  }
                />
              </View>
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Monthly Budget (₹)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.buttonSecondary,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="Enter your monthly budget"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={editForm.monthly_budget}
                  keyboardType="numeric"
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, monthly_budget: text })
                  }
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { backgroundColor: theme.colors.buttonSecondary },
                ]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={updateProfile}
              >
                <Save color="white" size={16} style={{ marginRight: 8 }} />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  editButton: {
    padding: 8,
    borderRadius: 12,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 20,
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "white",
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  userEmail: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 8,
  },
  joinDate: {
    fontSize: 14,
    color: "#94a3b8",
    fontStyle: "italic",
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  infoCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(6, 182, 212, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: "#1e293b",
    fontWeight: "600",
  },
  settingsSection: {
    paddingHorizontal: 20,
    marginBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  settingItem: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingIconContainer: {
    marginRight: 16,
  },
  settingText: {
    fontSize: 16,
    color: "#1e293b",
    fontWeight: "500",
  },
  logoutItem: {
    marginTop: 20,
  },
  logoutText: {
    color: "#ef4444",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    width: "90%",
    maxHeight: "80%",
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.1)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    fontSize: 16,
    color: "#1e293b",
  },
  modalButtons: {
    flexDirection: "row",
    padding: 24,
    paddingTop: 0,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    marginRight: 12,
  },
  saveButton: {
    backgroundColor: "#06b6d4",
  },
  cancelButtonText: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: 16,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});
