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
  Dimensions,
} from "react-native";
import { PieChart } from "react-native-chart-kit";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const screenWidth = Dimensions.get("window").width;

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

export default function DashboardScreen({ navigation }) {
  const { session } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    amount: "",
    category: "",
    date: "",
  });
  const [budgetForm, setBudgetForm] = useState({
    category: "",
    amount: "",
    period: "monthly",
  });

  // Statistics
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [topCategory, setTopCategory] = useState("");

  useEffect(() => {
    fetchExpenses();
    fetchBudgets();
  }, []);
  const dailyfetchExpenses = async () => {};
  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false });

      if (!error && data) {
        setExpenses(data);
        calculateStatistics(data);
      } else {
        console.error("Error fetching expenses:", error);
        setExpenses([]);
      }
    } catch (err) {
      console.error("Error in fetchExpenses:", err);
      setExpenses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchBudgets = async () => {
    try {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", session.user.id);

      if (!error && data) {
        setBudgets(data);
      }
    } catch (err) {
      console.error("Error fetching budgets:", err);
    }
  };

  const calculateStatistics = (expenseData) => {
    const total = expenseData.reduce(
      (sum, expense) => sum + parseFloat(expense.amount || 0),
      0
    );
    setTotalExpenses(total);

    // Calculate monthly expenses (current month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyTotal = expenseData
      .filter((expense) => {
        const expenseDate = new Date(expense.date);
        return (
          expenseDate.getMonth() === currentMonth &&
          expenseDate.getFullYear() === currentYear
        );
      })
      .reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
    setMonthlyExpenses(monthlyTotal);

    // Find top category
    const categoryMap = {};
    expenseData.forEach((expense) => {
      const category = expense.category || "Uncategorized";
      categoryMap[category] =
        (categoryMap[category] || 0) + parseFloat(expense.amount || 0);
    });
    const topCat = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0];
    setTopCategory(topCat ? topCat[0] : "None");
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
    fetchBudgets();
  };

  const getPieData = (items) => {
    const categoryMap = {};
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
      "#98D8C8",
    ];

    items.forEach((item) => {
      const amount = parseFloat(item.amount);
      if (!item.category || isNaN(amount)) return;
      categoryMap[item.category] = (categoryMap[item.category] || 0) + amount;
    });

    const pieData = Object.entries(categoryMap)
      .filter(([cat, amt]) => cat && amt > 0)
      .map(([cat, amt], index) => ({
        name: cat,
        amount: parseFloat(amt.toFixed(2)),
        color: colors[index % colors.length],
        legendFontColor: "#333",
        legendFontSize: 12,
      }));

    return pieData.length > 0 ? pieData : [];
  };

  const getCategorySpending = (category) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.date);
        return (
          expense.category === category &&
          expenseDate.getMonth() === currentMonth &&
          expenseDate.getFullYear() === currentYear
        );
      })
      .reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
  };

  const getBudgetProgress = () => {
    return budgets.map((budget) => {
      const spent = getCategorySpending(budget.category);
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

  const handleEdit = (expense) => {
    setSelectedExpense(expense);
    setEditForm({
      title: expense.title || "",
      amount: expense.amount?.toString() || "",
      category: expense.category || "",
      date: expense.date || "",
    });
    setEditModalVisible(true);
  };

  const handleDelete = (expense) => {
    Alert.alert(
      "Delete Expense",
      `Are you sure you want to delete "${expense.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteExpense(expense.id),
        },
      ]
    );
  };

  const deleteExpense = async (expenseId) => {
    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId);

      if (!error) {
        fetchExpenses();
        Alert.alert("Success", "Expense deleted successfully!");
      } else {
        Alert.alert("Error", "Failed to delete expense");
      }
    } catch (err) {
      console.error("Error deleting expense:", err);
      Alert.alert("Error", "Failed to delete expense");
    }
  };

  const updateExpense = async () => {
    if (!editForm.title || !editForm.amount) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      const { error } = await supabase
        .from("expenses")
        .update({
          title: editForm.title,
          amount: parseFloat(editForm.amount),
          category: editForm.category,
          date: editForm.date,
        })
        .eq("id", selectedExpense.id);

      if (!error) {
        setEditModalVisible(false);
        fetchExpenses();
        Alert.alert("Success", "Expense updated successfully!");
      } else {
        Alert.alert("Error", "Failed to update expense");
      }
    } catch (err) {
      console.error("Error updating expense:", err);
      Alert.alert("Error", "Failed to update expense");
    }
  };

  const saveBudget = async () => {
    if (!budgetForm.category || !budgetForm.amount) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      // Check if budget already exists for this category
      const existingBudget = budgets.find(
        (b) => b.category === budgetForm.category
      );

      if (existingBudget) {
        // Update existing budget
        const { error } = await supabase
          .from("budgets")
          .update({
            amount: parseFloat(budgetForm.amount),
            period: budgetForm.period,
          })
          .eq("id", existingBudget.id);

        if (!error) {
          setBudgetModalVisible(false);
          fetchBudgets();
          Alert.alert("Success", "Budget updated successfully!");
        }
      } else {
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
        }
      }

      setBudgetForm({ category: "", amount: "", period: "monthly" });
    } catch (err) {
      console.error("Error saving budget:", err);
      Alert.alert("Error", "Failed to save budget");
    }
  };

  const deleteBudget = async (budgetId) => {
    try {
      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", budgetId);

      if (!error) {
        fetchBudgets();
        Alert.alert("Success", "Budget deleted successfully!");
      }
    } catch (err) {
      console.error("Error deleting budget:", err);
      Alert.alert("Error", "Failed to delete budget");
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: performLogout },
    ]);
  };

  const performLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const renderExpenseItem = ({ item }) => (
    <View style={styles.expenseItem}>
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseTitle}>{item.title || "Untitled"}</Text>
        <Text style={styles.expenseCategory}>
          {item.category || "Uncategorized"}
        </Text>
        <Text style={styles.expenseDate}>{item.date || "No date"}</Text>
      </View>
      <View style={styles.expenseActions}>
        <Text style={styles.expenseAmount}>₹{item.amount || "0"}</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEdit(item)}
          >
            <Text style={styles.actionButtonText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item)}
          >
            <Text style={styles.actionButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderBudgetItem = ({ item }) => (
    <View
      style={[styles.budgetItem, item.isOverBudget && styles.overBudgetItem]}
    >
      <View style={styles.budgetHeader}>
        <View style={styles.budgetTitleContainer}>
          <Text style={styles.budgetIcon}>{item.icon}</Text>
          <Text style={styles.budgetTitle}>{item.category}</Text>
        </View>
        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              "Delete Budget",
              `Delete budget for ${item.category}?`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => deleteBudget(item.id),
                },
              ]
            )
          }
        >
          <Text style={styles.deleteBudgetText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.budgetProgress}>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${item.percentage}%`,
                backgroundColor: item.isOverBudget ? "#FF6B6B" : item.color,
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
        <Text style={styles.budgetSpent}>Spent: ₹{item.spent.toFixed(2)}</Text>
        <Text
          style={[
            styles.budgetRemaining,
            item.isOverBudget && styles.overBudgetAmount,
          ]}
        >
          {item.isOverBudget ? "Over by" : "Remaining"}: ₹
          {Math.abs(item.remaining).toFixed(2)}
        </Text>
        <Text style={styles.budgetTotal}>
          Budget: ₹{item.amount.toFixed(2)}
        </Text>
      </View>
    </View>
  );

  const recentExpenses = expenses.slice(0, 5);
  const pieData = getPieData(expenses);
  const budgetProgress = getBudgetProgress();
  const hasPieData = pieData.length > 0;

  // 1. Calculate today's total expense (add this in your component logic)
  const today = new Date();
  const todayString = today.toISOString().split("T")[0];
  const todaysTotal = expenses
    .filter((exp) => exp.date === todayString)
    .reduce((sum, exp) => sum + Number(exp.amount), 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
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
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{totalExpenses.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total Expenses</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{monthlyExpenses.toFixed(2)}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{todaysTotal.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Today's Total</Text>
          </View>
        </View>

        {/* Budget Progress Section */}
        {budgetProgress.length > 0 && (
          <View style={styles.budgetSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Budget Overview</Text>
              <TouchableOpacity onPress={() => setBudgetModalVisible(true)}>
                <Text style={styles.seeAllText}>Manage</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={budgetProgress}
              renderItem={renderBudgetItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Charts Section */}
        {hasPieData && (
          <View style={styles.chartsContainer}>
            <Text style={styles.sectionTitle}>Expense Analysis</Text>

            {/* Category Breakdown */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Category Breakdown</Text>
              <PieChart
                data={pieData}
                width={screenWidth - 60}
                height={200}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
                hasLegend={true}
                chartConfig={{
                  color: () => "#000",
                  labelColor: () => "#333",
                }}
              />
            </View>
          </View>
        )}

        {/* Recent Expenses */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("AllExpenses")}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentExpenses.length > 0 ? (
            <FlatList
              data={recentExpenses}
              renderItem={renderExpenseItem}
              keyExtractor={(item) =>
                item.id?.toString() || Math.random().toString()
              }
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No expenses yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Add your first expense to get started!
              </Text>
            </View>
          )}
        </View>

        {/* Edit Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={editModalVisible}
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Expense</Text>

              <TextInput
                style={styles.input}
                placeholder="Expense Title"
                value={editForm.title}
                onChangeText={(text) =>
                  setEditForm({ ...editForm, title: text })
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Amount"
                value={editForm.amount}
                onChangeText={(text) =>
                  setEditForm({ ...editForm, amount: text })
                }
                keyboardType="numeric"
              />

              <TextInput
                style={styles.input}
                placeholder="Category"
                value={editForm.category}
                onChangeText={(text) =>
                  setEditForm({ ...editForm, category: text })
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Date (YYYY-MM-DD)"
                value={editForm.date}
                onChangeText={(text) =>
                  setEditForm({ ...editForm, date: text })
                }
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={updateExpense}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Budget Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={budgetModalVisible}
          onRequestClose={() => setBudgetModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Set Budget</Text>

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
                {["monthly", "weekly", "yearly"].map((period) => (
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
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={saveBudget}
                >
                  <Text style={styles.saveButtonText}>Save Budget</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>

      <View style={styles.taskbarContainer}>
        <View style={styles.taskbar}>
          {/* Left Action - Set Budget */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setBudgetModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionLabel}>
              <Text style={styles.actionIcon}>💰</Text>
              Budget
            </Text>
          </TouchableOpacity>

          {/* Center Add Button - Elevated */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate("AddExpense")}
            activeOpacity={0.8}
          >
            <Text style={styles.addIcon}>+</Text>
          </TouchableOpacity>

          {/* Right Action - All Expenses */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("AllExpenses")}
            activeOpacity={0.7}
          >
            <Text style={styles.actionLabel}>
              <Text style={styles.actionIcon}>📊</Text>
              Expenses
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // === CONTAINER STYLES ===
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

  // === HEADER STYLES ===
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    backdropFilter: "blur(20px)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.1)",
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e293b",
    letterSpacing: -0.5,
  },
  logoutButton: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
  },

  // === STATISTICS STYLES ===
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    backdropFilter: "blur(20px)",
    padding: 10,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#1e293b",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    minHeight: 100,
    justifyContent: "center",
  },
  statValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#06b6d4",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 16,
  },

  // === SECTION HEADERS ===
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 15,
    color: "#06b6d4",
    fontWeight: "600",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(6, 182, 212, 0.1)",
  },

  // === BUDGET STYLES ===
  budgetSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  budgetItem: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#1e293b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  overBudgetItem: {
    borderLeftWidth: 6,
    borderLeftColor: "#ef4444",
    backgroundColor: "rgba(254, 242, 242, 0.9)",
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
  },
  budgetIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  budgetTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    letterSpacing: -0.2,
  },
  deleteBudgetText: {
    fontSize: 18,
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    backgroundColor: "rgba(248, 250, 252, 0.8)",
    borderRadius: 12,
    padding: 12,
  },
  budgetSpent: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  budgetRemaining: {
    fontSize: 13,
    color: "#06b6d4",
    fontWeight: "600",
  },
  overBudgetAmount: {
    color: "#ef4444",
  },
  budgetTotal: {
    fontSize: 13,
    color: "#1e293b",
    fontWeight: "600",
  },

  // === CHART STYLES ===
  chartsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  chartCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
    borderRadius: 24,
    padding: 24,
    marginTop: 12,
    shadowColor: "#1e293b",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: -0.2,
  },

  // === EXPENSE ITEM STYLES ===
  recentSection: {
    paddingHorizontal: 20,
    marginBottom: 100, // Space for taskbar
  },
  expenseItem: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
    padding: 20,
    marginBottom: 12,
    borderRadius: 20,
    shadowColor: "#1e293b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  expenseCategory: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 4,
    fontWeight: "500",
  },
  expenseDate: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "400",
  },
  expenseActions: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#06b6d4",
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(248, 250, 252, 0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  editButton: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
  },
  deleteButton: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  actionButtonText: {
    fontSize: 16,
  },

  // === EMPTY STATE STYLES ===
  emptyState: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    backdropFilter: "blur(20px)",
    padding: 48,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#1e293b",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  emptyStateSubtext: {
    fontSize: 15,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
  },

  // === MODAL STYLES ===
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    backdropFilter: "blur(8px)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    backdropFilter: "blur(20px)",
    borderRadius: 28,
    padding: 28,
    width: "92%",
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelButton: {
    backgroundColor: "rgba(248, 250, 252, 0.9)",
    borderWidth: 1.5,
    borderColor: "rgba(148, 163, 184, 0.3)",
  },
  saveButton: {
    backgroundColor: "#06b6d4",
    shadowColor: "#06b6d4",
    shadowOpacity: 0.3,
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

  // === FORM INPUT STYLES ===
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
    marginTop: 16,
    letterSpacing: -0.1,
  },
  input: {
    backgroundColor: "rgba(248, 250, 252, 0.8)",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "rgba(148, 163, 184, 0.2)",
    fontSize: 16,
    color: "#1e293b",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // === CATEGORY PICKER STYLES ===
  categoryPickerContainer: {
    marginBottom: 20,
  },
  categoryPicker: {
    backgroundColor: "rgba(248, 250, 252, 0.8)",
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    alignItems: "center",
    minWidth: 90,
    borderWidth: 1.5,
    borderColor: "rgba(148, 163, 184, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedCategoryPicker: {
    backgroundColor: "#06b6d4",
    borderColor: "#06b6d4",
    shadowColor: "#06b6d4",
    shadowOpacity: 0.3,
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

  // === PERIOD SELECTOR STYLES ===
  periodContainer: {
    flexDirection: "row",
    marginBottom: 24,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    backgroundColor: "rgba(248, 250, 252, 0.8)",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(148, 163, 184, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedPeriodButton: {
    backgroundColor: "#06b6d4",
    borderColor: "#06b6d4",
    shadowColor: "#06b6d4",
    shadowOpacity: 0.3,
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

  taskbarContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: 34, // Safe area padding
    paddingTop: 10,
  },

  // === MAIN TASKBAR ===
  taskbar: {
    height: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    
    backgroundColor: "white",
    backdropFilter: "blur(25px)",
    paddingHorizontal: 32,
    borderRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 20,
    borderWidth: 5,
    borderColor: "#06b6d4",
    
    position: "relative",
  },

  // === ACTION BUTTONS ===
  actionButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: "transparent",
    minWidth: 80,
    transition: "all 0.2s ease",
  },

  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(6, 182, 212, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  actionIcon: {
    fontSize: 20,
  },

  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
    letterSpacing: -0.2,
    left: 2,
    
  },

  // === CENTER ADD BUTTON ===
  addButton: {
    position: "absolute",
    left: "45%",
    right: 0,
    top: -16, // Elevated above taskbar
    width: 90,
    height: 90,
    backgroundColor: "#06b6d4",
    borderRadius: 90,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 16,
    borderWidth: 5,
    borderColor: "white",
    zIndex: 10,
    alignSelf: "center",
  },

  addIcon: {
    fontSize: 32,
    fontWeight: "300",
    color: "white",
    lineHeight: 32,
  },

  // === ACTIVE STATES (Add these with conditional styling) ===
  actionButtonActive: {
    backgroundColor: "rgba(6, 182, 212, 0.08)",
    transform: [{ scale: 0.95 }],
  },

  actionIconContainerActive: {
    backgroundColor: "rgba(6, 182, 212, 0.2)",
  },

  addButtonPressed: {
    transform: [{ scale: 0.92 }],
    shadowOpacity: 0.25,
  },
});
