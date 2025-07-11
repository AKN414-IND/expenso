import React, { useEffect, useState } from "react";
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
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import Alert from "../components/Alert";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import { useTheme } from "../context/ThemeContext";
import {
  setupNotificationCategories,
  scheduleNotification as scheduleReminderNotification,
  cleanupNotifications,
  requestNotificationPermissions,
  BACKGROUND_FETCH_TASK,
} from "../services/NotificationService";
import {
  Bell,
  Plus,
  Edit3,
  Trash2,
  Calendar,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react-native";

const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly", icon: "📅" },
  { value: "weekly", label: "Weekly", icon: "📋" },
  { value: "yearly", label: "Yearly", icon: "🗓️" },
  { value: "one-time", label: "One Time", icon: "⏰" },
];

const CATEGORY_OPTIONS = [
  { value: "Bills", label: "Bills" },
  { value: "Subscription", label: "Subscription" },
  { value: "Loan", label: "Loan" },
  { value: "Rent", label: "Rent" },
  { value: "Other", label: "Other" },
];

export default function PaymentReminderScreen({ navigation }) {
  const { session } = useAuth();
  const { theme } = useTheme();

  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [notificationPermission, setNotificationPermission] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [form, setForm] = useState({
    title: "",
    amount: "",
    frequency: "monthly",
    next_due_date: "",
    reminder_time: "09:00",
    description: "",
    notification_enabled: true,
    category: "",
  });

  useEffect(() => {
    if (session?.user) {
      initializeNotifications();
      fetchReminders();
    }
    return () => {
      Notifications.removeAllNotificationListeners &&
        Notifications.removeAllNotificationListeners();
    };
  }, [session]);

  const initializeNotifications = async () => {
    try {
      await setupNotificationCategories();
      const status = await requestNotificationPermissions();
      setNotificationPermission(status);
      if (status !== "granted") {
        Alert({
          title: "Notification Permission Required",
          message: "Please enable notifications to receive payment reminders.",
          onConfirm: () => Notifications.openSettingsAsync(),
          confirmText: "Settings",
          cancelText: "Cancel",
          open: true,
        });
      }
      const subscription =
        Notifications.addNotificationResponseReceivedListener(
          handleNotificationResponse
        );
      return () => subscription.remove();
    } catch (error) {}
  };

  const handleNotificationResponse = async (response) => {
    const { screen, params, reminderId } = response.notification.request.content.data || {};
    const actionIdentifier = response.actionIdentifier;
  
    if (actionIdentifier === "mark_paid") {
      await markReminderAsPaid(reminderId);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "✅ Marked as Paid!",
          body: "Your payment reminder has been marked as paid. Great job! 🎉",
          sound: "default"
        },
        trigger: null,
      });
      fetchReminders(); 
    } else if (actionIdentifier === "urgent_pay" || actionIdentifier === "view_details") {
      navigation.navigate("PaymentReminder", params);
    } else if (actionIdentifier === "snooze") {
      await snoozeReminder(reminderId);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "😴 Snoozed!",
          body: "We’ll remind you again in 1 hour. Don’t forget to pay! ⏰",
          sound: "default"
        },
        trigger: null,
      });
      fetchReminders();
    } else if (screen) {
      navigation.navigate(screen, params);
    }
  };
  
  const scheduleNotification = async (reminder) => {
    return await scheduleReminderNotification(reminder, form.reminder_time);
  };

  const markReminderAsPaid = async (reminderId) => {
    try {
      await supabase
        .from("payment_reminders")
        .update({ is_active: false })
        .eq("id", reminderId);
      await fetchReminders(); 
    } catch (error) {}
  };
  
  const snoozeReminder = async (reminderId) => {
    try {
      const reminder = reminders.find((r) => r.id === reminderId);
      if (reminder) {
        const snoozeTime = new Date();
        snoozeTime.setHours(snoozeTime.getHours() + 1);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "💰 Payment Reminder (Snoozed)",
            body: `${reminder.title} - Don't forget to pay!`,
            data: { reminderId: reminder.id, type: "snoozed" },
            sound: "default"
          },
          trigger: snoozeTime,
        });
      }
    } catch (error) {}
  };
  

  const fetchReminders = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_reminders")
        .select("*")
        .eq("user_id", session.user.id)
        .order("next_due_date", { ascending: true });
      if (!error && data) {
        setReminders(data);
        await cleanupNotifications(data);
        checkOverdueReminders(data);
      } else {
        setReminders([]);
        if (error?.code !== "PGRST116") {
          Alert({
            title: "Error",
            message: "Failed to load reminders. Please try again.",
            open: true,
          });
        }
      }
    } catch (err) {
      setReminders([]);
      Alert({
        title: "Error",
        message: "Network error. Please check your connection.",
        open: true,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReminders();
  };

  const checkOverdueReminders = (reminderList) => {
    const today = new Date().toISOString().split("T")[0];
    const overdueReminders = reminderList.filter(
      (reminder) =>
        reminder.is_active &&
        reminder.next_due_date < today &&
        reminder.notification_enabled !== false
    );
    if (overdueReminders.length > 0) sendOverdueNotifications(overdueReminders);
  };

  const sendOverdueNotifications = async (overdueReminders) => {
    try {
      for (const reminder of overdueReminders) {
        const daysPast = Math.floor(
          (new Date() - new Date(reminder.next_due_date)) /
            (1000 * 60 * 60 * 24)
        );
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "⚠️ Overdue Payment Reminder",
            body: `${reminder.title} was due ${daysPast} day(s) ago. Amount: ₹${
              reminder.amount || "Not specified"
            }`,
            data: { reminderId: reminder.id, type: "overdue" },
          },
          trigger: null,
        });
      }
    } catch (error) {}
  };

  const calculateNextDueDate = (currentDate, frequency) => {
    const date = new Date(currentDate);
    switch (frequency) {
      case "weekly":
        date.setDate(date.getDate() + 7);
        break;
      case "monthly":
        date.setMonth(date.getMonth() + 1);
        break;
      case "yearly":
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        return null;
    }
    return date.toISOString().split("T")[0];
  };

  const validateForm = () => {
    const errors = [];
    if (!form.title.trim()) errors.push("Title is required");
    if (!form.next_due_date.trim()) errors.push("Due date is required");
    if (!form.category?.trim()) errors.push("Category is required");
    if (
      form.amount &&
      (isNaN(parseFloat(form.amount)) || parseFloat(form.amount) < 0)
    )
      errors.push("Amount must be a valid positive number");
    if (errors.length > 0) {
      Alert({
        title: "Validation Error",
        message: errors.join("\n"),
        open: true,
      });
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setForm({
      title: "",
      amount: "",
      frequency: "monthly",
      next_due_date: "",
      reminder_time: "09:00",
      description: "",
      notification_enabled: true,
      category: "",
    });
    setEditingReminder(null);
    setSelectedDate(new Date());
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (reminder) => {
    setEditingReminder(reminder);
    setSelectedDate(new Date(reminder.next_due_date));
    setForm({
      title: reminder.title || "",
      amount: reminder.amount?.toString() || "",
      frequency: reminder.frequency || "monthly",
      next_due_date: reminder.next_due_date || "",
      reminder_time: reminder.reminder_time || "09:00",
      description: reminder.description || "",
      notification_enabled: reminder.notification_enabled !== false,
      category: reminder.category || "",
    });
    setModalVisible(true);
  };

  const saveReminder = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const reminderData = {
        title: form.title.trim(),
        amount: form.amount ? parseFloat(form.amount) : null,
        frequency: form.frequency,
        next_due_date: form.next_due_date,
        description: form.description.trim(),
        is_active: true,
        user_id: session.user.id,
        notification_enabled: form.notification_enabled,
        updated_at: new Date().toISOString(),
        category: form.category,
        reminder_time: form.reminder_time,
      };
      let savedReminder, error;
      if (editingReminder) {
        const { data, error: updateError } = await supabase
          .from("payment_reminders")
          .update(reminderData)
          .eq("id", editingReminder.id)
          .select()
          .single();
        error = updateError;
        savedReminder = data;
      } else {
        reminderData.created_at = new Date().toISOString();
        const { data, error: insertError } = await supabase
          .from("payment_reminders")
          .insert([reminderData])
          .select()
          .single();
        error = insertError;
        savedReminder = data;
      }
      if (!error && savedReminder) {
        const notificationId = await scheduleNotification({
          ...savedReminder,
          notification_enabled: form.notification_enabled,
        });
        if (notificationId) {
          await supabase
            .from("payment_reminders")
            .update({ notification_id: notificationId })
            .eq("id", savedReminder.id);
        }
        if (form.frequency !== "one-time") {
          const nextDueDate = calculateNextDueDate(
            form.next_due_date,
            form.frequency
          );
          if (nextDueDate) {
            await supabase
              .from("payment_reminders")
              .update({ next_due_date: nextDueDate })
              .eq("id", savedReminder.id);
          }
        }
        setModalVisible(false);
        resetForm();
        fetchReminders();
        Alert({
          title: "Success",
          message: `Reminder ${
            editingReminder ? "updated" : "created"
          } successfully!`,
          open: true,
        });
      } else {
        Alert({
          title: "Error",
          message:
            error?.message || "Failed to save reminder. Please try again.",
          open: true,
        });
      }
    } catch (err) {
      Alert({
        title: "Error",
        message: "Network error. Please try again.",
        open: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteReminder = async (reminderId) => {
    try {
      const reminderToDelete = reminders.find((r) => r.id === reminderId);
      if (reminderToDelete?.notification_id) {
        await Notifications.cancelScheduledNotificationAsync(
          reminderToDelete.notification_id
        );
      }
      const { error } = await supabase
        .from("payment_reminders")
        .delete()
        .eq("id", reminderId);
      if (!error) {
        fetchReminders();
        Alert({
          title: "Success",
          message: "Reminder deleted successfully!",
          open: true,
        });
      } else {
        Alert({
          title: "Error",
          message: "Failed to delete reminder. Please try again.",
          open: true,
        });
      }
    } catch (err) {
      Alert({
        title: "Error",
        message: "Network error. Please try again.",
        open: true,
      });
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setSelectedDate(selectedDate);
      setForm({
        ...form,
        next_due_date: selectedDate.toISOString().split("T")[0],
      });
    }
  };
  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, "0");
      const minutes = selectedTime.getMinutes().toString().padStart(2, "0");
      setForm({ ...form, reminder_time: `${hours}:${minutes}` });
    }
  };

  function formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return dateString;
    }
  }
  function getDaysUntilDue(dateString) {
    try {
      const today = new Date();
      const dueDate = new Date(dateString);
      const diffTime = dueDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (error) {
      return 0;
    }
  }
  function getStatusColor(reminder) {
    if (!reminder.is_active) return theme.colors.textTertiary;
    const daysUntil = getDaysUntilDue(reminder.next_due_date);
    if (daysUntil < 0) return theme.colors.error;
    if (daysUntil <= 3) return theme.colors.warning;
    return theme.colors.success;
  }
  function getStatusText(reminder) {
    if (!reminder.is_active) return "Inactive";
    const daysUntil = getDaysUntilDue(reminder.next_due_date);
    if (daysUntil < 0) return `${Math.abs(daysUntil)} days overdue`;
    if (daysUntil === 0) return "Due today";
    if (daysUntil === 1) return "Due tomorrow";
    return `${daysUntil} days left`;
  }
  function getFrequencyIcon(frequency) {
    const option = FREQUENCY_OPTIONS.find((opt) => opt.value === frequency);
    return option ? option.icon : "📅";
  }
  const toggleReminderStatus = async (reminder) => {
    try {
      const newStatus = !reminder.is_active;
      if (reminder.notification_id) {
        if (newStatus) {
          const notificationId = await scheduleNotification(reminder);
          await supabase
            .from("payment_reminders")
            .update({
              is_active: newStatus,
              notification_id: notificationId,
            })
            .eq("id", reminder.id);
        } else {
          await Notifications.cancelScheduledNotificationAsync(
            reminder.notification_id
          );
          await supabase
            .from("payment_reminders")
            .update({
              is_active: newStatus,
              notification_id: null,
            })
            .eq("id", reminder.id);
        }
      } else {
        await supabase
          .from("payment_reminders")
          .update({ is_active: newStatus })
          .eq("id", reminder.id);
      }
      fetchReminders();
    } catch (err) {
      Alert({
        title: "Error",
        message: "Failed to update reminder status.",
        open: true,
      });
    }
  };

  const renderReminder = ({ item }) => (
    <View
      style={[
        styles.reminderCard,
        {
          backgroundColor: theme.colors.surface,
          borderLeftColor: getStatusColor(item),
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.reminderHeader}>
        <View style={styles.reminderTitleRow}>
          <Text style={styles.reminderIcon}>
            {getFrequencyIcon(item.frequency)}
          </Text>
          <View style={styles.reminderTitleContainer}>
            <Text
              style={[
                styles.reminderTitle,
                !item.is_active && styles.inactiveText,
                { color: theme.colors.text },
              ]}
            >
              {item.title}
            </Text>
            {item.description && (
              <Text
                style={[
                  styles.reminderDescription,
                  { color: theme.colors.textTertiary },
                ]}
              >
                {item.description}
              </Text>
            )}
          </View>
          <View style={styles.reminderStatusContainer}>
            <TouchableOpacity
              style={[
                styles.statusToggle,
                { backgroundColor: getStatusColor(item) },
              ]}
              onPress={() => toggleReminderStatus(item)}
            >
              <CheckCircle2
                size={16}
                color="#fff"
                style={{ opacity: item.is_active ? 1 : 0.6 }}
              />
            </TouchableOpacity>
            {item.notification_enabled === false && (
              <AlertCircle
                size={16}
                color={theme.colors.warning}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>
        <View style={styles.reminderDetails}>
          <View style={styles.reminderInfo}>
            <Calendar size={14} color={theme.colors.textTertiary} />
            <Text
              style={[
                styles.reminderDate,
                { color: theme.colors.textTertiary },
              ]}
            >
              {formatDate(item.next_due_date)}
            </Text>
          </View>
          {item.amount && (
            <View style={styles.reminderInfo}>
              <Text
                style={[styles.reminderAmount, { color: theme.colors.primary }]}
              >
                ₹{item.amount}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.statusText, { color: getStatusColor(item) }]}>
          {getStatusText(item)}
        </Text>
      </View>
      <View style={styles.reminderActions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: theme.colors.buttonSecondary },
          ]}
          onPress={() => openEditModal(item)}
        >
          <Edit3 size={16} color={theme.colors.primary} />
          <Text
            style={[styles.actionButtonText, { color: theme.colors.primary }]}
          >
            Edit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.deleteButton,
            { backgroundColor: theme.colors.error + "18" },
          ]}
          onPress={() => {
            setReminderToDelete(item);
            setShowDeleteAlert(true);
          }}
        >
          <Trash2 size={16} color={theme.colors.error} />
          <Text
            style={[
              styles.actionButtonText,
              styles.deleteButtonText,
              { color: theme.colors.error },
            ]}
          >
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text
          style={[styles.loadingText, { color: theme.colors.textTertiary }]}
        >
          Loading reminders...
        </Text>
      </View>
    );
  }

  return (
    <>
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.backButton,
              { backgroundColor: theme.colors.buttonSecondary },
            ]}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Payment Reminders
          </Text>
          <TouchableOpacity
            style={[
              styles.addHeaderButton,
              { backgroundColor: theme.colors.buttonSecondary },
            ]}
            onPress={openAddModal}
          >
            <Plus size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        {notificationPermission !== "granted" && (
          <View
            style={[
              styles.permissionBanner,
              {
                backgroundColor: theme.colors.warning + "22",
                borderBottomColor: theme.colors.warning,
              },
            ]}
          >
            <AlertCircle size={20} color={theme.colors.warning} />
            <Text
              style={[styles.permissionText, { color: theme.colors.warning }]}
            >
              Enable notifications to receive payment reminders
            </Text>
            <TouchableOpacity
              style={[
                styles.enableButton,
                { backgroundColor: theme.colors.warning },
              ]}
              onPress={initializeNotifications}
            >
              <Text style={styles.enableButtonText}>Enable</Text>
            </TouchableOpacity>
          </View>
        )}
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {reminders.length > 0 ? (
            <FlatList
              data={reminders}
              renderItem={renderReminder}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Bell size={64} color={theme.colors.border} />
              <Text
                style={[
                  styles.emptyStateTitle,
                  { color: theme.colors.textTertiary },
                ]}
              >
                No Payment Reminders
              </Text>
              <Text
                style={[
                  styles.emptyStateText,
                  { color: theme.colors.textTertiary },
                ]}
              >
                Create your first payment reminder to stay on top of your bills
                and subscriptions.
              </Text>
              <TouchableOpacity
                style={[
                  styles.emptyStateButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={openAddModal}
              >
                <Plus size={20} color="white" />
                <Text style={styles.emptyStateButtonText}>Add Reminder</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={openAddModal}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {editingReminder ? "Edit Reminder" : "Add Reminder"}
              </Text>
              <TouchableOpacity
                style={[
                  styles.modalCloseButton,
                  { backgroundColor: theme.colors.buttonSecondary },
                ]}
                onPress={() => setModalVisible(false)}
              >
                <Text
                  style={[
                    styles.modalCloseText,
                    { color: theme.colors.textTertiary },
                  ]}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Title *
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
                  placeholder="e.g., Netflix Subscription"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={form.title}
                  onChangeText={(text) => setForm({ ...form, title: text })}
                  maxLength={100}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Amount (Optional)
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
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={form.amount}
                  onChangeText={(text) => setForm({ ...form, amount: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Category *
                </Text>
                <View style={[styles.frequencyOptions, { marginBottom: 8 }]}>
                  {CATEGORY_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.frequencyOption,
                        form.category === option.value && {
                          backgroundColor: theme.colors.primary,
                          borderColor: theme.colors.primaryDark,
                        },
                        {
                          backgroundColor:
                            form.category === option.value
                              ? theme.colors.primary
                              : theme.colors.buttonSecondary,
                          borderColor:
                            form.category === option.value
                              ? theme.colors.primaryDark
                              : theme.colors.borderLight,
                        },
                      ]}
                      onPress={() =>
                        setForm({ ...form, category: option.value })
                      }
                    >
                      <Text
                        style={[
                          styles.frequencyLabel,
                          form.category === option.value && { color: "#fff" },
                          {
                            color:
                              form.category === option.value
                                ? "#fff"
                                : theme.colors.textTertiary,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Frequency
                </Text>
                <View style={styles.frequencyOptions}>
                  {FREQUENCY_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.frequencyOption,
                        form.frequency === option.value && {
                          backgroundColor: theme.colors.primary,
                          borderColor: theme.colors.primaryDark,
                        },
                        {
                          backgroundColor:
                            form.frequency === option.value
                              ? theme.colors.primary
                              : theme.colors.buttonSecondary,
                          borderColor:
                            form.frequency === option.value
                              ? theme.colors.primaryDark
                              : theme.colors.borderLight,
                        },
                      ]}
                      onPress={() =>
                        setForm({ ...form, frequency: option.value })
                      }
                    >
                      <Text style={styles.frequencyIcon}>{option.icon}</Text>
                      <Text
                        style={[
                          styles.frequencyLabel,
                          form.frequency === option.value && { color: "#fff" },
                          {
                            color:
                              form.frequency === option.value
                                ? "#fff"
                                : theme.colors.textTertiary,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Due Date *
                </Text>
                <TouchableOpacity
                  style={[
                    styles.datePickerButton,
                    {
                      backgroundColor: theme.colors.buttonSecondary,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Calendar size={20} color={theme.colors.textTertiary} />
                  <Text
                    style={[
                      styles.datePickerText,
                      { color: theme.colors.text },
                    ]}
                  >
                    {form.next_due_date
                      ? formatDate(form.next_due_date)
                      : "Select Date"}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    minimumDate={new Date()}
                  />
                )}
              </View>
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Reminder Time *
                </Text>
                <TouchableOpacity
                  style={[
                    styles.datePickerButton,
                    {
                      backgroundColor: theme.colors.buttonSecondary,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Clock size={20} color={theme.colors.textTertiary} />
                  <Text
                    style={[
                      styles.datePickerText,
                      { color: theme.colors.text },
                    ]}
                  >
                    {form.reminder_time || "Select Time"}
                  </Text>
                </TouchableOpacity>
                {showTimePicker && (
                  <DateTimePicker
                    value={
                      form.reminder_time
                        ? new Date(`1970-01-01T${form.reminder_time}:00`)
                        : new Date()
                    }
                    mode="time"
                    display="default"
                    onChange={onTimeChange}
                  />
                )}
              </View>
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Description (Optional)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    {
                      backgroundColor: theme.colors.buttonSecondary,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="Additional notes..."
                  placeholderTextColor={theme.colors.textTertiary}
                  value={form.description}
                  onChangeText={(text) =>
                    setForm({ ...form, description: text })
                  }
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                />
              </View>
              <View style={styles.inputGroup}>
                <View style={styles.switchContainer}>
                  <Text
                    style={[
                      styles.inputLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Enable Notifications
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.switch,
                      form.notification_enabled && {
                        backgroundColor: theme.colors.primary,
                      },
                      !form.notification_enabled && {
                        backgroundColor: theme.colors.border,
                      },
                    ]}
                    onPress={() =>
                      setForm({
                        ...form,
                        notification_enabled: !form.notification_enabled,
                      })
                    }
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        form.notification_enabled && styles.switchThumbActive,
                      ]}
                    />
                  </TouchableOpacity>
                </View>
                {notificationPermission !== "granted" && (
                  <Text
                    style={[
                      styles.permissionWarning,
                      { color: theme.colors.warning },
                    ]}
                  >
                    ⚠️ Notification permission required
                  </Text>
                )}
              </View>
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  {
                    backgroundColor: theme.colors.buttonSecondary,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => setModalVisible(false)}
                disabled={saving}
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
                  saving && { backgroundColor: theme.colors.textTertiary },
                ]}
                onPress={saveReminder}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingReminder ? "Update" : "Create"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Alert
        open={showDeleteAlert}
        onConfirm={async () => {
          setShowDeleteAlert(false);
          if (reminderToDelete) {
            await deleteReminder(reminderToDelete.id);
            setReminderToDelete(null);
          }
        }}
        onCancel={() => {
          setShowDeleteAlert(false);
          setReminderToDelete(null);
        }}
        title="Delete Reminder"
        message={`Are you sure you want to delete "${reminderToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        icon={<Trash2 color="#fff" size={40} />}
        iconBg={theme.colors.error}
        confirmColor={theme.colors.error}
        confirmTextColor="#fff"
        cancelColor={theme.colors.buttonSecondary}
        cancelTextColor={theme.colors.textSecondary}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: "500" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomWidth: 1,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  addHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  permissionBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  permissionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  enableButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  enableButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  reminderCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  reminderHeader: { marginBottom: 12 },
  reminderTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  reminderIcon: { fontSize: 20, marginRight: 12, marginTop: 2 },
  reminderTitleContainer: { flex: 1 },
  reminderTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  inactiveText: { opacity: 0.6, textDecorationLine: "line-through" },
  reminderDescription: { fontSize: 14, fontWeight: "500", lineHeight: 18 },
  reminderStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  statusToggle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  reminderDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reminderInfo: { flexDirection: "row", alignItems: "center" },
  reminderDate: { fontSize: 14, fontWeight: "600", marginLeft: 6 },
  reminderAmount: { fontSize: 16, fontWeight: "700", letterSpacing: -0.2 },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reminderActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteButton: {},
  actionButtonText: { fontSize: 12, fontWeight: "600", marginLeft: 4 },
  deleteButtonText: {},
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyStateButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 6,
  },
  emptyStateButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    borderRadius: 20,
    width: "95%",
    maxHeight: "90%",
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseText: { fontSize: 16, fontWeight: "600" },
  modalForm: { paddingHorizontal: 24, paddingVertical: 16, maxHeight: 400 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16 },
  textArea: { height: 80, textAlignVertical: "top" },
  frequencyOptions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  frequencyOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 100,
  },
  frequencyLabel: { fontSize: 14, fontWeight: "600" },
  frequencyIcon: { fontSize: 16, marginRight: 8 },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  datePickerText: { fontSize: 16, marginLeft: 12 },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  switchActive: {},
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "white",
    alignSelf: "flex-start",
  },
  switchThumbActive: { alignSelf: "flex-end" },
  permissionWarning: { fontSize: 12, fontWeight: "500", marginTop: 4 },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: { borderWidth: 1 },
  saveButton: {},
  saveButtonDisabled: {},
  cancelButtonText: { fontSize: 16, fontWeight: "600" },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
