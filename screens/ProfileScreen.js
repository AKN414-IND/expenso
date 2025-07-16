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
  Dimensions,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
  TrendingUp,
  Wallet,
  Target,
  Award,
  Bell,
  Moon,
  Sun,
  ChevronRight,
  Eye,
  Lock,
  CreditCard,
  Smartphone,
} from "lucide-react-native";
import { Linking } from "react-native";

const { width, height } = Dimensions.get("window");

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
      "#667eea",
      "#764ba2",
      "#f093fb",
      "#f5576c",
      "#4facfe",
      "#43e97b",
      "#fa709a",
      "#fee140",
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
          elevation: 8,
          shadowColor: backgroundColor,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          borderWidth: 4,
          borderColor: "rgba(255, 255, 255, 0.2)",
        },
        style,
      ]}
    >
      <Text
        style={{
          color: "white",
          fontSize: size * 0.35,
          fontWeight: "700",
          letterSpacing: 1.5,
        }}
      >
        {initials}
      </Text>
    </View>
  );
};

const StatCard = ({ icon, label, value, color, theme }) => (
  <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
    <View style={[styles.statIconContainer, { backgroundColor: color + "20" }]}>
      {icon}
    </View>
    <View style={styles.statContent}>
      <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color: theme.colors.text }]}>
        {value}
      </Text>
    </View>
  </View>
);

