import React, { useEffect, useState, useMemo, useCallback, memo, useRef } from "react";
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
  Switch,
  KeyboardAvoidingView,
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
  Clock,
  X,
  Calendar,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../lib/supabase";
import Alert from "../components/Alert";
import DateTimePicker from "@react-native-community/datetimepicker";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
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
  Salary: { emoji: "💼", color: "#4ECDC4" },
  Freelance: { emoji: "💻", color: "#54A0FF" },
  Investment: { emoji: "📈", color: "#96CEB4" },
  Gift: { emoji: "🎁", color: "#FF9FF3" },
  Other: { emoji: "📝", color: "#A8A8A8" },
};

const EXPENSE_CATEGORIES = Object.keys(CATEGORY_DETAILS).slice(0, 10);
const INCOME_SOURCES = Object.keys(CATEGORY_DETAILS).slice(10);

const formatDate = (date, long = false) => {
  if (!date) return long ? "Select Date" : "N/A";
  const options = long
    ? { year: "numeric", month: "long", day: "numeric" }
    : { month: "short", day: "numeric" };
  return new Date(date).toLocaleDateString("en-IN", options);
};

const SegmentedControl = ({ options, selected, onSelect, theme }) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.segmentedControlContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.segment,
            selected === option.value && { backgroundColor: theme.colors.surface },
          ]}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
      <View style={[styles.cardActions, { borderTopColor: theme.colors.borderLight }]}>
        <TouchableOpacity
          style={[styles.actionButton]}
          onPress={() => onEdit(item)}
        >
          <Edit3 color={theme.colors.textSecondary} size={16} />
          <Text style={[styles.buttonText, { color: theme.colors.textSecondary }]}>
            Edit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton]}
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
            <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
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
  const [viewMode, setViewMode] = useState("monthly"); // 'monthly', 'yearly', or 'all'

  const [editingItem, setEditingItem] = useState(null);
  const [alertProps, setAlertProps] = useState({ open: false });

  const TAB_CONFIG = {
    expenses: {
      title: "Expenses",
      table: "expenses",
      data: data.expenses,
      titleKey: "title",
      categoryKey: "category",
      color: theme.colors.error,
      sign: "-",
    },
    income: {
      title: "Income",
      table: "income",
      data: data.income,
      titleKey: "source",
      categoryKey: "source",
      color: theme.colors.success,
      sign: "+",
    },
  };

  const currentConfig = TAB_CONFIG[activeTab];

  const fetchData = useCallback(async () => {
    try {
      const userId = session.user.id;
      const now = new Date();
      let firstDay, lastDay;

      if (viewMode === "monthly") {
        firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      } else if (viewMode === "year") {
        firstDay = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
        lastDay = new Date(now.getFullYear(), 11, 31).toISOString().split("T")[0];
      }

      const expensesQuery = supabase.from("expenses").select("*").eq("user_id", userId);
      const incomeQuery = supabase.from("income").select("*").eq("user_id", userId);

      if (viewMode !== 'all' && firstDay && lastDay) {
        expensesQuery.gte("date", firstDay).lte("date", lastDay);
        incomeQuery.gte("date", firstDay).lte("date", lastDay);
      }

      const [expensesRes, incomesRes] = await Promise.all([expensesQuery, incomeQuery]);

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
  }, [session.user.id, viewMode]);


  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };
  
  const totalAmount = useMemo(
    () =>
      currentConfig.data.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0),
    [currentConfig.data]
  );
  
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

  const handleDeleteItem = (item) => {
    const title = item[currentConfig.titleKey];
    confirmAction({
      title: `Delete ${currentConfig.title}`,
      message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      onConfirm: async () => {
        setLoading(true);
        const { error } = await supabase.from(currentConfig.table).delete().eq("id", item.id);
        if (error) {
           setAlertProps({
             open: true, title: "Error", message: `Failed to delete ${currentConfig.title}.`,
             confirmText: "OK", onConfirm: () => setAlertProps({ open: false })
           });
        } else {
           setAlertProps({
             open: true, title: "Success", message: `${currentConfig.title} deleted successfully!`,
             confirmText: "OK", onConfirm: async () => {
               setAlertProps({ open: false });
               await fetchData();
             }
           });
        }
        setLoading(false);
      },
    });
  };

  const openEditModal = (item) => {
    navigation.navigate('AddExpense', {
      screen: activeTab, // Differentiate between expense/income
      transaction: item, // Pass the item data to the edit screen
    });
  };

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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={[styles.headerButton, { backgroundColor: theme.colors.buttonSecondary }]} onPress={() => navigation.goBack()}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Transactions</Text>
        <TouchableOpacity style={[styles.headerButton, { backgroundColor: theme.colors.buttonSecondary }]} onPress={() => navigation.navigate("AddExpense")}>
          <Plus color={theme.colors.primary} size={24} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.controlsContainer}>
        <SegmentedControl 
          options={[{label: 'Expenses', value: 'expenses'}, {label: 'Income', value: 'income'}]}
          selected={activeTab}
          onSelect={setActiveTab}
          theme={theme}
        />
        <SegmentedControl 
          options={[{label: 'This Month', value: 'monthly'}, {label: 'This Year', value: 'year'}, {label: 'All Time', value: 'all'}]}
          selected={viewMode}
          onSelect={setViewMode}
          theme={theme}
        />
      </View>

      <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}>
            Total {currentConfig.title} ({
              viewMode === 'monthly' ? 'This Month' : viewMode === 'year' ? 'This Year' : 'All Time'
            })
          </Text>
          <Text style={[styles.summaryAmount, { color: currentConfig.color }]}>
            {currentConfig.sign}₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
      </View>

      <FlatList
        data={currentConfig.data}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTransactionItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}
        ListEmptyComponent={<ListEmptyState theme={theme} activeTab={activeTab} isFiltered={false} />}
        showsVerticalScrollIndicator={false}
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
      paddingHorizontal: 20,
      paddingTop: 60,
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
    controlsContainer: {
        padding: 16,
        gap: 12,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    segmentedControlContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.buttonSecondary,
      borderRadius: 12,
      padding: 4,
    },
    segment: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentText: {
      fontSize: 13,
      fontWeight: '700'
    },
    summaryCard: {
        marginHorizontal: 16,
        marginTop: 16,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
    },
    summaryItem: { alignItems: "center" },
    summaryLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
    summaryAmount: { fontSize: 24, fontWeight: "bold" },
    listContainer: { padding: 16 },
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
    cardCategory: { fontSize: 13, marginTop: 2 },
    cardDate: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 6,
    },
    cardDateText: { fontSize: 12 },
    amountContainer: { alignItems: 'flex-end' },
    amountText: { fontSize: 16, fontWeight: "700" },
    cardActions: {
      flexDirection: "row",
      borderTopWidth: 1,
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
      justifyContent: 'center',
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
      lineHeight: 20
    },
  });