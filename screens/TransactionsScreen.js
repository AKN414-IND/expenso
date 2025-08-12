import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
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
  Plus,
  Eye,
  Edit3,
  Trash2,
  Clock,
  X,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../lib/supabase";
import Alert from "../components/Alert";
import DateTimePicker from "@react-native-community/datetimepicker";

const { width } = Dimensions.get("window");

const CATEGORY_DETAILS = {
  "Food & Dining": { emoji: "🍽️", color: "#FF6B6B" },
  Transportation: { emoji: "🚗", color: "#45B7D1" },
  Shopping: { emoji: "🛍️", color: "#4ECDC4" },
  Entertainment: { emoji: "🎬", color: "#96CEB4" },
  "Bills & Utilities": { emoji: "💡", color: "#FECA57" },
  Healthcare: { emoji: "🏥", color: "#FF9FF3" },
  Travel: { emoji: "✈️", color: "#5F27CD" },
  Education: { emoji: "📚", color: "#54A0FF" },
  Groceries: { emoji: "🛒", color: "#00D2D3" },
  Salary: { emoji: "💼", color: "#4ECDC4" },
  Freelance: { emoji: "💻", color: "#54A0FF" },
  Investment: { emoji: "📈", color: "#96CEB4" },
  Gift: { emoji: "🎁", color: "#FF9FF3" },
  Other: { emoji: "📝", color: "#A8A8A8" },
};

const EXPENSE_CATEGORIES = [
  "All",
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Bills & Utilities",
  "Healthcare",
  "Travel",
  "Education",
  "Groceries",
  "Other",
];
const INCOME_SOURCES = [
  "All",
  "Salary",
  "Freelance",
  "Investment",
  "Gift",
  "Other",
];

