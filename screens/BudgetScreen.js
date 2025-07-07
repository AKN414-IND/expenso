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
  Dimensions,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const { width } = Dimensions.get('window');

const EXPENSE_CATEGORIES = [
  { name: "Food & Dining", icon: "🍽️", color: "#06b6d4" },
  { name: "Transportation", icon: "🚗", color: "#334155" },
  { name: "Shopping", icon: "🛍️", color: "#facc15" },
  { name: "Entertainment", icon: "🎬", color: "#06b6d4" },
  { name: "Bills & Utilities", icon: "💡", color: "#facc15" },
  { name: "Healthcare", icon: "🏥", color: "#334155" },
  { name: "Education", icon: "📚", color: "#06b6d4" },
  { name: "Travel", icon: "✈️", color: "#facc15" },
  { name: "Groceries", icon: "🛒", color: "#334155" },
  { name: "Other", icon: "📝", color: "#06b6d4" },
];

export default function BudgetScreen({ navigation }) {
  const { session } = useAuth();
  const { theme } = useTheme();
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
        color: categoryData?.color || "#06b6d4",
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
    <View style={[styles.budgetCard, item.isOverBudget && styles.overBudgetCard]}>
      <View style={styles.budgetHeader}>
        <View style={styles.budgetTitleSection}>
          <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
            <Text style={styles.budgetIcon}>{item.icon}</Text>
          </View>
          <View style={styles.budgetInfo}>
            <Text style={styles.budgetTitle}>{item.category}</Text>
            <Text style={styles.budgetPeriod}>
              {item.period.charAt(0).toUpperCase() + item.period.slice(1)} Budget
            </Text>
          </View>
        </View>
        <View style={styles.budgetActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => openBudgetModal(item)}
          >
            <Text style={styles.actionButtonText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => deleteBudget(item.id)}
          >
            <Text style={styles.actionButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.progressSection}>
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
        <Text style={[styles.progressText, item.isOverBudget && styles.overBudgetText]}>
          {item.percentage.toFixed(0)}%
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>₹{item.spent.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Spent</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, item.isOverBudget && styles.overBudgetAmount]}>
            ₹{Math.abs(item.remaining).toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>
            {item.isOverBudget ? "Over by" : "Remaining"}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>₹{item.amount.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Budget</Text>
        </View>
      </View>

      {item.isOverBudget && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ Budget exceeded by ₹{Math.abs(item.remaining).toLocaleString()}
          </Text>
        </View>
      )}
    </View>
  );

  const budgetProgress = getBudgetProgress();
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);
  const totalSpent = budgetProgress.reduce((sum, item) => sum + item.spent, 0);
  const overBudgetCount = budgetProgress.filter(item => item.isOverBudget).length;
  const remainingBudget = totalBudget - totalSpent;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading budget data...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => openBudgetModal()}
            >
              <Text style={styles.addButtonText}>+ New Budget</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>Budget Overview</Text>
          <Text style={styles.headerSubtitle}>Track and manage your spending limits</Text>
        </View>

        {/* Overview Cards */}
        <View style={styles.overviewContainer}>
          <View style={styles.overviewCard}>
            <View style={styles.overviewCardHeader}>
              <Text style={styles.overviewIcon}>💰</Text>
              <View style={styles.overviewInfo}>
                <Text style={styles.overviewValue}>₹{totalBudget.toLocaleString()}</Text>
                <Text style={styles.overviewLabel}>Total Budget</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.overviewCard}>
            <View style={styles.overviewCardHeader}>
              <Text style={styles.overviewIcon}>💸</Text>
              <View style={styles.overviewInfo}>
                <Text style={styles.overviewValue}>₹{totalSpent.toLocaleString()}</Text>
                <Text style={styles.overviewLabel}>Total Spent</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.overviewCard}>
            <View style={styles.overviewCardHeader}>
              <Text style={styles.overviewIcon}>💡</Text>
              <View style={styles.overviewInfo}>
                <Text style={[styles.overviewValue, remainingBudget < 0 && styles.negativeValue]}>
                  ₹{Math.abs(remainingBudget).toLocaleString()}
                </Text>
                <Text style={styles.overviewLabel}>
                  {remainingBudget < 0 ? "Over Budget" : "Remaining"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Alert Banner */}
        {overBudgetCount > 0 && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertText}>
              ⚠️ {overBudgetCount} budget{overBudgetCount > 1 ? 's' : ''} exceeded this month
            </Text>
          </View>
        )}

        {/* Budget List */}
        <View style={styles.budgetListContainer}>
          <Text style={styles.sectionTitle}>Your Budgets</Text>
          {budgetProgress.length > 0 ? (
            <FlatList
              data={budgetProgress}
              renderItem={renderBudgetItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📊</Text>
              <Text style={styles.emptyStateTitle}>No Budgets Created</Text>
              <Text style={styles.emptyStateText}>
                Start managing your finances by creating your first budget
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => openBudgetModal()}
              >
                <Text style={styles.emptyStateButtonText}>Create Your First Budget</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Budget Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={budgetModalVisible}
        onRequestClose={() => setBudgetModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingBudget ? "Edit Budget" : "Create New Budget"}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setBudgetModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Select Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categoryGrid}>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <TouchableOpacity
                        key={category.name}
                        style={[
                          styles.categoryOption,
                          budgetForm.category === category.name && styles.selectedCategory,
                        ]}
                        onPress={() =>
                          setBudgetForm({ ...budgetForm, category: category.name })
                        }
                      >
                        <Text style={styles.categoryIcon}>{category.icon}</Text>
                        <Text style={styles.categoryText}>{category.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Budget Amount</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0"
                    value={budgetForm.amount}
                    onChangeText={(text) =>
                      setBudgetForm({ ...budgetForm, amount: text })
                    }
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Budget Period</Text>
                <View style={styles.periodOptions}>
                  {["weekly", "monthly", "yearly"].map((period) => (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.periodOption,
                        budgetForm.period === period && styles.selectedPeriod,
                      ]}
                      onPress={() => setBudgetForm({ ...budgetForm, period })}
                    >
                      <Text
                        style={[
                          styles.periodText,
                          budgetForm.period === period && styles.selectedPeriodText,
                        ]}
                      >
                        {period.charAt(0).toUpperCase() + period.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setBudgetModalVisible(false);
                    setBudgetForm({ category: "", amount: "", period: "monthly" });
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
                    {editingBudget ? "Update" : "Create"} Budget
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  scrollView: {
    flex: 1,
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
    color: "#334155",
    fontWeight: "500",
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: "#f5f7fa",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "600",
  },
  addButton: {
    backgroundColor: "#06b6d4",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 2,
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#334155",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "500",
  },
  overviewContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  overviewCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  overviewCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  overviewIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  overviewInfo: {
    flex: 1,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  overviewLabel: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },
  negativeValue: {
    color: "#ef4444",
  },
  alertBanner: {
    backgroundColor: "#facc15",
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  alertText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "600",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  budgetListContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  separator: {
    height: 16,
  },
  budgetCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  overBudgetCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  budgetTitleSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  budgetIcon: {
    fontSize: 24,
  },
  budgetInfo: {
    flex: 1,
  },
  budgetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#334155",
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  budgetPeriod: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  budgetActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  editButton: {
    backgroundColor: "#06b6d4" + "20",
  },
  deleteButton: {
    backgroundColor: "#ef4444" + "20",
  },
  actionButtonText: {
    fontSize: 16,
  },
  progressSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    marginRight: 12,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    minWidth: 40,
    textAlign: "right",
  },
  overBudgetText: {
    color: "#ef4444",
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#f5f7fa",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  overBudgetAmount: {
    color: "#ef4444",
  },
  warningBanner: {
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
  },
  warningText: {
    fontSize: 13,
    color: "#dc2626",
    fontWeight: "600",
    textAlign: "center",
  },
  emptyState: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 48,
    alignItems: "center",
    marginTop: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyStateButton: {
    backgroundColor: "#06b6d4",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    elevation: 3,
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  emptyStateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    minHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#334155",
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f7fa",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    fontSize: 24,
    color: "#334155",
    fontWeight: "300",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formSection: {
    marginBottom: 32,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 12,
    letterSpacing: -0.1,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  categoryOption: {
    backgroundColor: "#f5f7fa",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    minWidth: 100,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedCategory: {
    backgroundColor: "#06b6d4" + "20",
    borderColor: "#06b6d4",
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f7fa",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: "transparent",
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: "600",
    color: "#334155",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    color: "#334155",
    paddingVertical: 16,
  },
  periodOptions: {
    flexDirection: "row",
    backgroundColor: "#f5f7fa",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  periodOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  selectedPeriod: {
    backgroundColor: "#06b6d4",
    elevation: 2,
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  periodText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  selectedPeriodText: {
    color: "#fff",
  },
  modalActions: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cancelButton: {
    backgroundColor: "#f5f7fa",
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  saveButton: {
    backgroundColor: "#06b6d4",
    shadowColor: "#06b6d4",
    shadowOpacity: 0.3,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});