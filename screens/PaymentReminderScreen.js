import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";

import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  setupNotificationCategories,
  scheduleNotification,
  syncAllNotifications,
  requestNotificationPermissions,
  snoozeNotification,
  cancelNotification,
  NOTIFICATION_ACTIONS,
} from "../services/NotificationService";
import {
  Bell,
  Plus,
  ArrowLeft,
  X,
  Trash2,
  Calendar,
  Clock,
  ChevronDown,
} from "lucide-react-native";
import AlertComponent from "../components/Alert";
import ReminderCard from "../components/ReminderCard";

// --- Constants ---
const FILTERS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "overdue", label: "Overdue" },
  { key: "paid", label: "Paid" },
];

const CATEGORIES = [
  "Rent",
  "Utilities",
  "Subscription",
  "Loan",
  "Insurance",
  "Other",
];
const FREQUENCY_OPTIONS = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "half_yearly",
  "yearly",
];

// --- Main Screen ---
export default function PaymentReminderScreen({ navigation }) {
  const { session } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createScreenStyles(theme), [theme]);

  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState(null);
  const [activeFilter, setActiveFilter] = useState("upcoming");

  const notificationListener = useRef();
  const responseListener = useRef();

  const { counts, filteredReminders } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let c = { upcoming: 0, overdue: 0, paid: 0 };
    const tagged = reminders.map((item) => {
      const dueDate = new Date(item.next_due_date);
      dueDate.setHours(0, 0, 0, 0);
      const isOverdue = item.is_active && dueDate < today;
      const isUpcoming = item.is_active && !isOverdue;
      const isPaid = !item.is_active;
      if (isUpcoming) c.upcoming += 1;
      if (isOverdue) c.overdue += 1;
      if (isPaid) c.paid += 1;
      return {
        ...item,
        __isOverdue: isOverdue,
        __isUpcoming: isUpcoming,
        __isPaid: isPaid,
      };
    });

    const filtered = tagged.filter((t) => {
      if (activeFilter === "upcoming") return t.__isUpcoming;
      if (activeFilter === "overdue") return t.__isOverdue;
      if (activeFilter === "paid") return t.__isPaid;
      return true;
    });

    return { counts: c, filteredReminders: filtered };
  }, [reminders, activeFilter]);

  const fetchReminders = useCallback(
    async (shouldSync = true) => {
      if (!session?.user) {
        setReminders([]);
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("payment_reminders")
          .select("*")
          .eq("user_id", session.user.id)
          .order("next_due_date", { ascending: true });

        if (error) throw error;

        setReminders(data || []);

        // Only sync notifications when explicitly told to.
        if (shouldSync && data?.length) {
          try {
            await syncAllNotifications(data);
          } catch (syncErr) {
            console.error("Failed to sync notifications:", syncErr);
          }
        }
      } catch (err) {
        console.error("Error fetching reminders:", err);
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred.";
        Alert.alert("Error Fetching Data", errorMessage);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session]
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchReminders(true); // Sync when the screen is focused
    }, [fetchReminders])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReminders(true); // Sync on manual refresh
  }, [fetchReminders]);

  useEffect(() => {
    requestNotificationPermissions();
    setupNotificationCategories();

    // ✅ FIX: Call fetchReminders with `false` to prevent the sync loop.
    notificationListener.current =
      Notifications.addNotificationReceivedListener(() => {
        // This just refreshes the data on screen without re-syncing all notifications.
        fetchReminders(false);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(async (response) => {
        const { actionIdentifier, notification } = response;
        const reminderId = notification?.request?.content?.data?.reminderId;
        if (!reminderId) return;

        if (actionIdentifier === NOTIFICATION_ACTIONS.MARK_AS_PAID) {
          await togglePaidStatus(reminderId, true);
        } else if (actionIdentifier === NOTIFICATION_ACTIONS.SNOOZE) {
          await snoozeNotification(reminderId);
        } else {
          navigation.navigate("PaymentReminder");
        }
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [fetchReminders, navigation]);

  const handleSaveReminder = useCallback(
    async (formData) => {
      try {
        let notificationId = formData.notification_id || null;
        // ✅ FIX: Explicitly cancel the old notification before scheduling a new one.
        if (notificationId) {
          await cancelNotification(notificationId);
        }

        if (formData.notification_enabled) {
          notificationId = await scheduleNotification(formData);
        } else {
          notificationId = null;
        }

        const payload = { ...formData, notification_id: notificationId };
        const { error } = editingReminder
          ? await supabase
              .from("payment_reminders")
              .update(payload)
              .eq("id", editingReminder.id)
          : await supabase
              .from("payment_reminders")
              .insert({ ...payload, user_id: session.user.id });

        if (error) throw error;

        setModalVisible(false);
        setEditingReminder(null);
        await fetchReminders(true); // Re-fetch and re-sync after saving.
      } catch (err) {
        Alert.alert("Save Error", `Failed to save reminder: ${err.message}`);
      }
    },
    [editingReminder, fetchReminders, session?.user?.id]
  );

  const confirmDeleteReminder = useCallback(async () => {
    if (!reminderToDelete) return;
    try {
      if (reminderToDelete.notification_id) {
        await cancelNotification(reminderToDelete.notification_id);
      }
      const { error } = await supabase
        .from("payment_reminders")
        .delete()
        .eq("id", reminderToDelete.id);
      if (error) throw error;

      setShowDeleteAlert(false);
      setReminderToDelete(null);
      await fetchReminders(true); // Re-fetch and re-sync after deleting.
    } catch (err) {
      Alert.alert("Delete Error", `Failed to delete reminder: ${err.message}`);
    }
  }, [reminderToDelete, fetchReminders]);

  const togglePaidStatus = useCallback(
    async (reminderId, isActiveNow) => {
      try {
        const { data, error } = await supabase
          .from("payment_reminders")
          .update({
            is_active: !isActiveNow,
            last_paid_date: !isActiveNow ? new Date().toISOString() : null,
          })
          .eq("id", reminderId)
          .select()
          .single();

        if (error) throw error;

        if (data?.notification_id) {
          await cancelNotification(data.notification_id);
        }

        if (!isActiveNow && data) {
           // If marking as unpaid, schedule a new notification
          await scheduleNotification(data);
        }

        await fetchReminders(true); // Re-fetch and re-sync after status change.
      } catch (err) {
        Alert.alert("Update Error", `Failed to update reminder: ${err.message}`);
      }
    },
    [fetchReminders]
  );

  const handleOpenModal = useCallback((reminder = null) => {
    setEditingReminder(reminder);
    setModalVisible(true);
  }, []);

  const ListEmpty = (
    <View style={styles.emptyState}>
      <Bell size={64} color={theme.colors.border} />
      <Text style={styles.emptyStateTitle}>No Reminders Here</Text>
      <Text style={styles.emptyStateText}>
        Tap the "+" button to add your first reminder in this category.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Reminders</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.filterContainer}>
        {FILTERS.map(({ key, label }) => (
          <FilterPill
            key={key}
            label={label}
            count={counts[key] || 0}
            active={activeFilter === key}
            onPress={() => setActiveFilter(key)}
            theme={theme}
          />
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredReminders}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ReminderCard
              item={item}
              onPress={() => handleOpenModal(item)}
              onDelete={() => handleDeletePress(item)}
              onTogglePaid={() => togglePaidStatus(item.id, item.is_active)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={ListEmpty}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => handleOpenModal()}>
        <Plus size={28} color="#fff" />
      </TouchableOpacity>

      <ReminderFormModal
        isVisible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveReminder}
        initialData={editingReminder}
        theme={theme}
        onTogglePaid={togglePaidStatus}
      />

      <AlertComponent
        open={showDeleteAlert}
        onConfirm={confirmDeleteReminder}
        onCancel={() => setShowDeleteAlert(false)}
        title="Delete Reminder"
        message={`Are you sure you want to delete "${reminderToDelete?.title}"? This is permanent.`}
        confirmText="Delete"
        icon={<Trash2 color="#fff" size={32} />}
        iconBg={theme.colors.error}
        confirmColor={theme.colors.error}
      />
    </View>
  );
}

// --- Filter Pill Component ---
function FilterPill({ label, count, active, onPress, theme }) {
  const pillStyles = useMemo(() => createPillStyles(theme), [theme]);
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[pillStyles.base, active && pillStyles.activeBase]}
    >
      <Text style={[pillStyles.text, active && pillStyles.activeText]}>
        {label}
      </Text>
      <View style={[pillStyles.badge, active && pillStyles.activeBadge]}>
        <Text
          style={[pillStyles.badgeText, active && pillStyles.activeBadgeText]}
        >
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// --- Custom Picker Modal Component ---
const PickerModal = ({ isVisible, onClose, theme, data }) => {
  const styles = useMemo(() => createPickerModalStyles(theme), [theme]);
  const { label, options, value, onSelect } = data;

  const handleSelect = (option) => {
    onSelect(option);
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={isVisible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalView}>
          <Text style={styles.title}>{`Select ${label}`}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.option, item === value && styles.selectedOption]}
                onPress={() => handleSelect(item)}
              >
                <Text
                  style={[
                    styles.optionText,
                    item === value && styles.selectedOptionText,
                  ]}
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// --- Add/Edit Modal ---
const ReminderFormModal = ({
  isVisible,
  onClose,
  onSave,
  initialData,
  theme,
  onTogglePaid,
}) => {
  const styles = useMemo(() => createModalStyles(theme), [theme]);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [frequency, setFrequency] = useState(FREQUENCY_OPTIONS[2]);
  const [description, setDescription] = useState("");
  const [nextDueDate, setNextDueDate] = useState(new Date());
  const [reminderTime, setReminderTime] = useState(new Date());
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // State for the custom picker
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [pickerData, setPickerData] = useState({
    options: [],
    value: "",
    onSelect: () => {},
    label: "",
  });

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title ?? "");
      setAmount(initialData.amount?.toString() || "");
      setCategory(initialData.category || CATEGORIES[0]);
      setFrequency(initialData.frequency || FREQUENCY_OPTIONS[2]);
      setDescription(initialData.description || "");
      setNextDueDate(new Date(initialData.next_due_date));
      const [h, m] = (initialData.reminder_time || "09:00")
        .split(":")
        .map(Number);
      const t = new Date();
      t.setHours(h, m, 0, 0);
      setReminderTime(t);
      setNotificationEnabled(initialData.notification_enabled ?? true);
    } else {
      // Reset form for new entry
      setTitle("");
      setAmount("");
      setCategory(CATEGORIES[0]);
      setFrequency(FREQUENCY_OPTIONS[2]);
      setDescription("");
      const d = new Date();
      d.setDate(d.getDate() + 1); // Default to tomorrow
      setNextDueDate(d);
      const t = new Date();
      t.setHours(9, 0, 0, 0); // Default to 9:00 AM
      setReminderTime(t);
      setNotificationEnabled(true);
    }
  }, [initialData]);

  const handleSave = () => {
    if (!title || !amount) {
      Alert.alert("Missing Information", "Please enter a title and amount.");
      return;
    }
    const hh = reminderTime.getHours().toString().padStart(2, "0");
    const mm = reminderTime.getMinutes().toString().padStart(2, "0");

    onSave({
      title,
      amount: parseFloat(amount),
      category,
      frequency,
      description,
      next_due_date: nextDueDate.toISOString().split("T")[0],
      reminder_time: `${hh}:${mm}`,
      notification_enabled: notificationEnabled,
      notification_id: initialData?.notification_id || null,
      is_active: initialData?.is_active ?? true,
    });
  };

  const handleTogglePaid = () => {
    if (initialData && onTogglePaid) {
      onTogglePaid(initialData.id, initialData.is_active);
      onClose(); // Close the modal after action
    }
  };

  const openPicker = (label, options, currentValue, onSelect) => {
    setPickerData({ label, options, value: currentValue, onSelect });
    setPickerVisible(true);
  };

  const datePickerDisplay = Platform.OS === "ios" ? "spinner" : "default";

  return (
    <Modal
      animationType="slide"
      transparent
      visible={isVisible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalBackdrop}
      >
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {initialData ? "Edit Reminder" : "New Reminder"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={28} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Rent Payment"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="e.g., 15000"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>

            <View style={styles.inlineGroup}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Category</Text>
                <TouchableOpacity
                  style={styles.picker}
                  onPress={() =>
                    openPicker("Category", CATEGORIES, category, setCategory)
                  }
                >
                  <Text style={styles.pickerText}>{category}</Text>
                  <ChevronDown size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Frequency</Text>
                <TouchableOpacity
                  style={styles.picker}
                  onPress={() =>
                    openPicker(
                      "Frequency",
                      FREQUENCY_OPTIONS,
                      frequency,
                      setFrequency
                    )
                  }
                >
                  <Text style={styles.pickerText}>
                    {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                  </Text>
                  <ChevronDown size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inlineGroup}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Due Date</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={[styles.input, styles.datePickerButton]}
                >
                  <Calendar size={18} color={theme.colors.textSecondary} />
                  <Text style={styles.dateText}>
                    {nextDueDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              </View>
              {notificationEnabled && (
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Notify At</Text>
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(true)}
                    style={[styles.input, styles.datePickerButton]}
                  >
                    <Clock size={18} color={theme.colors.textSecondary} />
                    <Text style={styles.dateText}>
                      {reminderTime.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={nextDueDate}
                mode="date"
                display={datePickerDisplay}
                onChange={(_e, s) => {
                  setShowDatePicker(false);
                  if (s) setNextDueDate(s);
                }}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={reminderTime}
                mode="time"
                display={datePickerDisplay}
                onChange={(_e, s) => {
                  setShowTimePicker(false);
                  if (s) setReminderTime(s);
                }}
              />
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={description}
                onChangeText={setDescription}
                placeholder="e.g., Monthly payment for apartment"
                placeholderTextColor={theme.colors.textTertiary}
                multiline
              />
            </View>
            <View style={styles.switchGroup}>
              <View>
                <Text style={[styles.label, { marginBottom: 2 }]}>
                  Enable Notification
                </Text>
                <Text style={styles.helpText}>
                  Get a push notification on the due date.
                </Text>
              </View>
              <Switch
                trackColor={{
                  false: "#767577",
                  true: theme.colors.primary + "50",
                }}
                thumbColor={
                  notificationEnabled ? theme.colors.primary : "#f4f3f4"
                }
                onValueChange={setNotificationEnabled}
                value={notificationEnabled}
              />
            </View>
          </ScrollView>

          <View style={styles.footerContainer}>
            {initialData && (
              <TouchableOpacity
                style={[
                  styles.footerButton,
                  {
                    backgroundColor: initialData.is_active
                      ? theme.colors.success
                      : theme.colors.warning,
                  },
                ]}
                onPress={handleTogglePaid}
              >
                <Text style={styles.footerButtonText}>
                  {initialData.is_active ? "Mark as Paid" : "Mark as Unpaid"}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.footerButton,
                styles.saveButton,
                !initialData && { flex: 1 },
              ]}
              onPress={handleSave}
            >
              <Text style={styles.footerButtonText}>
                {initialData ? "Save Changes" : "Create Reminder"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      <PickerModal
        isVisible={isPickerVisible}
        onClose={() => setPickerVisible(false)}
        theme={theme}
        data={pickerData}
      />
    </Modal>
  );
};

// --- Styles ---
const createScreenStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 18,
      borderBottomWidth: 1,
      justifyContent: "space-between",
    },
    headerButton: {
      width: 44,
      height: 44,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
    filterContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      paddingBottom: 100,
    },
    emptyState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingTop: 80,
      paddingHorizontal: 40,
    },
    emptyStateTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.text,
      marginTop: 16,
      textAlign: "center",
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 6,
      textAlign: "center",
      lineHeight: 20,
    },
    fab: {
      position: "absolute",
      bottom: 30,
      right: 30,
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      elevation: 10,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
  });

const createPillStyles = (theme) =>
  StyleSheet.create({
    base: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    activeBase: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    text: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    activeText: { color: "#fff" },
    badge: {
      minWidth: 22,
      height: 22,
      paddingHorizontal: 6,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.borderLight,
      marginLeft: 8,
    },
    activeBadge: { backgroundColor: "rgba(255,255,255,0.25)" },
    badgeText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.textSecondary,
    },
    activeBadgeText: { color: "#fff" },
  });

