import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const EXPENSE_CATEGORIES = [
  { name: "Food & Dining", icon: "🍽️", color: "#FF6B6B" },
  { name: "Transportation", icon: "🚗", color: "#4ECDC4" },
  { name: "Shopping", icon: "🛍️", color: "#45B7D1" },
  { name: "Entertainment", icon: "🎬", color: "#96CEB4" },
  { name: "Bills & Utilities", icon: "💡", color: "#FECA57" },
  { name: "Healthcare", icon: "🏥", color: "#FF9FF3" },
  { name: "Education", icon: "📚", color: "#54A0FF" },
  { name: "Travel", icon: "✈️", color: "#5F27CD" },
  { name: "Groceries", icon: "🛒", color: "#00D2D3" },
  { name: "Other", icon: "📝", color: "#747D8C" },
];

export default function BudgetScreen({ navigation }) {
  const { session } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [budgetForm, setBudgetForm] = useState({
    category: "",
    amount: "",
    period: "monthly",
  });

  useEffect(() => {
    if (session && session.user) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    await Promise.all([fetchExpenses(), fetchBudgets()]);
    setLoading(false);
    setRefreshing(false);
  };

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", session.user.id);

      if (!error && data) {
        setExpenses(data);
      } else {
        setExpenses([]);
      }
    } catch (err) {
      setExpenses([]);
    }
  };

  const fetchBudgets = async () => {
    try {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setBudgets(data);
      } else {
        setBudgets([]);
      }
    } catch (err) {
      setBudgets([]);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getCategorySpending = (category, period = "monthly") => {
    const now = new Date();
    let startDate;

    switch (period) {
      case "weekly":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "monthly":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    return expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.date);
        return expense.category === category && expenseDate >= startDate;
      })
      .reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
  };

  const getBudgetProgress = () => {
    return budgets.map((budget) => {
      const spent = getCategorySpending(budget.category, budget.period);
      const remaining = budget.amount - spent;
      const percentage = Math.min((spent / budget.amount) * 100, 100);
      const categoryData = EXPENSE_CATEGORIES.find(
        (cat) => cat.name === budget.category
      );
      return {
        ...budget,
        spent,
        remaining,
        percentage,
        icon: categoryData?.icon || "📝",
        color: categoryData?.color || "#747D8C",
        isOverBudget: spent > budget.amount,
      };
    });
  };

  const openBudgetModal = (budget = null) => {
    if (budget) {
      setEditingBudget(budget);
      setBudgetForm({
        category: budget.category,
        amount: budget.amount.toString(),
        period: budget.period,
      });
    } else {
      setEditingBudget(null);
      setBudgetForm({
        category: "",
        amount: "",
        period: "monthly",
      });
    }
    setBudgetModalVisible(true);
  };

  const saveBudget = async () => {
    if (!budgetForm.category || !budgetForm.amount) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      if (editingBudget) {
        // Update existing budget
        const { error } = await supabase
          .from("budgets")
          .update({
            category: budgetForm.category,
            amount: parseFloat(budgetForm.amount),
            period: budgetForm.period,
          })
          .eq("id", editingBudget.id);

        if (!error) {
          setBudgetModalVisible(false);
          fetchBudgets();
          Alert.alert("Success", "Budget updated successfully!");
        } else {
          Alert.alert("Error", "Failed to update budget");
        }
      } else {
        // Check if budget already exists for this category
        const existingBudget = budgets.find(
          (b) => b.category === budgetForm.category
        );
        
        if (existingBudget) {
          Alert.alert(
            "Budget Exists", 
            "A budget for this category already exists. Do you want to update it?",
            [
              { text: "Cancel", style: "cancel" },
              { 
                text: "Update", 
                onPress: () => {
                  setEditingBudget(existingBudget);
                  saveBudget();
                }
              }
            ]
          );
          return;
        }

        // Create new budget
        const { error } = await supabase.from("budgets").insert([
          {
            user_id: session.user.id,
            category: budgetForm.category,
            amount: parseFloat(budgetForm.amount),
            period: budgetForm.period,
          },
        ]);

        if (!error) {
          setBudgetModalVisible(false);
          fetchBudgets();
          Alert.alert("Success", "Budget created successfully!");
        } else {
          Alert.alert("Error", "Failed to create budget");
        }
      }
      
      setBudgetForm({ category: "", amount: "", period: "monthly" });
      setEditingBudget(null);
    } catch (err) {
      Alert.alert("Error", "Failed to save budget");
    }
  };

  const deleteBudget = async (budgetId) => {
    Alert.alert(
      "Delete Budget",
      "Are you sure you want to delete this budget?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("budgets")
                .delete()
                .eq("id", budgetId);

              if (!error) {
                fetchBudgets();
                Alert.alert("Success", "Budget deleted successfully!");
              } else {
                Alert.alert("Error", "Failed to delete budget");
              }
            } catch (err) {
              Alert.alert("Error", "Failed to delete budget");
            }
          },
        },
      ]
    );
  };

  const renderBudgetItem = ({ item }) => (
    <View
      style={[styles.budgetItem, item.isOverBudget && styles.overBudgetItem]}
    >
      <View style={styles.budgetHeader}>
        <View style={styles.budgetTitleContainer}>
          <Text style={styles.budgetIcon}>{item.icon}</Text>
          <View style={styles.budgetInfo}>
            <Text style={styles.budgetTitle}>{item.category}</Text>
            <Text style={styles.budgetPeriod}>
              {item.period.charAt(0).toUpperCase() + item.period.slice(1)} Budget
            </Text>
          </View>
        </View>
        <View style={styles.budgetActions}>
          <TouchableOpacity
            style={styles.editBudgetButton}
            onPress={() => openBudgetModal(item)}
          >
            <Text style={styles.actionButtonText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBudgetButton}
            onPress={() => deleteBudget(item.id)}
          >
            <Text style={styles.actionButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.budgetProgress}>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(item.percentage, 100)}%`,
                backgroundColor: item.isOverBudget ? "#ef4444" : item.color,
              },
            ]}
          />
        </View>
        <Text
          style={[
            styles.progressText,
            item.isOverBudget && styles.overBudgetText,
          ]}
        >
          {item.percentage.toFixed(0)}%
        </Text>
      </View>

      <View style={styles.budgetStats}>
        <View style={styles.budgetStatItem}>
          <Text style={styles.budgetStatLabel}>Spent</Text>
          <Text style={styles.budgetStatValue}>₹{item.spent.toFixed(2)}</Text>
        </View>
        <View style={styles.budgetStatItem}>
          <Text style={styles.budgetStatLabel}>
            {item.isOverBudget ? "Over by" : "Remaining"}
          </Text>
          <Text
            style={[
              styles.budgetStatValue,
              item.isOverBudget && styles.overBudgetAmount,
            ]}
          >
            ₹{Math.abs(item.remaining).toFixed(2)}
          </Text>
        </View>
        <View style={styles.budgetStatItem}>
          <Text style={styles.budgetStatLabel}>Budget</Text>
          <Text style={styles.budgetStatValue}>₹{item.amount.toFixed(2)}</Text>
        </View>
      </View>

      {item.isOverBudget && (
        <View style={styles.overBudgetWarning}>
          <Text style={styles.overBudgetWarningText}>
            ⚠️ You've exceeded your budget for this category
          </Text>
        </View>
      )}
    </View>
  );

  const budgetProgress = getBudgetProgress();
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);
  const totalSpent = budgetProgress.reduce((sum, item) => sum + item.spent, 0);
  const overBudgetCount = budgetProgress.filter(item => item.isOverBudget).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading budgets...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Budget Management</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => openBudgetModal()}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>₹{totalBudget.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>Total Budget</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>₹{totalSpent.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>Total Spent</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, overBudgetCount > 0 && styles.warningText]}>
              {overBudgetCount}
            </Text>
            <Text style={styles.summaryLabel}>Over Budget</Text>
          </View>
        </View>

        {/* Budget List */}
        <View style={styles.budgetListContainer}>
          {budgetProgress.length > 0 ? (
            <FlatList
              data={budgetProgress}
              renderItem={renderBudgetItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>💰</Text>
              <Text style={styles.emptyStateTitle}>No Budgets Set</Text>
              <Text style={styles.emptyStateText}>
                Create your first budget to start tracking your spending limits
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => openBudgetModal()}
              >
                <Text style={styles.emptyStateButtonText}>Create Budget</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Budget Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={budgetModalVisible}
          onRequestClose={() => setBudgetModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingBudget ? "Edit Budget" : "Create Budget"}
              </Text>
              
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryPickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category.name}
                      style={[
                        styles.categoryPicker,
                        budgetForm.category === category.name &&
                          styles.selectedCategoryPicker,
                      ]}
                      onPress={() =>
                        setBudgetForm({
                          ...budgetForm,
                          category: category.name,
                        })
                      }
                    >
                      <Text style={styles.categoryPickerIcon}>
                        {category.icon}
                      </Text>
                      <Text style={styles.categoryPickerText}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.inputLabel}>Budget Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                value={budgetForm.amount}
                onChangeText={(text) =>
                  setBudgetForm({ ...budgetForm, amount: text })
                }
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Period</Text>
              <View style={styles.periodContainer}>
                {["weekly", "monthly", "yearly"].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodButton,
                      budgetForm.period === period &&
                        styles.selectedPeriodButton,
                    ]}
                    onPress={() => setBudgetForm({ ...budgetForm, period })}
                  >
                    <Text
                      style={[
                        styles.periodButtonText,
                        budgetForm.period === period &&
                          styles.selectedPeriodButtonText,
                      ]}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setBudgetModalVisible(false);
                    setBudgetForm({
                      category: "",
                      amount: "",
                      period: "monthly",
                    });
                    setEditingBudget(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={saveBudget}
                >
                  <Text style={styles.saveButtonText}>
                    {editingBudget ? "Update Budget" : "Create Budget"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
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
    paddingBottom: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.1)",
  },
  backButton: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  backButtonText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    letterSpacing: -0.3,
  },
  addButton: {
    backgroundColor: "#06b6d4",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  summaryContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "rgba(6, 182, 212, 0.1)",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#06b6d4",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    fontWeight: "500",
  },
  warningText: {
    color: "#ef4444",
  },
  budgetListContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  budgetItem: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "rgba(6, 182, 212, 0.1)",
  },
  overBudgetItem: {
    borderLeftWidth: 6,
    borderLeftColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  budgetTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  budgetIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  budgetInfo: {
    flex: 1,
  },
  budgetTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    letterSpacing: -0.2,
  },
  budgetPeriod: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "500",
  },
  budgetActions: {
    flexDirection: "row",
    gap: 8,
  },
  editBudgetButton: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    padding: 8,
    borderRadius: 12,
  },
  deleteBudgetButton: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: 8,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 16,
  },
  budgetProgress: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  progressBarContainer: {
    flex: 1,
    height: 12,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    borderRadius: 8,
    marginRight: 12,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    minWidth: 40,
    textAlign: "right",
  },
  overBudgetText: {
    color: "#ef4444",
  },
  budgetStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
  },
  budgetStatItem: {
    alignItems: "center",
  },
  budgetStatLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    marginBottom: 4,
  },
  budgetStatValue: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "600",
  },
  overBudgetAmount: {
    color: "#ef4444",
  },
  overBudgetWarning: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
  },
  overBudgetWarningText: {
    fontSize: 13,
    color: "#dc2626",
    fontWeight: "500",
    textAlign: "center",
  },
  emptyState: {
    backgroundColor: "#fff",
    padding: 48,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 40,
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "rgba(6, 182, 212, 0.1)",
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  emptyStateText: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: "#06b6d4",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyStateButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 28,
    width: "92%",
    maxHeight: "85%",
    elevation: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 28,
    letterSpacing: -0.3,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
    marginTop: 16,
    letterSpacing: -0.1,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "rgba(148, 163, 184, 0.2)",
    fontSize: 16,
    color: "#1e293b",
    elevation: 2,
  },
  categoryPickerContainer: {
    marginBottom: 20,
  },
  categoryPicker: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    alignItems: "center",
    minWidth: 90,
    borderWidth: 1.5,
    borderColor: "rgba(148, 163, 184, 0.2)",
    elevation: 2,
  },
  selectedCategoryPicker: {
    backgroundColor: "#06b6d4",
    borderColor: "#06b6d4",
  },
  categoryPickerIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  categoryPickerText: {
    fontSize: 11,
    color: "#1e293b",
    textAlign: "center",
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  periodContainer: {
    flexDirection: "row",
    marginBottom: 24,
  },
  periodButton: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(148, 163, 184, 0.2)",
    elevation: 2,
    marginRight: 8,
  },
  selectedPeriodButton: {
    backgroundColor: "#06b6d4",
    borderColor: "#06b6d4",
  },
  periodButtonText: {
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  selectedPeriodButtonText: {
    color: "white",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    elevation: 4,
  },
  cancelButton: {
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "rgba(148, 163, 184, 0.3)",
  },
  saveButton: {
    backgroundColor: "#06b6d4",
  },
  cancelButtonText: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: 16,
    letterSpacing: -0.1,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    letterSpacing: -0.1,
  },
});