const SettingsItem = ({ icon, title, subtitle, onPress, theme, showChevron = true, isDestructive = false }) => (
  <TouchableOpacity
    style={[styles.settingsItem, { backgroundColor: theme.colors.surface }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.settingsItemContent}>
      <View style={[styles.settingsIconContainer, { backgroundColor: isDestructive ? "#FEF2F2" : theme.colors.primary + "15" }]}>
        {React.cloneElement(icon, { 
          color: isDestructive ? "#EF4444" : theme.colors.primary, 
          size: 20 
        })}
      </View>
      <View style={styles.settingsTextContainer}>
        <Text style={[styles.settingsTitle, { color: isDestructive ? "#EF4444" : theme.colors.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingsSubtitle, { color: theme.colors.textTertiary }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
    {showChevron && (
      <ChevronRight color={theme.colors.textTertiary} size={20} />
    )}
  </TouchableOpacity>
);

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
    monthly_budget: "",
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
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out of your account?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await supabase.auth.signOut();
            } catch (error) {
              console.error("Logout error:", error);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContent}>
          <View style={[styles.loadingSpinner, { borderColor: theme.colors.primary + "30", borderTopColor: theme.colors.primary }]} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading your profile...
          </Text>
        </View>
      </View>
    );
  }

  const userEmail = session?.user?.email || "";
  const userName = profile?.full_name || "";
  const joinDate = new Date(session?.user?.created_at || Date.now()).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header with Gradient */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primary + "DD"]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft color="white" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity
              style={styles.editHeaderButton}
              onPress={() => setEditModalVisible(true)}
            >
              <Edit3 color="white" size={20} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView 
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Header Section */}
          <View style={[styles.profileHeader, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.profileAvatarSection}>
              <Avatar name={userName} email={userEmail} size={100} />
              <TouchableOpacity style={styles.cameraButton}>
                <Camera color="white" size={18} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.colors.text }]}>
                {userName || "Welcome!"}
              </Text>
              <Text style={[styles.profileEmail, { color: theme.colors.textSecondary }]}>
                {userEmail}
              </Text>
              <View style={styles.memberBadge}>
                <Award color={theme.colors.primary} size={14} />
                <Text style={[styles.memberText, { color: theme.colors.primary }]}>
                  Member since {joinDate.split(",")[1]}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Financial Overview
            </Text>
            <View style={styles.statsGrid}>
              <StatCard
                icon={<Wallet color="#10B981" size={24} />}
                label="Monthly Income"
                value={profile?.monthly_income ? `₹${profile.monthly_income.toLocaleString()}` : "Not set"}
                color="#10B981"
                theme={theme}
              />
              <StatCard
                icon={<TrendingUp color="#3B82F6" size={24} />}
                label="Total Investments"
                value={profile?.total_investments ? `₹${profile.total_investments.toLocaleString()}` : "Not set"}
                color="#3B82F6"
                theme={theme}
              />
              <StatCard
                icon={<Target color="#F59E0B" size={24} />}
                label="Monthly Budget"
                value={profile?.monthly_budget ? `₹${profile.monthly_budget.toLocaleString()}` : "Not set"}
                color="#F59E0B"
                theme={theme}
              />
            </View>
          </View>

          {/* Account Settings Section */}
          <View style={styles.settingsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Account Settings
            </Text>
            <View style={styles.settingsGroup}>
              <SettingsItem
                icon={<User />}
                title="Personal Information"
                subtitle="Update your profile details"
                onPress={() => setEditModalVisible(true)}
                theme={theme}
              />
              <SettingsItem
                icon={<Bell />}
                title="Notifications"
                subtitle="Manage your notification preferences"
                onPress={() => navigation.navigate("Notifications")}
                theme={theme}
              />
              <SettingsItem
                icon={<Eye />}
                title="Privacy Settings"
                subtitle="Control your data and privacy"
                onPress={() => navigation.navigate("PrivacySecurity")}
                theme={theme}
              />
            </View>
          </View>

          {/* App Settings Section */}
          <View style={styles.settingsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              App Settings
            </Text>
            <View style={styles.settingsGroup}>
              <SettingsItem
                icon={<Settings />}
                title="General Settings"
                subtitle="App preferences and configurations"
                onPress={() => navigation.navigate("AppSettings")}
                theme={theme}
              />
              <SettingsItem
                icon={<Smartphone />}
                title="App Tutorial"
                subtitle="Learn how to use the app"
                onPress={() => navigation.navigate("Dashboard", { showOnboarding: true })}
                theme={theme}
              />
              <SettingsItem
                icon={<Shield />}
                title="Security"
                subtitle="Manage your account security"
                onPress={() => navigation.navigate("Security")}
                theme={theme}
              />
            </View>
          </View>

          {/* Support Section */}
          <View style={styles.settingsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Support
            </Text>
            <View style={styles.settingsGroup}>
              <SettingsItem
                icon={<HelpCircle />}
                title="Help & Support"
                subtitle="Get help via WhatsApp"
                onPress={() =>
                  Linking.openURL(
                    "https://wa.me/918075648949?text=Hi%2C%20I%20need%20help%20with%20Expense%20Tracker"
                  )
                }
                theme={theme}
              />
              <SettingsItem
                icon={<LogOut />}
                title="Sign Out"
                subtitle="Sign out of your account"
                onPress={handleLogout}
                theme={theme}
                isDestructive={true}
              />
            </View>
          </View>
        </ScrollView>

        {/* Enhanced Edit Profile Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={editModalVisible}
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
            <KeyboardAvoidingView
              style={styles.modalContainer}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                {/* Modal Header */}
                <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                  <View>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                      Edit Profile
                    </Text>
                    <Text style={[styles.modalSubtitle, { color: theme.colors.textTertiary }]}>
                      Update your personal information
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setEditModalVisible(false)}
                    style={[styles.closeButton, { backgroundColor: theme.colors.buttonSecondary }]}
                  >
                    <X color={theme.colors.textTertiary} size={20} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {/* Personal Information */}
                  <View style={styles.modalSection}>
                    <Text style={[styles.modalSectionTitle, { color: theme.colors.text }]}>
                      Personal Information
                    </Text>
                    
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                        Full Name *
                      </Text>
                      <TextInput
                        style={[styles.input, {
                          backgroundColor: theme.colors.buttonSecondary,
                          color: theme.colors.text,
                          borderColor: theme.colors.border,
                        }]}
                        placeholder="Enter your full name"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={editForm.full_name}
                        onChangeText={(text) => setEditForm({ ...editForm, full_name: text })}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                        Username
                      </Text>
                      <TextInput
                        style={[styles.input, {
                          backgroundColor: theme.colors.buttonSecondary,
                          color: theme.colors.text,
                          borderColor: theme.colors.border,
                        }]}
                        placeholder="Enter your username"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={editForm.username}
                        onChangeText={(text) => setEditForm({ ...editForm, username: text })}
                      />
                    </View>
                  </View>

                  {/* Financial Information */}
                  <View style={styles.modalSection}>
                    <Text style={[styles.modalSectionTitle, { color: theme.colors.text }]}>
                      Financial Information
                    </Text>
                    
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                        Monthly Income (₹)
                      </Text>
                      <TextInput
                        style={[styles.input, {
                          backgroundColor: theme.colors.buttonSecondary,
                          color: theme.colors.text,
                          borderColor: theme.colors.border,
                        }]}
                        placeholder="Enter your monthly income"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={editForm.monthly_income}
                        keyboardType="numeric"
                        onChangeText={(text) => setEditForm({ ...editForm, monthly_income: text })}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                        Total Investments (₹)
                      </Text>
                      <TextInput
                        style={[styles.input, {
                          backgroundColor: theme.colors.buttonSecondary,
                          color: theme.colors.text,
                          borderColor: theme.colors.border,
                        }]}
                        placeholder="Enter your total investments"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={editForm.total_investments}
                        keyboardType="numeric"
                        onChangeText={(text) => setEditForm({ ...editForm, total_investments: text })}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                        Monthly Budget (₹)
                      </Text>
                      <TextInput
                        style={[styles.input, {
                          backgroundColor: theme.colors.buttonSecondary,
                          color: theme.colors.text,
                          borderColor: theme.colors.border,
                        }]}
                        placeholder="Enter your monthly budget"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={editForm.monthly_budget}
                        keyboardType="numeric"
                        onChangeText={(text) => setEditForm({ ...editForm, monthly_budget: text })}
                      />
                    </View>
                  </View>
                </ScrollView>

                {/* Modal Footer */}
                <View style={[styles.modalFooter, { borderTopColor: theme.colors.border }]}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.colors.buttonSecondary }]}
                    onPress={() => setEditModalVisible(false)}
                  >
                    <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.colors.primary }]}
                    onPress={updateProfile}
                  >
                    <Save color="white" size={16} style={{ marginRight: 8 }} />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </View>
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
  loadingContent: {
    alignItems: "center",
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderStyle: "solid",
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
  },
  headerGradient: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  editHeaderButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileHeader: {
    marginTop: -20,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  profileAvatarSection: {
    position: "relative",
    marginBottom: 16,
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "white",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  profileInfo: {
    alignItems: "center",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    marginBottom: 12,
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 20,
  },
  memberText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  statsSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: (width - 60) / 2,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  settingsSection: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  settingsGroup: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  settingsItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  settingsTextContainer: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  settingsSubtitle: {
    fontSize: 14,
    fontWeight: "400",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.9,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 24,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  modalBody: {
    maxHeight: height * 0.6,
  },
  modalSection: {
    padding: 24,
    paddingTop: 0,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderTopWidth: 1,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cancelButton: {
    marginRight: 6,
  },
  saveButton: {
    marginLeft: 6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
});