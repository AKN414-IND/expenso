import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  memo,
} from "react";
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
  Platform,
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
      ? { year: 'numeric', month: 'long', day: 'numeric' }
      : { month: "short", day: "numeric", year: "numeric" };
    return new Date(date).toLocaleDateString("en-IN", options);
};

const FilterModal = ({
  visible,
  onClose,
  onApply,
  initialFilters,
  categories,
  theme,
}) => {
  const [filters, setFilters] = useState(initialFilters);
  const [showPicker, setShowPicker] = useState(null);

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const handleDateChange = (event, selectedDate) => {
    const currentPicker = showPicker;
    setShowPicker(null);
    if (event.type === 'set' && selectedDate) {
      setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, [currentPicker]: selectedDate } }));
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
        filters[field] === value && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
      ]}
      onPress={() => setFilters(prev => ({ ...prev, [field]: value }))}
    >
      <Text style={[styles.modalOptionText, { color: theme.colors.text }, filters[field] === value && { color: '#fff' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Filter & Sort</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <X color={theme.colors.textSecondary} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScrollView}>
            <Text style={[styles.modalSectionTitle, { color: theme.colors.text }]}>Date Range</Text>
            <View style={styles.dateRangeContainer}>
              <TouchableOpacity style={[styles.dateInput, { borderColor: theme.colors.border }]} onPress={() => setShowPicker('startDate')}>
                 <Calendar color={theme.colors.textSecondary} size={18}/>
                 <Text style={{color: theme.colors.textSecondary}}>{formatDate(filters.dateRange.startDate, true)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dateInput, { borderColor: theme.colors.border }]} onPress={() => setShowPicker('endDate')}>
                 <Calendar color={theme.colors.textSecondary} size={18}/>
                 <Text style={{color: theme.colors.textSecondary}}>{formatDate(filters.dateRange.endDate, true)}</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSectionTitle, { color: theme.colors.text }]}>Category</Text>
            <View style={styles.optionsContainer}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.modalOption, { borderColor: theme.colors.border }, filters.category === cat && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                  onPress={() => setFilters(prev => ({ ...prev, category: cat }))}
                >
                  <Text style={[styles.modalOptionText, { color: theme.colors.textSecondary }, filters.category === cat && { color: '#fff' }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalSectionTitle, { color: theme.colors.text }]}>Sort By</Text>
            <View style={styles.optionsContainer}>
                {renderOption('date', 'sortBy', 'Date')}
                {renderOption('amount', 'sortBy', 'Amount')}
                {renderOption('title', 'sortBy', 'Title')}
            </View>

            <Text style={[styles.modalSectionTitle, { color: theme.colors.text }]}>Sort Order</Text>
            <View style={styles.optionsContainer}>
                <TouchableOpacity style={[styles.modalOption, filters.sortOrder === 'desc' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]} onPress={() => setFilters(prev => ({ ...prev, sortOrder: 'desc' }))}>
                  <ChevronDown color={filters.sortOrder === 'desc' ? '#fff' : theme.colors.text} size={16} />
                  <Text style={[styles.modalOptionText, { color: theme.colors.text }, filters.sortOrder === 'desc' && { color: '#fff' }]}>Descending</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalOption, filters.sortOrder === 'asc' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]} onPress={() => setFilters(prev => ({ ...prev, sortOrder: 'asc' }))}>
                  <ChevronUp color={filters.sortOrder === 'asc' ? '#fff' : theme.colors.text} size={16} />
                  <Text style={[styles.modalOptionText, { color: theme.colors.text }, filters.sortOrder === 'asc' && { color: '#fff' }]}>Ascending</Text>
                </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity style={[styles.modalButton, styles.resetButton]} onPress={handleReset}>
              <Text style={[styles.modalButtonText, { color: theme.colors.textSecondary }]}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.applyButton, { backgroundColor: theme.colors.primary }]} onPress={handleApply}>
              <Text style={[styles.modalButtonText, { color: '#fff' }]}>Apply Filters</Text>
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
            style={[
              styles.cardCategory,
              { color: theme.colors.textSecondary },
            ]}
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
          {config.sign}₹{parseFloat(item.amount).toLocaleString('en-IN')}
        </Text>
      </View>
      {item.description && (
        <Text
          style={[styles.cardDescription, { color: theme.colors.textSecondary }]}
        >
          {item.description}
        </Text>
      )}
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

