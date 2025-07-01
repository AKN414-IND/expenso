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
import Alert from "../components/Alert";
import { LogOut, Trash2, User } from "lucide-react-native";

const screenWidth = Dimensions.get("window").width;

// Avatar component with initials fallback
const Avatar = ({ name, email, size = 50, style, onPress }) => {
  const getInitials = (name, email) => {
    if (name && name.trim()) {
      return name
        .trim()
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const getAvatarColor = (text) => {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FECA57",
      "#FF9FF3",
      "#54A0FF",
      "#5F27CD",
    ];
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const initials = getInitials(name, email);
  const backgroundColor = getAvatarColor(name || email || "User");

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          alignItems: "center",
          justifyContent: "center",
          elevation: 4,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          borderWidth: 2,
          borderColor: "white",
        },
        style,
      ]}
    >
      <Text
        style={{
          color: "white",
          fontSize: size * 0.4,
          fontWeight: "bold",
          letterSpacing: 1,
        }}
      >
        {initials}
      </Text>
    </TouchableOpacity>
  );
};

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
  const isOverBudget = spent > budget;

  return (
    <View style={{ marginBottom: 16 }}>
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
      >
        {icon && <Text style={{ marginRight: 8, fontSize: 16 }}>{icon}</Text>}
        <Text
          style={{ fontWeight: "600", color: "#222", flex: 1, fontSize: 16 }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontWeight: "600",
            color: isOverBudget ? "#ef4444" : "#06b6d4",
            fontSize: 14,
          }}
        >
          ₹{spent.toFixed(0)} / ₹{budget.toFixed(0)}
        </Text>
      </View>
      <View
        style={{
          backgroundColor: "#e5e7eb",
          borderRadius: 12,
          height: 18,
          overflow: "hidden",
          marginBottom: 4,
        }}
      >
        <View
          style={{
            width: `${percent}%`,
            backgroundColor: isOverBudget ? "#ef4444" : color,
            height: 18,
            borderRadius: 12,
          }}
        />
      </View>
      {isOverBudget && (
        <Text style={{ fontSize: 12, color: "#ef4444", fontWeight: "500" }}>
          Over budget by ₹{(spent - budget).toFixed(0)}
        </Text>
      )}
      <Text style={{ fontSize: 12, color: "#64748b", fontWeight: "400" }}>
        {percent.toFixed(1)}% used
      </Text>
    </View>
  );
};

