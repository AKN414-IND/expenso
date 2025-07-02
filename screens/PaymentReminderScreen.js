import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Switch,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import * as Notifications from "expo-notifications";
import {
  Bell,
  Plus,
  Calendar,
  Clock,
  Trash2,
  Edit3,
  AlertCircle,
} from "lucide-react-native";

const screenWidth = Dimensions.get("window").width;

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const REMINDER_FREQUENCIES = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly (3 months)", value: "quarterly" },
  { label: "Half-yearly (6 months)", value: "half_yearly" },
  { label: "Yearly", value: "yearly" },
  { label: "Custom", value: "custom" },
];

const REMINDER_CATEGORIES = [
  { name: "Rent", icon: "🏠", color: "#FF6B6B" },
  { name: "Utilities", icon: "⚡", color: "#4ECDC4" },
  { name: "Insurance", icon: "🛡️", color: "#45B7D1" },
  { name: "Subscription", icon: "📱", color: "#96CEB4" },
  { name: "Loan Payment", icon: "🏦", color: "#FECA57" },
  { name: "Credit Card", icon: "💳", color: "#FF9FF3" },
  { name: "Tax Payment", icon: "📊", color: "#54A0FF" },
  { name: "Medical", icon: "🏥", color: "#5F27CD" },
  { name: "Education", icon: "📚", color: "#00D2D3" },
  { name: "Other", icon: "📝", color: "#747D8C" },
];

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function PaymentReminderScreen({ navigation }) {
  const { session } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    amount: "",
    category: "Other",
    frequency: "monthly",
    nextDueDate: new Date(),
    endDate: null, // optional end date
    reminderTime: new Date(),
    isActive: true,
    dayOfMonth: 1,
    dayOfWeek: 1,
    customInterval: 30,
    advanceNotice: 1, // days before due date
  });

  useEffect(() => {
    if (session?.user) {
      requestNotificationPermissions();
      fetchReminders();
      setupNotificationListener();
    }
  }, [session]);

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Notification Permission",
        "Please enable notifications to receive payment reminders."
      );
    }
  };

  const setupNotificationListener = () => {
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        // Handle received notification while app is running
        console.log("Notification received:", notification);
      }
    );

    return () => subscription.remove();
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
        // Schedule notifications for active reminders
        data.filter((r) => r.is_active).forEach(scheduleNotification);
      } else {
        console.error("Error fetching reminders:", error);
      }
    } catch (err) {
      console.error("Exception fetching reminders:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateNextDueDate = (
    frequency,
    baseDate,
    dayOfMonth,
    dayOfWeek,
    customInterval
  ) => {
    const date = new Date(baseDate);

    switch (frequency) {
      case "daily":
        date.setDate(date.getDate() + 1);
        break;
      case "weekly":
        date.setDate(date.getDate() + 7);
        break;
      case "monthly":
        date.setMonth(date.getMonth() + 1);
        date.setDate(dayOfMonth);
        break;
      case "quarterly":
        date.setMonth(date.getMonth() + 3);
        break;
      case "half_yearly":
        date.setMonth(date.getMonth() + 6);
        break;
      case "yearly":
        date.setFullYear(date.getFullYear() + 1);
        break;
      case "custom":
        date.setDate(date.getDate() + customInterval);
        break;
      default:
        date.setMonth(date.getMonth() + 1);
    }

    return date;
  };

  const scheduleNotification = async (reminder) => {
    try {
      // Cancel existing notification
      if (reminder.notification_id) {
        await Notifications.cancelScheduledNotificationAsync(
          reminder.notification_id
        );
      }

      if (!reminder.is_active) return;

      const dueDate = new Date(reminder.next_due_date);
      const notificationDate = new Date(dueDate);
      notificationDate.setDate(dueDate.getDate() - reminder.advance_notice);

      // Set the time from reminder_time
      const reminderTime = new Date(reminder.reminder_time);
      notificationDate.setHours(reminderTime.getHours());
      notificationDate.setMinutes(reminderTime.getMinutes());

      // Only schedule if the notification date is in the future
      if (notificationDate > new Date()) {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `💰 Payment Reminder: ${reminder.title}`,
            body:
              reminder.description ||
              `${
                reminder.title
              } is due on ${dueDate.toLocaleDateString()}. Amount: ₹${
                reminder.amount
              }`,
            data: {
              reminderId: reminder.id,
              type: "payment_reminder",
              amount: reminder.amount,
              category: reminder.category,
            },
            sound: true,
            priority: Notifications.AndroidImportance.HIGH,
          },
          trigger: notificationDate,
        });

        // Update the notification ID in the database
        await supabase
          .from("payment_reminders")
          .update({ notification_id: notificationId })
          .eq("id", reminder.id);
      }
    } catch (error) {
      console.error("Error scheduling notification:", error);
    }
  };

  const saveReminder = async () => {
    if (!form.title.trim()) {
      Alert.alert("Error", "Please enter a reminder title");
      return;
    }

    try {
      const reminderData = {
        title: form.title.trim(),
        description: form.description.trim(),
        amount: parseFloat(form.amount) || 0,
        category: form.category,
        frequency: form.frequency,
        next_due_date: form.nextDueDate.toISOString(),
        end_date: form.endDate ? form.endDate.toISOString() : null,
        reminder_time: form.reminderTime.toISOString(),
        is_active: form.isActive,
        day_of_month: form.dayOfMonth,
        day_of_week: form.dayOfWeek,
        custom_interval: form.customInterval,
        advance_notice: form.advanceNotice,
        user_id: session.user.id,
      };

      let result;
      if (editingReminder) {
        result = await supabase
          .from("payment_reminders")
          .update(reminderData)
          .eq("id", editingReminder.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from("payment_reminders")
          .insert([reminderData])
          .select()
          .single();
      }

      if (!result.error && result.data) {
        // Schedule notification for the new/updated reminder
        await scheduleNotification(result.data);

        fetchReminders();
        closeModal();
        Alert.alert(
          "Success",
          editingReminder
            ? "Reminder updated successfully!"
            : "Reminder created successfully!"
        );
      } else {
        console.error("Error saving reminder:", result.error);
        Alert.alert("Error", "Failed to save reminder");
      }
    } catch (error) {
      console.error("Exception saving reminder:", error);
      Alert.alert("Error", "Failed to save reminder");
    }
  };

  const deleteReminder = async (reminderId) => {
    try {
      // Find the reminder to get notification ID
      const reminder = reminders.find((r) => r.id === reminderId);

      // Cancel scheduled notification
      if (reminder?.notification_id) {
        await Notifications.cancelScheduledNotificationAsync(
          reminder.notification_id
        );
      }

      const { error } = await supabase
        .from("payment_reminders")
        .delete()
        .eq("id", reminderId);

      if (!error) {
        fetchReminders();
        Alert.alert("Success", "Reminder deleted successfully!");
      } else {
        console.error("Error deleting reminder:", error);
        Alert.alert("Error", "Failed to delete reminder");
      }
    } catch (error) {
      console.error("Exception deleting reminder:", error);
      Alert.alert("Error", "Failed to delete reminder");
    }
  };

  const toggleReminderStatus = async (reminder) => {
    try {
      const newStatus = !reminder.is_active;

      const { error } = await supabase
        .from("payment_reminders")
        .update({ is_active: newStatus })
        .eq("id", reminder.id);

      if (!error) {
        if (newStatus) {
          // Schedule notification when activating
          await scheduleNotification({ ...reminder, is_active: true });
        } else {
          // Cancel notification when deactivating
          if (reminder.notification_id) {
            await Notifications.cancelScheduledNotificationAsync(
              reminder.notification_id
            );
          }
        }

        fetchReminders();
      } else {
        console.error("Error toggling reminder status:", error);
        Alert.alert("Error", "Failed to update reminder status");
      }
    } catch (error) {
      console.error("Exception toggling reminder status:", error);
    }
  };

  const markAsPaid = async (reminder) => {
    try {
      // Calculate next due date based on frequency
      const nextDueDate = calculateNextDueDate(
        reminder.frequency,
        new Date(reminder.next_due_date),
        reminder.day_of_month,
        reminder.day_of_week,
        reminder.custom_interval
      );

      const { error } = await supabase
        .from("payment_reminders")
        .update({
          next_due_date: nextDueDate.toISOString(),
          last_paid_date: new Date().toISOString(),
        })
        .eq("id", reminder.id);

      if (!error) {
        // Reschedule notification for the new due date
        await scheduleNotification({
          ...reminder,
          next_due_date: nextDueDate.toISOString(),
        });

        fetchReminders();
        Alert.alert(
          "Success",
          "Payment marked as completed! Next reminder scheduled."
        );
      } else {
        console.error("Error marking as paid:", error);
        Alert.alert("Error", "Failed to mark as paid");
      }
    } catch (error) {
      console.error("Exception marking as paid:", error);
    }
  };

  const openEditModal = (reminder = null) => {
    if (reminder) {
      setEditingReminder(reminder);
      setForm({
        title: reminder.title,
        description: reminder.description || "",
        amount: reminder.amount?.toString() || "",
        category: reminder.category,
        frequency: reminder.frequency,
        nextDueDate: new Date(reminder.next_due_date),
        endDate: reminder.end_date ? new Date(reminder.end_date) : null,
        reminderTime: new Date(reminder.reminder_time),
        isActive: reminder.is_active,
        dayOfMonth: reminder.day_of_month || 1,
        dayOfWeek: reminder.day_of_week || 1,
        customInterval: reminder.custom_interval || 30,
        advanceNotice: reminder.advance_notice || 1,
      });
    } else {
      setEditingReminder(null);
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(now.getDate() + 1);

      setForm({
        title: "",
        description: "",
        amount: "",
        category: "Other",
        frequency: "monthly",
        nextDueDate: tomorrow,
        endDate: null,
        reminderTime: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          9,
          0
        ), // 9 AM
        isActive: true,
        dayOfMonth: tomorrow.getDate(),
        dayOfWeek: 1,
        customInterval: 30,
        advanceNotice: 1,
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingReminder(null);
    setShowDatePicker(false);
    setShowEndDatePicker(false);
    setShowTimePicker(false);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getReminderStatusColor = (reminder) => {
    const daysUntil = getDaysUntilDue(reminder.next_due_date);
    if (daysUntil < 0) return "#ef4444"; // Overdue - red
    if (daysUntil <= reminder.advance_notice) return "#f59e0b"; // Due soon - orange
    return "#10b981"; // Good - green
  };

  const getReminderStatusText = (reminder) => {
    const daysUntil = getDaysUntilDue(reminder.next_due_date);
    if (daysUntil < 0) return `Overdue by ${Math.abs(daysUntil)} days`;
    if (daysUntil === 0) return "Due today";
    if (daysUntil === 1) return "Due tomorrow";
    return `Due in ${daysUntil} days`;
  };

  const getCategoryIcon = (category) => {
    const cat = REMINDER_CATEGORIES.find((c) => c.name === category);
    return cat ? cat.icon : "📝";
  };

  const getCategoryColor = (category) => {
    const cat = REMINDER_CATEGORIES.find((c) => c.name === category);
    return cat ? cat.color : "#747D8C";
  };

  const renderReminderItem = ({ item }) => (
    <View
      style={[
        styles.reminderCard,
        { borderLeftColor: getCategoryColor(item.category) },
      ]}
    >
      <View style={styles.reminderHeader}>
        <View style={styles.reminderInfo}>
          <View style={styles.reminderTitleRow}>
            <Text style={styles.categoryIcon}>
              {getCategoryIcon(item.category)}
            </Text>
            <Text style={styles.reminderTitle}>{item.title}</Text>
            <Switch
              value={item.is_active}
              onValueChange={() => toggleReminderStatus(item)}
              trackColor={{ false: "#d1d5db", true: "#06b6d4" }}
              thumbColor={item.is_active ? "#ffffff" : "#f3f4f6"}
            />
          </View>
          {item.description && (
            <Text style={styles.reminderDescription}>{item.description}</Text>
          )}
          <View style={styles.reminderDetails}>
            <Text style={styles.reminderAmount}>₹{item.amount || 0}</Text>
            <Text style={styles.reminderFrequency}>
              {
                REMINDER_FREQUENCIES.find((f) => f.value === item.frequency)
                  ?.label
              }
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.reminderFooter}>
        <View style={styles.dueDateInfo}>
          <Text style={styles.dueDateLabel}>Next Due:</Text>
          <Text style={styles.dueDate}>{formatDate(item.next_due_date)}</Text>
          <Text
            style={[styles.statusText, { color: getReminderStatusColor(item) }]}
          >
            {getReminderStatusText(item)}
          </Text>
        </View>

        <View style={styles.reminderActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.paidButton]}
            onPress={() => markAsPaid(item)}
          >
            <Text style={styles.paidButtonText}>✓ Paid</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => openEditModal(item)}
          >
            <Edit3 size={16} color="#06b6d4" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => {
              Alert.alert(
                "Delete Reminder",
                `Are you sure you want to delete "${item.title}"?`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteReminder(item.id),
                  },
                ]
              );
            }}
          >
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Reminders</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => openEditModal()}
        >
          <Plus size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Reminders List */}
      <FlatList
        data={reminders}
        renderItem={renderReminderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Bell size={64} color="#94a3b8" />
            <Text style={styles.emptyStateTitle}>No Payment Reminders</Text>
            <Text style={styles.emptyStateText}>
              Create your first reminder to never miss a payment!
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => openEditModal()}
            >
              <Text style={styles.emptyStateButtonText}>Create Reminder</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingReminder ? "Edit Reminder" : "Create New Reminder"}
              </Text>

              {/* Title */}
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Rent Payment, Electricity Bill"
                value={form.title}
                onChangeText={(text) => setForm({ ...form, title: text })}
              />

              {/* Description */}
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Optional description or notes"
                value={form.description}
                onChangeText={(text) => setForm({ ...form, description: text })}
                multiline
                numberOfLines={3}
              />

              {/* Amount */}
              <Text style={styles.inputLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={form.amount}
                onChangeText={(text) => setForm({ ...form, amount: text })}
                keyboardType="numeric"
              />

              {/* Category */}
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.category}
                  onValueChange={(value) =>
                    setForm({ ...form, category: value })
                  }
                  style={styles.picker}
                >
                  {REMINDER_CATEGORIES.map((cat) => (
                    <Picker.Item
                      key={cat.name}
                      label={`${cat.icon} ${cat.name}`}
                      value={cat.name}
                    />
                  ))}
                </Picker>
              </View>

              {/* Frequency */}
              <Text style={styles.inputLabel}>Frequency</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.frequency}
                  onValueChange={(value) =>
                    setForm({ ...form, frequency: value })
                  }
                  style={styles.picker}
                >
                  {REMINDER_FREQUENCIES.map((freq) => (
                    <Picker.Item
                      key={freq.value}
                      label={freq.label}
                      value={freq.value}
                    />
                  ))}
                </Picker>
              </View>

              {/* Custom Interval (only for custom frequency) */}
              {form.frequency === "custom" && (
                <>
                  <Text style={styles.inputLabel}>Custom Interval (days)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="30"
                    value={form.customInterval.toString()}
                    onChangeText={(text) =>
                      setForm({ ...form, customInterval: parseInt(text) || 30 })
                    }
                    keyboardType="numeric"
                  />
                </>
              )}

              {/* Day of Month (for monthly/quarterly/etc.) */}
              {["monthly", "quarterly", "half_yearly", "yearly"].includes(
                form.frequency
              ) && (
                <>
                  <Text style={styles.inputLabel}>Day of Month (1-31)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    value={form.dayOfMonth.toString()}
                    onChangeText={(text) =>
                      setForm({
                        ...form,
                        dayOfMonth: Math.min(
                          31,
                          Math.max(1, parseInt(text) || 1)
                        ),
                      })
                    }
                    keyboardType="numeric"
                  />
                </>
              )}

              {/* Next Due Date */}
              <Text style={styles.inputLabel}>Next Due Date</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Calendar size={20} color="#06b6d4" />
                <Text style={styles.dateTimeText}>
                  {formatDate(form.nextDueDate)}
                </Text>
              </TouchableOpacity>

              {/* End Date (Optional) */}
              <Text style={styles.inputLabel}>End Date (Optional)</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Calendar size={20} color="#06b6d4" />
                <Text style={styles.dateTimeText}>
                  {form.endDate ? formatDate(form.endDate) : "No end date"}
                </Text>
              </TouchableOpacity>
              {form.endDate && (
                <TouchableOpacity
                  style={styles.clearEndDateButton}
                  onPress={() => setForm({ ...form, endDate: null })}
                >
                  <Text style={styles.clearEndDateText}>Clear end date</Text>
                </TouchableOpacity>
              )}

              {/* Reminder Time */}
              <Text style={styles.inputLabel}>Reminder Time</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Clock size={20} color="#06b6d4" />
                <Text style={styles.dateTimeText}>
                  {formatTime(form.reminderTime)}
                </Text>
              </TouchableOpacity>

              {/* Advance Notice */}
              <Text style={styles.inputLabel}>
                Notify me (days before due date)
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.advanceNotice}
                  onValueChange={(value) =>
                    setForm({ ...form, advanceNotice: value })
                  }
                  style={styles.picker}
                >
                  <Picker.Item label="Same day" value={0} />
                  <Picker.Item label="1 day before" value={1} />
                  <Picker.Item label="2 days before" value={2} />
                  <Picker.Item label="3 days before" value={3} />
                  <Picker.Item label="1 week before" value={7} />
                </Picker>
              </View>

              {/* Active Toggle */}
              <View style={styles.switchRow}>
                <Text style={styles.inputLabel}>Active</Text>
                <Switch
                  value={form.isActive}
                  onValueChange={(value) =>
                    setForm({ ...form, isActive: value })
                  }
                  trackColor={{ false: "#d1d5db", true: "#06b6d4" }}
                  thumbColor={form.isActive ? "#ffffff" : "#f3f4f6"}
                />
              </View>

              {/* Modal Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={closeModal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={saveReminder}
                >
                  <Text style={styles.saveButtonText}>
                    {editingReminder ? "Update" : "Create"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={form.nextDueDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setForm({ ...form, nextDueDate: selectedDate });
            }
          }}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={form.reminderTime}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => {
            setShowTimePicker(false);
            if (selectedTime) {
              setForm({ ...form, reminderTime: selectedTime });
            }
          }}
        />
      )}

      {/* End Date Picker */}
      {showEndDatePicker && (
        <DateTimePicker
          value={form.endDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(false);
            if (selectedDate) {
              setForm({ ...form, endDate: selectedDate });
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.1)",
  },
  backButton: {
    fontSize: 16,
    color: "#06b6d4",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  addButton: {
    backgroundColor: "#06b6d4",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  reminderCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  reminderHeader: {
    marginBottom: 16,
  },
  reminderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  reminderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  reminderDescription: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 12,
    lineHeight: 20,
  },
  reminderDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reminderAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#059669",
  },
  reminderFrequency: {
    fontSize: 14,
    color: "#64748b",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reminderFooter: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.1)",
    paddingTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dueDateInfo: {
    flex: 1,
  },
  dueDateLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
  },
  dueDate: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  reminderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  paidButton: {
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: "#16a34a",
  },
  paidButtonText: {
    color: "#16a34a",
    fontSize: 12,
    fontWeight: "600",
  },
  editButton: {
    backgroundColor: "#e0f2fe",
    borderWidth: 1,
    borderColor: "#06b6d4",
  },
  deleteButton: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyStateButton: {
    backgroundColor: "#06b6d4",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    backgroundColor: "#ffffff",
  },
  picker: {
    height: 50,
  },
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
  },
  dateTimeText: {
    fontSize: 16,
    color: "#374151",
    marginLeft: 8,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 32,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  cancelButtonText: {
    color: "#64748b",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#06b6d4",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  clearEndDateButton: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  clearEndDateText: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
});
