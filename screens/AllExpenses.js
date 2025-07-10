import React, { useEffect, useState, useMemo } from "react";
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
} from "react-native";
import {
  ArrowLeft,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  Plus,
  Eye,
  Edit3,
  Trash2,
  DollarSign,
  Clock,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../lib/supabase";
import Alert from "../components/Alert";

const { width } = Dimensions.get("window");

export default function AllExpensesScreen({ navigation }) {
  const { session } = useAuth();
  const { theme } = useTheme();
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const categories = [
    "All",
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Bills & Utilities",
    "Healthcare",
    "Travel",
    "Education",
    "Others",
  ];
  const CATEGORIES = [
    {
      id: "Food",
      name: "Food & Dining",
      icon: "restaurant",
      emoji: "🍽️",
      color: "#FF6B6B",
    },
    {
      id: "Shopping",
      name: "Shopping",
      icon: "bag",
      emoji: "🛍️",
      color: "#4ECDC4",
    },
    {
      id: "Transportation",
      name: "Transportation",
      icon: "car",
      emoji: "🚗",
      color: "#45B7D1",
    },
    {
      id: "Entertainment",
      name: "Entertainment",
      icon: "game-controller",
      emoji: "🎬",
      color: "#96CEB4",
    },
    {
      id: "Healthcare",
      name: "Healthcare",
      icon: "medical",
      emoji: "🏥",
      color: "#FF9FF3",
    },
    {
      id: "Utilities",
      name: "Bills & Utilities",
      icon: "flash",
      emoji: "💡",
      color: "#FECA57",
    },
    {
      id: "Education",
      name: "Education",
      icon: "school",
      emoji: "📚",
      color: "#54A0FF",
    },
    {
      id: "Travel",
      name: "Travel",
      icon: "airplane",
      emoji: "✈️",
      color: "#5F27CD",
    },
    {
      id: "Groceries",
      name: "Groceries",
      icon: "basket",
      emoji: "🛒",
      color: "#00D2D3",
    },
    {
      id: "Other",
      name: "Other",
      icon: "ellipsis-horizontal",
      emoji: "📝",
      color: "#A8A8A8",
    },
  ];

  const [alertProps, setAlertProps] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "",
    cancelText: "",
    icon: null,
    iconBg: "",
    confirmColor: "",
    confirmTextColor: "",
    cancelColor: "",
    cancelTextColor: "",
    onConfirm: null,
    onCancel: null,
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    filterAndSortExpenses();
  }, [expenses, searchQuery, selectedCategory, sortBy, sortOrder]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchExpenses();
    setRefreshing(false);
  };

  const filterAndSortExpenses = () => {
    let filtered = [...expenses];

    if (searchQuery) {
      filtered = filtered.filter(
        (expense) =>
          expense.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          expense.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          expense.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== "All") {
      filtered = filtered.filter(
        (expense) => expense.category === selectedCategory
      );
    }

    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "amount":
          aValue = parseFloat(a.amount);
          bValue = parseFloat(b.amount);
          break;
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "date":
        default:
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredExpenses(filtered);
  };

  const deleteExpense = async (expenseId) => {
    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId);

      if (error) throw error;

      setExpenses(expenses.filter((exp) => exp.id !== expenseId));
      showSuccessAlert("Expense deleted successfully!");
    } catch (error) {
      showErrorAlert("Failed to delete expense. Please try again.");
    }
  };

  const confirmDelete = (expense) => {
    setAlertProps({
      open: true,
      title: "Delete Expense",
      message: `Are you sure you want to delete "${expense.title}"?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      icon: <Trash2 color="#fff" size={40} />,
      iconBg: theme.colors.error,
      confirmColor: theme.colors.error,
      confirmTextColor: "#fff",
      cancelColor: theme.colors.buttonSecondary,
      cancelTextColor: theme.colors.text,
      onConfirm: () => {
        setAlertProps((prev) => ({ ...prev, open: false }));
        deleteExpense(expense.id);
      },
      onCancel: () => setAlertProps((prev) => ({ ...prev, open: false })),
    });
  };

  const showSuccessAlert = (message) => {
    setAlertProps({
      open: true,
      title: "Success",
      message,
      confirmText: "OK",
showCancel: false,
      icon: <DollarSign color="#fff" size={40} />,
      iconBg: theme.colors.primary,
      confirmColor: theme.colors.primary,
      confirmTextColor: "#fff",
      cancelText: null,
      onConfirm: () => setAlertProps((prev) => ({ ...prev, open: false })),
      onCancel: null,
    });
  };

  const showErrorAlert = (message) => {
    setAlertProps({
      open: true,
      title: "Error",
      message,
      confirmText: "OK",
showCancel: false,
      icon: <Trash2 color="#fff" size={40} />,
      iconBg: theme.colors.error,
      confirmColor: theme.colors.error,
      confirmTextColor: "#fff",
      cancelText: null,
      onConfirm: () => setAlertProps((prev) => ({ ...prev, open: false })),
      onCancel: null,
    });
  };

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce(
      (sum, expense) => sum + parseFloat(expense.amount),
      0
    );
  }, [filteredExpenses]);

  const getCategoryIcon = (category) => {
    const iconMap = {
      "Food & Dining": "🍽️",
      Transportation: "🚗",
      Shopping: "🛒",
      Entertainment: "🎬",
      "Bills & Utilities": "💡",
      Healthcare: "🏥",
      Travel: "✈️",
      Education: "📚",
      Others: "📝",
    };
    return iconMap[category] || "📝";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const ExpenseCard = ({ expense, index }) => (
    <View
      style={[
        styles.expenseCard,
        {
          marginBottom: index === filteredExpenses.length - 1 ? 20 : 12,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderLight,
        },
      ]}
    >
      <View style={styles.expenseHeader}>
        <View style={[styles.expenseIcon, { backgroundColor: theme.colors.buttonSecondary }]}>
          <Text style={styles.categoryEmoji}>
            {getCategoryIcon(expense.category)}
          </Text>
        </View>
        <View style={styles.expenseInfo}>
          <Text style={[styles.expenseTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {expense.title}
          </Text>
          <Text style={[styles.expenseCategory, { color: theme.colors.textSecondary }]}>{expense.category}</Text>
          <View style={styles.expenseDate}>
            <Clock color={theme.colors.textTertiary} size={12} />
            <Text style={[styles.expenseDateText, { color: theme.colors.textTertiary }]}>
              {formatDate(expense.date)}
            </Text>
          </View>
        </View>
        <View style={styles.expenseAmount}>
          <Text style={[styles.amountText, { color: theme.colors.primary }]}>
            ₹{parseFloat(expense.amount).toLocaleString()}
          </Text>
        </View>
      </View>

      {expense.description && (
        <Text style={[styles.expenseDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {expense.description}
        </Text>
      )}

      <View style={styles.expenseActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.warning + "15" }]}
          onPress={() => {
            setEditingExpense(expense);
            setShowEditModal(true);
          }}
        >
          <Edit3 color={theme.colors.warning} size={16} />
          <Text style={[styles.editButtonText, { color: theme.colors.warning }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.error + "15" }]}
          onPress={() => confirmDelete(expense)}
        >
          <Trash2 color={theme.colors.error} size={16} />
          <Text style={[styles.deleteButtonText, { color: theme.colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const FilterModal = () =>
    showFilters && (
      <View style={styles.filterOverlay}>
        <View style={[styles.filterModal, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.filterHeader}>
            <Text style={[styles.filterTitle, { color: theme.colors.text }]}>Filter & Sort</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={[styles.closeButton, { color: theme.colors.textTertiary }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: theme.colors.text }]}>Categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryFilters}>
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
          </View>
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: theme.colors.text }]}>Sort By</Text>
            <View style={styles.sortOptions}>
              {[
                { key: "date", label: "Date" },
                { key: "amount", label: "Amount" },
                { key: "title", label: "Title" },
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.sortOption,
                    {
                      backgroundColor:
                        sortBy === option.key
                          ? theme.colors.primary
                          : theme.colors.buttonSecondary,
                    },
                  ]}
                  onPress={() => setSortBy(option.key)}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      {
                        color:
                          sortBy === option.key
                            ? "#fff"
                            : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: theme.colors.text }]}>Sort Order</Text>
            <View style={styles.sortOptions}>
              <TouchableOpacity
                style={[
                  styles.sortOption,
                  {
                    backgroundColor:
                      sortOrder === "desc"
                        ? theme.colors.primary
                        : theme.colors.buttonSecondary,
                  },
                ]}
                onPress={() => setSortOrder("desc")}
              >
                <TrendingDown
                  color={sortOrder === "desc" ? "#fff" : theme.colors.primary}
                  size={16}
                />
                <Text
                  style={[
                    styles.sortOptionText,
                    {
                      color:
                        sortOrder === "desc"
                          ? "#fff"
                          : theme.colors.textSecondary,
                    },
                  ]}
                >
                  Descending
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sortOption,
                  {
                    backgroundColor:
                      sortOrder === "asc"
                        ? theme.colors.primary
                        : theme.colors.buttonSecondary,
                  },
                ]}
                onPress={() => setSortOrder("asc")}
              >
                <TrendingUp
                  color={sortOrder === "asc" ? "#fff" : theme.colors.primary}
                  size={16}
                />
                <Text
                  style={[
                    styles.sortOptionText,
                    {
                      color:
                        sortOrder === "asc"
                          ? "#fff"
                          : theme.colors.textSecondary,
                    },
                  ]}
                >
                  Ascending
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.applyFiltersButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowFilters(false)}
          >
            <Text style={styles.applyFiltersText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.colors.buttonSecondary }]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>All Expenses</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.buttonSecondary }]}
          onPress={() => navigation.navigate("AddExpense")}
        >
          <Plus color={theme.colors.primary} size={24} />
        </TouchableOpacity>
      </View>
      <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}>Total Expenses</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{filteredExpenses.length}</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.colors.borderLight }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}>Total Amount</Text>
            <Text style={[styles.summaryAmount, { color: theme.colors.primary }]}>
              ₹{totalAmount.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
          <Search color={theme.colors.textTertiary} size={18} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search expenses..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}
          onPress={() => setShowFilters(true)}
        >
          <Filter color={theme.colors.primary} size={20} />
        </TouchableOpacity>
      </View>
      {(selectedCategory !== "All" || searchQuery) && (
        <View style={styles.activeFilters}>
          <Text style={[styles.activeFiltersLabel, { color: theme.colors.textSecondary }]}>Active filters:</Text>
          {selectedCategory !== "All" && (
            <View style={[styles.activeFilterTag, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.activeFilterText}>{selectedCategory}</Text>
              <TouchableOpacity onPress={() => setSelectedCategory("All")}>
                <Text style={styles.removeFilterText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          {searchQuery && (
            <View style={[styles.activeFilterTag, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.activeFilterText}>"{searchQuery}"</Text>
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Text style={styles.removeFilterText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      <FlatList
        data={filteredExpenses}
        renderItem={({ item, index }) => (
          <ExpenseCard expense={item} index={index} />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <DollarSign color={theme.colors.textTertiary} size={64} />
            <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>{loading ? "Loading..." : "No expenses found"}</Text>
            <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
              {searchQuery || selectedCategory !== "All"
                ? "Try adjusting your search or filters"
                : "Start tracking your expenses by adding your first expense"}
            </Text>
            <TouchableOpacity
              style={[styles.addExpenseButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation.navigate("AddExpense")}
            >
              <Plus color="#fff" size={20} />
              <Text style={styles.addExpenseButtonText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        }
      />
      <FilterModal />
      <Alert {...alertProps} />
      <Modal visible={showEditModal} animationType="slide" transparent={false}>
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <ArrowLeft color={theme.colors.text} size={24} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Expense</Text>
            <View style={styles.placeholder} />
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: theme.colors.text }]}>Title</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight, color: theme.colors.text }]}
                value={editingExpense?.title}
                onChangeText={(text) =>
                  setEditingExpense({ ...editingExpense, title: text })
                }
                placeholder="Expense Title"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: theme.colors.text }]}>Amount</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight, color: theme.colors.text }]}
                value={String(editingExpense?.amount)}
                onChangeText={(text) =>
                  setEditingExpense({ ...editingExpense, amount: text })
                }
                placeholder="Amount"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: theme.colors.text }]}>Date</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight, color: theme.colors.text }]}
                value={editingExpense?.date}
                onChangeText={(text) =>
                  setEditingExpense({ ...editingExpense, date: text })
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: theme.colors.text }]}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryEditScroll}
              >
                {CATEGORIES.map((cat) => {
                  const isActive = editingExpense?.category === cat.name;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryEditChip,
                        isActive && [
                          styles.categoryEditChipActive,
                          { backgroundColor: cat.color, borderColor: cat.color },
                        ],
                      ]}
                      onPress={() =>
                        setEditingExpense({ ...editingExpense, category: cat.name })
                      }
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.categoryEditChipEmoji,
                          isActive && styles.categoryEditChipEmojiActive,
                        ]}
                      >
                        {cat.emoji}
                      </Text>
                      <Text
                        style={[
                          styles.categoryEditChipText,
                          isActive && styles.categoryEditChipTextActive,
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: theme.colors.text }]}>Description</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight, color: theme.colors.text }]}
                value={editingExpense?.description || ""}
                onChangeText={(text) =>
                  setEditingExpense({ ...editingExpense, description: text })
                }
                placeholder="Description (optional)"
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>
          <View style={[styles.modalButtonContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton, { backgroundColor: theme.colors.buttonSecondary, borderColor: theme.colors.border }]}
              onPress={() => setShowEditModal(false)}
            >
              <Text style={[styles.modalCancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
              onPress={async () => {
                const { error } = await supabase
                  .from("expenses")
                  .update({
                    title: editingExpense.title,
                    amount: editingExpense.amount,
                    category: editingExpense.category,
                    date: editingExpense.date,
                    description: editingExpense.description,
                  })
                  .eq("id", editingExpense.id);
                if (!error) {
                  setShowEditModal(false);
                  fetchExpenses();
                  showSuccessAlert("Expense updated successfully!");
                } else {
                  showErrorAlert("Failed to update expense. Please try again.");
                }
              }}
            >
              <Text style={styles.modalButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 18,
    borderBottomWidth: 1,
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  addButton: {
    padding: 8,
    borderRadius: 12,
  },
  summaryCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 20,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: "700",
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 1,
    borderWidth: 1,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  filterButton: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    elevation: 1,
  },
  activeFilters: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexWrap: "wrap",
  },
  activeFiltersLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  activeFilterTag: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
  },
  activeFilterText: {
    fontSize: 12,
    fontWeight: "600",
    marginRight: 4,
  },
  removeFilterText: {
    fontSize: 12,
    fontWeight: "700",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  expenseCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    elevation: 2,
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
  categoryEmoji: {
    fontSize: 20,
  },
  expenseInfo: {
    flex: 1,
    marginRight: 12,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  expenseCategory: {
    fontSize: 14,
    marginBottom: 4,
  },
  expenseDate: {
    flexDirection: "row",
    alignItems: "center",
  },
  expenseDateText: {
    fontSize: 12,
    marginLeft: 4,
  },
  expenseAmount: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 18,
    fontWeight: "700",
  },
  expenseDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
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
  viewButtonText: {
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },
  editButtonText: {
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },
  deleteButtonText: {
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },
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
  addExpenseButtonText: {
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 8,
  },
  filterOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  filterModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    fontSize: 24,
    fontWeight: "300",
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  categoryFilters: {
    flexDirection: "row",
    paddingVertical: 4,
  },
  categoryFilter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  
  categoryFilterText: {
    fontSize: 14,
    fontWeight: "600",
    
  },
  
  sortOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  sortOptionText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  applyFiltersButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  applyFiltersText: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  modalInput: {
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,

    fontWeight: "500",
  },
  modalTextArea: {
    height: 100,
    textAlignVertical: "top",
  },
  categoryEditScroll: {
    flexDirection: "row",
    paddingVertical: 8,
    gap: 12,
  },
  categoryEditChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  categoryEditChipActive: {
    borderWidth: 2,
  },
  categoryEditChipEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  categoryEditChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  categoryEditChipTextActive: {
    fontWeight: "700",
  },
  modalButtonContainer: {
    flexDirection: "row",
    padding: 20,
    gap: 16,
    borderTopWidth: 1,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalButtonText: {
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  modalCancelButton: {
    shadowColor: "transparent",
    elevation: 0,
    borderWidth: 1,
  }
});
