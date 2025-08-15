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
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  User,
  Edit3,
  Save,
  X,
  Settings,
  Shield,
  HelpCircle,
  LogOut,
  ArrowLeft,
  TrendingUp,
  Wallet,
  Target,
  Award,
  ChevronRight,
  Smartphone,
} from "lucide-react-native";
import { Linking } from "react-native";

const { width } = Dimensions.get("window");

// Avatar, StatCard, and SettingsItem components remain unchanged
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
      "#667eea", "#764ba2", "#f093fb", "#f5576c",
      "#4facfe", "#43e97b", "#fa709a", "#fee140",
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
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor, alignItems: "center", justifyContent: "center", elevation: 8 }, style]}>
      <Text style={{ color: "white", fontSize: size * 0.35, fontWeight: "700", letterSpacing: 1.5 }}>{initials}</Text>
    </View>
  );
};

const StatCard = ({ icon, label, value, color, theme }) => (
  <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
    <View style={[styles.statIconContainer, { backgroundColor: color + "20" }]}>
      {icon}
    </View>
    <View style={styles.statContent}>
      <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
    </View>
  </View>
);

const SettingsItem = ({ icon, title, subtitle, onPress, theme, isDestructive = false }) => (
  <TouchableOpacity style={[styles.settingsItem, { backgroundColor: theme.colors.surface }]} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.settingsItemContent}>
      <View style={[styles.settingsIconContainer, { backgroundColor: isDestructive ? "#FEF2F2" : theme.colors.primary + "15" }]}>
        {React.cloneElement(icon, { color: isDestructive ? "#EF4444" : theme.colors.primary, size: 20 })}
      </View>
      <View style={styles.settingsTextContainer}>
        <Text style={[styles.settingsTitle, { color: isDestructive ? "#EF4444" : theme.colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.settingsSubtitle, { color: theme.colors.textTertiary }]}>{subtitle}</Text>}
      </View>
    </View>
    <ChevronRight color={theme.colors.textTertiary} size={20} />
  </TouchableOpacity>
);


