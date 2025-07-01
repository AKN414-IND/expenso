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

// Avatar component with initials fallback
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
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    username: "",
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
        });
      } else {
        // Create initial profile if it doesn't exist
        await createInitialProfile();
      }
    } catch (err) {
      console.error("Exception fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const createInitialProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .insert([
          {
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name || "",
            username: session.user.email?.split("@")[0] || "",
            email: session.user.email,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
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
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
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
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft color="#1e293b" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditModalVisible(true)}
          >
            <Edit3 color="#06b6d4" size={24} />
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Avatar name={userName} email={userEmail} size={120} />
            <TouchableOpacity style={styles.cameraButton}>
              <Camera color="white" size={20} />
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>{userName || "User"}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
          <Text style={styles.joinDate}>Member since {joinDate}</Text>
        </View>

        {/* Profile Info Cards */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <User color="#06b6d4" size={20} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>{userName || "Not set"}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Mail color="#06b6d4" size={20} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{userEmail}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Calendar color="#06b6d4" size={20} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Username</Text>
                <Text style={styles.infoValue}>
                  {profile?.username || "Not set"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>

          {/* App Settings */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate("AppSettings")}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingIconContainer}>
                <Settings color="#64748b" size={20} />
              </View>
              <Text style={styles.settingText}>App Settings</Text>
            </View>
          </TouchableOpacity>

          {/* Privacy & Security */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate("PrivacySecurity")}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingIconContainer}>
                <Shield color="#64748b" size={20} />
              </View>
              <Text style={styles.settingText}>Privacy & Security</Text>
            </View>
          </TouchableOpacity>

          {/* Help & Support */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() =>
              Linking.openURL(
                "https://wa.me/918075648949?text=Hi%2C%20I%20need%20help%20with%20Expense%20Tracker"
              )
            }
          >
            <View style={styles.settingRow}>
              <View style={styles.settingIconContainer}>
                <HelpCircle color="#64748b" size={20} />
              </View>
              <Text style={styles.settingText}>Help & Support (will be by what's app)</Text>
            </View>
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity
            style={[styles.settingItem, styles.logoutItem]}
            onPress={handleLogout}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingIconContainer}>
                <LogOut color="#ef4444" size={20} />
              </View>
              <Text style={[styles.settingText, styles.logoutText]}>
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
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.closeButton}
              >
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  value={editForm.full_name}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, full_name: text })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your username"
                  value={editForm.username}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, username: text })
                  }
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
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
    backgroundColor: "#f5f7fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f7fa",
  },
  loadingText: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.1)",
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
  },
  editButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(6, 182, 212, 0.1)",
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
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
    backgroundColor: "#06b6d4",
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
    color: "#1e293b",
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
