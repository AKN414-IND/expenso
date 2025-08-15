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
  FlatList,
  SectionList,
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
  Search,
  CheckSquare,
} from "lucide-react-native";
import AlertComponent from "../components/Alert";
import ReminderCard from "../components/ReminderCard";

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
  "custom",
];

const HorizontalCalendar = ({ onSelectDate, selectedDate, theme }) => {
  const [dates, setDates] = useState([]);

  useEffect(() => {
    const getDates = () => {
      const dateArray = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dateArray.push({ full: null, day: "ALL", isToday: false });
      for (let i = 0; i < 30; i++) {
        const newDate = new Date();
        newDate.setDate(today.getDate() + i);
        newDate.setHours(0, 0, 0, 0);
        dateArray.push({
          full: newDate.toISOString().split("T")[0],
          day: newDate
            .toLocaleDateString("en-US", { weekday: "short" })
            .toUpperCase(),
          date: newDate.getDate(),
          isToday: i === 0,
        });
      }
      return dateArray;
    };
    setDates(getDates());
  }, []);

  const styles = useMemo(() => createCalendarStyles(theme), [theme]);

  return (
    <View style={styles.calendarContainer}>
      <FlatList
        horizontal
        data={dates}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.full || "all"}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onSelectDate(item.full)}
            style={[
              styles.dateItem,
              item.isToday && styles.todayItem,
              selectedDate === item.full && styles.selectedItem,
            ]}
          >
            {item.full === null ? (
              <Text
                style={[
                  styles.dateDay,
                  selectedDate === null && styles.selectedText,
                ]}
              >
                {item.day}
              </Text>
            ) : (
              <>
                <Text
                  style={[
                    styles.dateDay,
                    selectedDate === item.full && styles.selectedText,
                  ]}
                >
                  {item.day}
                </Text>
                <Text
                  style={[
                    styles.dateNumber,
                    selectedDate === item.full && styles.selectedText,
                  ]}
                >
                  {item.date}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

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

const ReminderFormModal = ({
  isVisible,
  onClose,
  onSave,
  initialData,
  theme,
}) => {
  const styles = useMemo(() => createModalStyles(theme), [theme]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [frequency, setFrequency] = useState(FREQUENCY_OPTIONS[2]);
  const [nextDueDate, setNextDueDate] = useState(new Date());
  const [reminderTime, setReminderTime] = useState(new Date());
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [customInterval, setCustomInterval] = useState("");
  const [payee, setPayee] = useState("");
  const [payUrl, setPayUrl] = useState("");
  const [tags, setTags] = useState("");
  const [icon, setIcon] = useState("💰");
  const [color, setColor] = useState("#6750A4");
  const [priority, setPriority] = useState(2);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
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
      setNextDueDate(new Date(initialData.next_due_date));
      const [h, m] = (initialData.reminder_time || "09:00")
        .split(":")
        .map(Number);
      const t = new Date();
      t.setHours(h, m, 0, 0);
      setReminderTime(t);
      setNotificationEnabled(initialData.notification_enabled ?? true);
      setCustomInterval(
        initialData.custom_interval ? String(initialData.custom_interval) : ""
      );
      setPayee(initialData.payee || "");
      setPayUrl(initialData.pay_url || "");
      setTags(initialData.tags?.join(", ") || "");
      setIcon(initialData.icon || "💰");
      setColor(initialData.color || "#6750A4");
      setPriority(initialData.priority || 2);
    } else {
      setTitle("");
      setAmount("");
      setCategory(CATEGORIES[0]);
      setFrequency(FREQUENCY_OPTIONS[2]);
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      setNextDueDate(d);
      const t = new Date();
      t.setHours(9, 0, 0, 0);
      setReminderTime(t);
      setNotificationEnabled(true);
      setCustomInterval("");
      setPayee("");
      setPayUrl("");
      setTags("");
      setIcon("💰");
      setColor("#6750A4");
      setPriority(2);
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
      custom_interval:
        frequency === "custom"
          ? parseInt(customInterval || "0", 10) || 0
          : null,
      next_due_date: nextDueDate.toISOString().split("T")[0],
      reminder_time: `${hh}:${mm}`,
      notification_enabled: notificationEnabled,
      notification_id: initialData?.notification_id || null,
      is_active: initialData?.is_active ?? true,
      payee,
      pay_url: payUrl,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      icon,
      color,
      priority,
    });
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
            {frequency === "custom" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Custom Interval (days)</Text>
                <TextInput
                  style={styles.input}
                  value={customInterval}
                  onChangeText={setCustomInterval}
                  keyboardType="number-pad"
                  placeholder="e.g., 45"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payee (Optional)</Text>
              <TextInput
                style={styles.input}
                value={payee}
                onChangeText={setPayee}
                placeholder="e.g., Landlord"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Link (Optional)</Text>
              <TextInput
                style={styles.input}
                value={payUrl}
                onChangeText={setPayUrl}
                placeholder="upi://pay?pa=..."
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tags (comma-separated)</Text>
              <TextInput
                style={styles.input}
                value={tags}
                onChangeText={setTags}
                placeholder="e.g., housing, essential"
              />
            </View>
            <View style={styles.inlineGroup}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Icon (Emoji)</Text>
                <TextInput
                  style={styles.input}
                  value={icon}
                  onChangeText={setIcon}
                  maxLength={2}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Color</Text>
                <TextInput
                  style={styles.input}
                  value={color}
                  onChangeText={setColor}
                  placeholder="#6750A4"
                  autoCapitalize="none"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.priorityContainer}>
                <TouchableOpacity
                  onPress={() => setPriority(1)}
                  style={[
                    styles.priorityButton,
                    priority === 1 && { backgroundColor: theme.colors.error },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      priority === 1 && { color: "#fff" },
                    ]}
                  >
                    High
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPriority(2)}
                  style={[
                    styles.priorityButton,
                    priority === 2 && { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      priority === 2 && { color: "#fff" },
                    ]}
                  >
                    Normal
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPriority(3)}
                  style={[
                    styles.priorityButton,
                    priority === 3 && { backgroundColor: theme.colors.success },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      priority === 3 && { color: "#fff" },
                    ]}
                  >
                    Low
                  </Text>
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

            <View className="switch" style={styles.switchGroup}>
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
            <TouchableOpacity
              style={[styles.footerButton, styles.saveButton]}
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
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);

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

        if (shouldSync && data?.length) {
          await syncAllNotifications(data);
        }
      } catch (err) {
        Alert.alert("Error Fetching Data", err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session]
  );

  const handleOpenModal = (reminder = null) => {
    setEditingReminder(reminder);
    setModalVisible(true);
  };

  const handleDeletePress = (reminder) => {
    setReminderToDelete(reminder);
    setShowDeleteAlert(true);
  };

  const snoozeBy = async (reminderId, days = 1) => {
    try {
      await snoozeNotification(reminderId, days);
      Alert.alert("Snoozed", `Reminder snoozed for ${days} day(s).`);
      fetchReminders(false);
    } catch (e) {
      Alert.alert("Snooze failed", e.message || "Could not snooze.");
    }
  };

  const togglePaidStatus = async (reminderId, isActiveNow) => {
    const { data, error } = await supabase
      .from("payment_reminders")
      .update({
        is_active: !isActiveNow,
        last_paid_date: !isActiveNow ? new Date().toISOString() : null,
      })
      .eq("id", reminderId)
      .select()
      .single();

    if (error) {
      Alert.alert("Error", "Could not update payment status.");
      return;
    }

    if (data?.notification_id) await cancelNotification(data.notification_id);
    if (!isActiveNow && data?.notification_enabled) {
      await scheduleNotification(data);
    }
    fetchReminders(false);
  };

  const confirmDeleteReminder = async () => {
    if (!reminderToDelete) return;
    if (reminderToDelete.notification_id) {
      await cancelNotification(reminderToDelete.notification_id);
    }
    const { error } = await supabase
      .from("payment_reminders")
      .delete()
      .eq("id", reminderToDelete.id);
    if (error) {
      Alert.alert("Error", "Could not delete reminder.");
    }
    setShowDeleteAlert(false);
    setReminderToDelete(null);
    fetchReminders(false);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReminders(true);
  }, [fetchReminders]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchReminders(true);
    }, [fetchReminders])
  );

  const groupedReminders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    let filtered = reminders.filter((r) => {
      const q = query.trim().toLowerCase();
      const hay = `${r.title} ${r.payee} ${r.tags?.join(" ")}`.toLowerCase();
      if (q && !hay.includes(q)) {
        return false;
      }
      if (selectedDate && r.next_due_date !== selectedDate) {
        return false;
      }
      return true;
    });

    if (selectedDate) {
      return filtered.length > 0
        ? [
            {
              title: new Date(selectedDate).toLocaleDateString("en-GB", {
                weekday: "long",
                month: "long",
                day: "numeric",
              }),
              data: filtered,
            },
          ]
        : [];
    }

    const groups = {
      overdue: [],
      today: [],
      tomorrow: [],
      next7Days: [],
      later: [],
      paid: [],
    };

    for (const r of filtered) {
      if (!r.is_active) {
        groups.paid.push(r);
        continue;
      }
      const dueDate = new Date(r.next_due_date);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate < today) groups.overdue.push(r);
      else if (dueDate.getTime() === today.getTime()) groups.today.push(r);
      else if (dueDate.getTime() === tomorrow.getTime())
        groups.tomorrow.push(r);
      else if (dueDate <= nextWeek) groups.next7Days.push(r);
      else groups.later.push(r);
    }

    const sections = [
      { title: "Overdue", data: groups.overdue },
      { title: "Today", data: groups.today },
      { title: "Tomorrow", data: groups.tomorrow },
      { title: "Next 7 Days", data: groups.next7Days },
      { title: "Later", data: groups.later },
      { title: "Paid", data: groups.paid },
    ];
    return sections.filter((section) => section.data.length > 0);
  }, [reminders, query, selectedDate]);

  const ListEmpty = (
    <View style={styles.emptyState}>
      <Bell size={64} color={theme.colors.border} />
      <Text style={styles.emptyStateTitle}>No Reminders Found</Text>
      <Text style={styles.emptyStateText}>
        Try clearing your search or creating a new reminder.
      </Text>
    </View>
  );

  const handleSave = async (formData) => {
    try {
      let notificationId = formData.notification_id || null;
      if (notificationId) await cancelNotification(notificationId);

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
      fetchReminders(true);
    } catch (err) {
      Alert.alert("Save Error", `Failed to save reminder: ${err.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headerTitle}>Payment Reminders</Text>
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <CheckSquare size={22} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <HorizontalCalendar
        onSelectDate={setSelectedDate}
        selectedDate={selectedDate}
        theme={theme}
      />

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Search size={18} color={theme.colors.textSecondary} />
          <TextInput
            placeholder="Search reminders..."
            placeholderTextColor={theme.colors.textTertiary}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <SectionList
          sections={groupedReminders}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ReminderCard
              item={item}
              onEdit={() => handleOpenModal(item)}
              onMarkPaid={() => togglePaidStatus(item.id, item.is_active)}
              onSnooze={() => snoozeBy(item.id, 1)}
              onDelete={() => handleDeletePress(item)}
            />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
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

      <TouchableOpacity
        style={styles.fab}
        onPress={() => handleOpenModal(null)}
      >
        <Plus size={28} color="#fff" />
      </TouchableOpacity>

      <ReminderFormModal
        isVisible={isModalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingReminder(null);
        }}
        onSave={handleSave}
        initialData={editingReminder}
        theme={theme}
      />
      <AlertComponent
        open={showDeleteAlert}
        onConfirm={confirmDeleteReminder}
        onCancel={() => setShowDeleteAlert(false)}
        title="Delete Reminder"
        message={`Are you sure you want to delete "${reminderToDelete?.title}"?`}
        confirmText="Delete"
        icon={<Trash2 color="#fff" size={32} />}
        iconBg={theme.colors.error}
        confirmColor={theme.colors.error}
      />
    </View>
  );
}

const createCalendarStyles = (theme) =>
  StyleSheet.create({
    calendarContainer: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    dateItem: {
      alignItems: "center",
      justifyContent: "center",
      width: 60,
      height: 70,
      borderRadius: 14,
      marginHorizontal: 4,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
    },
    todayItem: {
      borderColor: theme.colors.primary,
    },
    selectedItem: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    dateDay: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.textSecondary,
    },
    dateNumber: {
      fontSize: 18,
      fontWeight: "800",
      color: theme.colors.text,
      marginTop: 4,
    },
    selectedText: {
      color: "#FFFFFF",
    },
  });

const createScreenStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 10,
      justifyContent: "space-between",
      backgroundColor: theme.colors.surface,
    },
    headerButton: {
      width: 44,
      height: 44,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: { fontSize: 18, fontWeight: "800", color: theme.colors.text },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderColor: theme.colors.border,
    },
    searchBox: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    searchInput: { flex: 1, color: theme.colors.text, fontSize: 16 },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 110,
    },
    sectionHeader: {
      fontSize: 14,
      fontWeight: "bold",
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 16,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingTop: 40,
      paddingHorizontal: 40,
    },
    emptyStateTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.text,
      marginTop: 12,
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
    },
    footerContainer: { flexDirection: "row", gap: 12, marginTop: 12 },
    footerButton: {
      flex: 1,
      borderRadius: 12,
      padding: 18,
      alignItems: "center",
    },
    saveButton: { backgroundColor: theme.colors.primary },
    footerButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
    priorityContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
    },
    priorityButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
    },
    priorityText: {
      fontWeight: "700",
      color: theme.colors.textSecondary,
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
    optionText: { fontSize: 16, color: theme.colors.textSecondary },
    selectedOptionText: { color: theme.colors.primary, fontWeight: "600" },
  });
