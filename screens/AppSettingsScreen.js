import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
  ScrollView,
} from "react-native";
import { ArrowLeft, Trash2, FileText, Bell, Download, HelpCircle } from "lucide-react-native";
import * as Notifications from "expo-notifications";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import Alert from "../components/Alert";

export default function AppSettingsScreen({ navigation }) {
  const { session } = useAuth();
  const [notificationStatus, setNotificationStatus] = useState("unknown");
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(null); // 'from' or 'to'
  const [dateRange, setDateRange] = useState({ from: null, to: null });

  // Custom Alert State
  const [alertProps, setAlertProps] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "",
    cancelText: "",
    icon: null,
    iconBg: "",
    confirmColor: "",
    confirmTextColor: "",
    cancelColor: "",
    cancelTextColor: "",
    onConfirm: null,
    onCancel: null,
  });

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotificationStatus(status);
    });
  }, []);

  const openSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };

  // Show Confirm Custom Alert for Delete
  const confirmDeleteAllData = () => {
    setAlertProps({
      open: true,
      title: "Delete All Data",
      message: "Are you sure you want to delete ALL your data? This cannot be undone!",
      confirmText: "Delete",
      cancelText: "Cancel",
      icon: <Trash2 color="#fff" size={40} />,
      iconBg: "#ef4444",
      confirmColor: "#ef4444",
      confirmTextColor: "#fff",
      cancelColor: "#f1f5f9",
      cancelTextColor: "#334155",
      onConfirm: async () => {
        setAlertProps((a) => ({ ...a, open: false }));
        setIsLoading(true);
        try {
          await supabase.from("expenses").delete().eq("user_id", session.user.id);
          await supabase.from("budgets").delete().eq("user_id", session.user.id);
          await supabase.from("payment_reminders").delete().eq("user_id", session.user.id);
          setAlertProps({
            open: true,
            title: "Success",
            message: "All your data has been deleted.",
            confirmText: "OK",
            icon: <Trash2 color="#fff" size={40} />,
            iconBg: "#06b6d4",
            confirmColor: "#06b6d4",
            confirmTextColor: "#fff",
            cancelText: null,
            onConfirm: () => setAlertProps((a) => ({ ...a, open: false })),
            onCancel: null,
          });
        } catch (e) {
          setAlertProps({
            open: true,
            title: "Error",
            message: "Failed to delete data. Try again.",
            confirmText: "OK",
            icon: <Trash2 color="#fff" size={40} />,
            iconBg: "#ef4444",
            confirmColor: "#ef4444",
            confirmTextColor: "#fff",
            cancelText: null,
            onConfirm: () => setAlertProps((a) => ({ ...a, open: false })),
            onCancel: null,
          });
        }
        setIsLoading(false);
      },
      onCancel: () => setAlertProps((a) => ({ ...a, open: false })),
    });
  };

  const createExcelWorkbook = (expenses, dateRange) => {
    // Calculate summary statistics
    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const categoryTotals = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + parseFloat(exp.amount);
      return acc;
    }, {});
  
    // Create CSV content (Excel-compatible)
    let csvContent = '';
    
    // Header information
    csvContent += `Expense Report\n`;
    csvContent += `Period: ${dateRange.from} to ${dateRange.to}\n`;
    csvContent += `Generated: ${new Date().toLocaleDateString()}\n`;
    csvContent += `Total Expenses: ₹${totalExpenses.toFixed(2)}\n\n`;
    
    // Summary by Category
    csvContent += `CATEGORY SUMMARY\n`;
    csvContent += `Category,Amount\n`;
    Object.entries(categoryTotals).forEach(([category, amount]) => {
      csvContent += `${category},₹${amount.toFixed(2)}\n`;
    });
    csvContent += `\n`;
    
    // Detailed Expenses
    csvContent += `DETAILED EXPENSES\n`;
    csvContent += `Date,Description,Category,Amount,Notes\n`;
    expenses.forEach(exp => {
      const notes = exp.notes || '';
      csvContent += `${exp.date},"${exp.title}","${exp.category}",₹${parseFloat(exp.amount).toFixed(2)},"${notes}"\n`;
    });
    
    return csvContent;
  };
  
  const formatFileName = (dateRange) => {
    const fromDate = dateRange.from.replace(/-/g, '');
    const toDate = dateRange.to.replace(/-/g, '');
    return `ExpenseReport_${fromDate}_to_${toDate}.csv`;
  };
  

  const exportDataAsExcel = async () => {
    if (!dateRange.from || !dateRange.to) {
      showDateMissingAlert();
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Fetch expenses with additional details
      const { data: expenses, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", session.user.id)
        .gte("date", dateRange.from)
        .lte("date", dateRange.to)
        .order("date", { ascending: true });
  
      if (error) throw error;
  
      if (!expenses || expenses.length === 0) {
        setAlertProps({
          open: true,
          title: "No Data Found",
          message: "No expenses found for the selected date range. Please try a different period.",
          confirmText: "OK",
          icon: <FileText color="#fff" size={40} />,
          iconBg: "#f59e0b",
          confirmColor: "#f59e0b",
          confirmTextColor: "#fff",
          cancelText: null,
          onConfirm: () => setAlertProps((a) => ({ ...a, open: false })),
          onCancel: null,
        });
        setIsLoading(false);
        return;
      }
  
      // Create Excel-compatible CSV content
      const csvContent = createExcelWorkbook(expenses, dateRange);
      const fileName = formatFileName(dateRange);
      const fileUri = FileSystem.cacheDirectory + fileName;
  
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
  
      // Share the file
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: "Export Expense Report",
        UTI: "public.comma-separated-values-text",
      });
  
      // Show success message
      setAlertProps({
        open: true,
        title: "Export Successful",
        message: `Expense report exported successfully! ${expenses.length} expenses included.`,
        confirmText: "OK",
        icon: <Download color="#fff" size={40} />,
        iconBg: "#10b981",
        confirmColor: "#10b981",
        confirmTextColor: "#fff",
        cancelText: null,
        onConfirm: () => setAlertProps((a) => ({ ...a, open: false })),
        onCancel: null,
      });
  
    } catch (error) {
      console.error("Export error:", error);
      setAlertProps({
        open: true,
        title: "Export Failed",
        message: "Could not export data. Please check your connection and try again.",
        confirmText: "Retry",
        cancelText: "Cancel",
        icon: <FileText color="#fff" size={40} />,
        iconBg: "#ef4444",
        confirmColor: "#ef4444",
        confirmTextColor: "#fff",
        cancelColor: "#f1f5f9",
        cancelTextColor: "#334155",
        onConfirm: () => {
          setAlertProps((a) => ({ ...a, open: false }));
          exportDataAsExcel();
        },
        onCancel: () => setAlertProps((a) => ({ ...a, open: false })),
      });
    }
    
    setIsLoading(false);
  };
  

  // Custom Alert for "Select Dates"
  const showDateMissingAlert = () => {
    setAlertProps({
      open: true,
      title: "Date Selection Required",
      message: "Please select both start and end dates to generate your expense report.",
      confirmText: "OK",
      icon: <FileText color="#fff" size={40} />,
      iconBg: "#f59e0b",
      confirmColor: "#f59e0b",
      confirmTextColor: "#fff",
      cancelText: null,
      onConfirm: () => setAlertProps((a) => ({ ...a, open: false })),
      onCancel: null,
    });
  };
  
  // Export Data Logic
  const exportDataAsPDF = async () => {
    if (!dateRange.from || !dateRange.to) {
      showDateMissingAlert();
      return;
    }
    setIsLoading(true);
    try {
      const { data: expenses } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", session.user.id)
        .gte("date", dateRange.from)
        .lte("date", dateRange.to)
        .order("date", { ascending: true });

      if (!expenses || expenses.length === 0) {
        setAlertProps({
          open: true,
          title: "No Data",
          message: "No expenses found for the selected period.",
          confirmText: "OK",
          icon: <FileText color="#fff" size={40} />,
          iconBg: "#06b6d4",
          confirmColor: "#06b6d4",
          confirmTextColor: "#fff",
          cancelText: null,
          onConfirm: () => setAlertProps((a) => ({ ...a, open: false })),
          onCancel: null,
        });
        setIsLoading(false);
        return;
      }

      let content = `Expense Report\n${dateRange.from} to ${dateRange.to}\n\n`;
      content += expenses
        .map(
          (exp) =>
            `• ${exp.date}: ₹${exp.amount} | ${exp.title} | ${exp.category}`
        )
        .join("\n");

      const fileUri = FileSystem.cacheDirectory + `expense-report-${Date.now()}.txt`;
      await FileSystem.writeAsStringAsync(fileUri, content);

      await Sharing.shareAsync(fileUri, {
        mimeType: "text/plain",
        dialogTitle: "Export Expense Report",
      });
    } catch (e) {
      setAlertProps({
        open: true,
        title: "Export Failed",
        message: "Could not export data.",
        confirmText: "OK",
        icon: <FileText color="#fff" size={40} />,
        iconBg: "#ef4444",
        confirmColor: "#ef4444",
        confirmTextColor: "#fff",
        cancelText: null,
        onConfirm: () => setAlertProps((a) => ({ ...a, open: false })),
        onCancel: null,
      });
    }
    setIsLoading(false);
  };

  // Card UI Helper
  const Card = ({ icon, title, children, style }) => (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        {icon}
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color="#1e293b" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Settings</Text>
        <View style={{ width: 38 }} /> {/* Spacer for center title */}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 22, paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications Card */}
        <Card icon={<Bell color="#06b6d4" size={22} style={{ marginRight: 10 }} />} title="Notifications">
          <View style={styles.cardRow}>
            <Text style={styles.label}>Push Notifications</Text>
            <Text style={[
              styles.status,
              notificationStatus === "granted"
                ? styles.statusOn
                : styles.statusOff
            ]}>
              {notificationStatus === "granted" ? "Enabled" : "Disabled"}
            </Text>
            <TouchableOpacity style={styles.manageButton} onPress={openSettings}>
              <Text style={styles.manageButtonText}>Manage</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* App Tour Card */}
        <Card icon={<HelpCircle color="#06b6d4" size={22} style={{ marginRight: 10 }} />} title="Help & Tour">
          <View style={styles.cardRow}>
            <Text style={styles.label}>App Tour</Text>
            <TouchableOpacity 
              style={styles.tourButton} 
              onPress={() => navigation.navigate('Dashboard', { showOnboarding: true })}
            >
              <Text style={styles.tourButtonText}>Show Tour</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sublabel}>
            Replay the interactive tour to learn about all app features
          </Text>
        </Card>

        {/* Export Data Card */}
        <Card icon={<Download color="#06b6d4" size={22} style={{ marginRight: 10 }} />} title="Export Data">
  <Text style={styles.label}>Export Expenses as Excel Report</Text>
  <Text style={styles.sublabel}>
    Generate a detailed Excel report with expense summary and category breakdown
  </Text>
  <View style={{ flexDirection: "row", marginTop: 14, marginBottom: 6 }}>
    <TouchableOpacity
      onPress={() => setShowDatePicker("from")}
      style={styles.dateButton}
    >
      <Text style={styles.dateButtonText}>
        {dateRange.from || "Start Date"}
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      onPress={() => setShowDatePicker("to")}
      style={styles.dateButton}
    >
      <Text style={styles.dateButtonText}>
        {dateRange.to || "End Date"}
      </Text>
    </TouchableOpacity>
  </View>
  <TouchableOpacity
    style={[styles.exportButton, { backgroundColor: "#10b981" }]}
    onPress={exportDataAsExcel}
  >
    <Download color="#fff" size={18} style={{ marginRight: 8 }} /> 
    <Text style={styles.exportButtonText}> Export Excel</Text>
  </TouchableOpacity>
