import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { PieChart } from "react-native-chart-kit";

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

const CHART_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
];

// BudgetBar - horizontal bar for visualizing progress
const BudgetBar = ({ label, spent, budget, color, icon }) => {
  const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
        {icon && <Text style={{ marginRight: 4 }}>{icon}</Text>}
        <Text style={{ fontWeight: "600", color: "#222", flex: 1 }}>{label}</Text>
        <Text style={{ fontWeight: "600", color: spent > budget ? "#ef4444" : "#06b6d4" }}>
          ₹{spent.toFixed(0)} / ₹{budget.toFixed(0)}
        </Text>
      </View>
      <View style={{
        backgroundColor: "#e5e7eb",
        borderRadius: 12,
        height: 18,
        overflow: "hidden",
        marginBottom: 2
      }}>
        <View style={{
          width: `${percent}%`,
          backgroundColor: spent > budget ? "#ef4444" : color,
          height: 18,
        }} />
      </View>
    </View>
  );
};

export default function DashboardScreen({ navigation }) {
  const { session } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    amount: "",
    category: "",
    date: "",
  });

  const [totalExpenses, setTotalExpenses] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);

  useEffect(() => {
    if (session && session.user) {
      fetchExpenses();
      fetchBudgets();
    }
  }, [session]);

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
        setExpenses([]);
      }
    } catch (err) {
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
    } catch (err) {}
  };

  const calculateStatistics = (expenseData) => {
    const total = expenseData.reduce(
      (sum, expense) => sum + parseFloat(expense.amount || 0),
      0
    );
    setTotalExpenses(total);

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
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
    fetchBudgets();
  };

  const getPieChartData = (items) => {
    const categoryMap = {};
    items.forEach((item) => {
      const amount = parseFloat(item.amount);
      if (!item.category || isNaN(amount)) return;
      categoryMap[item.category] = (categoryMap[item.category] || 0) + amount;
    });
    return Object.entries(categoryMap)
      .filter(([cat, amt]) => cat && amt > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([category, amount], index) => {
        const categoryObj = EXPENSE_CATEGORIES.find((c) => c.name === category);
        return {
          name: category,
          amount: amount,
          color: categoryObj?.color || CHART_COLORS[index % CHART_COLORS.length],
          legendFontColor: "#222",
          legendFontSize: 14,
          icon: categoryObj?.icon || "📝",
        };
      });
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
      Alert.alert("Error", "Failed to update expense");
    }
  };

  const recentExpenses = expenses.slice(0, 5);
  const budgetProgress = getBudgetProgress();

  // Today's total
  const today = new Date();
  const todayString = today.toISOString().split("T")[0];
  const todaysTotal = expenses
    .filter((exp) => exp.date === todayString)
    .reduce((sum, exp) => sum + Number(exp.amount), 0);

  if (loading || !session || !session.user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }
  const pieData = getPieChartData(expenses);

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
          <TouchableOpacity style={styles.logoutButton} onPress={() => {
            Alert.alert("Logout", "Are you sure you want to logout?", [
              { text: "Cancel", style: "cancel" },
              { text: "Logout", style: "destructive", onPress: async () => {
                try { await supabase.auth.signOut(); } catch (error) {}
              }},
            ]);
          }}>
            <Text style={styles.logoutButtonText}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.StatisticsContainer}>
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { marginRight: 12 }]}>
              <Text style={styles.statValue}>₹{totalExpenses.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Total Expenses</Text>
            </View>
            <View style={[styles.statCard, { marginRight: 12 }]}>
              <Text style={styles.statValue}>₹{monthlyExpenses.toFixed(2)}</Text>
              <Text style={styles.statLabel}>This Month</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>₹{todaysTotal.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Today's Total</Text>
            </View>
          </View>
          {expenses.length > 0 && pieData.length > 0 && (
            <View style={styles.chartsContainer}>
              <View style={styles.chartCard}>
                <View style={styles.chartRow}>
                  {/* Pie Chart Side */}
                  <View style={styles.chartSide}>
                    <PieChart
                      data={pieData}
                      width={screenWidth}
                      height={200}
                      chartConfig={{
                        backgroundColor: "#fff",
                        backgroundGradientFrom: "#fff",
                        backgroundGradientTo: "#fff",
                        color: (opacity = 1) => `rgba(6,182,212,${opacity})`,
                      }}
                      accessor={"amount"}
                      backgroundColor={"transparent"}
                      paddingLeft={100}
                      center={[0, 0]}
                      absolute
                      hasLegend={false}
                    />
                  </View>

                  {/* Legend Side */}
                  <View style={styles.legendSide}>
                    <View style={styles.chartLegendGrid}>
                      {pieData.map((item, idx) => (
                        <View key={item.name} style={styles.legendGridItem}>
                          <View
                            style={[
                              styles.legendColor,
                              { backgroundColor: item.color },
                            ]}
                          />
                          <Text style={styles.legendText}>
                            {item.icon} {item.name}: ₹{item.amount}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Budget Progress Section */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <Text style={{ fontWeight: "700", fontSize: 20, marginBottom: 10 }}>
            Budget Progress
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("BudgetScreen")}>
            <Text style={styles.seeAllText}>Manage</Text>
          </TouchableOpacity>

          {/* Total Budget Bar */}
          <BudgetBar
            label="Total"
            spent={budgetProgress.reduce((s, b) => s + b.spent, 0)}
            budget={budgetProgress.reduce((s, b) => s + b.amount, 0)}
            color="#06b6d4"
            icon="💰"
          />
          {/* Category Bars */}
          {budgetProgress.map((item) => (
            <BudgetBar
              key={item.id}
              label={item.icon + " " + item.category}
              spent={item.spent}
              budget={item.amount}
              color={item.color}
            />
          ))}
        </View>

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
              renderItem={({ item, index }) => (
                <View
                  style={[
                    styles.expenseItem,
                    { marginRight: index < 4 ? 8 : 0 },
                  ]}
                >
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
              )}
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

        {/* Edit Expense Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={editModalVisible}
          onRequestClose={() => setEditModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
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
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
      {/* Taskbar */}
      <View style={styles.taskbarContainer}>
        <View style={styles.taskbar}>
          <TouchableOpacity
            style={styles.actionButton2}
            onPress={() => navigation.navigate("BudgetScreen")}
            activeOpacity={0.7}
          >
            <Text style={styles.actionLabel}>
              <Text style={styles.actionIcon}>💰</Text>
              Budget
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate("AddExpense")}
            activeOpacity={0.8}
          >
            <Text style={styles.addIcon}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton2}
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
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: "#fff",
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
    elevation: 6,
  },
  logoutButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  StatisticsContainer: {
    flexDirection: "column",
    gap: 1,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 20,
    alignItems: "center",
    minHeight: 100,
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "rgba(6, 182, 212, 0.1)",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "900",
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
  chartsContainer: {
    marginHorizontal: 15,
    marginVertical: 10,
  },
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 15,
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "rgba(6, 182, 212, 0.1)",
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chartSide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  legendSide: {
    flex: 1,
    justifyContent: "center",
  },
  chartLegendGrid: {
    flexDirection: "column",
    justifyContent: "center",
  },
  legendGridItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  legendText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
    flex: 1,
  },
  seeAllText: {
    fontSize: 15,
    color: "#06b6d4",
    fontWeight: "600",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(6, 182, 212, 0.1)",
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    letterSpacing: -0.3,
  },
  recentSection: {
    paddingHorizontal: 20,
    marginBottom: 100,
  },
  expenseItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 20,
    marginBottom: 12,
    borderRadius: 20,
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "rgba(6, 182, 212, 0.1)",
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
    marginTop: 4,
  },
  actionButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    elevation: 2,
    marginRight: 8,
  },
  editButton: {
    marginRight: 0,
    marginTop: 0,
    },
  deleteButton: {
    marginRight: 0,
    marginTop: 0,
  },
  actionButtonText: {
    fontSize: 16,
  },
  emptyState: {
    backgroundColor: "#fff",
    padding: 48,
    borderRadius: 24,
    alignItems: "center",
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
  },
  modalButton: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    elevation: 4,
    marginRight: 12,
  },
  cancelButton: {
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
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
    letterSpacing: -0.1,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
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
  taskbarContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 10,
  },
  taskbar: {
    height: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 32,
    borderRadius: 40,
    elevation: 20,
    borderWidth: 5,
    borderColor: "#06b6d4",
    position: "relative",
  },
  addButton: {
    position: "absolute",
    left: "45%",
    right: 0,
    top: -16,
    width: 90,
    height: 90,
    backgroundColor: "#06b6d4",
    borderRadius: 90,
    alignItems: "center",
    justifyContent: "center",
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
  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
    letterSpacing: -0.2,
    left: 2,
  },
  actionIcon: {
    fontSize: 20,
    margin:10
  },
  actionButton2: {
    padding: 10,
    
    // borderRadius: 12,
    // backgroundColor: "#f8fafc",
    // elevation: 2,
    // marginRight: 8,
  },
});

