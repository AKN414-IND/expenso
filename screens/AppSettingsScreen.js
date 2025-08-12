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
  const [showDatePicker, setShowDatePicker] = useState(null); // "from" | "to" | null
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [exportOptions, setExportOptions] = useState({
    expenses: true,
    budgets: false,
    reminders: false,
    incomes: false,
    investments: false,
  });

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
          await supabase.from("expenses").delete().eq("user_id", session.user.id);
          await supabase.from("budgets").delete().eq("user_id", session.user.id);
          await supabase.from("payment_reminders").delete().eq("user_id", session.user.id);
          setAlertProps({
            open: true,
            title: "Success",
            message: "All your data has been deleted.",
            confirmText: "OK",
            showCancel: false,
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
            showCancel: false,
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

  function generateExpenseReportHTML(expenses, dateRange, chartImageBase64 = null) {
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
            <div style="font-size:0.96rem;color:#64748b;">${dateRange.from} to ${dateRange.to}</div>
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
      showCancel: false,
      icon: <FileText color="#fff" size={40} />,
      iconBg: "#f59e0b",
      confirmColor: "#f59e0b",
      confirmTextColor: "#fff",
      cancelText: null,
      onConfirm: () => setAlertProps((a) => ({ ...a, open: false })),
      onCancel: null,
    });
  };

  const diffInDays = (from, to) => {
    const d1 = new Date(from + "T00:00:00");
    const d2 = new Date(to + "T00:00:00");
    return Math.max(1, Math.ceil((d2 - d1) / 86400000) + 1);
  };

  const pickGranularity = (from, to) => {
    const days = diffInDays(from, to);
    if (days <= 31) return "day";
    if (days <= 180) return "month";
    if (days <= 730) return "quarter";
    return "year";
  };

  const keyFor = (dateStr, gran) => {
    const d = new Date(dateStr + "T00:00:00");
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    if (gran === "day") return `${y}-${m}-${da}`;
    if (gran === "month") return `${y}-${m}`;
    if (gran === "quarter") return `${y}-Q${Math.floor(d.getMonth() / 3) + 1}`;
    return String(y);
  };

  const buildPeriodSummaryTable = (expenses, from, to) => {
    const gran = pickGranularity(from, to);
    const totals = {};
    const counts = {};
    for (const e of expenses) {
      if (!e.date || !e.amount) continue;
      const k = keyFor(e.date, gran);
      const amt = parseFloat(e.amount) || 0;
      totals[k] = (totals[k] || 0) + amt;
      counts[k] = (counts[k] || 0) + 1;
    }
    const rows = Object.keys(totals)
      .sort()
      .map(
        (k) =>
          `<tr><td>${k}</td><td>${counts[k]}</td><td>₹${totals[k].toFixed(
            2
          )}</td></tr>`
      )
      .join("");

    const label =
      gran === "day"
        ? "Daily"
        : gran === "month"
        ? "Monthly"
        : gran === "quarter"
        ? "Quarterly"
        : "Yearly";

    return `
      <h2>${label} Summary</h2>
      <table>
        <tr><th>Period</th><th>Transactions</th><th>Total Amount</th></tr>
        ${rows || `<tr><td colspan="3">No data</td></tr>`}
      </table>
    `;
  };

  // async + non-blocking export with concurrency & cleanup
  const exportAppSettings = async () => {
    if (isLoading) return; // prevent double taps
    if (!dateRange.from || !dateRange.to) {
      setAlertProps({
        open: true,
        title: "Missing Date Range",
        message: "Please select a start and end date for export.",
        confirmText: "OK",
        showCancel: false,
      });
      return;
    }
    setIsLoading(true);

    // make table builder async so we can yield on large datasets
    const generateHtmlTable = async (title, headers, data) => {
      if (!data || data.length === 0) {
        return `<h2>${title}</h2><p>No records found for the selected period.</p>`;
      }
      const headerRow = `<tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>`;
      const keyFromHeader = (h) => h.toLowerCase().replace(/ /g, "_");

      const rows = [];
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const cells = headers
          .map((h) => {
            const key = keyFromHeader(h);
            const val = row?.[key] ?? "";
            return `<td>${String(val).replace(/</g, "&lt;")}</td>`;
          })
          .join("");
        rows.push(`<tr>${cells}</tr>`);
        if (i % 1000 === 0) await Promise.resolve(); // yield to UI
      }
      return `<h2>${title} (${data.length})</h2><table><thead>${headerRow}</thead><tbody>${rows.join(
        ""
      )}</tbody></table>`;
    };

    try {
      // 1) Totals queries in parallel
      const expensesPromise = supabase
        .from("expenses")
        .select("amount")
        .eq("user_id", session.user.id)
        .gte("date", dateRange.from)
        .lte("date", dateRange.to);
      const incomesPromise = supabase
        .from("side_incomes")
        .select("amount")
        .eq("user_id", session.user.id);
      const investmentsPromise = supabase
        .from("investments")
        .select("amount")
        .eq("user_id", session.user.id);

      const [{ data: expensesData }, { data: incomesData }, { data: investmentsData }] =
        await Promise.all([expensesPromise, incomesPromise, investmentsPromise]);

      const totalExpenses =
        expensesData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      const totalIncomes =
        incomesData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      const totalInvestments =
        investmentsData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

      // 2) HTML parts (assembled at end)
      const parts = [];
      parts.push(`
        <html>
          <head>
            <title>Expenso Data Export</title>
            <style>
              body { font-family: sans-serif; padding: 18px; font-size: 15px; }
              h1 { font-size: 26px; color: #009688; }
              h2 { font-size: 19px; margin-top: 24px; color: #374151; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
              th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
              th { background: #f0fdf4; color: #059669; font-weight: 700; }
              tr:nth-child(even) { background: #f9fafb; }
              .small { color: #64748b; font-size: 13px; }
              .totals-summary { margin-top: 20px; padding: 15px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; }
              .totals-summary p { margin: 5px 0; font-size: 16px; color: #374151; }
            </style>
          </head>
          <body>
            <h1>Expenso Data Export</h1>
            <p class="small">Period: ${dateRange.from} to ${dateRange.to}</p>
            <p class="small">Exported: ${new Date().toLocaleString()}</p>
            
            <div class="totals-summary">
                <p><b>Total Income:</b> ₹${totalIncomes.toFixed(2)}</p>
                <p><b>Total Expenses (in period):</b> ₹${totalExpenses.toFixed(2)}</p>
                <p><b>Total Investments:</b> ₹${totalInvestments.toFixed(2)}</p>
            </div>
      `);

      const sectionsToExport = [
        {
          key: "expenses",
          title: "Expenses",
          headers: ["Date", "Title", "Category", "Amount"],
          query: () =>
            supabase
              .from("expenses")
              .select("date,title,category,amount")
              .eq("user_id", session.user.id)
              .gte("date", dateRange.from)
              .lte("date", dateRange.to),
        },
        {
          key: "budgets",
          title: "Budgets",
          headers: ["Category", "Amount", "Period"],
          query: () =>
            supabase
              .from("budgets")
              .select("category,amount,period")
              .eq("user_id", session.user.id),
        },
        {
          key: "incomes",
          title: "Income",
          headers: ["Source", "Amount", "Description", "Frequency", "Date"],
          query: () =>
            supabase
              .from("side_incomes")
              .select("source,amount,description,frequency,date")
              .eq("user_id", session.user.id),
        },
        {
          key: "investments",
          title: "Investments",
          headers: ["Title", "Amount", "Type", "Date"],
          query: () =>
            supabase
              .from("investments")
              .select("title,amount,type,date")
              .eq("user_id", session.user.id),
        },
        {
          key: "reminders",
          title: "Reminders",
          headers: ["Title", "Description", "Amount", "Category", "Next Due Date"],
          query: () =>
            supabase
              .from("payment_reminders")
              .select("title,description,amount,category,next_due_date")
              .eq("user_id", session.user.id),
        },
      ];

      // 3) Fetch selected sections concurrently
      const selected = sectionsToExport.filter((s) => exportOptions[s.key]);
      const results = await Promise.all(selected.map((s) => s.query()));

      for (let i = 0; i < selected.length; i++) {
        const { data, error } = results[i];
        if (error) throw error;
        parts.push(await generateHtmlTable(selected[i].title, selected[i].headers, data));
        await Promise.resolve(); // yield between sections
      }

      parts.push(`</body></html>`);
      const htmlContent = parts.join("");

      // 4) Render and share
      const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });

      if (!(await Sharing.isAvailableAsync())) {
        setAlertProps({
          open: true,
          title: "Sharing Not Available",
          message:
            "The PDF was saved locally, but this device cannot open the share sheet.",
          confirmText: "OK",
          showCancel: false,
          onConfirm: () => setAlertProps((a) => ({ ...a, open: false })),
        });
        setIsLoading(false);
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Export App Settings (PDF)",
        UTI: "com.adobe.pdf",
      });

      // clean up temp file
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch {}

      setAlertProps({
        open: true,
        title: "Export Successful",
        message: "Your selected data was exported as PDF.",
        confirmText: "OK",
        showCancel: false,
        icon: <FileText color="#fff" size={40} />,
        iconBg: "#06b6d4",
        confirmColor: "#06b6d4",
        confirmTextColor: "#fff",
        onConfirm: () => setAlertProps((a) => ({ ...a, open: false })),
        onCancel: null,
      });
    } catch (e) {
      console.error("Export error:", e);
      setAlertProps({
        open: true,
        title: "Export Failed",
        message: "Could not export data. An error occurred.",
        confirmText: "OK",
        showCancel: false,
        icon: <FileText color="#fff" size={40} />,
        iconBg: "#ef4444",
        confirmColor: "#ef4444",
        confirmTextColor: "#fff",
        onConfirm: () => setAlertProps((a) => ({ ...a, open: false })),
        onCancel: null,
      });
    } finally {
      setIsLoading(false);
    }
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
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
          style={[styles.backButton, { backgroundColor: theme.colors.buttonSecondary }]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>App Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 22, paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications Card */}
        <Card
          icon={<Bell color={theme.colors.primary} size={22} style={{ marginRight: 10 }} />}
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
              style={[styles.manageButton, { backgroundColor: theme.colors.buttonSecondary }]}
              onPress={openSettings}
            >
              <Text style={[styles.manageButtonText, { color: theme.colors.primary }]}>
                Manage
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Theme Card */}
        <Card
          icon={<Palette color={theme.colors.primary} size={22} style={{ marginRight: 10 }} />}
          title="Appearance"
        >
          <View style={styles.cardRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Theme</Text>
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
                        color: currentTheme === key ? "#fff" : theme.colors.textTertiary,
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

        {/* Help & Tour */}
        <Card
          icon={<HelpCircle color={theme.colors.primary} size={22} style={{ marginRight: 10 }} />}
          title="Help & Tour"
        >
          <View style={styles.cardRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>App Tour</Text>
            <TouchableOpacity
              style={[styles.tourButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation.navigate("Dashboard", { showOnboarding: true })}
            >
              <Text style={styles.tourButtonText}>Show Tour</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.sublabel, { color: theme.colors.textTertiary }]}>
            Replay the interactive tour to learn about all app features
          </Text>
        </Card>

        {/* Export Data */}
        <Card
          icon={<Download color={theme.colors.primary} size={22} style={{ marginRight: 10 }} />}
          title="Export Data"
        >
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            Export Expenses as Excel Report
          </Text>
          <Text style={[styles.sublabel, { color: theme.colors.textTertiary }]}>
            Generate a detailed Excel report with expense summary and category breakdown
          </Text>

          <View style={{ flexDirection: "row", marginTop: 14, marginBottom: 6 }}>
            <TouchableOpacity
              onPress={() => setShowDatePicker("from")}
              style={[styles.dateButton, { backgroundColor: theme.colors.buttonSecondary }]}
            >
              <Text style={[styles.dateButtonText, { color: theme.colors.textSecondary }]}>
                {dateRange.from || "Start Date"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowDatePicker("to")}
              style={[styles.dateButton, { backgroundColor: theme.colors.buttonSecondary }]}
            >
              <Text style={[styles.dateButtonText, { color: theme.colors.textSecondary }]}>
                {dateRange.to || "End Date"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 12 }}>
            {[
              { key: "expenses", label: "Expenses" },
              { key: "budgets", label: "Budgets" },
              { key: "reminders", label: "Reminders" },
              { key: "incomes", label: "Income" },
              { key: "investments", label: "Investments" },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                style={{ flexDirection: "row", alignItems: "center", marginVertical: 5 }}
                onPress={() =>
                  setExportOptions((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                }
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderWidth: 2,
                    borderColor: theme.colors.primary,
                    borderRadius: 6,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                    backgroundColor: exportOptions[item.key]
                      ? theme.colors.primary
                      : theme.colors.surface,
                  }}
                >
                  {exportOptions[item.key] && (
                    <Text style={{ color: "#fff", fontSize: 16 }}>✓</Text>
                  )}
                </View>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: theme.colors.primary, marginTop: 10 }]}
            onPress={exportAppSettings}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Download color="#fff" size={18} style={{ marginRight: 8 }} />
                <Text style={styles.exportButtonText}>Export Selected</Text>
              </>
            )}
          </TouchableOpacity>
        </Card>

        {/* Danger Zone */}
        <Card
          icon={<Trash2 color={theme.colors.error} size={22} style={{ marginRight: 10 }} />}
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
            style={[styles.deleteButton, { backgroundColor: theme.colors.error }]}
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
              dateRange[showDatePicker] ? new Date(dateRange[showDatePicker]) : new Date()
            }
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              const which = showDatePicker; // capture key before clearing
              setShowDatePicker(null);
              if (event.type === "set" && selectedDate && which) {
                setDateRange((prev) => ({
                  ...prev,
                  [which]: selectedDate.toISOString().slice(0, 10),
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
    marginTop: 12,
    width: "100%",
    alignSelf: "flex",
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
    width: "100%",
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
