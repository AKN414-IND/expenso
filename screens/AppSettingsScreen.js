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
import {
  ArrowLeft,
  Trash2,
  FileText,
  Bell,
  Download,
  HelpCircle,
  Moon,
  Sun,
  Palette,
} from "lucide-react-native";
import * as Notifications from "expo-notifications";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";

import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../lib/supabase";
import Alert from "../components/Alert";

const themeLabels = {
  light: "Light",
  dark: "Dark",
  mint: "Mint",
  sunset: "Sunset",
  classic: "Classic",
  neon: "Neon",
};

export default function AppSettingsScreen({ navigation }) {
  const { session } = useAuth();
  const { theme, currentTheme, setTheme } = useTheme();
  const [notificationStatus, setNotificationStatus] = useState("unknown");
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(null);
  const [dateRange, setDateRange] = useState({ from: null, to: null });

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

  const confirmDeleteAllData = () => {
    setAlertProps({
      open: true,
      title: "Delete All Data",
      message:
        "Are you sure you want to delete ALL your data? This cannot be undone!",
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
          await supabase
            .from("expenses")
            .delete()
            .eq("user_id", session.user.id);
          await supabase
            .from("budgets")
            .delete()
            .eq("user_id", session.user.id);
          await supabase
            .from("payment_reminders")
            .delete()
            .eq("user_id", session.user.id);
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
    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + parseFloat(exp.amount),
      0
    );
    const categoryTotals = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + parseFloat(exp.amount);
      return acc;
    }, {});

    let csvContent = "";

    csvContent += `Expense Report\n`;
    csvContent += `Period: ${dateRange.from} to ${dateRange.to}\n`;
    csvContent += `Generated: ${new Date().toLocaleDateString()}\n`;
    csvContent += `Total Expenses: ₹${totalExpenses.toFixed(2)}\n\n`;

    csvContent += `CATEGORY SUMMARY\n`;
    csvContent += `Category,Amount\n`;
    Object.entries(categoryTotals).forEach(([category, amount]) => {
      csvContent += `${category},₹${amount.toFixed(2)}\n`;
    });
    csvContent += `\n`;

    csvContent += `DETAILED EXPENSES\n`;
    csvContent += `Date,Description,Category,Amount,Notes\n`;
    expenses.forEach((exp) => {
      const notes = exp.notes || "";
      csvContent += `${exp.date},"${exp.title}","${exp.category}",₹${parseFloat(
        exp.amount
      ).toFixed(2)},"${notes}"\n`;
    });

    return csvContent;
  };

  const formatFileName = (dateRange) => {
    const fromDate = dateRange.from.replace(/-/g, "");
    const toDate = dateRange.to.replace(/-/g, "");
    return `ExpenseReport_${fromDate}_to_${toDate}.csv`;
  };

  function generateExpenseReportHTML(
    expenses,
    dateRange,
    chartImageBase64 = null
  ) {
    const total = expenses.reduce(
      (sum, e) => sum + (parseFloat(e.amount) || 0),
      0
    );
    const categories = {};
    expenses.forEach((e) => {
      categories[e.category] =
        (categories[e.category] || 0) + (parseFloat(e.amount) || 0);
    });

    const categoryRows = Object.entries(categories)
      .map(
        ([cat, amt]) => `<tr><td>${cat}</td><td>₹${amt.toFixed(2)}</td></tr>`
      )
      .join("");

    const expenseRows = expenses
      .map(
        (e) => `
      <tr>
        <td>${e.date || ""}</td>
        <td>${e.title || ""}</td>
        <td>${e.category || ""}</td>
        <td>${e.payment_method || ""}</td>
        <td>₹${parseFloat(e.amount).toFixed(2)}</td>
        <td>${e.notes || ""}</td>
      </tr>`
      )
      .join("");

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: 'Segoe UI', 'Roboto', Arial, sans-serif; margin: 32px; color: #1e293b; }
          .header { display: flex; align-items: center; margin-bottom: 32px; }
          .app-icon { width: 56px; height: 56px; background: #06b6d4; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 38px; margin-right: 20px; }
          .app-title { font-size: 2.1rem; font-weight: 700; letter-spacing: -1px; color: #06b6d4; }
          h2 { color: #127f73; }
          .summary { margin-bottom: 24px; }
          .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .table th, .table td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; }
          .table th { background: #f5f7fa; color: #127f73; }
          .section-title { font-size: 1.2rem; margin-top: 2rem; color: #06b6d4; }
          .category-table { width: 60%; margin-bottom: 10px; }
          .category-table th, .category-table td { border: none; }
          .total { font-weight: 700; color: #127f73; }
          .chart { margin: 20px 0; display: flex; justify-content: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="app-icon">💸</div>
          <div>
            <div class="app-title">Expenso</div>
            <div style="color:#64748b;font-size:1rem;font-weight:500;">Expense Report</div>
            <div style="font-size:0.96rem;color:#64748b;">${
              dateRange.from
            } to ${dateRange.to}</div>
          </div>
        </div>
        <div class="summary">
          <h2>Overview</h2>
          <div class="section-title">Total Expenses: <span class="total">₹${total.toFixed(
            2
          )}</span></div>
          <div class="section-title">Category Breakdown:</div>
          <table class="table category-table">
            <tr><th>Category</th><th>Amount</th></tr>
            ${categoryRows}
          </table>
        </div>
        ${
          chartImageBase64
            ? `<div class="chart"><img src="data:image/png;base64,${chartImageBase64}" width="320" /></div>`
            : ""
        }
        <h2>Expense Details</h2>
        <table class="table">
          <tr>
            <th>Date</th>
            <th>Title</th>
            <th>Category</th>
            <th>Method</th>
            <th>Amount</th>
            <th>Notes</th>
          </tr>
          ${expenseRows}
        </table>
        <div style="margin-top:2rem;font-size:0.9rem;color:#94a3b8;text-align:right;">
          Generated by Expenso • ${new Date().toLocaleString()}
        </div>
      </body>
    </html>
    `;
  }

  const showDateMissingAlert = () => {
    setAlertProps({
      open: true,
      title: "Date Selection Required",
      message:
        "Please select both start and end dates to generate your expense report.",
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

      let chartImageBase64 = null;

      const html = generateExpenseReportHTML(
        expenses,
        dateRange,
        chartImageBase64
      );
      const { uri } = await Print.printToFileAsync({ html });

      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Export Expense Report (PDF)",
        UTI: "com.adobe.pdf",
      });

      setAlertProps({
        open: true,
        title: "Export Successful",
        message: `Expense report exported as PDF! ${expenses.length} expenses included.`,
        confirmText: "OK",
        icon: <Download color="#fff" size={40} />,
        iconBg: "#10b981",
        confirmColor: "#10b981",
        confirmTextColor: "#fff",
        cancelText: null,
        onConfirm: () => setAlertProps((a) => ({ ...a, open: false })),
        onCancel: null,
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

  const Card = ({ icon, title, children, style }) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      <View style={styles.cardHeader}>
        {icon}
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
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
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          App Settings
        </Text>
        <View style={{ width: 38 }} /> 
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 22, paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications Card */}
        <Card
          icon={
            <Bell
              color={theme.colors.primary}
              size={22}
              style={{ marginRight: 10 }}
            />
          }
          title="Notifications"
        >
          <View style={styles.cardRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Push Notifications
            </Text>
            <Text
              style={[
                styles.status,
                notificationStatus === "granted"
                  ? [styles.statusOn, { color: theme.colors.primary }]
                  : [styles.statusOff, { color: theme.colors.error }],
              ]}
            >
              {notificationStatus === "granted" ? "Enabled" : "Disabled"}
            </Text>
            <TouchableOpacity
              style={[
                styles.manageButton,
                { backgroundColor: theme.colors.buttonSecondary },
              ]}
              onPress={openSettings}
            >
              <Text
                style={[
                  styles.manageButtonText,
                  { color: theme.colors.primary },
                ]}
              >
                Manage
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Theme Card */}
        <Card
          icon={
            <Palette
              color={theme.colors.primary}
              size={22}
              style={{ marginRight: 10 }}
            />
          }
          title="Appearance"
        >
          <View style={styles.cardRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Theme
            </Text>
            <View style={styles.themeOptions}>
              {Object.keys(themeLabels).map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor:
                        currentTheme === key
                          ? theme.colors.primary
                          : theme.colors.buttonSecondary,
                      borderWidth: currentTheme === key ? 2 : 1,
                      borderColor:
                        currentTheme === key
                          ? theme.colors.primaryDark
                          : theme.colors.borderLight,
                    },
                  ]}
                  onPress={() => setTheme(key)}
                >
                  <Text
                    style={[
                      styles.themeOptionText,
                      {
                        color:
                          currentTheme === key
                            ? "#fff"
                            : theme.colors.textTertiary,
                      },
                    ]}
                  >
                    {themeLabels[key]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text style={[styles.sublabel, { color: theme.colors.textTertiary }]}>
            Choose your preferred theme for better viewing experience
          </Text>
        </Card>

        {/* App Tour Card */}
        <Card
          icon={
            <HelpCircle
              color={theme.colors.primary}
              size={22}
              style={{ marginRight: 10 }}
            />
          }
          title="Help & Tour"
        >
          <View style={styles.cardRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              App Tour
            </Text>
            <TouchableOpacity
              style={[
                styles.tourButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() =>
                navigation.navigate("Dashboard", { showOnboarding: true })
              }
              
            >
              <Text style={styles.tourButtonText}>Show Tour</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.sublabel, { color: theme.colors.textTertiary }]}>
            Replay the interactive tour to learn about all app features
          </Text>
        </Card>

        {/* Export Data Card */}
        <Card
          icon={
            <Download
              color={theme.colors.primary}
              size={22}
              style={{ marginRight: 10 }}
            />
          }
          title="Export Data"
        >
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            Export Expenses as Excel Report
          </Text>
          <Text style={[styles.sublabel, { color: theme.colors.textTertiary }]}>
            Generate a detailed Excel report with expense summary and category
            breakdown
          </Text>
          <View
            style={{ flexDirection: "row", marginTop: 14, marginBottom: 6 }}
          >
            <TouchableOpacity
              onPress={() => setShowDatePicker("from")}
              style={[
                styles.dateButton,
                { backgroundColor: theme.colors.buttonSecondary },
              ]}
            >
              <Text
                style={[
                  styles.dateButtonText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {dateRange.from || "Start Date"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowDatePicker("to")}
              style={[
                styles.dateButton,
                { backgroundColor: theme.colors.buttonSecondary },
              ]}
            >
              <Text
                style={[
                  styles.dateButtonText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {dateRange.to || "End Date"}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.exportButton,
              { backgroundColor: theme.colors.primary, marginTop: 10 },
            ]}
            onPress={exportDataAsPDF}
          >
            <Download color="#fff" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.exportButtonText}>Export PDF</Text>
          </TouchableOpacity>
        </Card>

        {/* Danger Zone Card */}
        <Card
          icon={
            <Trash2
              color={theme.colors.error}
              size={22}
              style={{ marginRight: 10 }}
            />
          }
          title="Danger Zone"
          style={[
            styles.dangerCard,
            {
              borderColor: theme.colors.error,
              backgroundColor: currentTheme === "light" ? "#fdf2f8" : "#451a1a",
            },
          ]}
        >
          <TouchableOpacity
            onPress={confirmDeleteAllData}
            style={[
              styles.deleteButton,
              { backgroundColor: theme.colors.error },
            ]}
          >
            <Text style={styles.deleteButtonText}>Delete All Data</Text>
          </TouchableOpacity>
        </Card>

        {isLoading && (
          <ActivityIndicator
            size="large"
            color={theme.colors.primary}
            style={{ marginTop: 30 }}
          />
        )}

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={
              dateRange[showDatePicker]
                ? new Date(dateRange[showDatePicker])
                : new Date()
            }
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
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 18,
    borderBottomWidth: 1,
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  card: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
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
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  status: {
    fontWeight: "600",
    fontSize: 14,
    marginRight: 12,
  },
  statusOn: {},
  statusOff: {},
  manageButton: {
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  manageButtonText: {
    fontWeight: "700",
    fontSize: 14,
  },
  themeOptions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    rowGap: 10,
  },
  themeOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  dateButton: {
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginRight: 10,
  },
  dateButtonText: {
    fontWeight: "600",
    fontSize: 15,
  },
  exportButton: {
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  exportButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  dangerCard: {
    borderWidth: 1,
  },
  deleteButton: {
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
    marginTop: 4,
    marginBottom: 8,
    fontWeight: "500",
  },
  tourButton: {
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