const TransactionCardSkeleton = ({ theme }) => (
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

const ListEmptyState = ({ theme, activeTab, isFiltered }) => (
  <View style={styles.emptyState}>
    <Eye color={theme.colors.textTertiary} size={64} />
    <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
      No Transactions Found
    </Text>
    <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
      {isFiltered
        ? "Try adjusting your search or filter criteria."
        : `Add a new ${activeTab} to see it here.`}
    </Text>
  </View>
);

export default function TransactionsScreen({ navigation }) {
  const { session } = useAuth();
  const { theme } = useTheme();

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
      if (!loading) setLoading(true);
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
      showErrorAlert("Failed to fetch data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [session.user.id, loading]);

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
      const lowerCaseQuery = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item[currentConfig.titleKey]
            ?.toLowerCase()
            .includes(lowerCaseQuery) ||
          item.description?.toLowerCase().includes(lowerCaseQuery)
      );
    }

    if (category !== "All") {
      items = items.filter(
        (item) => item[currentConfig.categoryKey] === category
      );
    }

    if (dateRange.startDate && dateRange.endDate) {
      const start = new Date(dateRange.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999);

      items = items.filter((item) => {
        const itemDate = new Date(item.date);
        return itemDate >= start && itemDate <= end;
      });
    }

    items.sort((a, b) => {
      let valA, valB;
      if (sortBy === "amount") {
        valA = parseFloat(a.amount);
        valB = parseFloat(b.amount);
      } else if (sortBy === "title") {
        valA = a[currentConfig.titleKey]?.toLowerCase() || "";
        valB = b[currentConfig.titleKey]?.toLowerCase() || "";
      } else {
        valA = new Date(a.date);
        valB = new Date(b.date);
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return items;
  }, [currentConfig.data, filters, currentConfig.titleKey, currentConfig.categoryKey]);

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
      sortBy: 'date',
      sortOrder: 'desc',
    }));
  };
  
  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setShowEditModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleDeleteItem = async (item) => {
    const title = item[currentConfig.titleKey];
    confirmAction({
      title: `Delete ${currentConfig.title}`,
      message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      onConfirm: async () => {
        const { error } = await supabase
          .from(currentConfig.table)
          .delete()
          .eq("id", item.id);
        if (error) {
          showErrorAlert(`Failed to delete ${currentConfig.title}.`);
        } else {
          showSuccessAlert(`${currentConfig.title} deleted successfully!`);
          fetchData();
        }
      },
    });
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

  const showSuccessAlert = (message) =>
    setAlertProps({
      open: true,
      title: "Success",
      message,
      confirmText: "OK",
      onConfirm: () => setAlertProps({ open: false }),
    });

  const showErrorAlert = (message) =>
    setAlertProps({
      open: true,
      title: "Error",
      message,
      confirmText: "OK",
      onConfirm: () => setAlertProps({ open: false }),
    });

  const isFiltered =
    filters.searchQuery ||
    filters.category !== "All" ||
    filters.dateRange.startDate;

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
          style={styles.headerButton}
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
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={openAddModal}
        >
          <Plus color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <View style={[styles.tabBar, { backgroundColor: theme.colors.surface }]}>
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
        <View
          style={[
            styles.summaryDivider,
            { backgroundColor: theme.colors.borderLight },
          ]}
        />
        <View style={styles.summaryItem}>
          <Text
            style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}
          >
            Transactions
          </Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
            {filteredData.length}
          </Text>
        </View>
      </View>

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
            placeholder={`Search ${currentConfig.title}...`}
            placeholderTextColor={theme.colors.textTertiary}
            value={filters.searchQuery}
            onChangeText={(text) =>
              setFilters((prev) => ({ ...prev, searchQuery: text }))
            }
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

      {loading ? (
        <View style={styles.listContainer}>
          <TransactionCardSkeleton theme={theme} />
          <TransactionCardSkeleton theme={theme} />
          <TransactionCardSkeleton theme={theme} />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          renderItem={({ item }) => (
            <TransactionCard
              item={item}
              config={currentConfig}
              onEdit={openEditModal}
              onDelete={handleDeleteItem}
              theme={theme}
            />
          )}
          keyExtractor={(item) => item.id.toString()}
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
        />
      )}

      <Alert {...alertProps} />
      
      <FilterModal
          visible={showFiltersModal}
          onClose={() => setShowFiltersModal(false)}
          onApply={handleApplyFilters}
          initialFilters={filters}
          categories={currentConfig.categories}
          theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  tabBar: { flexDirection: "row", justifyContent: "space-around" },
  tab: {
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    width: "50%",
    alignItems: "center",
  },
  tabText: { fontSize: 16, fontWeight: "600" },
  summaryCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: { flex: 1, alignItems: "center", gap: 4 },
  summaryDivider: { width: 1, height: 40 },
  summaryLabel: { fontSize: 14, fontWeight: "500" },
  summaryValue: { fontSize: 22, fontWeight: "700" },
  summaryAmount: { fontSize: 22, fontWeight: "700" },
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
    borderWidth: 1,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, height: 48 },
  filterButton: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 50,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardIconEmoji: { fontSize: 20 },
  cardInfo: { flex: 1, marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  cardCategory: { fontSize: 14, marginBottom: 6 },
  cardDate: { flexDirection: "row", alignItems: "center" },
  cardDateText: { fontSize: 12, marginLeft: 4 },
  amountText: { fontSize: 18, fontWeight: "700" },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    paddingLeft: 60,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: { fontWeight: "600", fontSize: 14, marginLeft: 6 },
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
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    padding: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetButton: {
    marginRight: 10,
  },
  applyButton: {
    marginLeft: 10,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});