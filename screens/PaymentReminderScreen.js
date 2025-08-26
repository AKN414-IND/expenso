import React, { useEffect, useState, useCallback, useMemo } from "react";
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
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  scheduleNotification,
  syncAllNotifications,
  snoozeNotification,
  cancelNotification,
  saveLocalReminder,
  getLocalReminders,
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const array = [{ full: null, day: "ALL", isToday: false }];
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      d.setHours(0, 0, 0, 0);
      array.push({
        full: d.toISOString().split("T")[0],
        day: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
        date: d.getDate(),
        isToday: i === 0,
      });
    }
    setDates(array);
  }, []);
  const styles = useMemo(() => createCalendarStyles(theme), [theme]);
  return (
    <View style={styles.calendarContainer}>
      <FlatList
        horizontal
        data={dates}
        keyExtractor={(i) => i.full || "all"}
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
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    </View>
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
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
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
    } else {
      setTitle("");
      setAmount("");
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      setNextDueDate(d);
      const t = new Date();
      t.setHours(9, 0, 0, 0);
      setReminderTime(t);
      setNotificationEnabled(true);
    }
  }, [initialData]);
  const handleSave = () => {
    if (!title || !amount) {
      Alert.alert("Missing info", "Enter a title and amount.");
      return;
    }
    const hh = reminderTime.getHours().toString().padStart(2, "0");
    const mm = reminderTime.getMinutes().toString().padStart(2, "0");
    onSave({
      title,
      amount: parseFloat(amount),
      category,
      frequency,
      next_due_date: nextDueDate.toISOString().split("T")[0],
      reminder_time: `${hh}:${mm}`,
      notification_enabled: notificationEnabled,
      notification_id: initialData?.notification_id || null,
      is_active: initialData?.is_active ?? true,
    });
  };
  return (
    <Modal transparent visible={isVisible} animationType="slide">
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
          <ScrollView>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Rent"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="e.g., 5000"
              />
            </View>
            <View style={styles.switchGroup}>
              <Text style={styles.label}>Enable Notification</Text>
              <Switch
                value={notificationEnabled}
                onValueChange={setNotificationEnabled}
              />
            </View>
          </ScrollView>
          <View style={styles.footerContainer}>
            <TouchableOpacity
              style={[styles.footerButton, styles.saveButton]}
              onPress={handleSave}
            >
              <Text style={styles.footerButtonText}>
                {initialData ? "Save" : "Create"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    const local = await getLocalReminders();
    setReminders(local);
    if (session?.user?.id) {
      const { data } = await supabase
        .from("payment_reminders")
        .select("*")
        .eq("user_id", session.user.id);
      if (data) {
        setReminders(data);
        for (const r of data) await saveLocalReminder(r);
        await syncAllNotifications(data);
      }
    }
    setLoading(false);
    setRefreshing(false);
  }, [session]);

  const handleSave = async (formData) => {
    let notificationId = formData.notification_id;
    if (notificationId) await cancelNotification(notificationId);
    if (formData.notification_enabled)
      notificationId = await scheduleNotification(formData);
    const payload = {
      ...formData,
      notification_id: notificationId,
      user_id: session?.user?.id,
    };
    await saveLocalReminder(payload);
    if (session?.user?.id) {
      if (editingReminder)
        await supabase
          .from("payment_reminders")
          .update(payload)
          .eq("id", editingReminder.id);
      else await supabase.from("payment_reminders").insert(payload);
    }
    setModalVisible(false);
    setEditingReminder(null);
    fetchReminders();
  };

  const confirmDeleteReminder = async () => {
    if (!reminderToDelete) return;
    if (reminderToDelete.notification_id)
      await cancelNotification(reminderToDelete.notification_id);
    await saveLocalReminder({ ...reminderToDelete, is_active: false });
    if (session?.user?.id)
      await supabase
        .from("payment_reminders")
        .delete()
        .eq("id", reminderToDelete.id);
    setShowDeleteAlert(false);
    setReminderToDelete(null);
    fetchReminders();
  };

  useFocusEffect(
    useCallback(() => {
      fetchReminders();
    }, [fetchReminders])
  );

  const groupedReminders = useMemo(() => {
    if (!reminders.length) return [];
    return [
      {
        title: "All Reminders",
        data: reminders.filter((r) => {
          if (query && !r.title.toLowerCase().includes(query.toLowerCase()))
            return false;
          if (selectedDate && r.next_due_date !== selectedDate) return false;
          return true;
        }),
      },
    ];
  }, [reminders, query, selectedDate]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Reminders</Text>
        <CheckSquare size={22} color={theme.colors.text} />
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
            placeholder="Search..."
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <SectionList
          sections={groupedReminders}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <ReminderCard
              item={item}
              onEdit={() => {
                setEditingReminder(item);
                setModalVisible(true);
              }}
              onDelete={() => {
                setReminderToDelete(item);
                setShowDeleteAlert(true);
              }}
              onSnooze={() => snoozeNotification(item)}
            />
          )}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchReminders}
            />
          }
        />
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setEditingReminder(null);
          setModalVisible(true);
        }}
      >
        <Plus size={28} color="#fff" />
      </TouchableOpacity>
      <ReminderFormModal
        isVisible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        initialData={editingReminder}
        theme={theme}
      />
      <AlertComponent
        open={showDeleteAlert}
        onConfirm={confirmDeleteReminder}
        onCancel={() => setShowDeleteAlert(false)}
        title="Delete Reminder"
        message={`Delete "${reminderToDelete?.title}"?`}
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
    todayItem: { borderColor: theme.colors.primary },
    selectedItem: { backgroundColor: theme.colors.primary },
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
    selectedText: { color: "#fff" },
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
    headerTitle: { fontSize: 18, fontWeight: "800", color: theme.colors.text },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
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
    sectionHeader: { fontSize: 14, fontWeight: "bold", marginVertical: 8 },
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
      height: "90%",
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    modalTitle: { fontSize: 22, fontWeight: "800", color: theme.colors.text },
    inputGroup: { marginBottom: 16 },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      marginBottom: 8,
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
    switchGroup: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginVertical: 12,
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
  });
