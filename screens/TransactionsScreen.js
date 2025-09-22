import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  RefreshControl,
  Dimensions,
  Modal,
  ScrollView,
  Platform,
  LayoutAnimation,
  UIManager,
} from "react-native";
import {
  ArrowLeft,
  Search,
  Plus,
  Edit3,
  Trash2,
  X,
  Calendar,
  Filter,
  ArrowDownUp,
  Check,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../lib/supabase";
import Alert from "../components/Alert";
import DateTimePicker from "@react-native-community/datetimepicker";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  Other: { emoji: "📝", color: "#A8A8A8" },
  Salary: { emoji: "💼", color: "#4ECDC4" },
  Freelance: { emoji: "💻", color: "#54A0FF" },
  Investment: { emoji: "📈", color: "#96CEB4" },
  Gift: { emoji: "🎁", color: "#FF9FF3" },
};

const EXPENSE_CATEGORIES = Object.keys(CATEGORY_DETAILS).slice(0, 10);
const INCOME_SOURCES = Object.keys(CATEGORY_DETAILS).slice(10, 14);

const formatDate = (date, long = false) => {
  if (!date) return long ? "Select Date" : "N/A";
  const options = long
    ? { year: "numeric", month: "long", day: "numeric" }
    : { month: "short", day: "numeric" };
  return new Date(date).toLocaleDateString("en-IN", options);
};

