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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

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

const BudgetItem = ({ item, theme, onEdit, onDelete }) => (
  <View
    style={[
      styles.budgetCard,
      {
        backgroundColor: theme.colors.surface,
        borderColor: item.isOverBudget
          ? theme.colors.error
          : theme.colors.border,
      },
    ]}
  >
    <View style={styles.budgetHeader}>
      <View style={styles.budgetTitleSection}>
        <View
          style={[styles.iconContainer, { backgroundColor: item.color + "22" }]}
        >
          <Text style={styles.budgetIcon}>{item.icon}</Text>
        </View>
        <View style={styles.budgetInfo}>
          <Text style={[styles.budgetTitle, { color: theme.colors.text }]}>
            {item.category}
          </Text>
          <Text
            style={[styles.budgetPeriod, { color: theme.colors.textTertiary }]}
          >
            {item.period.charAt(0).toUpperCase() + item.period.slice(1)} Budget
          </Text>
        </View>
      </View>
      <View style={styles.budgetActions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: theme.colors.primary + "18" },
          ]}
          onPress={() => onEdit(item)}
        >
          <Text style={{ fontSize: 16 }}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: theme.colors.error + "18" },
          ]}
          onPress={() => onDelete(item.id)}
        >
          <Text style={{ fontSize: 16 }}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
    <View style={styles.progressSection}>
      <View
        style={[
          styles.progressBarContainer,
          { backgroundColor: theme.colors.border },
        ]}
      >
        <View
          style={[
            styles.progressBar,
            {
              width: `${Math.min(item.percentage, 100)}%`,
              backgroundColor: item.isOverBudget
                ? theme.colors.error
                : item.color,
            },
          ]}
        />
      </View>
      <Text
        style={[
          styles.progressText,
          {
            color: item.isOverBudget
              ? theme.colors.error
              : theme.colors.primary,
          },
        ]}
      >
        {item.percentage.toFixed(0)}%
      </Text>
    </View>
    <View
      style={[
        styles.statsContainer,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <View style={styles.statItem}>
        <Text
          style={[styles.statValue, { color: theme.colors.text }]}
        >{`₹${item.spent.toLocaleString()}`}</Text>
        <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>
          Spent
        </Text>
      </View>
      <View style={styles.statItem}>
        <Text
          style={[
            styles.statValue,
            item.isOverBudget
              ? { color: theme.colors.error }
              : { color: theme.colors.success },
          ]}
        >
          {item.isOverBudget
            ? `₹${Math.abs(item.remaining).toLocaleString()}`
            : `₹${item.remaining.toLocaleString()}`}
        </Text>
        <Text
          style={[
            styles.statLabel,
            {
              color: item.isOverBudget
                ? theme.colors.error
                : theme.colors.textTertiary,
            },
          ]}
        >
          {item.isOverBudget ? "Over by" : "Remaining"}
        </Text>
      </View>
      <View style={styles.statItem}>
        <Text
          style={[styles.statValue, { color: theme.colors.text }]}
        >{`₹${item.amount.toLocaleString()}`}</Text>
        <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>
          Budget
        </Text>
      </View>
    </View>
    {item.isOverBudget && (
      <View
        style={[
          styles.warningBanner,
          { backgroundColor: theme.colors.error + "10" },
        ]}
      >
        <Text style={[styles.warningText, { color: theme.colors.error }]}>
          ⚠️ Budget exceeded by ₹{Math.abs(item.remaining).toLocaleString()}
        </Text>
      </View>
    )}
  </View>
);

export default function BudgetScreen({ navigation }) {
  const { session } = useAuth();
  const { theme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [monthlyBudgetModalVisible, setMonthlyBudgetModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [budgetForm, setBudgetForm] = useState({
    category: "",
    amount: "",
    period: "monthly",
  });
  const [monthlyBudgetAmount, setMonthlyBudgetAmount] = useState("");

  const fetchData = useCallback(async () => {
    if (!session?.user) return;
    try {
      const [expensesRes, budgetsRes, profileRes] = await Promise.all([
        supabase.from("expenses").select("*").eq("user_id", session.user.id),
        supabase
          .from("budgets")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("monthly_budget")
          .eq("id", session.user.id)
          .single(),
      ]);

      if (expensesRes.error) throw expensesRes.error;
      setExpenses(expensesRes.data || []);

      if (budgetsRes.error) throw budgetsRes.error;
      setBudgets(budgetsRes.data || []);

      if (profileRes.error) throw profileRes.error;
      setProfile(profileRes.data);
    } catch (error) {
      console.error("Error fetching data:", error.message);
      alert("Failed to fetch your financial data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const totalSpentThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    return expenses
      .filter((expense) => {
        if (!expense.date) return false;
        const expenseDate = new Date(expense.date);
        return expenseDate >= startOfMonth && expenseDate <= now;
      })
      .reduce((sum, expense) => {
        const amt = parseFloat(expense.amount);
        return sum + (isNaN(amt) ? 0 : amt);
      }, 0);
  }, [expenses]);

  const overallBudgetProgress = useMemo(() => {
    const monthlyBudget = parseFloat(profile?.monthly_budget) || 0;
    const remaining = monthlyBudget - totalSpentThisMonth;
    let percentage = 0;
    if (monthlyBudget > 0) {
      percentage = (totalSpentThisMonth / monthlyBudget) * 100;
    } else if (totalSpentThisMonth > 0) {
      percentage = 100;
    }
    return {
      total: monthlyBudget,
      spent: totalSpentThisMonth,
      remaining,
      percentage: Math.min(percentage, 100),
      isOverBudget: totalSpentThisMonth > monthlyBudget,
    };
  }, [profile, totalSpentThisMonth]);

  const categoryBudgetsProgress = useMemo(() => {
    const getCategorySpending = (category, period = "monthly") => {
      const now = new Date();
      let startDate;
      switch (period) {
        case "weekly":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case "yearly":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      startDate.setHours(0, 0, 0, 0);

      return expenses
        .filter((e) => {
          const expenseDate = new Date(e.date);
          return (
            e.category === category &&
            expenseDate >= startDate &&
            expenseDate <= now
          );
        })
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    };

    return budgets.map((budget) => {
      const amount = parseFloat(budget.amount) || 0;
      const spent = getCategorySpending(budget.category, budget.period);
      const remaining = amount - spent;
      let percentage =
        amount > 0 ? (spent / amount) * 100 : spent > 0 ? 100 : 0;
      const categoryData = EXPENSE_CATEGORIES.find(
        (cat) => cat.name === budget.category
      );
      return {
        ...budget,
        amount,
        spent,
        remaining,
        percentage,
        icon: categoryData?.icon || "📝",
        color: categoryData?.color || theme.colors.primary,
        isOverBudget: spent > amount,
      };
    });
  }, [budgets, expenses, theme.colors.primary]);

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
      setBudgetForm({ category: "", amount: "", period: "monthly" });
    }
    setBudgetModalVisible(true);
  };

  const openMonthlyBudgetModal = () => {
    setMonthlyBudgetAmount((profile?.monthly_budget || 0).toString());
    setMonthlyBudgetModalVisible(true);
  };

  const saveBudget = async () => {
    if (!budgetForm.category || !budgetForm.amount) {
      alert("Please fill in all fields.");
      return;
    }

    const isEditing = !!editingBudget;
    const existingBudget = budgets.find(
      (b) =>
        b.category === budgetForm.category &&
        (!isEditing || b.id !== editingBudget.id)
    );

    if (existingBudget) {
      alert("A budget for this category already exists.");
      return;
    }

    const budgetData = {
      user_id: session.user.id,
      category: budgetForm.category,
      amount: parseFloat(budgetForm.amount),
      period: budgetForm.period,
    };

    try {
      const { error } = isEditing
        ? await supabase
            .from("budgets")
            .update(budgetData)
            .eq("id", editingBudget.id)
        : await supabase.from("budgets").insert(budgetData);

      if (error) throw error;

      setBudgetModalVisible(false);
      fetchData(); 
      alert(`Budget ${isEditing ? "updated" : "created"} successfully!`);
    } catch (err) {
      alert(`Failed to ${isEditing ? "update" : "create"} budget.`);
      console.error("Save budget error:", err);
    }
  };

  const saveMonthlyBudget = async () => {
    if (!monthlyBudgetAmount) {
      alert("Please enter a valid amount.");
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ monthly_budget: parseFloat(monthlyBudgetAmount) })
        .eq("id", session.user.id);

      if (error) throw error;

      setMonthlyBudgetModalVisible(false);
      fetchData();
      alert("Monthly budget updated successfully!");
    } catch (err) {
      alert("Failed to update monthly budget.");
      console.error("Save monthly budget error:", err);
    }
  };

  const deleteBudget = async (budgetId) => {
    try {
      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", budgetId);
      if (error) throw error;
      fetchData();
      alert("Budget deleted successfully!");
    } catch (err) {
      alert("Failed to delete budget.");
      console.error("Delete budget error:", err);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text
          style={[styles.loadingText, { color: theme.colors.textSecondary }]}
        >
          Loading your financial overview...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={[
                styles.backButton,
                { backgroundColor: theme.colors.buttonSecondary },
              ]}
              onPress={() => navigation.goBack()}
            >
              <Text
                style={[styles.backButtonText, { color: theme.colors.text }]}
              >
                ← Back
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.addButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => openBudgetModal()}
            >
              <Text style={[styles.addButtonText, { color: "#fff" }]}>
                + New Category Budget
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Budget Overview
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              { color: theme.colors.textTertiary },
            ]}
          >
            Your monthly spending at a glance
          </Text>
        </View>

        {/* Overall Monthly Budget Progress */}
        <View style={styles.overallProgressContainer}>
          <View
            style={[
              styles.overallProgressCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.overallProgressHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Overall Monthly Progress
              </Text>
              <TouchableOpacity
                style={[
                  styles.editBudgetButton,
                  { backgroundColor: theme.colors.primary + "18" },
                ]}
                onPress={openMonthlyBudgetModal}
              >
                <Text style={{ fontSize: 16 }}>✏️</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.progressSection}>
              <View
                style={[
                  styles.progressBarContainer,
                  { backgroundColor: theme.colors.border },
                ]}
              >
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${overallBudgetProgress.percentage}%`,
                      backgroundColor: overallBudgetProgress.isOverBudget
                        ? theme.colors.error
                        : theme.colors.primary,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.progressText,
                  {
                    color: overallBudgetProgress.isOverBudget
                      ? theme.colors.error
                      : theme.colors.primary,
                  },
                ]}
              >
                {overallBudgetProgress.percentage.toFixed(0)}%
              </Text>
            </View>
            <View
              style={[
                styles.statsContainer,
                { backgroundColor: theme.colors.background },
              ]}
            >
              <View style={styles.statItem}>
                <Text
                  style={[styles.statValue, { color: theme.colors.text }]}
                >{`₹${overallBudgetProgress.spent.toLocaleString()}`}</Text>
                <Text
                  style={[
                    styles.statLabel,
                    { color: theme.colors.textTertiary },
                  ]}
                >
                  Spent
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statValue,
                    {
                      color: overallBudgetProgress.isOverBudget
                        ? theme.colors.error
                        : theme.colors.success,
                    },
                  ]}
                >
                  {`₹${Math.abs(
                    overallBudgetProgress.remaining
                  ).toLocaleString()}`}
                </Text>
                <Text
                  style={[
                    styles.statLabel,
                    {
                      color: overallBudgetProgress.isOverBudget
                        ? theme.colors.error
                        : theme.colors.textTertiary,
                    },
                  ]}
                >
                  {overallBudgetProgress.isOverBudget
                    ? "Over Budget"
                    : "Remaining"}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  style={[styles.statValue, { color: theme.colors.text }]}
                >{`₹${overallBudgetProgress.total.toLocaleString()}`}</Text>
                <Text
                  style={[
                    styles.statLabel,
                    { color: theme.colors.textTertiary },
                  ]}
                >
                  Budget
                </Text>
              </View>
            </View>
            {overallBudgetProgress.isOverBudget && (
              <View
                style={[
                  styles.warningBanner,
                  { backgroundColor: theme.colors.error + "10" },
                ]}
              >
                <Text
                  style={[styles.warningText, { color: theme.colors.error }]}
                >
                  ⚠️ You've exceeded your monthly budget!
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Category Budgets List */}
        <View style={styles.budgetListContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Category Budgets
          </Text>
          {categoryBudgetsProgress.length > 0 ? (
            <FlatList
              data={categoryBudgetsProgress}
              renderItem={({ item }) => (
                <BudgetItem
                  item={item}
                  theme={theme}
                  onEdit={openBudgetModal}
                  onDelete={deleteBudget}
                />
              )}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
            />
          ) : (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text style={styles.emptyStateIcon}>📊</Text>
              <Text
                style={[styles.emptyStateTitle, { color: theme.colors.text }]}
              >
                No Category Budgets
              </Text>
              <Text
                style={[
                  styles.emptyStateText,
                  { color: theme.colors.textTertiary },
                ]}
              >
                Create budgets for specific categories to track your spending in
                more detail.
              </Text>
              <TouchableOpacity
                style={[
                  styles.emptyStateButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => openBudgetModal()}
              >
                <Text style={[styles.emptyStateButtonText, { color: "#fff" }]}>
                  Create a Category Budget
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Category Budget Modal */}
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
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {editingBudget ? "Edit Budget" : "Create New Budget"}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setBudgetModalVisible(false)}
              >
                <Text
                  style={[styles.closeButtonText, { color: theme.colors.text }]}
                >
                  ×
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formSection}>
                <Text
                  style={[
                    styles.formLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Select Category
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categoryGrid}>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <TouchableOpacity
                        key={category.name}
                        style={[
                          styles.categoryOption,
                          {
                            backgroundColor:
                              budgetForm.category === category.name
                                ? theme.colors.primary + "33"
                                : theme.colors.buttonSecondary,
                            borderColor:
                              budgetForm.category === category.name
                                ? theme.colors.primary
                                : theme.colors.borderLight,
                          },
                        ]}
                        onPress={() =>
                          setBudgetForm({
                            ...budgetForm,
                            category: category.name,
                          })
                        }
                      >
                        <Text style={styles.categoryIcon}>{category.icon}</Text>
                        <Text
                          style={[
                            styles.categoryText,
                            { color: theme.colors.textTertiary },
                          ]}
                        >
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.formSection}>
                <Text
                  style={[
                    styles.formLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Budget Amount
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    { borderColor: theme.colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.currencySymbol,
                      { color: theme.colors.textTertiary },
                    ]}
                  >
                    ₹
                  </Text>
                  <TextInput
                    style={[styles.amountInput, { color: theme.colors.text }]}
                    placeholder="0"
                    value={budgetForm.amount}
                    onChangeText={(text) =>
                      setBudgetForm({ ...budgetForm, amount: text })
                    }
                    keyboardType="numeric"
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text
                  style={[
                    styles.formLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Budget Period
                </Text>
                <View style={styles.periodOptions}>
                  {["weekly", "monthly", "yearly"].map((period) => (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.periodOption,
                        {
                          backgroundColor:
                            budgetForm.period === period
                              ? theme.colors.primary
                              : theme.colors.buttonSecondary,
                          borderColor:
                            budgetForm.period === period
                              ? theme.colors.primaryDark
                              : theme.colors.borderLight,
                        },
                      ]}
                      onPress={() => setBudgetForm({ ...budgetForm, period })}
                    >
                      <Text
                        style={[
                          styles.periodText,
                          {
                            color:
                              budgetForm.period === period
                                ? "#fff"
                                : theme.colors.textTertiary,
                          },
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
                  style={[
                    styles.modalButton,
                    styles.cancelButton,
                    {
                      backgroundColor: theme.colors.buttonSecondary,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setBudgetModalVisible(false)}
                >
                  <Text
                    style={[
                      styles.cancelButtonText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.saveButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={saveBudget}
                >
                  <Text style={[styles.saveButtonText, { color: "#fff" }]}>
                    {editingBudget ? "Update" : "Create"} Budget
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Monthly Budget Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={monthlyBudgetModalVisible}
        onRequestClose={() => setMonthlyBudgetModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View
            style={[
              styles.monthlyBudgetModalContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Edit Monthly Budget
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setMonthlyBudgetModalVisible(false)}
              >
                <Text
                  style={[styles.closeButtonText, { color: theme.colors.text }]}
                >
                  ×
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.monthlyBudgetContent}>
              <View style={styles.formSection}>
                <Text
                  style={[
                    styles.formLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Monthly Budget Amount
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    { borderColor: theme.colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.currencySymbol,
                      { color: theme.colors.textTertiary },
                    ]}
                  >
                    ₹
                  </Text>
                  <TextInput
                    style={[styles.amountInput, { color: theme.colors.text }]}
                    placeholder="0"
                    value={monthlyBudgetAmount}
                    onChangeText={setMonthlyBudgetAmount}
                    keyboardType="numeric"
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.cancelButton,
                    {
                      backgroundColor: theme.colors.buttonSecondary,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setMonthlyBudgetModalVisible(false)}
                >
                  <Text
                    style={[
                      styles.cancelButtonText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.saveButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={saveMonthlyBudget}
                >
                  <Text style={[styles.saveButtonText, { color: "#fff" }]}>
                    Update Budget
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: "400",
  },
  overallProgressContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  overallProgressCard: {
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  overallProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  editBudgetButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  progressSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginRight: 12,
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
    minWidth: 48,
    textAlign: "right",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  warningBanner: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  warningText: {
    fontSize: 14,
    fontWeight: "500",
  },
  budgetListContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  budgetCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  budgetIcon: {
    fontSize: 24,
  },
  budgetInfo: {
    flex: 1,
  },
  budgetTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  budgetPeriod: {
    fontSize: 14,
    fontWeight: "500",
  },
  budgetActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginTop: 8,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyStateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%",
    borderRadius: 16,
    overflow: "hidden",
  },
  monthlyBudgetModalContainer: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 16,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: "300",
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  monthlyBudgetContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 80,
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: "500",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  periodOptions: {
    flexDirection: "row",
    gap: 8,
  },
  periodOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  periodText: {
    fontSize: 14,
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    // No additional styles needed
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});