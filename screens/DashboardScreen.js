import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  Alert as RNAlert,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { PieChart } from "react-native-chart-kit";
import Alert from "../components/Alert";
import { LogOut, Trash2 } from "lucide-react-native";
import Carousel from "react-native-reanimated-carousel";
import ReminderCard from "../components/ReminderCard";

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

// --- Avatar Component ---
const Avatar = ({ name, email, size = 50, style, onPress }) => {
  const getInitials = useCallback((name, email) => {
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
  }, []);
  const getAvatarColor = useCallback((text) => {
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
  }, []);
  const initials = useMemo(() => getInitials(name, email), [name, email, getInitials]);
  const backgroundColor = useMemo(() => getAvatarColor(name || email || "User"), [name, email, getAvatarColor]);
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
          borderWidth: 2,
          borderColor: "white",
          elevation: 4,
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

// --- BudgetBar Component ---
const BudgetBar = ({ label, spent, budget, color, icon }) => {
  const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const isOverBudget = spent > budget && budget > 0;
  return (
    <View style={styles.budgetBarContainer}>
      <View style={styles.budgetBarHeader}>
        {icon && <Text style={styles.budgetBarIcon}>{icon}</Text>}
        <Text style={styles.budgetBarLabel}>{label}</Text>
        <Text
          style={[
            styles.budgetBarAmount,
            { color: isOverBudget ? "#ef4444" : "#06b6d4" },
          ]}
        >
          ₹{spent.toFixed(0)} / ₹{budget.toFixed(0)}
        </Text>
      </View>
      <View style={styles.budgetBarTrack}>
        <View
          style={[
            styles.budgetBarFill,
            {
              width: `${percent}%`,
              backgroundColor: isOverBudget ? "#ef4444" : color,
            },
          ]}
        />
      </View>
      {isOverBudget && (
        <Text style={styles.budgetBarOverage}>
          Over budget by ₹{(spent - budget).toFixed(0)}
        </Text>
      )}
      <Text style={styles.budgetBarPercent}>{percent.toFixed(1)}% used</Text>
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
  const [reminders, setReminders] = useState([]);
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
    if (session?.user) {
      initializeData();
    }
  }, [session]);

  const initializeData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchExpenses(),
        fetchBudgets(),
        fetchProfile(),
        fetchReminders(),
      ]);
    } catch (error) {
      RNAlert.alert("Error", "Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (error && error.code !== "PGRST116") return;
      if (data) {
        setProfile(data);
      } else {
        // Create profile if it doesn't exist
        const { data: newProfile } = await supabase
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
        if (newProfile) setProfile(newProfile);
      }
    } catch {}
  };

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false });
      if (!error) {
        setExpenses(data || []);
        calculateStatistics(data || []);
      }
    } catch {}
  };

  const fetchBudgets = async () => {
    try {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", session.user.id);
      if (!error) setBudgets(data || []);
    } catch {}
  };

  const fetchReminders = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_reminders")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .order("next_due_date", { ascending: true });
      if (!error) setReminders(data || []);
    } catch {}
  };

  const calculateStatistics = useCallback((expenseData) => {
    setTotalExpenses(expenseData.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0));
    const now = new Date();
    setMonthlyExpenses(
      expenseData.filter(e => {
        if (!e.date) return false;
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
    );
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchExpenses(), fetchBudgets(), fetchReminders()])
      .finally(() => setRefreshing(false));
  }, []);

  const getPieChartData = useMemo(() => {
    const categoryMap = {};
    expenses.forEach((item) => {
      const amount = parseFloat(item.amount);
      if (!item.category || isNaN(amount) || amount <= 0) return;
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
  }, [expenses]);

  const getMonthlyCategorySpending = useCallback((category) => {
    const now = new Date();
    return expenses
      .filter((expense) => {
        if (expense.category !== category || !expense.date) return false;
        const expenseDate = new Date(expense.date);
        return (
          expenseDate.getFullYear() === now.getFullYear() &&
          expenseDate.getMonth() === now.getMonth()
        );
      })
      .reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
  }, [expenses]);

  const budgetProgress = useMemo(() => {
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
        isOverBudget: spent > parseFloat(budget.amount || 0),
      };
    });
  }, [budgets, getMonthlyCategorySpending]);

  const handleEdit = useCallback((expense) => {
    setSelectedExpense(expense);
    setEditForm({
      title: expense.title || "",
      amount: expense.amount?.toString() || "",
      category: expense.category || "",
      date: expense.date || "",
    });
    setEditModalVisible(true);
  }, []);

  const handleDelete = useCallback((expense) => {
    setExpenseToDelete(expense);
    setShowDeleteAlert(true);
  }, []);

  const deleteExpense = async (expenseId) => {
    try {
      await supabase.from("expenses").delete().eq("id", expenseId);
      await fetchExpenses();
      RNAlert.alert("Success", "Expense deleted successfully!");
    } catch {
      RNAlert.alert("Error", "Failed to delete expense. Please try again.");
    }
  };

  const uniqueReminders = useMemo(() => {
    return reminders
      .sort((a, b) => {
        const dateA = new Date(`${a.next_due_date}T${a.reminder_time || '00:00'}`);
        const dateB = new Date(`${b.next_due_date}T${b.reminder_time || '00:00'}`);
        return dateA - dateB;
      })
      .filter((rem, idx, arr) =>
        arr.findIndex(
          r =>
            r.title === rem.title &&
            r.next_due_date === rem.next_due_date &&
            r.reminder_time === rem.reminder_time
        ) === idx
      );
  }, [reminders]);

  const updateExpense = async () => {
    if (!editForm.title.trim() || !editForm.amount.trim()) {
      RNAlert.alert("Error", "Please fill in all required fields");
      return;
    }
    const amount = parseFloat(editForm.amount);
    if (isNaN(amount) || amount <= 0) {
      RNAlert.alert("Error", "Please enter a valid amount");
      return;
    }
    try {
      await supabase
        .from("expenses")
        .update({
          title: editForm.title.trim(),
          amount: amount,
          category: editForm.category.trim(),
          date: editForm.date || new Date().toISOString().split('T')[0],
        })
        .eq("id", selectedExpense.id);
      setEditModalVisible(false);
      await fetchExpenses();
      RNAlert.alert("Success", "Expense updated successfully!");
    } catch {
      RNAlert.alert("Error", "Failed to update expense. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      setShowLogoutAlert(false);
      await supabase.auth.signOut();
    } catch {
      RNAlert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  const renderExpenseItem = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.expenseItem}
      onPress={() => handleEdit(item)}
      onLongPress={() => handleDelete(item)}
      activeOpacity={0.7}
    >
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseTitle}>
          {item.title || "Untitled"}
        </Text>
        <Text style={styles.expenseDate}>
          {item.date ? new Date(item.date).toLocaleDateString() : "No date"}
        </Text>
        {item.category && (
          <Text style={styles.expenseCategory}>
            {EXPENSE_CATEGORIES.find(cat => cat.name === item.category)?.icon || "📝"} {item.category}
          </Text>
        )}
      </View>
      <Text style={styles.expenseAmount}>
        ₹{(parseFloat(item.amount) || 0).toFixed(2)}
      </Text>
    </TouchableOpacity>
  ), [handleEdit, handleDelete]);

  if (loading || !session?.user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  const recentExpenses = expenses.slice(0, 5);
  const totalBudgetAmount = budgets.reduce(
    (sum, b) => sum + (parseFloat(b.amount) || 0),
    0
  );
  const totalSpentForBudgets = budgets.reduce(
    (sum, b) => sum + getMonthlyCategorySpending(b.category),
    0
  );
  const today = new Date();
  const todayString = today.toISOString().split("T")[0];
  const todaysTotal = expenses
    .filter((exp) => exp.date === todayString)
    .reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* --- Header Section --- */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <View style={styles.headerActions}>
            <Avatar
              name={profile?.full_name}
              email={profile?.email || session?.user?.email}
              size={44}
              onPress={() => navigation.navigate("Profile", { profile })}
            />
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => setShowLogoutAlert(true)}
            >
              <Text style={styles.logoutButtonText}>🚪 Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- Statistics Section --- */}
        <View style={styles.statisticsContainer}>
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, styles.statCardMargin]}>
              <Text style={styles.statValue}>₹{totalExpenses.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Total Expenses</Text>
            </View>
            <View style={[styles.statCard, styles.statCardMargin]}>
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
          {expenses.length > 0 && getPieChartData.length > 0 && (
            <View style={styles.chartsContainer}>
              <View style={styles.chartCard}>
                <View style={styles.chartRow}>
                  <View style={styles.chartSide}>
                    <PieChart
                      data={getPieChartData}
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
                  <View style={styles.legendSide}>
                    <View style={styles.chartLegendGrid}>
                      {getPieChartData.map((item) => (
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

        {/* --- Reminders Section --- */}
        {uniqueReminders.length > 0 && (
          <View style={styles.remindersSection2}>
            <View style={styles.sectionHeader2}>
              <Text style={styles.sectionTitle}>Payment Reminders</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("PaymentReminder")}
              >
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <Carousel
              width={screenWidth - 40}
              height={190}
              data={uniqueReminders}
              mode="parallax"
              autoPlay={true}
              scrollAnimationDuration={800}
              renderItem={({ item }) => (
                <ReminderCard
                  item={item}
                  onPress={() => navigation.navigate("PaymentReminder")}
                />
              )}
            />
          </View>
        )}

        {/* --- Budgets Section --- */}
        <View style={styles.budgetSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Budget Progress</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("BudgetScreen")}
            >
              <Text style={styles.seeAllText}>
                {budgets.length > 0 ? "Manage" : "Create Budget"}
              </Text>
            </TouchableOpacity>
          </View>
          {budgets.length > 0 ? (
            <>
              {totalBudgetAmount > 0 && (
                <BudgetBar
                  label="Total Budget"
                  spent={totalSpentForBudgets}
                  budget={totalBudgetAmount}
                  color="#06b6d4"
                  icon="💰"
                />
              )}
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
            </>
          ) : (
            <View style={styles.emptyBudgetState}>
              <Text style={styles.emptyStateText}>No budgets set</Text>
              <Text style={styles.emptyStateSubtext}>
                Create your first budget to track spending!
              </Text>
            </View>
          )}
        </View>

        {/* --- Recent Expenses Section --- */}
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
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
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

        {/* --- Edit Expense Modal --- */}
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

      {/* --- Floating Taskbar --- */}
      <View style={styles.taskbarContainer}>
        <View style={styles.taskbar}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("BudgetScreen")}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>💰</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("PaymentReminder")}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate("AddExpense")}
            activeOpacity={0.8}
          >
            <Text style={styles.addIcon}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("AllExpenses")}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>📊</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- Alerts --- */}
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
        message={`Are you sure you want to delete "${expenseToDelete?.title}"?`}
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
        onConfirm={handleLogout}
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
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
  statisticsContainer: {
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
    borderWidth: 2,
    borderColor: "rgba(6, 182, 212, 0.1)",
    justifyContent: "center",
  },
  statCardMargin: {
    marginRight: 12,
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
  budgetSection: {
    paddingHorizontal: 20,
  },
  budgetBarContainer: {
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.1)",
    elevation: 2,
  },
  budgetBarHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  budgetBarIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  budgetBarLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  budgetBarAmount: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  budgetBarTrack: {
    height: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  budgetBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  budgetBarOverage: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "600",
    marginTop: 4,
  },
  budgetBarPercent: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  sectionHeader2: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 16,
    color: "#06b6d4",
    fontWeight: "600",
  },
  emptyBudgetState: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.1)",
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
  },
  recentSection: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 120,
  },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.1)",
    elevation: 1,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    marginBottom: 2,
  },
  expenseCategory: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#06b6d4",
    letterSpacing: -0.2,
  },
  emptyState: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.1)",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#f8fafc",
    color: "#1e293b",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  saveButton: {
    backgroundColor: "#06b6d4",
  },
  cancelButtonText: {
    color: "#334155",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  taskbarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  taskbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 12,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.1)",
  },
  actionButton: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  actionIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  addButton: {
    backgroundColor: "#06b6d4",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#06b6d4",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addIcon: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "300",
    lineHeight: 32,
  },
});