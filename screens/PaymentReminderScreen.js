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

  // ----- Notification Integration -----

  useEffect(() => {
    if (session?.user) {
      initializeNotifications();
      fetchReminders();
    }
    // Remove notification listener on unmount
    return () => {
      Notifications.removeAllNotificationListeners && Notifications.removeAllNotificationListeners();
    };
    // eslint-disable-next-line
  }, [session]);

  // 1. Notification Setup & Permission
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
      // Add notification response handler
      const subscription = Notifications.addNotificationResponseReceivedListener(
        handleNotificationResponse
      );
      return () => subscription.remove();
    } catch (error) {
      console.error("Error initializing notifications:", error);
    }
  };

  // 2. Notification Response Handler
  const handleNotificationResponse = (response) => {
    const { screen, params, reminderId } = response.notification.request.content.data || {};
    const actionIdentifier = response.actionIdentifier;
    if (actionIdentifier === "mark_paid") {
      markReminderAsPaid(reminderId);
    } else if (actionIdentifier === "urgent_pay" || actionIdentifier === "view_details") {
      navigation.navigate("PaymentReminder", params);
    } else if (actionIdentifier === "snooze") {
      snoozeReminder(reminderId);
    } else if (screen) {
      navigation.navigate(screen, params);
    }
  };

  // 3. Notification Scheduling
  const scheduleNotification = async (reminder) => {
    return await scheduleReminderNotification(reminder, form.reminder_time);
  };

  // 4. Helper: Mark as Paid
  const markReminderAsPaid = async (reminderId) => {
    try {
      await supabase.from("payment_reminders").update({ is_active: false }).eq("id", reminderId);
      fetchReminders();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "✅ Payment Marked as Paid",
          body: "Reminder has been marked as completed.",
        },
        trigger: null,
      });
    } catch (error) {
      console.error("Error marking reminder as paid:", error);
    }
  };

  // 5. Helper: Snooze
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
          },
          trigger: snoozeTime,
        });
      }
    } catch (error) {
      console.error("Error snoozing reminder:", error);
    }
  };

  // 6. Reminder CRUD
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
      Alert({ title: "Error", message: "Network error. Please check your connection.", open: true });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ----- UI & Other Logic -----

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
          (new Date() - new Date(reminder.next_due_date)) / (1000 * 60 * 60 * 24)
        );
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "⚠️ Overdue Payment Reminder",
            body: `${reminder.title} was due ${daysPast} day(s) ago. Amount: ₹${reminder.amount || "Not specified"}`,
            data: { reminderId: reminder.id, type: "overdue" },
          },
          trigger: null,
        });
      }
    } catch (error) {
      console.error("Error sending overdue notifications:", error);
    }
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
    if (form.amount && (isNaN(parseFloat(form.amount)) || parseFloat(form.amount) < 0)) errors.push("Amount must be a valid positive number");
    if (errors.length > 0) {
      Alert({ title: "Validation Error", message: errors.join("\n"), open: true });
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
        // Schedule notification
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
        // Next due for recurring
        if (form.frequency !== "one-time") {
          const nextDueDate = calculateNextDueDate(form.next_due_date, form.frequency);
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
          message: `Reminder ${editingReminder ? "updated" : "created"} successfully!`,
          open: true,
        });
      } else {
        Alert({
          title: "Error",
          message: error?.message || "Failed to save reminder. Please try again.",
          open: true,
        });
      }
    } catch (err) {
      Alert({ title: "Error", message: "Network error. Please try again.", open: true });
    } finally {
      setSaving(false);
    }
  };

  const deleteReminder = async (reminderId) => {
    try {
      const reminderToDelete = reminders.find((r) => r.id === reminderId);
      if (reminderToDelete?.notification_id) {
        await Notifications.cancelScheduledNotificationAsync(reminderToDelete.notification_id);
      }
      const { error } = await supabase
        .from("payment_reminders")
        .delete()
        .eq("id", reminderId);
      if (!error) {
        fetchReminders();
        Alert({ title: "Success", message: "Reminder deleted successfully!", open: true });
      } else {
        Alert({ title: "Error", message: "Failed to delete reminder. Please try again.", open: true });
      }
    } catch (err) {
      Alert({ title: "Error", message: "Network error. Please try again.", open: true });
    }
  };

  // Date/time input handlers
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setSelectedDate(selectedDate);
      setForm({ ...form, next_due_date: selectedDate.toISOString().split("T")[0] });
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

  // --- Render ---

  const renderReminder = ({ item }) => (
    <View style={[styles.reminderCard, { borderLeftColor: getStatusColor(item) }]}>
      <View style={styles.reminderHeader}>
        <View style={styles.reminderTitleRow}>
          <Text style={styles.reminderIcon}>{getFrequencyIcon(item.frequency)}</Text>
          <View style={styles.reminderTitleContainer}>
            <Text style={[styles.reminderTitle, !item.is_active && styles.inactiveText]}>
              {item.title}
            </Text>
            {item.description && (
              <Text style={styles.reminderDescription}>{item.description}</Text>
            )}
          </View>
          <View style={styles.reminderStatusContainer}>
            <TouchableOpacity
              style={[styles.statusToggle, { backgroundColor: getStatusColor(item) }]}
              onPress={() => toggleReminderStatus(item)}
            >
              <CheckCircle2 size={16} color="white" style={{ opacity: item.is_active ? 1 : 0.6 }} />
            </TouchableOpacity>
            {item.notification_enabled === false && (
              <AlertCircle size={16} color="#f59e0b" style={{ marginLeft: 4 }} />
            )}
          </View>
        </View>
        <View style={styles.reminderDetails}>
          <View style={styles.reminderInfo}>
            <Calendar size={14} color="#64748b" />
            <Text style={styles.reminderDate}>{formatDate(item.next_due_date)}</Text>
          </View>
          {item.amount && (
            <View style={styles.reminderInfo}>
              <Text style={styles.reminderAmount}>₹{item.amount}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.statusText, { color: getStatusColor(item) }]}>
          {getStatusText(item)}
        </Text>
      </View>
      <View style={styles.reminderActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
          <Edit3 size={16} color="#06b6d4" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => {
            setReminderToDelete(item);
            setShowDeleteAlert(true);
          }}
        >
          <Trash2 size={16} color="#ef4444" />
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // --- Util UI ---
  function formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
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
    if (!reminder.is_active) return "#94a3b8";
    const daysUntil = getDaysUntilDue(reminder.next_due_date);
    if (daysUntil < 0) return "#ef4444";
    if (daysUntil <= 3) return "#f59e0b";
    return "#10b981";
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
          await Notifications.cancelScheduledNotificationAsync(reminder.notification_id);
          await supabase
            .from("payment_reminders")
            .update({
              is_active: newStatus,
              notification_id: null,
            })
            .eq("id", reminder.id);
        }
      } else {
        await supabase.from("payment_reminders").update({ is_active: newStatus }).eq("id", reminder.id);
      }
      fetchReminders();
    } catch (err) {
      Alert({ title: "Error", message: "Failed to update reminder status.", open: true });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading reminders...</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Reminders</Text>
          <TouchableOpacity style={styles.addHeaderButton} onPress={openAddModal}>
            <Plus size={24} color="#06b6d4" />
          </TouchableOpacity>
        </View>
        {/* Notification Banner */}
        {notificationPermission !== "granted" && (
          <View style={styles.permissionBanner}>
            <AlertCircle size={20} color="#f59e0b" />
            <Text style={styles.permissionText}>
              Enable notifications to receive payment reminders
            </Text>
            <TouchableOpacity style={styles.enableButton} onPress={initializeNotifications}>
              <Text style={styles.enableButtonText}>Enable</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* List */}
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
            <View style={styles.emptyState}>
              <Bell size={64} color="#cbd5e1" />
              <Text style={styles.emptyStateTitle}>No Payment Reminders</Text>
              <Text style={styles.emptyStateText}>
                Create your first payment reminder to stay on top of your bills and subscriptions.
              </Text>
              <TouchableOpacity style={styles.emptyStateButton} onPress={openAddModal}>
                <Plus size={20} color="white" />
                <Text style={styles.emptyStateButtonText}>Add Reminder</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
        <TouchableOpacity style={styles.fab} onPress={openAddModal}>
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Add/Edit Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingReminder ? "Edit Reminder" : "Add Reminder"}
              </Text>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Netflix Subscription"
                  value={form.title}
                  onChangeText={(text) => setForm({ ...form, title: text })}
                  maxLength={100}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={form.amount}
                  onChangeText={(text) => setForm({ ...form, amount: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category *</Text>
                <View style={[styles.frequencyOptions, { marginBottom: 8 }]}>
                  {CATEGORY_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.frequencyOption,
                        form.category === option.value && styles.frequencyOptionSelected,
                      ]}
                      onPress={() => setForm({ ...form, category: option.value })}
                    >
                      <Text
                        style={[
                          styles.frequencyLabel,
                          form.category === option.value && styles.frequencyLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Frequency</Text>
                <View style={styles.frequencyOptions}>
                  {FREQUENCY_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.frequencyOption,
                        form.frequency === option.value && styles.frequencyOptionSelected,
                      ]}
                      onPress={() => setForm({ ...form, frequency: option.value })}
                    >
                      <Text style={styles.frequencyIcon}>{option.icon}</Text>
                      <Text
                        style={[
                          styles.frequencyLabel,
                          form.frequency === option.value && styles.frequencyLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Due Date *</Text>
                <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
                  <Calendar size={20} color="#64748b" />
                  <Text style={styles.datePickerText}>
                    {form.next_due_date ? formatDate(form.next_due_date) : "Select Date"}
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
                <Text style={styles.inputLabel}>Reminder Time *</Text>
                <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowTimePicker(true)}>
                  <Clock size={20} color="#64748b" />
                  <Text style={styles.datePickerText}>{form.reminder_time || "Select Time"}</Text>
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
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Additional notes..."
                  value={form.description}
                  onChangeText={(text) => setForm({ ...form, description: text })}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                />
              </View>
              <View style={styles.inputGroup}>
                <View style={styles.switchContainer}>
                  <Text style={styles.inputLabel}>Enable Notifications</Text>
                  <TouchableOpacity
                    style={[styles.switch, form.notification_enabled && styles.switchActive]}
                    onPress={() =>
                      setForm({
                        ...form,
                        notification_enabled: !form.notification_enabled,
                      })
                    }
                  >
                    <View
                      style={[styles.switchThumb, form.notification_enabled && styles.switchThumbActive]}
                    />
                  </TouchableOpacity>
                </View>
                {notificationPermission !== "granted" && (
                  <Text style={styles.permissionWarning}>
                    ⚠️ Notification permission required
                  </Text>
                )}
              </View>
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={saveReminder}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
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

      {/* Custom Alert for Delete */}
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
        iconBg="#ef4444"
        confirmColor="#ef4444"
        confirmTextColor="#fff"
        cancelColor="#f1f5f9"
        cancelTextColor="#334155"
      />
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
    marginTop: 16,
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
    paddingBottom: 24,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.1)",
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    letterSpacing: -0.3,
  },
  addHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  permissionBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#fbbf24",
  },
  permissionText: {
    flex: 1,
    fontSize: 14,
    color: "#92400e",
    fontWeight: "500",
    marginLeft: 8,
  },
  enableButton: {
    backgroundColor: "#f59e0b",
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
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.1)",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  reminderHeader: {
    marginBottom: 12,
  },
  reminderTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  reminderIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  reminderTitleContainer: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  inactiveText: {
    opacity: 0.6,
    textDecorationLine: "line-through",
  },
  reminderDescription: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
    lineHeight: 18,
  },
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
  reminderInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  reminderDate: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
    marginLeft: 6,
  },
  reminderAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#06b6d4",
    letterSpacing: -0.2,
  },
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
    borderTopColor: "rgba(148, 163, 184, 0.1)",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
  },
  deleteButton: {
    backgroundColor: "#fef2f2",
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#06b6d4",
    marginLeft: 4,
  },
  deleteButtonText: {
    color: "#ef4444",
  },
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
    color: "#64748b",
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyStateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#06b6d4",
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
    backgroundColor: "#06b6d4",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#06b6d4",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
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
    borderBottomColor: "rgba(148, 163, 184, 0.1)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "600",
  },
  modalForm: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    maxHeight: 400,
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
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#f8fafc",
    color: "#1e293b",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  frequencyOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  frequencyOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minWidth: 100,
  },
  frequencyOptionSelected: {
    backgroundColor: "#06b6d4",
    borderColor: "#06b6d4",
  },
  frequencyIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  frequencyLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  frequencyLabelSelected: {
    color: "white",
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#f8fafc",
  },
  datePickerText: {
    fontSize: 16,
    color: "#1e293b",
    marginLeft: 12,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: "#06b6d4",
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "white",
    alignSelf: "flex-start",
  },
  switchThumbActive: {
    alignSelf: "flex-end",
  },
  permissionWarning: {
    fontSize: 12,
    color: "#f59e0b",
    fontWeight: "500",
    marginTop: 4,
  },
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
  cancelButton: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  saveButton: {
    backgroundColor: "#06b6d4",
  },
  saveButtonDisabled: {
    backgroundColor: "#94a3b8",
  },
  cancelButtonText: {
    color: "#334155",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
