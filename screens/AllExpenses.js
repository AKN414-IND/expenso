import React, { useEffect, useState, useMemo } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import { Search, Filter, Plus, Edit3, Trash2, TrendingUp, DollarSign, Calendar } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const screenWidth = Dimensions.get("window").width;

// Theme colors following the app's design system
const THEME_COLORS = {
  primary: '#06b6d4',      // Main buttons, active tabs, graph bars, icons
  secondary: '#334155',    // Text, headers, borders, and inactive elements
  background: '#f5f7fa',   // Screen backgrounds, cards
  accent: '#facc15',       // Reminders, badges, pie chart highlights, alerts
  white: '#ffffff',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray300: '#cbd5e1',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray600: '#475569',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
};

export default function AllExpensesScreen({ navigation }) {
  const { session } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    amount: "",
    category: "",
    date: "",
  });

  // Filter and sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("date"); // date, amount, title, category
  const [sortOrder, setSortOrder] = useState("desc"); // asc, desc
  const [dateRange, setDateRange] = useState("all"); // all, today, week, month, year
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  useEffect(() => {
    fetchExpenses();
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
  };

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = ["All", ...new Set(expenses.map(expense => expense.category).filter(Boolean))];
    return cats;
  }, [expenses]);

  // Filter and sort expenses
  const filteredAndSortedExpenses = useMemo(() => {
    let filtered = [...expenses];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(expense =>
        expense.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== "All") {
      filtered = filtered.filter(expense => expense.category === selectedCategory);
    }

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.date);
        switch (dateRange) {
          case "today":
            return expenseDate >= today;
          case "week":
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return expenseDate >= weekAgo;
          case "month":
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return expenseDate >= monthAgo;
          case "year":
            const yearAgo = new Date(today);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            return expenseDate >= yearAgo;
          default:
            return true;
        }
      });
    }

    // Amount range filter
    if (minAmount) {
      filtered = filtered.filter(expense => parseFloat(expense.amount) >= parseFloat(minAmount));
    }
    if (maxAmount) {
      filtered = filtered.filter(expense => parseFloat(expense.amount) <= parseFloat(maxAmount));
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "amount":
          aValue = parseFloat(a.amount) || 0;
          bValue = parseFloat(b.amount) || 0;
          break;
        case "title":
          aValue = a.title?.toLowerCase() || "";
          bValue = b.title?.toLowerCase() || "";
          break;
        case "category":
          aValue = a.category?.toLowerCase() || "";
          bValue = b.category?.toLowerCase() || "";
          break;
        case "date":
        default:
          aValue = new Date(a.date || 0);
          bValue = new Date(b.date || 0);
          break;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [expenses, searchQuery, selectedCategory, sortBy, sortOrder, dateRange, minAmount, maxAmount]);

  // Calculate statistics for filtered data
  const statistics = useMemo(() => {
    const total = filteredAndSortedExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
    const count = filteredAndSortedExpenses.length;
    const average = count > 0 ? total / count : 0;
    
    return { total, count, average };
  }, [filteredAndSortedExpenses]);

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

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setSortBy("date");
    setSortOrder("desc");
    setDateRange("all");
    setMinAmount("");
    setMaxAmount("");
    setFilterModalVisible(false);
  };

  const renderExpenseItem = ({ item, index }) => (
    <View style={styles.expenseCard}>
      <View style={styles.expenseHeader}>
        <View style={styles.expenseCategory}>
          <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(item.category) }]} />
          <Text style={styles.categoryText}>{item.category || "Uncategorized"}</Text>
        </View>
        <Text style={styles.expenseDate}>{formatDate(item.date)}</Text>
      </View>
      
      <View style={styles.expenseBody}>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseTitle}>{item.title || "Untitled"}</Text>
          <Text style={styles.expenseAmount}>₹{parseFloat(item.amount || 0).toFixed(2)}</Text>
        </View>
        
        <View style={styles.expenseActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEdit(item)}
          >
            <Edit3 size={16} color={THEME_COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item)}
          >
            <Trash2 size={16} color={THEME_COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const getCategoryColor = (category) => {
    const colors = {
      "Food & Dining": "#FF6B6B",
      "Transportation": THEME_COLORS.primary,
      "Shopping": "#45B7D1",
      "Entertainment": "#96CEB4",
      "Bills & Utilities": THEME_COLORS.accent,
      "Healthcare": "#FF9FF3",
      "Education": "#54A0FF",
      "Travel": "#5F27CD",
      "Groceries": "#00D2D3",
      "Other": THEME_COLORS.gray400,
    };
    return colors[category] || THEME_COLORS.gray400;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderSortButton = (label, value) => (
    <TouchableOpacity
      style={[
        styles.sortButton,
        sortBy === value && styles.activeSortButton
      ]}
      onPress={() => {
        if (sortBy === value) {
          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
          setSortBy(value);
          setSortOrder("desc");
        }
      }}
    >
      <Text style={[
        styles.sortButtonText,
        sortBy === value && styles.activeSortButtonText
      ]}>
        {label}
      </Text>
      {sortBy === value && (
        <Text style={styles.sortDirection}>
          {sortOrder === "asc" ? "↑" : "↓"}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderDateRangeButton = (label, value) => (
    <TouchableOpacity
      style={[
        styles.dateRangeButton,
        dateRange === value && styles.activeDateRangeButton
      ]}
      onPress={() => setDateRange(value)}
    >
      <Text style={[
        styles.dateRangeButtonText,
        dateRange === value && styles.activeDateRangeButtonText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.emptyStateIcon}>
          <ActivityIndicator size="large" color={THEME_COLORS.primary} />
        </View>
        <Text style={styles.loadingText}>Loading all expenses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Professional Header with Gradient */}
      <LinearGradient
        colors={[THEME_COLORS.primary, '#0891b2']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>All Expenses</Text>
            <Text style={styles.headerSubtitle}>Track and manage your spending</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <Filter size={20} color={THEME_COLORS.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Enhanced Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconContainer}>
            <DollarSign size={24} color={THEME_COLORS.primary} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryValue}>₹{statistics.total.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>Total Spent</Text>
          </View>
        </View>
        
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconContainer}>
            <TrendingUp size={24} color={THEME_COLORS.success} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryValue}>{statistics.count}</Text>
            <Text style={styles.summaryLabel}>Transactions</Text>
          </View>
        </View>
        
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconContainer}>
            <Calendar size={24} color={THEME_COLORS.accent} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryValue}>₹{statistics.average.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>Average</Text>
          </View>
        </View>
      </View>

      {/* Enhanced Search & Filter Section */}
      <View style={styles.searchFilterSection}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color={THEME_COLORS.gray400} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search expenses..."
            placeholderTextColor={THEME_COLORS.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity 
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery("")}
            >
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Chips */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filterChipsContainer}
          contentContainerStyle={styles.filterChipsContent}
        >
          {/* Quick Filter Chips */}
          <TouchableOpacity 
            style={[styles.filterChip, selectedCategory !== "All" && styles.activeFilterChip]}
            onPress={() => setSelectedCategory("All")}
          >
            <Text style={[styles.filterChipText, selectedCategory !== "All" && styles.activeFilterChipText]}>
              All
            </Text>
          </TouchableOpacity>
          
          {dateRange !== "all" && (
            <TouchableOpacity 
              style={[styles.filterChip, styles.activeFilterChip]}
              onPress={() => setDateRange("all")}
            >
              <Text style={[styles.filterChipText, styles.activeFilterChipText]}>
                {dateRange.charAt(0).toUpperCase() + dateRange.slice(1)} ✕
              </Text>
            </TouchableOpacity>
          )}
          
          {selectedCategory !== "All" && (
            <TouchableOpacity 
              style={[styles.filterChip, styles.activeFilterChip]}
              onPress={() => setSelectedCategory("All")}
            >
              <Text style={[styles.filterChipText, styles.activeFilterChipText]}>
                {selectedCategory} ✕
              </Text>
            </TouchableOpacity>
          )}
          
          {(minAmount || maxAmount) && (
            <TouchableOpacity 
              style={[styles.filterChip, styles.activeFilterChip]}
              onPress={() => {
                setMinAmount("");
                setMaxAmount("");
              }}
            >
              <Text style={[styles.filterChipText, styles.activeFilterChipText]}>
                Amount Range ✕
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Enhanced Sort Buttons */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <View style={styles.sortButtons}>
          {renderSortButton("Date", "date")}
          {renderSortButton("Amount", "amount")}
          {renderSortButton("Title", "title")}
          {renderSortButton("Category", "category")}
        </View>
      </View>
      
        
      

      {/* Expenses List */}
      <FlatList
        data={filteredAndSortedExpenses}
        renderItem={renderExpenseItem}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        style={styles.expensesList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <DollarSign size={48} color={THEME_COLORS.gray300} />
            </View>
            <Text style={styles.emptyStateText}>No expenses found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery || selectedCategory !== "All" ? 
                "Try adjusting your filters to see more results" : 
                "Start tracking your expenses by adding your first transaction!"
              }
            </Text>
            <TouchableOpacity 
              style={styles.addExpenseButton}
              onPress={() => navigation.navigate("AddExpense")}
            >
              <Plus size={20} color={THEME_COLORS.white} />
              <Text style={styles.addExpenseButtonText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Filter & Sort</Text>
              
              {/* Category Filter */}
              <Text style={styles.filterSectionTitle}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      selectedCategory === category && styles.activeCategoryButton
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      selectedCategory === category && styles.activeCategoryButtonText
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Date Range Filter */}
              <Text style={styles.filterSectionTitle}>Date Range</Text>
              <View style={styles.dateRangeContainer}>
                {renderDateRangeButton("All", "all")}
                {renderDateRangeButton("Today", "today")}
                {renderDateRangeButton("Week", "week")}
                {renderDateRangeButton("Month", "month")}
                {renderDateRangeButton("Year", "year")}
              </View>

              {/* Amount Range Filter */}
              <Text style={styles.filterSectionTitle}>Amount Range</Text>
              <View style={styles.amountRangeContainer}>
                <TextInput
                  style={styles.amountInput}
                  placeholder="Min Amount"
                  value={minAmount}
                  onChangeText={setMinAmount}
                  keyboardType="numeric"
                />
                <Text style={styles.amountSeparator}>to</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="Max Amount"
                  value={maxAmount}
                  onChangeText={setMaxAmount}
                  keyboardType="numeric"
                />
              </View>

              {/* Modal Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.clearButton]}
                  onPress={clearFilters}
                >
                  <Text style={styles.clearButtonText}>Clear All</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.applyButton]}
                  onPress={() => setFilterModalVisible(false)}
                >
                  <Text style={styles.applyButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME_COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME_COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: THEME_COLORS.secondary,
    fontWeight: "500",
  },
  
  // Header Styles
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 20,
    color: THEME_COLORS.white,
    fontWeight: "600",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: THEME_COLORS.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: "400",
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Summary Cards Styles
  summaryContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: THEME_COLORS.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: THEME_COLORS.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME_COLORS.gray100,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  summaryContent: {
    flex: 1,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME_COLORS.secondary,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: THEME_COLORS.gray500,
    fontWeight: "500",
  },
  
  // Search & Filter Styles
  searchFilterSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME_COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    shadowColor: THEME_COLORS.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: THEME_COLORS.gray200,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: THEME_COLORS.secondary,
  },
  clearSearchButton: {
    padding: 8,
  },
  clearSearchText: {
    color: THEME_COLORS.gray400,
    fontSize: 16,
    fontWeight: "600",
  },
  
  filterChipsContainer: {
    maxHeight: 50,
  },
  filterChipsContent: {
    paddingRight: 20,
  },
  filterChip: {
    backgroundColor: THEME_COLORS.gray100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: THEME_COLORS.gray200,
  },
  activeFilterChip: {
    backgroundColor: THEME_COLORS.primary,
    borderColor: THEME_COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: THEME_COLORS.secondary,
    fontWeight: "500",
  },
  activeFilterChipText: {
    color: THEME_COLORS.white,
  },
  
  // Sort Styles
  sortContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sortLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME_COLORS.secondary,
    marginBottom: 12,
  },
  sortButtons: {
    flexDirection: "row",
    gap: 8,
  },
  sortButton: {
    flex: 1,
    backgroundColor: THEME_COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME_COLORS.gray200,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: THEME_COLORS.secondary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeSortButton: {
    backgroundColor: THEME_COLORS.primary,
    borderColor: THEME_COLORS.primary,
  },
  sortButtonText: {
    fontSize: 14,
    color: THEME_COLORS.secondary,
    fontWeight: "600",
    marginRight: 4,
  },
  activeSortButtonText: {
    color: THEME_COLORS.white,
  },
  sortDirection: {
    fontSize: 14,
    color: THEME_COLORS.white,
    fontWeight: "600",
  },
  
  // Expense List Styles
  expensesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  expenseCard: {
    backgroundColor: THEME_COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: THEME_COLORS.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: THEME_COLORS.gray100,
  },
  expenseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  expenseCategory: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 12,
    color: THEME_COLORS.gray500,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  expenseDate: {
    fontSize: 12,
    color: THEME_COLORS.gray400,
    fontWeight: "500",
  },
  expenseBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expenseInfo: {
    flex: 1,
    marginRight: 16,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME_COLORS.secondary,
    marginBottom: 4,
  },
  expenseAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: THEME_COLORS.primary,
  },
  expenseActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME_COLORS.gray100,
  },
  editButton: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  
  // Empty State Styles
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME_COLORS.gray100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: "600",
    color: THEME_COLORS.secondary,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: THEME_COLORS.gray500,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  addExpenseButton: {
    backgroundColor: THEME_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: THEME_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addExpenseButtonText: {
    color: THEME_COLORS.white,
    fontWeight: "600",
    fontSize: 16,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  filterModalContent: {
    backgroundColor: THEME_COLORS.white,
    borderRadius: 24,
    padding: 24,
    width: screenWidth - 40,
    maxHeight: "85%",
    shadowColor: THEME_COLORS.secondary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalContent: {
    backgroundColor: THEME_COLORS.white,
    borderRadius: 24,
    padding: 24,
    width: screenWidth - 40,
    maxHeight: "80%",
    shadowColor: THEME_COLORS.secondary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: THEME_COLORS.secondary,
    textAlign: "center",
    marginBottom: 24,
  },
  
  // Filter Modal Styles
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: THEME_COLORS.secondary,
    marginTop: 20,
    marginBottom: 16,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryButton: {
    backgroundColor: THEME_COLORS.gray100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: THEME_COLORS.gray200,
  },
  activeCategoryButton: {
    backgroundColor: THEME_COLORS.primary,
    borderColor: THEME_COLORS.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    color: THEME_COLORS.secondary,
    fontWeight: "600",
  },
  activeCategoryButtonText: {
    color: THEME_COLORS.white,
  },
  dateRangeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    gap: 8,
  },
  dateRangeButton: {
    backgroundColor: THEME_COLORS.gray100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME_COLORS.gray200,
  },
  activeDateRangeButton: {
    backgroundColor: THEME_COLORS.primary,
    borderColor: THEME_COLORS.primary,
  },
  dateRangeButtonText: {
    fontSize: 14,
    color: THEME_COLORS.secondary,
    fontWeight: "600",
  },
  activeDateRangeButtonText: {
    color: THEME_COLORS.white,
  },
  amountRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  amountInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: THEME_COLORS.gray200,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: THEME_COLORS.gray100,
    color: THEME_COLORS.secondary,
  },
  amountSeparator: {
    fontSize: 16,
    color: THEME_COLORS.gray500,
    fontWeight: "600",
  },
  
  // Form Input Styles
  input: {
    borderWidth: 2,
    borderColor: THEME_COLORS.gray200,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: THEME_COLORS.gray100,
    color: THEME_COLORS.secondary,
  },
  
  // Modal Button Styles
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
    justifyContent: "center",
  },
  clearButton: {
    backgroundColor: THEME_COLORS.gray100,
    borderWidth: 2,
    borderColor: THEME_COLORS.gray200,
  },
  applyButton: {
    backgroundColor: THEME_COLORS.primary,
  },
  cancelButton: {
    backgroundColor: THEME_COLORS.gray100,
    borderWidth: 2,
    borderColor: THEME_COLORS.gray200,
  },
  saveButton: {
    backgroundColor: THEME_COLORS.primary,
  },
  clearButtonText: {
    color: THEME_COLORS.secondary,
    fontWeight: "600",
    fontSize: 16,
  },
  applyButtonText: {
    color: THEME_COLORS.white,
    fontWeight: "600",
    fontSize: 16,
  },
  cancelButtonText: {
    color: THEME_COLORS.secondary,
    fontWeight: "600",
    fontSize: 16,
  },
  saveButtonText: {
    color: THEME_COLORS.white,
    fontWeight: "600",
    fontSize: 16,
  },
});