</Card>

        {/* Danger Zone Card */}
        <Card
          icon={<Trash2 color="#ef4444" size={22} style={{ marginRight: 10 }} />}
          title="Danger Zone"
          style={styles.dangerCard}
        >
          <TouchableOpacity
            onPress={confirmDeleteAllData}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>Delete All Data</Text>
          </TouchableOpacity>
        </Card>

        {isLoading && (
          <ActivityIndicator
            size="large"
            color="#06b6d4"
            style={{ marginTop: 30 }}
          />
        )}

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={dateRange[showDatePicker] ? new Date(dateRange[showDatePicker]) : new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(null);
              if (event.type === "set" && selectedDate) {
                setDateRange((prev) => ({
                  ...prev,
                  [showDatePicker]: selectedDate.toISOString().slice(0, 10),
                }));
              }
            }}
            maximumDate={new Date()}
          />
        )}
      </ScrollView>

      {/* Custom Alert */}
      <Alert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 18,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.1)",
    justifyContent: "space-between",
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
    flex: 1,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.09)",
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1e293b",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  label: {
    flex: 1,
    fontSize: 16,
    color: "#334155",
    fontWeight: "600",
  },
  status: {
    fontWeight: "600",
    fontSize: 14,
    marginRight: 12,
  },
  statusOn: { color: "#06b6d4" },
  statusOff: { color: "#ef4444" },
  manageButton: {
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  manageButtonText: {
    color: "#06b6d4",
    fontWeight: "700",
    fontSize: 14,
  },
  dateButton: {
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginRight: 10,
  },
  dateButtonText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 15,
  },
  exportButton: {
    backgroundColor: "#06b6d4",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
    width: 120,
    alignSelf: "flex-start",
  },
  exportButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  dangerCard: {
    borderColor: "#ef4444",
    backgroundColor: "#fdf2f8",
  },
  deleteButton: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 10,
    width: 150,
    alignSelf: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.2,
  },
  sublabel: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
    marginBottom: 8,
    fontWeight: "500",
  },
  exportButton: {
    backgroundColor: "#10b981",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    width: 140,
    alignSelf: "flex-start",
    flexDirection: "row",
    elevation: 2,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  exportButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  tourButton: {
    backgroundColor: "#06b6d4",
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  tourButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
