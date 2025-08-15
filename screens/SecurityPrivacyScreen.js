// screens/SecurityPrivacyScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../lib/supabase";
import {
  ArrowLeft,
  Lock,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Save,
  X,
} from "lucide-react-native";
import Alert from "../components/Alert"; // Using your existing Alert component

// Reusable component for section headers
const SectionHeader = ({ title, theme }) => (
  <Text style={[styles(theme).sectionHeader, { color: theme.colors.textSecondary }]}>{title}</Text>
);

// Reusable component for each settings item
const SettingsItem = ({ icon, title, onPress, theme }) => (
  <TouchableOpacity
    style={[styles(theme).itemContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.borderLight }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles(theme).iconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
      {icon}
    </View>
    <Text style={[styles(theme).itemTitle, { color: theme.colors.text }]}>{title}</Text>
    <ChevronRight color={theme.colors.textTertiary} size={20} />
  </TouchableOpacity>
);

// Modal for changing the password
const ChangePasswordModal = ({ isVisible, onClose, theme }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  
  const [alertProps, setAlertProps] = useState({ open: false });

  const handleUpdatePassword = async () => {
    setError("");
    if (!newPassword || !currentPassword) {
      setError("Please fill all fields.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsSaving(true);
    
    // First, reauthenticate to ensure the user knows their current password.
    // This is a security best practice.
    const { data: { user }, error: reauthError } = await supabase.auth.signInWithPassword({
        email: supabase.auth.getUser().data.user.email,
        password: currentPassword,
    });

    if (reauthError) {
        setError(reauthError.message);
        setIsSaving(false);
        return;
    }

    // If reauthentication is successful, update the password.
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setIsSaving(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setAlertProps({
        open: true,
        title: "Success",
        message: "Your password has been updated successfully.",
        confirmText: "OK",
        onConfirm: () => {
          setAlertProps({ open: false });
          onClose();
        },
      });
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles(theme).modalOverlay, { backgroundColor: theme.colors.overlay }]}
      >
        <View style={[styles(theme).modalContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles(theme).modalHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles(theme).modalTitle, { color: theme.colors.text }]}>Change Password</Text>
            <TouchableOpacity onPress={onClose} style={styles(theme).closeButton}>
              <X color={theme.colors.textTertiary} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles(theme).modalScroll}>
            <View style={styles(theme).inputGroup}>
              <Text style={[styles(theme).inputLabel, { color: theme.colors.textSecondary }]}>Current Password</Text>
              <View style={[styles(theme).inputContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.borderLight }]}>
                <TextInput
                  style={[styles(theme).input, { color: theme.colors.text }]}
                  secureTextEntry={!showCurrent}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter your current password"
                  placeholderTextColor={theme.colors.textTertiary}
                />
                <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                  {showCurrent ? <EyeOff color={theme.colors.textTertiary} size={20} /> : <Eye color={theme.colors.textTertiary} size={20} />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles(theme).inputGroup}>
              <Text style={[styles(theme).inputLabel, { color: theme.colors.textSecondary }]}>New Password</Text>
              <View style={[styles(theme).inputContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.borderLight }]}>
                <TextInput
                  style={[styles(theme).input, { color: theme.colors.text }]}
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor={theme.colors.textTertiary}
                />
                 <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                  {showNew ? <EyeOff color={theme.colors.textTertiary} size={20} /> : <Eye color={theme.colors.textTertiary} size={20} />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles(theme).inputGroup}>
              <Text style={[styles(theme).inputLabel, { color: theme.colors.textSecondary }]}>Confirm New Password</Text>
              <TextInput
                style={[styles(theme).input, styles(theme).inputSolo, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.borderLight }]}
                secureTextEntry={!showNew}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat new password"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>

            {error ? <Text style={styles(theme).errorText}>{error}</Text> : null}
          </ScrollView>

          <View style={[styles(theme).modalFooter, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[styles(theme).saveButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleUpdatePassword}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Save color="#fff" size={18} style={{ marginRight: 8 }} />
                  <Text style={styles(theme).saveButtonText}>Update Password</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <Alert {...alertProps} />
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default function SecurityPrivacyScreen({ navigation }) {
  const { theme } = useTheme();
  const s = styles(theme);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [alertProps, setAlertProps] = useState({ open: false });

  const handleSignOutOtherDevices = async () => {
    setIsModalVisible(false); // Close any open modals first
    setAlertProps({
      open: true,
      title: "Confirm Sign Out",
      message: "Are you sure you want to sign out of all other devices? You will remain logged in here.",
      confirmText: "Sign Out",
      cancelText: "Cancel",
      onConfirm: async () => {
        setAlertProps({ open: false });
        const { error } = await supabase.auth.signOut({ scope: 'others' });
        if (error) {
          setAlertProps({ open: true, title: "Error", message: error.message, confirmText: "OK", onConfirm: () => setAlertProps({ open: false }) });
        } else {
          setAlertProps({ open: true, title: "Success", message: "Successfully signed out on all other devices.", confirmText: "OK", onConfirm: () => setAlertProps({ open: false }) });
        }
      },
      onCancel: () => setAlertProps({ open: false }),
    });
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Security & Privacy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent}>
        <SectionHeader title="Account Security" theme={theme} />
        <View style={s.settingsGroup}>
            <SettingsItem
                icon={<Lock size={22} color={theme.colors.primary} />}
                title="Change Password"
                onPress={() => setIsModalVisible(true)}
                theme={theme}
            />
            <SettingsItem
                icon={<ShieldCheck size={22} color={theme.colors.primary} />}
                title="Two-Factor Authentication"
                onPress={() => alert("Two-Factor Authentication is coming soon!")}
                theme={theme}
            />
        </View>

        <SectionHeader title="Session Management" theme={theme} />
         <View style={s.settingsGroup}>
            <SettingsItem
                icon={<LogOut size={22} color={theme.colors.primary} />}
                title="Sign out on other devices"
                onPress={handleSignOutOtherDevices}
                theme={theme}
            />
        </View>
      </ScrollView>

      <ChangePasswordModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        theme={theme}
      />
      <Alert {...alertProps} />
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
  sectionHeader: {
      fontSize: 14,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginVertical: 12,
      paddingHorizontal: 8,
  },
  settingsGroup: {
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderBottomWidth: 1,
  },
  iconContainer: {
    padding: 10,
    borderRadius: 12,
    marginRight: 16,
  },
  itemTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  modalScroll: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  inputSolo: {
      paddingHorizontal: 12,
  },
  errorText: {
    color: theme.colors.error,
    marginTop: 10,
    textAlign: 'center',
  },
  modalFooter: {
      padding: 20,
      borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