const formatDate = (date, long = false) => {
  if (!date) return long ? "Select Date" : "N/A";
  const options = long
    ? { year: "numeric", month: "long", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" };
  return new Date(date).toLocaleDateString("en-IN", options);
};

const ExpenseFilterModal = ({
  visible,
  onClose,
  onApply,
  initialFilters,
  categories,
  theme,
}) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [filters, setFilters] = useState(initialFilters);
  const [showPicker, setShowPicker] = useState(null);

  useEffect(() => setFilters(initialFilters), [initialFilters]);

  const handleDateChange = (event, selectedDate) => {
    const currentPicker = showPicker;
    setShowPicker(null);
    if (event.type === "set" && selectedDate) {
      setFilters((prev) => ({
        ...prev,
        dateRange: { ...prev.dateRange, [currentPicker]: selectedDate },
      }));
    }
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      searchQuery: filters.searchQuery,
      category: "All",
      sortBy: "date",
      sortOrder: "desc",
      dateRange: { startDate: null, endDate: null },
    };
    setFilters(resetFilters);
    onApply(resetFilters);
    onClose();
  };

  const renderOption = (value, field, label) => (
    <TouchableOpacity
      style={[
        styles.modalOption,
        { borderColor: theme.colors.border },
        filters[field] === value && {
          backgroundColor: theme.colors.primary,
          borderColor: theme.colors.primary,
        },
      ]}
      onPress={() => setFilters((prev) => ({ ...prev, [field]: value }))}
    >
      <Text
        style={[
          styles.modalOptionText,
          {
            color:
              filters[field] === value ? "#fff" : theme.colors.textSecondary,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Filter & Sort
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <X color={theme.colors.textSecondary} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScrollView}>
            <Text
              style={[styles.modalSectionTitle, { color: theme.colors.text }]}
            >
              Date Range
            </Text>
            <View style={styles.dateRangeContainer}>
              <TouchableOpacity
                style={[styles.dateInput, { borderColor: theme.colors.border }]}
                onPress={() => setShowPicker("startDate")}
              >
                <Calendar color={theme.colors.textSecondary} size={18} />
                <Text style={{ color: theme.colors.textSecondary }}>
                  {formatDate(filters.dateRange.startDate, true)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateInput, { borderColor: theme.colors.border }]}
                onPress={() => setShowPicker("endDate")}
              >
                <Calendar color={theme.colors.textSecondary} size={18} />
                <Text style={{ color: theme.colors.textSecondary }}>
                  {formatDate(filters.dateRange.endDate, true)}
                </Text>
              </TouchableOpacity>
            </View>

            <Text
              style={[styles.modalSectionTitle, { color: theme.colors.text }]}
            >
              Category
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryChipsRow}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          cat === filters.category
                            ? theme.colors.primary
                            : theme.colors.buttonSecondary,
                        borderColor: theme.colors.borderLight,
                      },
                    ]}
                    onPress={() =>
                      setFilters((prev) => ({ ...prev, category: cat }))
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color:
                            cat === filters.category
                              ? "#fff"
                              : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text
              style={[styles.modalSectionTitle, { color: theme.colors.text }]}
            >
              Sort By
            </Text>
            <View style={styles.optionsContainer}>
              {renderOption("date", "sortBy", "Date")}
              {renderOption("amount", "sortBy", "Amount")}
              {renderOption("title", "sortBy", "Title")}
            </View>

            <Text
              style={[styles.modalSectionTitle, { color: theme.colors.text }]}
            >
              Sort Order
            </Text>
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  filters.sortOrder === "desc" && {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                ]}
                onPress={() =>
                  setFilters((prev) => ({ ...prev, sortOrder: "desc" }))
                }
              >
                <ChevronDown
                  color={
                    filters.sortOrder === "desc" ? "#fff" : theme.colors.text
                  }
                  size={16}
                />
                <Text
                  style={[
                    styles.modalOptionText,
                    {
                      color:
                        filters.sortOrder === "desc"
                          ? "#fff"
                          : theme.colors.text,
                    },
                  ]}
                >
                  Descending
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  filters.sortOrder === "asc" && {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                ]}
                onPress={() =>
                  setFilters((prev) => ({ ...prev, sortOrder: "asc" }))
                }
              >
                <ChevronUp
                  color={
                    filters.sortOrder === "asc" ? "#fff" : theme.colors.text
                  }
                  size={16}
                />
                <Text
                  style={[
                    styles.modalOptionText,
                    {
                      color:
                        filters.sortOrder === "asc"
                          ? "#fff"
                          : theme.colors.text,
                    },
                  ]}
                >
                  Ascending
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View
            style={[
              styles.modalFooter,
              { borderTopColor: theme.colors.border },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.resetButton,
                {
                  backgroundColor: theme.colors.buttonSecondary,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={handleReset}
            >
              <Text
                style={[
                  styles.modalButtonText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Reset
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.applyButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleApply}
            >
              <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                Apply Filters
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {showPicker && (
        <DateTimePicker
          value={filters.dateRange[showPicker] || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </Modal>
  );
};

const TransactionCard = memo(({ item, config, onEdit, onDelete, theme }) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const details =
    CATEGORY_DETAILS[item[config.categoryKey]] || CATEGORY_DETAILS["Other"];
  const title = item[config.titleKey];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderLight,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.cardIconContainer,
            { backgroundColor: details.color + "20" },
          ]}
        >
          <Text style={styles.cardIconEmoji}>{details.emoji}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text
            style={[styles.cardTitle, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[styles.cardCategory, { color: theme.colors.textSecondary }]}
          >
            {item[config.categoryKey]}
          </Text>
          <View style={styles.cardDate}>
            <Clock color={theme.colors.textTertiary} size={12} />
            <Text
              style={[
                styles.cardDateText,
                { color: theme.colors.textTertiary },
              ]}
            >
              {formatDate(item.date)}
            </Text>
          </View>
        </View>
        <Text style={[styles.amountText, { color: config.color }]}>
          {config.sign}₹{parseFloat(item.amount).toLocaleString("en-IN")}
        </Text>
      </View>
      {item.description ? (
        <Text
          style={[
            styles.cardDescription,
            { color: theme.colors.textSecondary },
          ]}
        >
          {item.description}
        </Text>
      ) : null}
      <View
        style={[
          styles.cardActions,
          { borderTopColor: theme.colors.borderLight },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: theme.colors.warning + "15" },
          ]}
          onPress={() => onEdit(item)}
        >
          <Edit3 color={theme.colors.warning} size={16} />
          <Text style={[styles.buttonText, { color: theme.colors.warning }]}>
            Edit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: theme.colors.error + "15" },
          ]}
          onPress={() => onDelete(item)}
        >
          <Trash2 color={theme.colors.error} size={16} />
          <Text style={[styles.buttonText, { color: theme.colors.error }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const TransactionCardSkeleton = ({ theme }) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderLight,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.cardIconContainer,
            { backgroundColor: theme.colors.borderLight },
          ]}
        />
        <View style={styles.cardInfo}>
          <View
            style={{
              height: 20,
              width: "70%",
              backgroundColor: theme.colors.borderLight,
              borderRadius: 4,
              marginBottom: 8,
            }}
          />
          <View
            style={{
              height: 16,
              width: "40%",
              backgroundColor: theme.colors.borderLight,
              borderRadius: 4,
            }}
          />
        </View>
      </View>
    </View>
  );
};

