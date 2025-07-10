import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  FlatList,
  RefreshControl,
  Dimensions,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  ArrowLeft,
  Plus,
  Edit3,
  Trash2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Pencil,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../lib/supabase";

const { width } = Dimensions.get("window");

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

function formatNumber(n) {
  return n ? parseFloat(n).toLocaleString() : "0";
}

const BudgetItem = ({ item, theme, onEdit, onDelete }) => (
  <View
    style={[
      styles.expenseCard,
      {
        backgroundColor: theme.colors.surface,
        borderColor: item.isOverBudget
          ? theme.colors.error
          : theme.colors.borderLight,
      },
    ]}
  >
    <View style={styles.expenseHeader}>
      <View
        style={[styles.expenseIcon, { backgroundColor: item.color + "22" }]}
      >
        <Text style={styles.categoryEmoji}>{item.icon}</Text>
      </View>
      <View style={styles.expenseInfo}>
        <Text
          style={[styles.expenseTitle, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {item.category}
        </Text>
        <Text
          style={[
            styles.expenseCategory,
            { color: theme.colors.textSecondary },
          ]}
        >
          {item.period.charAt(0).toUpperCase() + item.period.slice(1)} Budget
        </Text>
      </View>
      <View style={styles.expenseAmount}>
        <Text style={[styles.amountText, { color: theme.colors.primary }]}>
          ₹{formatNumber(item.amount)}
        </Text>
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
        <Text style={[styles.statValue, { color: theme.colors.text }]}>
          ₹{formatNumber(item.spent)}
        </Text>
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
            ? `₹${formatNumber(Math.abs(item.remaining))}`
            : `₹${formatNumber(item.remaining)}`}
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
        <Text style={[styles.statValue, { color: theme.colors.text }]}>
          ₹{formatNumber(item.amount)}
        </Text>
        <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>
          Budget
        </Text>
      </View>
    </View>
    <View style={styles.expenseActions}>
      <TouchableOpacity
        style={[
          styles.actionButton,
          { backgroundColor: theme.colors.warning + "15" },
        ]}
        onPress={() => onEdit(item)}
      >
        <Edit3 color={theme.colors.warning} size={16} />
        <Text style={[styles.editButtonText, { color: theme.colors.warning }]}>
          Edit
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.actionButton,
          { backgroundColor: theme.colors.error + "15" },
        ]}
        onPress={() => onDelete(item.id)}
      >
        <Trash2 color={theme.colors.error} size={16} />
        <Text style={[styles.deleteButtonText, { color: theme.colors.error }]}>
          Delete
        </Text>
      </TouchableOpacity>
    </View>
    {item.isOverBudget && (
      <View
        style={[
          styles.warningBanner,
          { backgroundColor: theme.colors.error + "10" },
        ]}
      >
        <Text style={[styles.warningText, { color: theme.colors.error }]}>
          ⚠️ Budget exceeded by ₹{formatNumber(Math.abs(item.remaining))}
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
  const [monthlyBudgetModalVisible, setMonthlyBudgetModalVisible] =
    useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [budgetForm, setBudgetForm] = useState({
    category: "",
    amount: "",
    period: "monthly",
  });
  const [monthlyBudgetInput, setMonthlyBudgetInput] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

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
      setExpenses([]);
      setBudgets([]);
      setProfile(null);
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

  const filterAndSortBudgets = useMemo(() => {
    let filtered = [...budgets];
    if (selectedCategory !== "All") {
      filtered = filtered.filter((b) => b.category === selectedCategory);
    }
    filtered.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case "amount":
          aValue = parseFloat(a.amount);
          bValue = parseFloat(b.amount);
          break;
        case "title":
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case "date":
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
      }
      if (sortOrder === "asc") return aValue > bValue ? 1 : -1;
      else return aValue < bValue ? 1 : -1;
    });
    return filtered;
  }, [budgets, selectedCategory, sortBy, sortOrder]);

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
    return filterAndSortBudgets.map((budget) => {
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
  }, [filterAndSortBudgets, expenses, theme.colors.primary]);

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
    setMonthlyBudgetInput(profile?.monthly_budget?.toString() || "");
    setMonthlyBudgetModalVisible(true);
  };

  const saveBudget = async () => {
    if (!budgetForm.category || !budgetForm.amount) return;
    const isEditing = !!editingBudget;
    const existingBudget = budgets.find(
      (b) =>
        b.category === budgetForm.category &&
        (!isEditing || b.id !== editingBudget.id)
    );
    if (existingBudget) return;
    const budgetData = {
      user_id: session.user.id,
      category: budgetForm.category,
      amount: parseFloat(budgetForm.amount),
      period: budgetForm.period,
    };
    try {
      if (isEditing) {
        await supabase
          .from("budgets")
          .update(budgetData)
          .eq("id", editingBudget.id);
      } else {
        await supabase.from("budgets").insert(budgetData);
      }
      setBudgetModalVisible(false);
      fetchData();
    } catch {}
  };

  const saveMonthlyBudget = async () => {
    if (!monthlyBudgetInput) return;
    try {
      await supabase
        .from("profiles")
        .update({ monthly_budget: parseFloat(monthlyBudgetInput) })
        .eq("id", session.user.id);
      setMonthlyBudgetModalVisible(false);
      fetchData();
    } catch {}
  };

  const deleteBudget = async (budgetId) => {
    try {
      await supabase.from("budgets").delete().eq("id", budgetId);
      fetchData();
    } catch {}
  };

  const categories = ["All", ...EXPENSE_CATEGORIES.map((c) => c.name)];

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
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.backButton,
            { backgroundColor: theme.colors.buttonSecondary },
          ]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Budgets
        </Text>
        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: theme.colors.buttonSecondary },
          ]}
          onPress={() => openBudgetModal()}
        >
          <Plus color={theme.colors.primary} size={24} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        <View style={styles.topSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
          >
            <View style={styles.categoriesContainer}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryFilter,
                    {
                      backgroundColor:
                        selectedCategory === category
                          ? theme.colors.primary
                          : theme.colors.buttonSecondary,
                    },
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryFilterText,
                      {
                        color:
                          selectedCategory === category
                            ? "#fff"
                            : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity
            style={[styles.monthlyBudgetBox, { borderColor: theme.colors.primary }]}
            onPress={openMonthlyBudgetModal}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.monthlyBudgetLabel,
                { color: theme.colors.textTertiary },
              ]}
            >
              Monthly Budget
            </Text>
            <View style={styles.incomeRow}>
              <Text
                style={[
                  styles.monthlyBudgetValue,
                  { color: theme.colors.primary },
                ]}
              >
                ₹{profile?.monthly_budget ? formatNumber(profile.monthly_budget) : "Set"}
              </Text>
              <Pencil
                size={18}
                color={theme.colors.textTertiary}
                style={{ marginLeft: 8 }}
              />
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.listContainer}>
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
              <DollarSign color={theme.colors.textTertiary} size={64} />
              <Text
                style={[styles.emptyStateTitle, { color: theme.colors.text }]}
              >
                No category budgets
              </Text>
              <Text
                style={[
                  styles.emptyStateText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Start tracking your category budgets by adding your first one!
              </Text>
              <TouchableOpacity
                style={[
                  styles.addExpenseButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={openBudgetModal}
              >
                <Plus color="#fff" size={20} />
                <Text style={styles.addExpenseButtonText}>
                  Add Category Budget
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
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
                              ? theme.colors.primary
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
              styles.modalContainer,
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
            <View style={styles.modalContent}>
              <View style={styles.formSection}>
                <Text
                  style={[
                    styles.formLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Monthly Budget
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
                    value={monthlyBudgetInput}
                    onChangeText={setMonthlyBudgetInput}
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
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 18,
    borderBottomWidth: 1,
    justifyContent: "space-between",
  },
  backButton: { padding: 8, borderRadius: 12 },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  addButton: { padding: 8, borderRadius: 12 },
  topSection: { paddingHorizontal: 20, paddingTop: 20, marginBottom: 8 },
  categoriesScroll: { marginBottom: 8 },
  categoriesContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
  },
  categoryFilter: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 8,
  },
  categoryFilterText: { fontSize: 14, fontWeight: "600" },
  monthlyBudgetBox: {
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  monthlyBudgetLabel: { fontSize: 12, fontWeight: "500", marginBottom: 2 },
  monthlyBudgetValue: { fontSize: 20, fontWeight: "bold" },
  incomeRow: { flexDirection: "row", alignItems: "center" },
  filterButton: { borderRadius: 12, padding: 12, borderWidth: 1, elevation: 1 },
  listContainer: { paddingHorizontal: 20, paddingTop: 10 },
  expenseCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    elevation: 2,
    marginBottom: 12,
  },
  expenseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  expenseIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  categoryEmoji: { fontSize: 20 },
  expenseInfo: { flex: 1, marginRight: 12 },
  expenseTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  expenseCategory: { fontSize: 14, marginBottom: 4 },
  expenseAmount: { alignItems: "flex-end" },
  amountText: { fontSize: 18, fontWeight: "700" },
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
  progressBar: { height: "100%", borderRadius: 4 },
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
  statItem: { alignItems: "center", flex: 1 },
  statValue: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  statLabel: { fontSize: 12, fontWeight: "500" },
  warningBanner: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  warningText: { fontSize: 14, fontWeight: "500" },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  addExpenseButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addExpenseButtonText: { fontWeight: "700", fontSize: 16, marginLeft: 8 },
  expenseActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: "center",
  },
  editButtonText: { fontWeight: "600", fontSize: 14, marginLeft: 4 },
  deleteButtonText: { fontWeight: "600", fontSize: 14, marginLeft: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
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
  modalTitle: { fontSize: 20, fontWeight: "600" },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: { fontSize: 24, fontWeight: "300" },
  modalContent: { paddingHorizontal: 20, paddingBottom: 20 },
  formSection: { marginBottom: 24 },
  formLabel: { fontSize: 16, fontWeight: "500", marginBottom: 12 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 80,
  },
  categoryIcon: { fontSize: 20, marginBottom: 4 },
  categoryText: { fontSize: 12, fontWeight: "500", textAlign: "center" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  currencySymbol: { fontSize: 18, fontWeight: "500", marginRight: 8 },
  amountInput: { flex: 1, fontSize: 16, fontWeight: "500" },
  periodOptions: { flexDirection: "row", gap: 8 },
  periodOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  periodText: { fontSize: 14, fontWeight: "500" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelButton: {},
  saveButton: {},
  cancelButtonText: { fontWeight: "600", fontSize: 16 },
  saveButtonText: { fontWeight: "700", fontSize: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: "500" },
});