// ## Reusable Components
const SegmentedControl = ({ options, selected, onSelect, theme }) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.segmentedControlContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.segment,
            selected === option.value && {
              backgroundColor: theme.colors.surface,
            },
          ]}
          onPress={() => {
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut
            );
            onSelect(option.value);
          }}
        >
          <Text
            style={[
              styles.segmentText,
              {
                color:
                  selected === option.value
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
              },
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const TransactionCard = memo(({ item, config, onEdit, onDelete, theme }) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const details =
    CATEGORY_DETAILS[item[config.categoryKey]] || CATEGORY_DETAILS["Other"];
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
            {item[config.titleKey]}
          </Text>
          <Text
            style={[styles.cardCategory, { color: theme.colors.textSecondary }]}
          >
            {item[config.categoryKey]}
          </Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={[styles.amountText, { color: config.color }]}>
            {config.sign}₹{parseFloat(item.amount).toLocaleString("en-IN")}
          </Text>
          <Text
            style={[styles.cardDateText, { color: theme.colors.textTertiary }]}
          >
            {formatDate(item.date)}
          </Text>
        </View>
      </View>
      <View
        style={[
          styles.cardActions,
          { borderTopColor: theme.colors.borderLight },
        ]}
      >
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onEdit(item)}
        >
          <Edit3 color={theme.colors.textSecondary} size={16} />
          <Text
            style={[styles.buttonText, { color: theme.colors.textSecondary }]}
          >
            Edit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
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

const ListEmptyState = ({ theme, activeTab, isFiltered }) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.emptyState}>
      <Search color={theme.colors.textTertiary} size={64} />
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

// ## Filter and Sort Modals
const FilterModal = ({
  visible,
  onClose,
  onApply,
  theme,
  activeTab,
  currentFilters,
}) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [categories, setCategories] = useState(currentFilters.categories);
  const [startDate, setStartDate] = useState(currentFilters.startDate);
  const [endDate, setEndDate] = useState(currentFilters.endDate);
  const [showPicker, setShowPicker] = useState(null); // 'start' or 'end'

  const categoryOptions =
    activeTab === "expenses" ? EXPENSE_CATEGORIES : INCOME_SOURCES;

  const toggleCategory = (cat) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleDateChange = (event, selectedDate) => {
    setShowPicker(null);
    if (selectedDate) {
      if (showPicker === "start") setStartDate(selectedDate);
      if (showPicker === "end") setEndDate(selectedDate);
    }
  };

  const applyFilters = () => {
    onApply({ categories, startDate, endDate });
    onClose();
  };

  const resetFilters = () => {
    setCategories([]);
    setStartDate(null);
    setEndDate(null);
    onApply({ categories: [], startDate: null, endDate: null });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Filter Transactions
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X color={theme.colors.textSecondary} size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            <Text
              style={[styles.filterSectionTitle, { color: theme.colors.text }]}
            >
              Categories
            </Text>
            <View style={styles.categoryGrid}>
              {categoryOptions.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: categories.includes(cat)
                        ? theme.colors.primary
                        : theme.colors.buttonSecondary,
                    },
                  ]}
                  onPress={() => toggleCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      {
                        color: categories.includes(cat)
                          ? "#FFF"
                          : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text
              style={[styles.filterSectionTitle, { color: theme.colors.text }]}
            >
              Date Range
            </Text>
            <View style={styles.dateRangeContainer}>
              <TouchableOpacity
                style={[styles.dateInput, { borderColor: theme.colors.border }]}
                onPress={() => setShowPicker("start")}
              >
                <Calendar color={theme.colors.textSecondary} size={18} />
                <Text
                  style={[styles.dateInputText, { color: theme.colors.text }]}
                >
                  {startDate ? formatDate(startDate, true) : "Start Date"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateInput, { borderColor: theme.colors.border }]}
                onPress={() => setShowPicker("end")}
              >
                <Calendar color={theme.colors.textSecondary} size={18} />
                <Text
                  style={[styles.dateInputText, { color: theme.colors.text }]}
                >
                  {endDate ? formatDate(endDate, true) : "End Date"}
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
                styles.footerButton,
                { backgroundColor: theme.colors.buttonSecondary },
              ]}
              onPress={resetFilters}
            >
              <Text
                style={[
                  styles.footerButtonText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Reset
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.footerButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={applyFilters}
            >
              <Text style={[styles.footerButtonText, { color: "#FFF" }]}>
                Apply Filters
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {showPicker && (
        <DateTimePicker
          value={(showPicker === "start" ? startDate : endDate) || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </Modal>
  );
};

const SortModal = ({ visible, onClose, onSelect, theme, currentSort }) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const sortOptions = [
    { label: "Date: Newest to Oldest", value: { key: "date", order: "desc" } },
    { label: "Date: Oldest to Newest", value: { key: "date", order: "asc" } },
    {
      label: "Amount: Highest to Lowest",
      value: { key: "amount", order: "desc" },
    },
    {
      label: "Amount: Lowest to Highest",
      value: { key: "amount", order: "asc" },
    },
    { label: "Name: A to Z", value: { key: "title", order: "asc" } },
    { label: "Name: Z to A", value: { key: "title", order: "desc" } },
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.modalContent,
            styles.sortModal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text
            style={[
              styles.modalTitle,
              { color: theme.colors.text, marginBottom: 16 },
            ]}
          >
            Sort By
          </Text>
          {sortOptions.map((option) => {
            const isSelected =
              currentSort.key === option.value.key &&
              currentSort.order === option.value.order;
            return (
              <TouchableOpacity
                key={option.label}
                style={styles.sortOption}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    {
                      color: isSelected
                        ? theme.colors.primary
                        : theme.colors.text,
                    },
                  ]}
                >
                  {option.label}
                </Text>
                {isSelected && <Check color={theme.colors.primary} size={20} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// ## Main Screen Component
export default function TransactionsScreen({ navigation }) {
  const { session } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("expenses");
  const [data, setData] = useState({ expenses: [], income: [] });
  const [viewMode, setViewMode] = useState("monthly");

  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    categories: [],
    startDate: null,
    endDate: null,
  });
  const [isSortModalVisible, setSortModalVisible] = useState(false);
  const [sortOption, setSortOption] = useState({ key: "date", order: "desc" });

  const [alertProps, setAlertProps] = useState({ open: false });

  const TAB_CONFIG = {
    expenses: {
      table: "expenses",
      data: data.expenses,
      titleKey: "title",
      categoryKey: "category",
      color: theme.colors.error,
      sign: "-",
      title: "Expense",
    },
    income: {
      table: "income",
      data: data.income,
      titleKey: "source",
      categoryKey: "source",
      color: theme.colors.success,
      sign: "+",
      title: "Income",
    },
  };
  const currentConfig = TAB_CONFIG[activeTab];

  const fetchData = useCallback(async () => {
    try {
      const userId = session.user.id;
      const [expensesRes, incomesRes] = await Promise.all([
        supabase.from("expenses").select("*").eq("user_id", userId),
        supabase.from("income").select("*").eq("user_id", userId),
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
        message: "Failed to fetch data.",
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

  const filteredAndSortedData = useMemo(() => {
    let items = [...currentConfig.data];
    const now = new Date();

    // Time Window Filter (from Segmented Control)
    if (viewMode === "monthly") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      items = items.filter((item) => new Date(item.date) >= startOfMonth);
    } else if (viewMode === "year") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      items = items.filter((item) => new Date(item.date) >= startOfYear);
    }

    // Search Query Filter
    if (searchQuery) {
      items = items.filter((item) =>
        item[currentConfig.titleKey]
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      );
    }

    // Category Filter
    if (activeFilters.categories.length > 0) {
      items = items.filter((item) =>
        activeFilters.categories.includes(item[currentConfig.categoryKey])
      );
    }

    // Custom Date Range Filter
    if (activeFilters.startDate && activeFilters.endDate) {
      const start = new Date(activeFilters.startDate).setHours(0, 0, 0, 0);
      const end = new Date(activeFilters.endDate).setHours(23, 59, 59, 999);
      items = items.filter((item) => {
        const itemDate = new Date(item.date);
        return itemDate >= start && itemDate <= end;
      });
    }

    // Sorting
    items.sort((a, b) => {
      const key =
        sortOption.key === "title" ? currentConfig.titleKey : sortOption.key;
      const valA = a[key];
      const valB = b[key];
      let comparison = 0;
      if (key === "amount") {
        comparison = parseFloat(valA) - parseFloat(valB);
      } else if (key === "date") {
        comparison = new Date(valA) - new Date(valB);
      } else {
        comparison = valA.localeCompare(valB);
      }
      return sortOption.order === "asc" ? comparison : -comparison;
    });

    return items;
  }, [currentConfig.data, viewMode, searchQuery, activeFilters, sortOption]);

  const totalAmount = useMemo(
    () =>
      filteredAndSortedData.reduce(
        (sum, item) => sum + parseFloat(item.amount || 0),
        0
      ),
    [filteredAndSortedData]
  );

  const confirmAction = ({ title, message, onConfirm }) =>
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

  const handleDeleteItem = (item) => {
    confirmAction({
      title: `Delete ${currentConfig.title}`,
      message: `Are you sure you want to delete "${
        item[currentConfig.titleKey]
      }"?`,
      onConfirm: async () => {
        const { error } = await supabase
          .from(currentConfig.table)
          .delete()
          .eq("id", item.id);
        if (error) {
          setAlertProps({
            open: true,
            title: "Error",
            message: `Failed to delete.`,
            confirmText: "OK",
            onConfirm: () => setAlertProps({ open: false }),
          });
        } else {
          fetchData(); // Refetch data to update UI
          setAlertProps({ open: false });
        }
      },
    });
  };

  const openEditModal = (item) =>
    navigation.navigate("AddExpense", { screen: activeTab, transaction: item });

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

  const isFiltered =
    searchQuery.length > 0 ||
    activeFilters.categories.length > 0 ||
    (activeFilters.startDate && activeFilters.endDate);

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

      <View
        style={[
          styles.controlsContainer,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <SegmentedControl
          options={[
            { label: "Expenses", value: "expenses" },
            { label: "Income", value: "income" },
          ]}
          selected={activeTab}
          onSelect={setActiveTab}
          theme={theme}
        />
        <SegmentedControl
          options={[
            { label: "This Month", value: "monthly" },
            { label: "This Year", value: "year" },
            { label: "All Time", value: "all" },
          ]}
          selected={viewMode}
          onSelect={setViewMode}
          theme={theme}
        />
      </View>

      <View style={styles.filterBar}>
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Search color={theme.colors.textTertiary} size={20} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder={`Search ${activeTab}...`}
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.filterSortButton,
            { backgroundColor: theme.colors.surface },
          ]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Filter color={theme.colors.textSecondary} size={20} />
          {isFiltered && (
            <View
              style={[
                styles.filterDot,
                { backgroundColor: theme.colors.primary },
              ]}
            />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterSortButton,
            { backgroundColor: theme.colors.surface },
          ]}
          onPress={() => setSortModalVisible(true)}
        >
          <ArrowDownUp color={theme.colors.textSecondary} size={20} />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderLight,
          },
        ]}
      >
        <Text
          style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}
        >
          Total for selected period & filters
        </Text>
        <Text style={[styles.summaryAmount, { color: currentConfig.color }]}>
          {currentConfig.sign}₹
          {totalAmount.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
      </View>

      <FlatList
        data={filteredAndSortedData}
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
            isFiltered={isFiltered}
          />
        }
        showsVerticalScrollIndicator={false}
      />
      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={setActiveFilters}
        theme={theme}
        activeTab={activeTab}
        currentFilters={activeFilters}
      />
      <SortModal
        visible={isSortModalVisible}
        onClose={() => setSortModalVisible(false)}
        onSelect={setSortOption}
        theme={theme}
        currentSort={sortOption}
      />
      <Alert {...alertProps} />
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: Platform.OS === "android" ? 25 : 60,
      paddingBottom: 18,
      borderBottomWidth: 1,
      justifyContent: "space-between",
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: { fontSize: 18, fontWeight: "700" },
    controlsContainer: { padding: 16, paddingTop: 12, gap: 12 },
    segmentedControlContainer: {
      flexDirection: "row",
      backgroundColor: theme.colors.buttonSecondary,
      borderRadius: 12,
      padding: 4,
    },
    segment: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentText: { fontSize: 13, fontWeight: "700" },
    filterBar: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingTop: 16,
      gap: 12,
      alignItems: "center",
    },
    searchContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 12,
      paddingHorizontal: 12,
    },
    searchInput: { flex: 1, height: 44, fontSize: 14, marginLeft: 8 },
    filterSortButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    filterDot: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: "#FFF",
    },
    summaryCard: {
      marginHorizontal: 16,
      marginTop: 16,
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
    },
    summaryLabel: {
      fontSize: 13,
      fontWeight: "500",
      marginBottom: 6,
      textAlign: "center",
    },
    summaryAmount: { fontSize: 24, fontWeight: "bold", textAlign: "center" },
    listContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
    card: { borderWidth: 1, borderRadius: 16, marginBottom: 12 },
    cardHeader: { flexDirection: "row", alignItems: "center", padding: 14 },
    cardIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    cardIconEmoji: { fontSize: 20 },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: "700" },
    cardCategory: {
      fontSize: 13,
      marginTop: 2,
      color: theme.colors.textSecondary,
    },
    amountContainer: { alignItems: "flex-end" },
    amountText: { fontSize: 16, fontWeight: "bold" },
    cardDateText: { fontSize: 12, marginTop: 2 },
    cardActions: { flexDirection: "row", borderTopWidth: 1 },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
    },
    buttonText: { fontSize: 13, fontWeight: "600" },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 64,
      gap: 12,
    },
    emptyStateTitle: { fontSize: 18, fontWeight: "700" },
    emptyStateText: {
      fontSize: 14,
      textAlign: "center",
      paddingHorizontal: 24,
      lineHeight: 20,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 16,
      maxHeight: "80%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingBottom: 16,
    },
    modalTitle: { fontSize: 20, fontWeight: "bold" },
    filterSectionTitle: {
      fontSize: 16,
      fontWeight: "bold",
      marginTop: 20,
      marginBottom: 12,
    },
    categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    categoryChip: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
    },
    categoryChipText: { fontSize: 14, fontWeight: "600" },
    dateRangeContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    dateInput: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      borderWidth: 1,
      borderRadius: 10,
      gap: 8,
    },
    dateInputText: { fontSize: 14 },
    modalFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      paddingTop: 16,
      borderTopWidth: 1,
      marginTop: 20,
    },
    footerButton: {
      flex: 1,
      padding: 14,
      borderRadius: 12,
      alignItems: "center",
    },
    footerButtonText: { fontSize: 16, fontWeight: "bold" },
    sortModal: {
      position: "absolute",
      bottom: 0,
      width: "100%",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
    },
    sortOption: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 16,
    },
    sortOptionText: { fontSize: 16 },
  });