const ListEmptyState = ({ theme, activeTab, isFiltered }) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.emptyState}>
      <Eye color={theme.colors.textTertiary} size={64} />
      <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
        No Transactions Found
      </Text>
      <Text
        style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}
      >
        {isFiltered
          ? "Try adjusting your search or filter criteria."
          : `Add a new ${activeTab} to see it here.`}
      </Text>
    </View>
  );
};

export default function TransactionsScreen({ navigation }) {
  const { session } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("expenses");
  const [data, setData] = useState({ expenses: [], income: [] });

  const [filters, setFilters] = useState({
    searchQuery: "",
    category: "All",
    sortBy: "date",
    sortOrder: "desc",
    dateRange: { startDate: null, endDate: null },
  });

  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [alertProps, setAlertProps] = useState({ open: false });

  const TAB_CONFIG = {
    expenses: {
      title: "Expenses",
      table: "expenses",
      data: data.expenses,
      titleKey: "title",
      categoryKey: "category",
      categories: EXPENSE_CATEGORIES,
      color: theme.colors.error,
      sign: "-",
    },
    income: {
      title: "Income",
      table: "side_incomes",
      data: data.income,
      titleKey: "source",
      categoryKey: "source",
      categories: INCOME_SOURCES,
      color: theme.colors.success,
      sign: "+",
    },
  };

  const currentConfig = TAB_CONFIG[activeTab];

  const fetchData = useCallback(async () => {
    try {
      const userId = session.user.id;
      const [expensesRes, incomesRes] = await Promise.all([
        supabase.from("expenses").select("*").eq("user_id", userId),
        supabase.from("side_incomes").select("*").eq("user_id", userId),
      ]);
      if (expensesRes.error) throw expensesRes.error;
      if (incomesRes.error) throw incomesRes.error;
      setData({
        expenses: expensesRes.data || [],
        income: incomesRes.data || [],
      });
    } catch (error) {
      setAlertProps({
        open: true,
        title: "Error",
        message: "Failed to fetch data. Please try again.",
        confirmText: "OK",
        onConfirm: () => setAlertProps({ open: false }),
      });
    } finally {
      setLoading(false);
    }
  }, [session.user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const filteredData = useMemo(() => {
    let items = [...currentConfig.data];
    const { searchQuery, category, dateRange, sortBy, sortOrder } = filters;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item[currentConfig.titleKey]?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
      );
    }
    if (category !== "All")
      items = items.filter(
        (item) => item[currentConfig.categoryKey] === category
      );
    if (dateRange.startDate && dateRange.endDate) {
      const start = new Date(dateRange.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999);
      items = items.filter((item) => {
        const d = new Date(item.date);
        return d >= start && d <= end;
      });
    }
    items.sort((a, b) => {
      let A, B;
      if (sortBy === "amount") {
        A = parseFloat(a.amount);
        B = parseFloat(b.amount);
      } else if (sortBy === "title") {
        A = a[currentConfig.titleKey]?.toLowerCase() || "";
        B = b[currentConfig.titleKey]?.toLowerCase() || "";
      } else {
        A = new Date(a.date);
        B = new Date(b.date);
      }
      if (A < B) return sortOrder === "asc" ? -1 : 1;
      if (A > B) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return items;
  }, [
    currentConfig.data,
    filters,
    currentConfig.titleKey,
    currentConfig.categoryKey,
  ]);

  const totalAmount = useMemo(
    () =>
      filteredData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0),
    [filteredData]
  );

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFilters((prev) => ({
      ...prev,
      category: "All",
      dateRange: { startDate: null, endDate: null },
      sortBy: "date",
      sortOrder: "desc",
    }));
  };

  const openAddModal = () => {
    setEditingItem(null);
    setShowEditModal(true);
  };
  const openEditModal = (item) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const confirmAction = ({ title, message, onConfirm }) => {
    setAlertProps({
      open: true,
      title,
      message,
      onConfirm,
      confirmText: "Confirm",
      cancelText: "Cancel",
      icon: <Trash2 color="#fff" size={40} />,
      iconBg: theme.colors.error,
      confirmColor: theme.colors.error,
      onCancel: () => setAlertProps({ open: false }),
    });
  };

  const handleDeleteItem = async (item) => {
    const title = item[currentConfig.titleKey];
    confirmAction({
      title: `Delete ${currentConfig.title}`,
      message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      onConfirm: async () => {
        setLoading(true);
        const { error } = await supabase
          .from(currentConfig.table)
          .delete()
          .eq("id", item.id);
        if (error) {
          setAlertProps({
            open: true,
            title: "Error",
            message: `Failed to delete ${currentConfig.title}.`,
            confirmText: "OK",
            onConfirm: () => setAlertProps({ open: false }),
          });
        } else {
          setAlertProps({
            open: true,
            title: "Success",
            message: `${currentConfig.title} deleted successfully!`,
            confirmText: "OK",
            onConfirm: async () => {
              setAlertProps({ open: false });
              await fetchData();
            },
          });
        }
        setLoading(false);
      },
    });
  };

  const isFiltered =
    filters.searchQuery ||
    filters.category !== "All" ||
    filters.dateRange.startDate;

  const renderTransactionItem = useCallback(
    ({ item }) => (
      <TransactionCard
        item={item}
        config={currentConfig}
        onEdit={openEditModal}
        onDelete={handleDeleteItem}
        theme={theme}
      />
    ),
    [currentConfig, theme]
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
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
        <TouchableOpacity
          style={[
            styles.headerButton,
            { backgroundColor: theme.colors.buttonSecondary },
          ]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Transactions
        </Text>
        <TouchableOpacity
          style={[
            styles.headerButton,
            { backgroundColor: theme.colors.buttonSecondary },
          ]}
          onPress={() => navigation.navigate("AddExpense")}
        >
          <Plus color={theme.colors.primary} size={24} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        {Object.keys(TAB_CONFIG).map((tabKey) => (
          <TouchableOpacity
            key={tabKey}
            style={[
              styles.tab,
              activeTab === tabKey && {
                borderBottomColor: TAB_CONFIG[tabKey].color,
              },
            ]}
            onPress={() => handleTabChange(tabKey)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tabKey
                  ? { color: TAB_CONFIG[tabKey].color }
                  : { color: theme.colors.textSecondary },
              ]}
            >
              {TAB_CONFIG[tabKey].title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary */}
      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderLight,
          },
        ]}
      >
        <View style={styles.summaryItem}>
          <Text
            style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}
          >
            Total {currentConfig.title}
          </Text>
          <Text style={[styles.summaryAmount, { color: currentConfig.color }]}>
            {currentConfig.sign}₹
            {totalAmount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
      </View>

      {/* Search + Filter */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderLight,
            },
          ]}
        >
          <Search color={theme.colors.textTertiary} size={18} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder={`Search ${currentConfig.title.toLowerCase()}...`}
            placeholderTextColor={theme.colors.textTertiary}
            value={filters.searchQuery}
            onChangeText={(t) => setFilters((p) => ({ ...p, searchQuery: t }))}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderLight,
            },
          ]}
          onPress={() => setShowFiltersModal(true)}
        >
          <Filter color={theme.colors.primary} size={20} />
        </TouchableOpacity>
      </View>

      {isFiltered ? (
        <View style={styles.activeFilters}>
          <Text
            style={[
              styles.activeFiltersLabel,
              { color: theme.colors.textSecondary },
            ]}
          >
            Active filters:
          </Text>
          {filters.category !== "All" && (
            <View
              style={[
                styles.activeFilterTag,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Text style={styles.activeFilterText}>{filters.category}</Text>
              <TouchableOpacity
                onPress={() => setFilters((p) => ({ ...p, category: "All" }))}
              >
                <Text style={styles.removeFilterText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          {filters.searchQuery ? (
            <View
              style={[
                styles.activeFilterTag,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Text style={styles.activeFilterText}>
                "{filters.searchQuery}"
              </Text>
              <TouchableOpacity
                onPress={() => setFilters((p) => ({ ...p, searchQuery: "" }))}
              >
                <Text style={styles.removeFilterText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* List */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTransactionItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <ListEmptyState
            theme={theme}
            activeTab={activeTab}
            isFiltered={!!isFiltered}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Modals */}
      <ExpenseFilterModal
        visible={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        onApply={(f) => setFilters(f)}
        initialFilters={filters}
        categories={currentConfig.categories}
        theme={theme}
      />
      <Alert {...alertProps} />
    </View>
  );
}

// ---- Styles aligned to InvestmentsScreen aesthetic ----
const createStyles = (theme) =>
  StyleSheet.create({
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
    headerButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: { fontSize: 18, fontWeight: "600" },

    tabBar: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    tab: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabText: { fontSize: 14, fontWeight: "600" },

    summaryCard: { margin: 16, borderWidth: 1, borderRadius: 16, padding: 16 },
    summaryItem: { alignItems: "center" },
    summaryLabel: { fontSize: 12, marginBottom: 6 },
    summaryAmount: { fontSize: 22, fontWeight: "700" },

    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      marginBottom: 8,
      gap: 10,
    },
    searchBar: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      height: 44,
      borderWidth: 1,
      borderRadius: 12,
    },
    searchInput: { flex: 1, fontSize: 14 },
    filterButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
    },

    activeFilters: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 6,
    },
    activeFiltersLabel: { fontSize: 12 },
    activeFilterTag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    activeFilterText: { color: "#fff", fontSize: 12, fontWeight: "600" },
    removeFilterText: { color: "#fff", fontWeight: "700" },

    listContainer: { padding: 16 },

    card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
    cardHeader: { flexDirection: "row", alignItems: "center" },
    cardIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    cardIconEmoji: { fontSize: 18 },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: "700" },
    cardCategory: { fontSize: 12, marginTop: 2 },
    cardDate: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 6,
    },
    cardDateText: { fontSize: 12 },
    amountText: { fontSize: 16, fontWeight: "700" },
    cardDescription: { marginTop: 8, fontSize: 13 },
    cardActions: {
      flexDirection: "row",
      gap: 10,
      paddingTop: 10,
      marginTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    actionButton: {
      flexDirection: "row",
      gap: 6,
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
    },
    buttonText: { fontSize: 13, fontWeight: "700" },

    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 48,
      gap: 8,
    },
    emptyStateTitle: { fontSize: 18, fontWeight: "700" },
    emptyStateText: {
      fontSize: 13,
      textAlign: "center",
      paddingHorizontal: 24,
    },

    // Modal styles (aligned with Investments)
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "center",
      padding: 16,
    },
    modalContainer: { borderRadius: 18, overflow: "hidden" },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalTitle: { fontSize: 16, fontWeight: "700" },
    modalCloseButton: { padding: 6, borderRadius: 8 },
    modalScrollView: { padding: 16, gap: 16 },
    modalSectionTitle: { fontSize: 14, fontWeight: "700" },

    dateRangeContainer: { flexDirection: "row", gap: 10 },
    dateInput: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
    },

    categoryChipsRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
    },
    chipText: { fontSize: 12, fontWeight: "700" },

    optionsContainer: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    modalOption: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    modalOptionText: { fontSize: 13, fontWeight: "700" },

    modalFooter: {
      flexDirection: "row",
      gap: 10,
      padding: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    modalButton: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    resetButton: {},
    applyButton: {},
  });