export default function DashboardScreen({ navigation }) {
  const { session } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [profile, setProfile] = useState(null);
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
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  useEffect(() => {
    if (session && session.user) {
      fetchExpenses();
      fetchBudgets();
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
      } else if (data) {
        setProfile(data);
      } else {
        // Create initial profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert([
            {
              id: session.user.id,
              full_name: session.user.user_metadata?.full_name || "",
              username: session.user.email?.split("@")[0] || "",
              email: session.user.email,
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (!createError && newProfile) {
          setProfile(newProfile);
        }
      }
    } catch (err) {
      console.error("Exception fetching profile:", err);
    }
  };

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
      console.error("Exception fetching expenses:", err);
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
      } else {
        console.error("Error fetching budgets:", error);
        setBudgets([]);
      }
    } catch (err) {
      console.error("Exception fetching budgets:", err);
      setBudgets([]);
    }
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
          color:
            categoryObj?.color || CHART_COLORS[index % CHART_COLORS.length],
          legendFontColor: "#222",
          legendFontSize: 14,
          icon: categoryObj?.icon || "📝",
        };
      });
  };

  // Returns how much was spent in a category for the current month
  const getMonthlyCategorySpending = (category) => {
    const now = new Date();
    return expenses
      .filter((expense) => {
        if (expense.category !== category) return false;
        const expenseDate = new Date(expense.date);
        return (
          expenseDate.getFullYear() === now.getFullYear() &&
          expenseDate.getMonth() === now.getMonth()
        );
      })
      .reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
  };

  // Creates an array of category budgets, each with current month spent
  const getBudgetProgress = () => {
    return budgets.map((budget) => {
      const spent = getMonthlyCategorySpending(budget.category);
      const categoryData = EXPENSE_CATEGORIES.find(
        (cat) => cat.name === budget.category
      );
      return {
        ...budget,
        spent,
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
    setExpenseToDelete(expense);
    setShowDeleteAlert(true);
  };

  const deleteExpense = async (expenseId) => {
    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId);

      if (!error) {
        fetchExpenses();
        // Using console.log instead of Alert.alert for React Native compatibility
        console.log("Expense deleted successfully!");
      } else {
        console.error("Failed to delete expense:", error);
      }
    } catch (err) {
      console.error("Failed to delete expense:", err);
    }
  };

  const updateExpense = async () => {
    if (!editForm.title || !editForm.amount) {
      console.log("Please fill in all required fields");
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
        console.log("Expense updated successfully!");
      } else {
        console.error("Failed to update expense:", error);
      }
    } catch (err) {
      console.error("Failed to update expense:", err);
    }
  };

  const recentExpenses = expenses.slice(0, 5);
  const budgetProgress = getBudgetProgress();
  const totalBudgetAmount = budgets.reduce(
    (sum, b) => sum + (parseFloat(b.amount) || 0),
    0
  );
  const totalSpentForBudgets = budgets.reduce(
    (sum, b) => sum + getMonthlyCategorySpending(b.category),
    0
  );

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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            {/* Profile Avatar */}
            <Avatar
              name={profile?.full_name}
              email={profile?.email || session?.user?.email}
              size={44}
              onPress={() => navigation.navigate("Profile", { profile })}
              style={{ marginRight: 8 }}
            />
            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => setShowLogoutAlert(true)}
            >
              <Text style={styles.logoutButtonText}>🚪 Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.StatisticsContainer}>
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { marginRight: 12 }]}>
              <Text style={styles.statValue}>₹{totalExpenses.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Total Expenses</Text>
            </View>
            <View style={[styles.statCard, { marginRight: 12 }]}>
              <Text style={styles.statValue}>
                ₹{monthlyExpenses.toFixed(2)}
              </Text>
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
                            {item.icon} {item.name}: ₹{item.amount.toFixed(0)}
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
        {budgets.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <View style={styles.sectionHeader}>
              <Text
                style={{ fontWeight: "700", fontSize: 20, marginBottom: 10 }}
              >
                Budget Progress
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("BudgetScreen")}
              >
                <Text style={styles.seeAllText}>Manage</Text>
              </TouchableOpacity>
            </View>

            {/* Total Budget Bar (this month, only for budgeted categories) */}
            {totalBudgetAmount > 0 && (
              <BudgetBar
                label="Total Budget"
                spent={totalSpentForBudgets}
                budget={totalBudgetAmount}
                color="#06b6d4"
                icon="💰"
              />
            )}

            {/* Per-category Budget Bars */}
            {budgetProgress.map((item) => (
              <BudgetBar
                key={item.id}
                label={item.category}
                spent={item.spent}
                budget={parseFloat(item.amount) || 0}
                color={item.color}
                icon={item.icon}
              />
            ))}
          </View>
        )}

        {/* Show message when no budgets exist */}
        {budgets.length === 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <View style={styles.sectionHeader}>
              <Text
                style={{ fontWeight: "700", fontSize: 20, marginBottom: 10 }}
              >
                Budget Progress
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("BudgetScreen")}
              >
                <Text style={styles.seeAllText}>Create Budget</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.emptyBudgetState}>
              <Text style={styles.emptyStateText}>No budgets set</Text>
              <Text style={styles.emptyStateSubtext}>
                Create your first budget to track spending!
              </Text>
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
              renderItem={({ item }) => (
                <View style={styles.expenseItem}>
                  <View style={styles.expenseInfo}>
                    <Text style={styles.expenseTitle}>
                      {item.title || "Untitled"}
                    </Text>
                    <Text style={styles.expenseDate}>
                      {item.date || "No date"}
                    </Text>
                  </View>
                  <Text style={styles.expenseAmount}>
                    ₹{item.amount || "0"}
                  </Text>
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

      {/* Alerts  */}
      <Alert
        open={showDeleteAlert}
        onConfirm={async () => {
          setShowDeleteAlert(false);
          if (expenseToDelete) {
            await deleteExpense(expenseToDelete.id);
            setExpenseToDelete(null);
          }
        }}
        onCancel={() => {
          setShowDeleteAlert(false);
          setExpenseToDelete(null);
        }}
        title="Delete Expense"
        message={`Are you sure you want to delete ${expenseToDelete?.title}?`}
        confirmText="Delete"
        cancelText="Cancel"
        icon={<Trash2 color="#fff" size={40} />}
        iconBg="#ef4444"
        confirmColor="#ef4444"
        confirmTextColor="#fff"
        cancelColor="#f1f5f9"
        cancelTextColor="#334155"
      />

      <Alert
        open={showLogoutAlert}
        onConfirm={async () => {
          setShowLogoutAlert(false);
          try {
            await supabase.auth.signOut();
          } catch (error) {
            console.error("Logout error:", error);
          }
        }}
        onCancel={() => setShowLogoutAlert(false)}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        icon={<LogOut color="#fff" size={40} />}
        iconBg="#ef4444"
        confirmColor="#ef4444"
        confirmTextColor="#fff"
        cancelColor="#f1f5f9"
        cancelTextColor="#334155"
      />
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
    justifyContent: "space-between",
    alignItems: "center",
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
    margin: 10,
  },
  actionButton2: {
    padding: 10,

  },
});
