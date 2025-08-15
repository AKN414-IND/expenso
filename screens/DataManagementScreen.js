import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { ArrowLeft, Download, Trash2 } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import DateTimePicker from "@react-native-community/datetimepicker";
import Alert from "../components/Alert"; // Ensure you have this component

export default function DataManagementScreen({ navigation }) {
  const { theme } = useTheme();
  const { session } = useAuth();
  const s = styles(theme);

  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(null);
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [alertProps, setAlertProps] = useState({ open: false });

  // --- Professional HTML Report Generation ---
  const generateProfessionalReportHTML = (data) => {
    const { profile, expenses, incomes, investments, budgets } = data;
    const today = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Calculate summaries
    const totalExpenses = expenses.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    );
    const totalIncomes = incomes.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    );
    const totalInvestments = investments.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    );
    const netSavings = totalIncomes - totalExpenses;

    // Helper to generate table rows
    const generateRows = (items, keys) => {
      if (!items || items.length === 0) {
        return `<tr><td colspan="${keys.length}" class="no-data">No data available for this period.</td></tr>`;
      }
      return items
        .map(
          (item) => `
            <tr>
                ${keys.map((key) => `<td>${item[key] || ""}</td>`).join("")}
            </tr>
        `
        )
        .join("");
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; color: #333; }
            .container { padding: 25px; }
            .header { background-color: ${
              theme.colors.primary
            }; color: white; padding: 20px; border-bottom: 5px solid ${
      theme.colors.primaryDark || "#004d40"
    }; }
            .header h1 { margin: 0; font-size: 28px; }
            .header p { margin: 5px 0 0; font-size: 14px; opacity: 0.9; }
            .section { margin-top: 30px; }
            .section-title { font-size: 22px; color: ${
              theme.colors.primary
            }; border-bottom: 2px solid #eee; padding-bottom: 8px; margin-bottom: 15px; }
            .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .summary-card { background-color: #f9f9f9; border-left: 5px solid; padding: 15px; border-radius: 5px; }
            .summary-card .label { font-size: 14px; color: #555; margin-bottom: 5px; }
            .summary-card .value { font-size: 20px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
            th { background-color: #f2f2f2; font-weight: 600; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .no-data { text-align: center; color: #888; font-style: italic; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #aaa; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Expenso Financial Report</h1>
            <p>For: ${profile.full_name || profile.email}</p>
            <p>Generated on: ${today}</p>
            ${
              dateRange.from && dateRange.to
                ? `<p>Period: ${dateRange.from} to ${dateRange.to}</p>`
                : ""
            }
          </div>
          <div class="container">
            <div class="section">
              <h2 class="section-title">Financial Summary</h2>
              <div class="summary-grid">
                <div class="summary-card" style="border-color: #28a745;">
                  <div class="label">Total Income</div>
                  <div class="value" style="color: #28a745;">₹${totalIncomes.toLocaleString()}</div>
                </div>
                <div class="summary-card" style="border-color: #dc3545;">
                  <div class="label">Total Expenses</div>
                  <div class="value" style="color: #dc3545;">₹${totalExpenses.toLocaleString()}</div>
                </div>
                <div class="summary-card" style="border-color: #17a2b8;">
                  <div class="label">Net Savings</div>
                  <div class="value" style="color: ${
                    netSavings >= 0 ? "#17a2b8" : "#dc3545"
                  };">₹${netSavings.toLocaleString()}</div>
                </div>
                <div class="summary-card" style="border-color: #ffc107;">
                  <div class="label">Total Investments</div>
                  <div class="value" style="color: #ffc107;">₹${totalInvestments.toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div class="section">
              <h2 class="section-title">Expenses</h2>
              <table>
                <thead><tr><th>Date</th><th>Title</th><th>Category</th><th>Amount (₹)</th></tr></thead>
                <tbody>${generateRows(expenses, [
                  "date",
                  "title",
                  "category",
                  "amount",
                ])}</tbody>
              </table>
            </div>

            <div class="section">
              <h2 class="section-title">Income</h2>
              <table>
                <thead><tr><th>Date</th><th>Source</th><th>Description</th><th>Amount (₹)</th></tr></thead>
                <tbody>${generateRows(incomes, [
                  "date",
                  "source",
                  "description",
                  "amount",
                ])}</tbody>
              </table>
            </div>

            <div class="section">
              <h2 class="section-title">Investments</h2>
              <table>
                <thead><tr><th>Date</th><th>Title</th><th>Type</th><th>Description</th><th>Amount (₹)</th></tr></thead>
                <tbody>${generateRows(investments, [
                  "date",
                  "title",
                  "type",
                  "description",
                  "amount",
                ])}</tbody>
              </table>
            </div>

            <div class="section">
              <h2 class="section-title">Budgets</h2>
              <table>
                <thead><tr><th>Category</th><th>Period</th><th>Amount (₹)</th></tr></thead>
                <tbody>${generateRows(budgets, [
                  "category",
                  "period",
                  "amount",
                ])}</tbody>
              </table>
            </div>
            
            <div class="footer">
              This is an auto-generated report from the Expenso application.
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const exportAllData = async () => {
    if (isLoading) return;
    if (!dateRange.from || !dateRange.to) {
      setAlertProps({
        open: true,
        title: "Date Range Required",
        message: "Please select a start and end date for the report.",
        onConfirm: () => setAlertProps({ open: false }),
        confirmText: "OK",
      });
      return;
    }
    setIsLoading(true);

    try {
      const [
        { data: profileData, error: profileError },
        { data: expensesData, error: expensesError },
        { data: incomesData, error: incomesError },
        { data: investmentsData, error: investmentsError },
        { data: budgetsData, error: budgetsError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single(),
        supabase
          .from("expenses")
          .select("*")
          .eq("user_id", session.user.id)
          .gte("date", dateRange.from)
          .lte("date", dateRange.to),
        supabase
          .from("side_incomes")
          .select("*")
          .eq("user_id", session.user.id)
          .gte("date", dateRange.from)
          .lte("date", dateRange.to),
        supabase
          .from("investments")
          .select("*")
          .eq("user_id", session.user.id)
          .gte("date", dateRange.from)
          .lte("date", dateRange.to),
        supabase.from("budgets").select("*").eq("user_id", session.user.id),
      ]);

      const errors = [profileError, expensesError, incomesError, investmentsError, budgetsError].filter(Boolean);
      if (errors.length > 0) {
        throw new Error(errors.map(e => e.message).join('\n'));
      }

      const reportData = {
        profile: profileData,
        expenses: expensesData,
        incomes: incomesData,
        investments: investmentsData,
        budgets: budgetsData,
      };

      const htmlContent = generateProfessionalReportHTML(reportData);
      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Expenso Financial Report",
        });
      }
    } catch (error) {
      setAlertProps({
        open: true,
        title: "Export Failed",
        message: error.message || "An unexpected error occurred.",
        onConfirm: () => setAlertProps({ open: false }),
        confirmText: "OK",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAllData = async () => {
    setIsLoading(true);
    try {
      // Call the Supabase RPC function
      const { data, error } = await supabase.rpc('delete_user_data');

      if (error) {
        throw error;
      }
      
      // Show success message
      setAlertProps({
        open: true,
        title: "Success",
        message: "All your financial data has been deleted successfully.",
        confirmText: "Great!",
        onConfirm: () => {
          setAlertProps({ open: false });
          // Optionally, navigate away or refresh the app state
          navigation.navigate("Dashboard"); 
        },
      });

    } catch (error) {
      setAlertProps({
        open: true,
        title: "Deletion Failed",
        message: error.message || "An unexpected error occurred while deleting your data.",
        confirmText: "OK",
        onConfirm: () => setAlertProps({ open: false }),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeleteAllData = () => {
    setAlertProps({
      open: true,
      title: "Delete All Data",
      message:
        "This is irreversible. Are you sure you want to delete ALL your application data? Your account will not be deleted.",
      confirmText: "Delete",
      cancelText: "Cancel",
      icon: <Trash2 color="#fff" size={40} />,
      iconBg: theme.colors.error,
      confirmColor: theme.colors.error,
      onConfirm: () => {
        setAlertProps({ open: false }); // Close the confirmation alert
        handleDeleteAllData(); // Proceed with deletion
      },
      onCancel: () => setAlertProps({ open: false }),
    });
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity
          style={s.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Data Management</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent}>
        <View style={s.card}>
          <Text style={s.cardTitle}>Export Financial Report</Text>
          <Text style={s.cardSubtitle}>
            Generate a professional PDF summary of all your financial data
            within a selected period.
          </Text>

          <Text style={s.label}>Select Date Range</Text>
          <View style={s.dateContainer}>
            <TouchableOpacity
              onPress={() => setShowDatePicker("from")}
              style={s.dateButton}
            >
              <Text style={s.dateText}>{dateRange.from || "Start Date"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowDatePicker("to")}
              style={s.dateButton}
            >
              <Text style={s.dateText}>{dateRange.to || "End Date"}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={s.actionButton}
            onPress={exportAllData}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Download color="#fff" size={18} style={{ marginRight: 8 }} />
                <Text style={s.actionButtonText}>Generate & Export Report</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={[s.card, { borderColor: theme.colors.error + "50" }]}>
          <Text style={s.cardTitle}>Danger Zone</Text>
          <Text style={s.cardSubtitle}>
            This action is permanent and cannot be undone.
          </Text>
          <TouchableOpacity
            style={[s.actionButton, { backgroundColor: theme.colors.error }]}
            onPress={confirmDeleteAllData}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Trash2 color="#fff" size={18} style={{ marginRight: 8 }} />
                <Text style={s.actionButtonText}>Delete All Data</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

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
            const which = showDatePicker;
            setShowDatePicker(null);
            if (event.type === "set" && selectedDate && which) {
              setDateRange((prev) => ({
                ...prev,
                [which]: selectedDate.toISOString().slice(0, 10),
              }));
            }
          }}
        />
      )}
      <Alert {...alertProps} />
    </View>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: Platform.OS === "ios" ? 60 : 50,
      paddingBottom: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: { fontSize: 20, fontWeight: "bold", color: theme.colors.text },
    backButton: { padding: 8 },
    scrollContent: { padding: 16 },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 4,
    },
    cardSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 20,
    },
    label: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      marginBottom: 10,
      marginTop: 10,
    },
    dateContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    dateButton: {
      backgroundColor: theme.colors.buttonSecondary,
      paddingVertical: 12,
      borderRadius: 10,
      width: "48%",
      alignItems: "center",
    },
    dateText: { color: theme.colors.text, fontWeight: "500" },
    actionButton: {
      backgroundColor: theme.colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      borderRadius: 12,
      marginTop: 10,
    },
    actionButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  });
