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
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const screenWidth = Dimensions.get("window").width;

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
    <View style={[styles.expenseItem, index % 2 === 0 ? styles.evenItem : styles.oddItem]}>
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseTitle}>{item.title || "Untitled"}</Text>
        <View style={styles.expenseDetails}>
          <Text style={styles.expenseCategory}>📁 {item.category || "Uncategorized"}</Text>
          <Text style={styles.expenseDate}>📅 {item.date || "No date"}</Text>
        </View>
      </View>
      <View style={styles.expenseActions}>
        <Text style={styles.expenseAmount}>₹{parseFloat(item.amount || 0).toFixed(2)}</Text>
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
        {label} {sortBy === value ? (sortOrder === "asc" ? "↑" : "↓") : ""}
      </Text>
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
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading all expenses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Expenses</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Text style={styles.filterButtonText}>🔍 Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Statistics Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{statistics.count}</Text>
          <Text style={styles.statLabel}>Expenses</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>₹{statistics.total.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>₹{statistics.average.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Average</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search expenses..."
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

      {/* Quick Sort Buttons */}

      <View style={styles.sortContainer}>
      {renderSortButton("Date", "date")}
        {renderSortButton("Amount", "amount")}
        {renderSortButton("Title", "title")}
        {renderSortButton("Category", "category")}
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
            <Text style={styles.emptyStateText}>No expenses found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery || selectedCategory !== "All" ? 
                "Try adjusting your filters" : 
                "Add your first expense to get started!"
              }
            </Text>
            <TouchableOpacity 
              style={styles.addExpenseButton}
              onPress={() => navigation.navigate("AddExpense")}
            >
              <Text style={styles.addExpenseButtonText}>➕ Add Expense</Text>
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
    paddingBottom: 15,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#4ECDC4",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  filterButton: {
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  filterButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  statsBar: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 10,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  clearSearchButton: {
    padding: 5,
  },
  clearSearchText: {
    color: "#999",
    fontSize: 16,
  },
  sortContainer: {
    flexDirection:'row',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sortButton: {
    backgroundColor: "white",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 5,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    height:40,
    width:'25%',
    justifyContent:'center',
    alignContent:'center',
  },
  activeSortButton: {
    backgroundColor: "#4ECDC4",
    borderColor: "#4ECDC4",
  },
  sortButtonText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  activeSortButtonText: {
    color: "white",
  },
  expensesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  expenseItem: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  evenItem: {
    backgroundColor: "#ffffff",
  },
  oddItem: {
    backgroundColor: "#fafafa",
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  expenseDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expenseCategory: {
    fontSize: 12,
    color: "#4ECDC4",
    flex: 1,
  },
  expenseDate: {
    fontSize: 11,
    color: "#999",
  },
  expenseActions: {
    alignItems: "flex-end",
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  actionButtons: {
    flexDirection: "row",
  },
  actionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 5,
  },
  editButton: {
    backgroundColor: "#FFEAA7",
  },
  deleteButton: {
    backgroundColor: "#FFB3B3",
  },
  actionButtonText: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  addExpenseButton: {
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addExpenseButtonText: {
    color: "white",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  filterModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: screenWidth - 40,
    maxHeight: "80%",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: screenWidth - 40,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 15,
    marginBottom: 10,
  },
  categoryContainer: {
    marginBottom: 10,
  },
  categoryButton: {
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  activeCategoryButton: {
    backgroundColor: "#4ECDC4",
    borderColor: "#4ECDC4",
  },
  categoryButtonText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  activeCategoryButtonText: {
    color: "white",
  },
  dateRangeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  dateRangeButton: {
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  activeDateRangeButton: {
    backgroundColor: "#45B7D1",
    borderColor: "#45B7D1",
  },
  dateRangeButtonText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  activeDateRangeButtonText: {
    color: "white",
  },
  amountRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#f8f9fa",
  },
  amountSeparator: {
    marginHorizontal: 10,
    color: "#666",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: "#f8f9fa",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },
  clearButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  applyButton: {
    backgroundColor: "#4ECDC4",
  },
  cancelButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  saveButton: {
    backgroundColor: "#4ECDC4",
  },
  clearButtonText: {
    color: "#666",
    fontWeight: "600",
  },
  applyButtonText: {
    color: "white",
    fontWeight: "600",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
  },
});