// screens/DataManagementScreen.js
// NOTE: This screen reuses the complex export logic from your original AppSettingsScreen.js.
// Make sure you have your dependencies (expo-print, expo-sharing, etc.) and the Alert component ready.

import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { ArrowLeft, Download, Trash2, FileText } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import DateTimePicker from "@react-native-community/datetimepicker";
import Alert from "../components/Alert"; // Assuming Alert component exists

export default function DataManagementScreen({ navigation }) {
  const { theme } = useTheme();
  const { session } = useAuth();
  const s = styles(theme);

  // --- STATE HOOKS for export functionality ---
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(null);
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [exportOptions, setExportOptions] = useState({ expenses: true, incomes: false, budgets: false, investments: false, reminders: false });
  const [alertProps, setAlertProps] = useState({ open: false });
  
  // --- PASTE ALL YOUR EXPORT AND DELETE FUNCTIONS HERE ---
  // e.g., exportAppSettings, confirmDeleteAllData, generateHtmlTable, etc.
  // The logic inside these functions does not need to change.
  // I am including a placeholder for the main export function.

  const exportAppSettings = async () => {
      if (isLoading) return;
      if (!dateRange.from || !dateRange.to) {
          setAlertProps({ open: true, title: "Date Range Required", message: "Please select a start and end date.", confirmText: "OK" });
          return;
      }
      setIsLoading(true);
      // ... Your full export logic here
      console.log("Exporting data...", { dateRange, exportOptions });
      // Simulate export
      setTimeout(() => {
          setIsLoading(false);
          setAlertProps({ open: true, title: "Export Complete", message: "Your data has been exported.", confirmText: "OK", icon: <FileText color="#fff" size={40} />, iconBg: theme.colors.primary });
      }, 2000);
  };
  
  const confirmDeleteAllData = () => {
    setAlertProps({
      open: true,
      title: "Delete All Data",
      message: "This is irreversible. Are you sure you want to delete ALL your application data?",
      confirmText: "Delete",
      cancelText: "Cancel",
      icon: <Trash2 color="#fff" size={40} />,
      iconBg: theme.colors.error,
      confirmColor: theme.colors.error,
      onConfirm: () => {
        console.log("Deleting data...");
        setAlertProps({ open: false });
      },
      onCancel: () => setAlertProps({ open: false }),
    });
  };

  const Checkbox = ({ label, value, onToggle }) => (
    <TouchableOpacity style={s.checkboxContainer} onPress={onToggle}>
      <View style={[s.checkbox, value && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}>
        {value && <Text style={s.checkmark}>✓</Text>}
      </View>
      <Text style={s.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Data Management</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent}>
        {/* Export Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Export Your Data</Text>
          <Text style={s.cardSubtitle}>Generate a PDF report of your selected data.</Text>
          
          <Text style={s.label}>Date Range</Text>
          <View style={s.dateContainer}>
            <TouchableOpacity onPress={() => setShowDatePicker('from')} style={s.dateButton}>
              <Text style={s.dateText}>{dateRange.from || "Start Date"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowDatePicker('to')} style={s.dateButton}>
              <Text style={s.dateText}>{dateRange.to || "End Date"}</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Data to Include</Text>
          <Checkbox label="Expenses" value={exportOptions.expenses} onToggle={() => setExportOptions(p => ({ ...p, expenses: !p.expenses }))} />
          <Checkbox label="Income" value={exportOptions.incomes} onToggle={() => setExportOptions(p => ({ ...p, incomes: !p.incomes }))} />
          <Checkbox label="Budgets" value={exportOptions.budgets} onToggle={() => setExportOptions(p => ({ ...p, budgets: !p.budgets }))} />
          <Checkbox label="Investments" value={exportOptions.investments} onToggle={() => setExportOptions(p => ({ ...p, investments: !p.investments }))} />
          <Checkbox label="Reminders" value={exportOptions.reminders} onToggle={() => setExportOptions(p => ({ ...p, reminders: !p.reminders }))} />

          <TouchableOpacity style={s.actionButton} onPress={exportAppSettings} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Download color="#fff" size={18} style={{ marginRight: 8 }} />
                <Text style={s.actionButtonText}>Export Data</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Danger Zone Card */}
        <View style={[s.card, { borderColor: theme.colors.error + '50' }]}>
          <Text style={s.cardTitle}>Danger Zone</Text>
          <Text style={s.cardSubtitle}>These actions are permanent and cannot be undone.</Text>
          <TouchableOpacity 
            style={[s.actionButton, { backgroundColor: theme.colors.error }]}
            onPress={confirmDeleteAllData}>
            <Trash2 color="#fff" size={18} style={{ marginRight: 8 }} />
            <Text style={s.actionButtonText}>Delete All Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={dateRange[showDatePicker] ? new Date(dateRange[showDatePicker]) : new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            const which = showDatePicker;
            setShowDatePicker(null);
            if (event.type === 'set' && selectedDate && which) {
              setDateRange(prev => ({...prev, [which]: selectedDate.toISOString().slice(0, 10)}));
            }
          }}
        />
      )}
      <Alert {...alertProps} onConfirm={() => setAlertProps(p => ({ ...p, open: false }))} />
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 16,
      backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
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
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 4 },
    cardSubtitle: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 20 },
    label: { fontSize: 15, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 10, marginTop: 10 },
    dateContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    dateButton: {
        backgroundColor: theme.colors.buttonSecondary,
        paddingVertical: 12,
        borderRadius: 10,
        width: '48%',
        alignItems: 'center',
    },
    dateText: { color: theme.colors.text, fontWeight: '500' },
    checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    checkbox: {
        width: 24, height: 24, borderRadius: 6, borderWidth: 2,
        borderColor: theme.colors.primary, marginRight: 12,
        alignItems: 'center', justifyContent: 'center'
    },
    checkmark: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    checkboxLabel: { fontSize: 16, color: theme.colors.text },
    actionButton: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 16,
    },
    actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});