const createModalStyles = (theme) =>
  StyleSheet.create({
    modalBackdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalView: {
      height: "92%",
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 20,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    modalTitle: { fontSize: 22, fontWeight: "800", color: theme.colors.text },
    inputGroup: { marginBottom: 16 },
    inlineGroup: { flexDirection: "row", gap: 16 },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    helpText: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      maxWidth: "80%",
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
    },
    multilineInput: { height: 100, textAlignVertical: "top", paddingTop: 14 },
    datePickerButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    dateText: { color: theme.colors.text, fontSize: 16 },
    picker: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: theme.colors.background,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    pickerText: { color: theme.colors.text, fontSize: 16 },
    switchGroup: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.colors.borderLight,
      marginBottom: 20,
    },
    footerContainer: {
      flexDirection: "row",
      gap: 12,
      marginTop: 12,
    },
    footerButton: {
      flex: 1,
      borderRadius: 12,
      padding: 18,
      alignItems: "center",
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
    },
    footerButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "bold",
    },
  });

const createPickerModalStyles = (theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalView: {
      width: "80%",
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      padding: 20,
      maxHeight: "60%",
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 16,
    },
    option: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    selectedOption: {
      backgroundColor: theme.colors.primary + "20",
      borderRadius: 8,
    },
    optionText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    selectedOptionText: {
      color: theme.colors.primary,
      fontWeight: "600",
    },
  });