export default function ProfileScreen({ navigation }) {
  const { session } = useAuth();
  const { theme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  
  // Updated state to include all editable fields
  const [editForm, setEditForm] = useState({
    full_name: "",
    username: "",
    email: "",
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

      if (!data && error && error.code === "PGRST116") {
        const newProfile = await createInitialProfile();
        if (newProfile) {
            setProfile(newProfile);
            setEditForm({
                full_name: newProfile.full_name || "",
                username: newProfile.username || "",
                email: newProfile.email || session.user.email,
                monthly_income: newProfile.monthly_income?.toString() || "",
                total_investments: newProfile.total_investments?.toString() || "",
                monthly_budget: newProfile.monthly_budget?.toString() || "",
            });
        }
      } else if (error) {
        console.error("Error fetching profile:", error);
      } else if (data) {
        setProfile(data);
        // Initialize form with all data from the profile
        setEditForm({
          full_name: data.full_name || "",
          username: data.username || "",
          email: data.email || session.user.email,
          monthly_income: data.monthly_income?.toString() || "",
          total_investments: data.total_investments?.toString() || "",
          monthly_budget: data.monthly_budget?.toString() || "",
        });
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
        .insert([{ id: session.user.id, email: session.user.email }])
        .select()
        .single();

      if (error) {
        console.error("Error creating profile:", error);
        return null;
      }
      return data;
    } catch (err) {
      console.error("Exception creating profile:", err);
      return null;
    }
  };

  const updateProfile = async () => {
    if (!editForm.full_name.trim())
      return Alert.alert("Error", "Please enter your full name");

    try {
      // Update payload with all editable fields
      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name,
          username: editForm.username,
          email: editForm.email,
          monthly_income: editForm.monthly_income ? parseFloat(editForm.monthly_income) : null,
          total_investments: editForm.total_investments ? parseFloat(editForm.total_investments) : null,
          monthly_budget: editForm.monthly_budget ? parseFloat(editForm.monthly_budget) : null,
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
        Alert.alert("Error", "Failed to update profile. " + (error?.message || ""));
      }
    } catch (err) {
      console.error("Exception updating profile:", err);
      Alert.alert("Error", "An unexpected error occurred.");
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => supabase.auth.signOut(),
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const userEmail = profile?.email || session?.user?.email || "";
  const userName = profile?.full_name || "";
  const joinDate = new Date(session?.user?.created_at || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "long" });

  return (
    <>
      <StatusBar barStyle={theme.name === "dark" ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LinearGradient colors={[theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]} style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><ArrowLeft color="white" size={24} /></TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity style={styles.editHeaderButton} onPress={() => setEditModalVisible(true)}><Edit3 color="white" size={20} /></TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.profileHeader, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.profileAvatarSection}><Avatar name={userName} email={userEmail} size={100} /></View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.colors.text }]}>{userName || "Welcome!"}</Text>
              <Text style={[styles.profileEmail, { color: theme.colors.textSecondary }]}>{userEmail}</Text>
              <View style={styles.memberBadge}><Award color={theme.colors.primary} size={14} /><Text style={[styles.memberText, { color: theme.colors.primary }]}>Member since {joinDate}</Text></View>
            </View>
          </View>

          <View style={styles.statsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Financial Overview</Text>
            <View style={styles.statsGrid}>
              <StatCard icon={<Wallet color="#10B981" size={24} />} label="Monthly Income" value={profile?.monthly_income ? `₹${profile.monthly_income.toLocaleString()}` : "Not set"} color="#10B981" theme={theme} />
              <StatCard icon={<TrendingUp color="#3B82F6" size={24} />} label="Total Investments" value={profile?.total_investments ? `₹${profile.total_investments.toLocaleString()}` : "Not set"} color="#3B82F6" theme={theme} />
              <StatCard icon={<Target color="#F59E0B" size={24} />} label="Monthly Budget" value={profile?.monthly_budget ? `₹${profile.monthly_budget.toLocaleString()}` : "Not set"} color="#F59E0B" theme={theme} />
            </View>
          </View>

          <View style={styles.settingsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Settings & Preferences</Text>
            <View style={styles.settingsGroup}>
              <SettingsItem icon={<User />} title="Personal Information" subtitle="Update your profile details" onPress={() => setEditModalVisible(true)} theme={theme} />
              <SettingsItem icon={<Settings />} title="App Settings" subtitle="Theme, data, and more" onPress={() => navigation.navigate("Settings")} theme={theme} />
              <SettingsItem icon={<Shield />} title="Security & Privacy" subtitle="Manage account security" onPress={() => navigation.navigate("SecurityPrivacy")} theme={theme} />
            </View>
          </View>

          <View style={styles.settingsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Support & Actions</Text>
            <View style={styles.settingsGroup}>
               <SettingsItem icon={<Smartphone />} title="App Tutorial" subtitle="Replay the introductory tour" onPress={() => navigation.navigate("Dashboard", { showOnboarding: true })} theme={theme} />
               <SettingsItem icon={<HelpCircle />} title="Help & Support" subtitle="Get help via WhatsApp" onPress={() => Linking.openURL("https://wa.me/918075648949?text=Hi%2C%20I%20need%20help%20with%20Expenso")} theme={theme} />
               <SettingsItem icon={<LogOut />} title="Sign Out" subtitle="Sign out of your account" onPress={handleLogout} theme={theme} isDestructive={true} />
            </View>
          </View>
        </ScrollView>

        {/* Expanded Edit Profile Modal */}
        <Modal animationType="slide" transparent={true} visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
          <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
            <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                  <View>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Profile</Text>
                    <Text style={[styles.modalSubtitle, { color: theme.colors.textTertiary }]}>Update your information</Text>
                  </View>
                  <TouchableOpacity onPress={() => setEditModalVisible(false)} style={[styles.closeButton, { backgroundColor: theme.colors.buttonSecondary }]}>
                    <X color={theme.colors.textTertiary} size={20} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <View style={styles.modalSection}>
                    <Text style={[styles.modalSectionTitle, { color: theme.colors.text }]}>Personal Information</Text>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Full Name *</Text>
                      <TextInput style={[styles.input, { backgroundColor: theme.colors.buttonSecondary, color: theme.colors.text, borderColor: theme.colors.border }]} placeholder="Enter your full name" value={editForm.full_name} onChangeText={(text) => setEditForm({ ...editForm, full_name: text })} />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Username</Text>
                      <TextInput style={[styles.input, { backgroundColor: theme.colors.buttonSecondary, color: theme.colors.text, borderColor: theme.colors.border }]} placeholder="Enter your username" value={editForm.username} onChangeText={(text) => setEditForm({ ...editForm, username: text })} />
                    </View>
                     <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Email</Text>
                      <TextInput style={[styles.input, { backgroundColor: theme.colors.buttonSecondary, color: theme.colors.text, borderColor: theme.colors.border }]} placeholder="Enter your email" value={editForm.email} onChangeText={(text) => setEditForm({ ...editForm, email: text })} keyboardType="email-address" />
                    </View>
                  </View>
                  
                  <View style={styles.modalSection}>
                    <Text style={[styles.modalSectionTitle, { color: theme.colors.text }]}>Financial Information</Text>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Monthly Income (₹)</Text>
                      <TextInput style={[styles.input, { backgroundColor: theme.colors.buttonSecondary, color: theme.colors.text, borderColor: theme.colors.border }]} placeholder="e.g., 50000" value={editForm.monthly_income} onChangeText={(text) => setEditForm({ ...editForm, monthly_income: text })} keyboardType="numeric" />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Total Investments (₹)</Text>
                      <TextInput style={[styles.input, { backgroundColor: theme.colors.buttonSecondary, color: theme.colors.text, borderColor: theme.colors.border }]} placeholder="e.g., 250000" value={editForm.total_investments} onChangeText={(text) => setEditForm({ ...editForm, total_investments: text })} keyboardType="numeric" />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Monthly Budget (₹)</Text>
                      <TextInput style={[styles.input, { backgroundColor: theme.colors.buttonSecondary, color: theme.colors.text, borderColor: theme.colors.border }]} placeholder="e.g., 25000" value={editForm.monthly_budget} onChangeText={(text) => setEditForm({ ...editForm, monthly_budget: text })} keyboardType="numeric" />
                    </View>
                  </View>
                </ScrollView>
                
                <View style={[styles.modalFooter, { borderTopColor: theme.colors.border }]}>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.colors.buttonSecondary }]} onPress={() => setEditModalVisible(false)}>
                    <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.colors.primary }]} onPress={updateProfile}>
                    <Save color="white" size={16} style={{ marginRight: 8 }} /><Text style={styles.saveButtonText}>Save Changes</Text>
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
  // All styles remain the same
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  headerTitle: { fontSize: 20, fontWeight: "700", color: "white" },
  editHeaderButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  scrollContent: { paddingBottom: 40 },
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
  profileAvatarSection: { position: "relative", marginBottom: 16 },
  profileInfo: { alignItems: "center" },
  profileName: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  profileEmail: { fontSize: 16, marginBottom: 12 },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 20,
  },
  memberText: { fontSize: 12, fontWeight: "600", marginLeft: 4 },
  statsSection: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
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
  statContent: { flex: 1 },
  statLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: "700" },
  settingsSection: { marginTop: 24, paddingHorizontal: 20 },
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
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  settingsItemContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  settingsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  settingsTextContainer: { flex: 1 },
  settingsTitle: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  settingsSubtitle: { fontSize: 14, fontWeight: "400" },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalContainer: { flex: 1, justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 24,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 22, fontWeight: "700" },
  modalSubtitle: { fontSize: 14, fontWeight: "500" },
  closeButton: { padding: 8, borderRadius: 20 },
  modalBody: { maxHeight: "60%" },
  modalSection: { paddingHorizontal: 24, paddingTop: 16 },
  modalSectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 16 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  input: { borderRadius: 12, padding: 16, borderWidth: 1, fontSize: 16 },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
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
    borderRadius: 12,
  },
  cancelButtonText: { fontSize: 16, fontWeight: "600" },
  saveButtonText: { fontSize: 16, fontWeight: "600", color: "white" },
});