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
  { name: 'Food & Dining', icon: '🍽️', color: '#FF6B6B' },
  { name: 'Transportation', icon: '🚗', color: '#4ECDC4' },
  { name: 'Shopping', icon: '🛍️', color: '#45B7D1' },
  { name: 'Entertainment', icon: '🎬', color: '#96CEB4' },
  { name: 'Bills & Utilities', icon: '💡', color: '#FECA57' },
  { name: 'Healthcare', icon: '🏥', color: '#FF9FF3' },
  { name: 'Education', icon: '📚', color: '#54A0FF' },
  { name: 'Travel', icon: '✈️', color: '#5F27CD' },
  { name: 'Groceries', icon: '🛒', color: '#00D2D3' },
  { name: 'Other', icon: '📝', color: '#747D8C' },
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
    period: "monthly", // monthly, weekly, yearly
  });

  // Statistics
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [topCategory, setTopCategory] = useState("");

  useEffect(() => {
    fetchExpenses();
    fetchBudgets();
  }, []);

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
    const total = expenseData.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
    setTotalExpenses(total);

    // Calculate monthly expenses (current month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyTotal = expenseData
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
      })
      .reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
    setMonthlyExpenses(monthlyTotal);

    // Find top category
    const categoryMap = {};
    expenseData.forEach(expense => {
      const category = expense.category || "Uncategorized";
      categoryMap[category] = (categoryMap[category] || 0) + parseFloat(expense.amount || 0);
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
    const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"];

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
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expense.category === category && 
               expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear;
      })
      .reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
  };

  const getBudgetProgress = () => {
    return budgets.map(budget => {
      const spent = getCategorySpending(budget.category);
      const remaining = budget.amount - spent;
      const percentage = Math.min((spent / budget.amount) * 100, 100);
      const categoryData = EXPENSE_CATEGORIES.find(cat => cat.name === budget.category);
      
      return {
        ...budget,
        spent,
        remaining,
        percentage,
        icon: categoryData?.icon || '📝',
        color: categoryData?.color || '#747D8C',
        isOverBudget: spent > budget.amount
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
        { text: "Delete", style: "destructive", onPress: () => deleteExpense(expense.id) },
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
      const existingBudget = budgets.find(b => b.category === budgetForm.category);
      
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
        const { error } = await supabase
          .from("budgets")
          .insert([{
            user_id: session.user.id,
            category: budgetForm.category,
            amount: parseFloat(budgetForm.amount),
            period: budgetForm.period,
          }]);

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
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: performLogout },
      ]
    );
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
        <Text style={styles.expenseCategory}>{item.category || "Uncategorized"}</Text>
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
    <View style={[styles.budgetItem, item.isOverBudget && styles.overBudgetItem]}>
      <View style={styles.budgetHeader}>
        <View style={styles.budgetTitleContainer}>
          <Text style={styles.budgetIcon}>{item.icon}</Text>
          <Text style={styles.budgetTitle}>{item.category}</Text>
        </View>
        <TouchableOpacity
          onPress={() => Alert.alert(
            "Delete Budget",
            `Delete budget for ${item.category}?`,
            [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => deleteBudget(item.id) },
            ]
          )}
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
                backgroundColor: item.isOverBudget ? '#FF6B6B' : item.color 
              }
            ]} 
          />
        </View>
        <Text style={[styles.progressText, item.isOverBudget && styles.overBudgetText]}>
          {item.percentage.toFixed(0)}%
        </Text>
      </View>
      
      <View style={styles.budgetStats}>
        <Text style={styles.budgetSpent}>
          Spent: ₹{item.spent.toFixed(2)}
        </Text>
        <Text style={[styles.budgetRemaining, item.isOverBudget && styles.overBudgetAmount]}>
          {item.isOverBudget ? 'Over by' : 'Remaining'}: ₹{Math.abs(item.remaining).toFixed(2)}
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
          <Text style={styles.statValue}>{topCategory}</Text>
          <Text style={styles.statLabel}>Top Category</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionCard, styles.addExpenseCard]}
          onPress={() => navigation.navigate("AddExpense")}
        >
          <Text style={styles.actionCardIcon}>➕</Text>
          <Text style={styles.actionCardText}>Add Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCard, styles.aiExpenseCard]}
          onPress={() => navigation.navigate("AIExpense")}
        >
          <Text style={styles.actionCardIcon}>📸</Text>
          <Text style={styles.actionCardText}>AI Receipt</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCard, styles.budgetCard]}
          onPress={() => setBudgetModalVisible(true)}
        >
          <Text style={styles.actionCardIcon}>💰</Text>
          <Text style={styles.actionCardText}>Set Budget</Text>
        </TouchableOpacity>
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
          <TouchableOpacity onPress={() => navigation.navigate("AllExpenses")}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {recentExpenses.length > 0 ? (
          <FlatList
            data={recentExpenses}
            renderItem={renderExpenseItem}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No expenses yet</Text>
            <Text style={styles.emptyStateSubtext}>Add your first expense to get started!</Text>
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
              onChangeText={(text) => setEditForm({...editForm, title: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Amount"
              value={editForm.amount}
              onChangeText={(text) => setEditForm({...editForm, amount: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Category"
              value={editForm.category}
              onChangeText={(text) => setEditForm({...editForm, category: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD)"
              value={editForm.date}
              onChangeText={(text) => setEditForm({...editForm, date: text})}
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
                      budgetForm.category === category.name && styles.selectedCategoryPicker
                    ]}
                    onPress={() => setBudgetForm({...budgetForm, category: category.name})}
                  >
                    <Text style={styles.categoryPickerIcon}>{category.icon}</Text>
                    <Text style={styles.categoryPickerText}>{category.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <Text style={styles.inputLabel}>Budget Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              value={budgetForm.amount}
              onChangeText={(text) => setBudgetForm({...budgetForm, amount: text})}
              keyboardType="numeric"
            />
            
            <Text style={styles.inputLabel}>Period</Text>
            <View style={styles.periodContainer}>
              {['monthly', 'weekly', 'yearly'].map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    budgetForm.period === period && styles.selectedPeriodButton
                  ]}
                  onPress={() => setBudgetForm({...budgetForm, period})}
                >
                  <Text style={[
                    styles.periodButtonText,
                    budgetForm.period === period && styles.selectedPeriodButtonText
                  ]}>
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
                  setBudgetForm({ category: "", amount: "", period: "monthly" });
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  logoutButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "white",
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4ECDC4",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "white",
    padding: 20,
    marginHorizontal: 5,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionCardIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionCardText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  addExpenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#4ECDC4",
  },
  aiExpenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#45B7D1",
  },
  budgetCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#96CEB4",
  },
  budgetSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  budgetItem: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  overBudgetItem: {
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B6B",
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  budgetTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  budgetIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  budgetTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  deleteBudgetText: {
    fontSize: 16,
    padding: 5,
  },
  budgetProgress: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    marginRight: 10,
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    minWidth: 35,
  },
  overBudgetText: {
    color: "#FF6B6B",
  },
  budgetStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  budgetSpent: {
    fontSize: 12,
    color: "#666",
  },
  budgetRemaining: {
    fontSize: 12,
    color: "#4ECDC4",
    fontWeight: "600",
  },
  overBudgetAmount: {
    color: "#FF6B6B",
  },
  budgetTotal: {
    fontSize: 12,
    color: "#333",
  },
  chartsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  chartCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  seeAllText: {
    fontSize: 14,
    color: "#4ECDC4",
    fontWeight: "600",
  },
  recentSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  expenseItem: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  expenseCategory: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  expenseDate: {
    fontSize: 12,
    color: "#999",
  },
  expenseActions: {
    alignItems: "flex-end",
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4ECDC4",
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: "row",
  },
  actionButton: {
    padding: 8,
    marginLeft: 5,
    borderRadius: 6,
  },
  editButton: {
    backgroundColor: "#f8f9fa",
  },
  deleteButton: {
    backgroundColor: "#f8f9fa",
  },
  actionButtonText: {
    fontSize: 14,
  },
  emptyState: {
    backgroundColor: "white",
    padding: 40,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e9ecef",
    fontSize: 16,
  },
  categoryPickerContainer: {
    marginBottom: 15,
  },
  categoryPicker: {
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 10,
    marginRight: 10,
    alignItems: "center",
    minWidth: 80,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  selectedCategoryPicker: {
    backgroundColor: "#4ECDC4",
    borderColor: "#4ECDC4",
  },
  categoryPickerIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryPickerText: {
    fontSize: 10,
    color: "#333",
    textAlign: "center",
    fontWeight: "600",
  },
  periodContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 12,
    marginRight: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  selectedPeriodButton: {
    backgroundColor: "#4ECDC4",
    borderColor: "#4ECDC4",
  },
  periodButtonText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  selectedPeriodButtonText: {
    color: "white",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  saveButton: {
    backgroundColor: "#4ECDC4",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 16,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});
