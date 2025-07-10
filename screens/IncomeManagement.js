import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList,
  RefreshControl,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Calendar,
  RefreshCw,
  User,
  BarChart3,
} from "lucide-react-native";

export default function SideIncomeScreen({ navigation }) {
  const { session } = useAuth();
  const { theme } = useTheme();
  const [sideIncomes, setSideIncomes] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [form, setForm] = useState({
    source: "",
    amount: "",
    description: "",
    frequency: "monthly",
    isRecurring: true,
    date: "", // Add date field to form
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchSideIncomes(), fetchProfile()]);
    setLoading(false);
  };

  const fetchSideIncomes = async () => {
    try {
      const { data, error } = await supabase
        .from("side_incomes")
        .select("*")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false });
      if (error) throw error;
      setSideIncomes(data || []);
    } catch (err) {
      console.error("Error fetching side incomes:", err);
      Alert.alert("Error", "Failed to fetch side incomes");
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("monthly_income, full_name, email")
        .eq("id", session.user.id)
        .single();
      if (!error) setProfileData(data);
    } catch (err) {
      // Ignore, optional
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }, []);

  const openModal = (income = null) => {
    if (income) {
      setEditingIncome(income);
      setForm({
        source: income.source,
        amount: income.amount.toString(),
        description: income.description || "",
        frequency: income.frequency || "monthly",
        isRecurring: income.is_recurring || false,
        date: income.date || new Date().toISOString().split("T")[0],
      });
    } else {
      setEditingIncome(null);
      setForm({
        source: "",
        amount: "",
        description: "",
        frequency: "monthly",
        isRecurring: true,
        date: new Date().toISOString().split("T")[0],
      });
    }
    setModalVisible(true);
  };

  const validateForm = () => {
    if (!form.source.trim()) {
      Alert.alert("Validation Error", "Please enter an income source");
      return false;
    }
    if (!form.amount.trim()) {
      Alert.alert("Validation Error", "Please enter an amount");
      return false;
    }
    if (isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      Alert.alert("Validation Error", "Please enter a valid amount greater than 0");
      return false;
    }
    if (!form.date) {
      Alert.alert("Validation Error", "Please select a date");
      return false;
    }
    return true;
  };

  const saveSideIncome = async () => {
    if (!validateForm()) return;
    try {
      const incomeData = {
        user_id: session.user.id,
        source: form.source.trim(),
        amount: parseFloat(form.amount),
        description: form.description.trim(),
        frequency: form.frequency,
        is_recurring: form.isRecurring,
        date: form.date,
        updated_at: new Date().toISOString(),
      };
      if (editingIncome) {
        const { error } = await supabase
          .from("side_incomes")
          .update(incomeData)
          .eq("id", editingIncome.id);
        if (error) throw error;
        Alert.alert("Success", "Side income updated successfully!");
      } else {
        incomeData.created_at = new Date().toISOString();
        const { error } = await supabase
          .from("side_incomes")
          .insert([incomeData]);
        if (error) throw error;
        Alert.alert("Success", "Side income added successfully!");
      }
      setModalVisible(false);
      fetchSideIncomes();
    } catch (err) {
      console.error("Error saving side income:", err);
      Alert.alert("Error", "Failed to save side income. Please try again.");
    }
  };

  const deleteSideIncome = async (id) => {
    Alert.alert(
      "Delete Side Income",
      "Are you sure you want to delete this side income? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("side_incomes")
                .delete()
                .eq("id", id);
              if (error) throw error;
              fetchSideIncomes();
              Alert.alert("Success", "Side income deleted successfully!");
            } catch (err) {
              console.error("Error deleting side income:", err);
              Alert.alert("Error", "Failed to delete side income. Please try again.");
            }
          },
        },
      ]
    );
  };

  // Only recurring and this month's one-time incomes are counted as monthly
  const getTotalSideIncome = () => {
    const today = new Date();
    return sideIncomes.reduce((total, income) => {
      if (income.frequency === "monthly" || (income.frequency === "one-time" && isIncomeThisMonth(income.date, today))) {
        return total + income.amount;
      } else if (income.frequency === "weekly") {
        return total + (income.amount * 4.33);
      } else {
        return total;
      }
    }, 0);
  };

  function isIncomeThisMonth(dateStr, now) {
    const d = new Date(dateStr);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }

  const getTotalMonthlyIncome = () => {
    const profileIncome = profileData?.monthly_income || 0;
    const sideIncome = getTotalSideIncome();
    return profileIncome + sideIncome;
  };

  const getIncomeBreakdown = () => {
    const profileIncome = profileData?.monthly_income || 0;
    const sideIncome = getTotalSideIncome();
    const total = profileIncome + sideIncome;
    return {
      primaryIncome: profileIncome,
      sideIncome: sideIncome,
      total: total,
      sideIncomePercentage: total > 0 ? (sideIncome / total) * 100 : 0,
    };
  };

  const renderSideIncomeItem = ({ item }) => (
    <View style={[styles.incomeItem, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.incomeContent}>
        <View style={styles.incomeHeader}>
          <Text style={[styles.incomeSource, { color: theme.colors.text }]}>
            {item.source}
          </Text>
          <Text style={[styles.incomeAmount, { color: theme.colors.primary }]}>
            ₹{item.amount.toLocaleString()}
          </Text>
        </View>
        <View style={styles.incomeDetails}>
          <Text style={[styles.incomeFrequency, { color: theme.colors.textSecondary }]}>
            {item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)} • {item.is_recurring ? "Recurring" : "One-time"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
            <Calendar color={theme.colors.textTertiary} size={14} />
            <Text style={[{ marginLeft: 4, fontSize: 13, color: theme.colors.textTertiary }]}>
              {item.date ? new Date(item.date).toLocaleDateString() : "-"}
            </Text>
          </View>
          {item.description ? (
            <Text style={[styles.incomeDescription, { color: theme.colors.textTertiary }]}>
              {item.description}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.incomeActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.buttonSecondary }]}
          onPress={() => openModal(item)}
        >
          <Edit3 color={theme.colors.primary} size={16} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.errorLight }]}
          onPress={() => deleteSideIncome(item.id)}
        >
          <Trash2 color={theme.colors.error} size={16} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const breakdown = getIncomeBreakdown();

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.colors.buttonSecondary }]}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Income Overview
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => openModal()}
          >
            <Plus color="white" size={24} />
          </TouchableOpacity>
        </View>
        <ScrollView 
          style={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Total Income Summary */}
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryIconContainer, { backgroundColor: theme.colors.primary + "20" }]}>
                <BarChart3 color={theme.colors.primary} size={24} />
              </View>
              <View style={styles.summaryContent}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                  Total Monthly Income
                </Text>
                <Text style={[styles.summaryAmount, { color: theme.colors.primary }]}>
                  ₹{getTotalMonthlyIncome().toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
          {/* Income Breakdown */}
          <View style={[styles.breakdownCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.breakdownTitle, { color: theme.colors.text }]}>
              Income Breakdown
            </Text>
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <View style={[styles.breakdownIcon, { backgroundColor: theme.colors.primary + "20" }]}>
                  <User color={theme.colors.primary} size={16} />
                </View>
                <View style={styles.breakdownContent}>
                  <Text style={[styles.breakdownLabel, { color: theme.colors.textSecondary }]}>
                    Primary Income
                  </Text>
                  <Text style={[styles.breakdownAmount, { color: theme.colors.text }]}>
                    ₹{breakdown.primaryIncome.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <View style={[styles.breakdownIcon, { backgroundColor: theme.colors.success + "20" }]}>
                  <TrendingUp color={theme.colors.success} size={16} />
                </View>
                <View style={styles.breakdownContent}>
                  <Text style={[styles.breakdownLabel, { color: theme.colors.textSecondary }]}>
                    Side Income ({breakdown.sideIncomePercentage.toFixed(1)}% of total)
                  </Text>
                  <Text style={[styles.breakdownAmount, { color: theme.colors.success }]}>
                    ₹{breakdown.sideIncome.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          {/* Side Income List */}
          <View style={styles.listContainer}>
            <View style={styles.listHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Side Income Sources ({sideIncomes.length})
              </Text>
              <TouchableOpacity
                style={[styles.refreshButton, { backgroundColor: theme.colors.buttonSecondary }]}
                onPress={() => fetchSideIncomes()}
              >
                <RefreshCw color={theme.colors.primary} size={16} />
              </TouchableOpacity>
            </View>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                  Loading income data...
                </Text>
              </View>
            ) : sideIncomes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <DollarSign color={theme.colors.textTertiary} size={48} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No side incomes added yet
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
                  Track your freelance work, part-time jobs, or any additional income sources
                </Text>
                <TouchableOpacity
                  style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => openModal()}
                >
                  <Plus color="white" size={20} />
                  <Text style={styles.emptyButtonText}>Add Your First Side Income</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={sideIncomes}
                renderItem={renderSideIncomeItem}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                scrollEnabled={false}
              />
            )}
          </View>
        </ScrollView>
      </View>
      {/* Add/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {editingIncome ? "Edit Side Income" : "Add Side Income"}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <X color={theme.colors.textTertiary} size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Income Source *
                </Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: theme.colors.buttonSecondary,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  }]}
                  placeholder="e.g., Freelance Web Design, Tutoring"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={form.source}
                  onChangeText={(text) => setForm({ ...form, source: text })}
                  maxLength={50}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Amount (₹) *
                </Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: theme.colors.buttonSecondary,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  }]}
                  placeholder="Enter amount"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={form.amount}
                  keyboardType="numeric"
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9.]/g, '');
                    setForm({ ...form, amount: numericText });
                  }}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Description (Optional)
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea, {
                    backgroundColor: theme.colors.buttonSecondary,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  }]}
                  placeholder="Description"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={form.description}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                  onChangeText={(text) => setForm({ ...form, description: text })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Date Received *
                </Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: theme.colors.buttonSecondary,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={form.date}
                  onChangeText={(text) => setForm({ ...form, date: text })}
                  maxLength={10}
                />
                <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 }}>
                  Example: 2025-07-10
                </Text>
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Frequency
                </Text>
                <View style={styles.frequencyContainer}>
                  {[
                    { key: "monthly", label: "Monthly" },
                    { key: "weekly", label: "Weekly" },
                    { key: "one-time", label: "One-time" }
                  ].map((freq) => (
                    <TouchableOpacity
                      key={freq.key}
                      style={[
                        styles.frequencyButton,
                        form.frequency === freq.key && { backgroundColor: theme.colors.primary },
                        { borderColor: theme.colors.border }
                      ]}
                      onPress={() => setForm({ ...form, frequency: freq.key })}
                    >
                      <Text style={[
                        styles.frequencyText,
                        form.frequency === freq.key
                          ? { color: "white" }
                          : { color: theme.colors.textSecondary }
                      ]}>
                        {freq.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setForm({ ...form, isRecurring: !form.isRecurring })}
                >
                  <View style={[
                    styles.checkbox,
                    form.isRecurring && { backgroundColor: theme.colors.primary },
                    { borderColor: theme.colors.border }
                  ]}>
                    {form.isRecurring && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.checkboxLabel, { color: theme.colors.textSecondary }]}>
                    This is a recurring income source
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.colors.buttonSecondary }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.colors.primary }]}
                onPress={saveSideIncome}
              >
                <Save color="white" size={16} style={{ marginRight: 8 }} />
                <Text style={styles.saveButtonText}>
                  {editingIncome ? "Update" : "Add"} Income
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  addButton: {
    padding: 8,
    borderRadius: 12,
  },
  summaryCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: "700",
  },
  breakdownCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  breakdownItem: {
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  breakdownIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  breakdownContent: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  breakdownAmount: {
    fontSize: 16,
    fontWeight: "600",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
  incomeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  incomeContent: {
    flex: 1,
  },
  incomeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  incomeSource: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  incomeAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  incomeDetails: {
    marginTop: 4,
  },
  incomeFrequency: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  incomeDescription: {
    fontSize: 14,
    fontStyle: "italic",
  },
  incomeActions: {
    flexDirection: "row",
    marginLeft: 12,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    width: "90%",
    maxHeight: "85%",
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.1)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    maxHeight: 400,
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  frequencyContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  frequencyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    marginHorizontal: 4,
  },
  frequencyText: {
    fontSize: 14,
    fontWeight: "500",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkmark: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  modalButtons: {
    flexDirection: "row",
    padding: 24,
    paddingTop: 16,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    marginRight: 12,
  },
  saveButton: {
    backgroundColor: "#06b6d4",
  },
  cancelButtonText: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: 16,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});