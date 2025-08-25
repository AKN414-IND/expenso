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
  Modal,
  ActivityIndicator,
} from "react-native";
import {
  ArrowLeft,
  Plus,
  Edit3,
  Trash2,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Eye,
  RefreshCw,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../lib/supabase";
import Alert from "../components/Alert";
import DateTimePicker from "@react-native-community/datetimepicker";
import { fetchInvestmentPrices } from "../services/api";

const ICONS = {
  Stocks: "📈",
  "Mutual Funds": "💹",
  FD: "🏦",
  Crypto: "🪙",
  Gold: "🥇",
  Bonds: "💵",
  "Real Estate": "🏠",
  Others: "🗂️",
};

const formatDate = (date) => {
  if (!date) return "No Date";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// ## Robust InvestmentCard Component
const InvestmentCard = ({ investment, onEdit, onDelete }) => {
  const { theme } = useTheme();

  // Use `total_cost` as the primary field for cost.
  const { title, type, date, total_cost, description, currentValue } =
    investment;

  // 1. Ensure totalCost is always a valid number, defaulting to 0.
  const totalCost = parseFloat(total_cost || 0);

  // 2. Safely calculate profit & loss
  const profitLoss = currentValue !== null ? currentValue - totalCost : null;

  // 3. Safely calculate percentage change, preventing division by zero.
  const percentageChange =
    profitLoss !== null && totalCost > 0
      ? (profitLoss / totalCost) * 100
      : null;

  const isProfit = profitLoss !== null && profitLoss >= 0;

  return (
    <View
      style={[
        styles.investmentCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderLight,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.cardIcon,
            { backgroundColor: theme.colors.buttonSecondary },
          ]}
        >
          <Text style={styles.cardEmoji}>{ICONS[type] || ICONS["Others"]}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text
            style={[styles.cardTitle, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[styles.cardType, { color: theme.colors.textSecondary }]}
          >
            {type}
          </Text>
          <View style={styles.cardDate}>
            <Calendar color={theme.colors.textTertiary} size={12} />
            <Text
              style={[
                styles.cardDateText,
                { color: theme.colors.textTertiary },
              ]}
            >
              {formatDate(date)}
            </Text>
          </View>
        </View>
        <View style={styles.cardAmountContainer}>
          <Text style={[styles.amountText, { color: theme.colors.text }]}>
            ₹{totalCost.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Render real-time data only if it's valid */}
      {currentValue !== null && profitLoss !== null && (
        <View
          style={[
            styles.realTimeSection,
            { borderTopColor: theme.colors.borderLight },
          ]}
        >
          <View style={styles.realTimeItem}>
            <Text
              style={[
                styles.realTimeLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Current Value
            </Text>
            <Text
              style={[styles.currentValue, { color: theme.colors.primary }]}
            >
              ₹
              {currentValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
          <View style={styles.realTimeItem}>
            <Text
              style={[
                styles.realTimeLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              P/L
            </Text>
            <Text
              style={[
                styles.profitLoss,
                { color: isProfit ? theme.colors.success : theme.colors.error },
              ]}
            >
              {isProfit ? "+" : ""}₹
              {profitLoss.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
          <View style={styles.realTimeItem}>
            <Text
              style={[
                styles.realTimeLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Change
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {isProfit ? (
                <TrendingUp color={theme.colors.success} size={14} />
              ) : (
                <TrendingDown color={theme.colors.error} size={14} />
              )}
              <Text
                style={[
                  styles.percentageChange,
                  {
                    color: isProfit ? theme.colors.success : theme.colors.error,
                    marginLeft: 4,
                  },
                ]}
              >
                {typeof percentageChange === "number"
                  ? `${percentageChange.toFixed(2)}%`
                  : "--"}
              </Text>
            </View>
          </View>
        </View>
      )}

      {description ? (
        <Text
          style={[
            styles.cardDescription,
            {
              color: theme.colors.textSecondary,
              borderTopColor: theme.colors.borderLight,
            },
          ]}
        >
          {description}
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
          onPress={onEdit}
        >
          <Edit3 color={theme.colors.warning} size={16} />
          <Text
            style={[styles.actionButtonText, { color: theme.colors.warning }]}
          >
            Edit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: theme.colors.error + "15" },
          ]}
          onPress={onDelete}
        >
          <Trash2 color={theme.colors.error} size={16} />
          <Text
            style={[styles.actionButtonText, { color: theme.colors.error }]}
          >
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function InvestmentsScreen({ navigation }) {
  const { session } = useAuth();
  const { theme } = useTheme();
  const [investments, setInvestments] = useState([]);
  const [filteredInvestments, setFilteredInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [alertProps, setAlertProps] = useState({ open: false });
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });
  const [showDatePicker, setShowDatePicker] = useState(null);

  const INVESTMENT_TYPES = [
    "All",
    "Stocks",
    "Mutual Funds",
    "FD",
    "Crypto",
    "Gold",
    "Bonds",
    "Real Estate",
    "Others",
  ];

  const fetchInvestments = useCallback(
    async (withPrices = true) => {
      if (!session) return;
      if (!withPrices) setLoading(true);
      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false });

      if (error) {
        showErrorAlert(error.message);
        setLoading(false);
        return;
      }

      if (withPrices && data) {
        setIsSyncing(true);
        const investmentsWithPrices = await fetchInvestmentPrices(data);
        setInvestments(investmentsWithPrices);
        setIsSyncing(false);
      } else if (data) {
        setInvestments(data);
      }
      setLoading(false);
    },
    [session]
  );

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  useEffect(() => {
    let filtered = [...investments];
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.title?.toLowerCase().includes(lowercasedQuery) ||
          inv.type?.toLowerCase().includes(lowercasedQuery) ||
          inv.description?.toLowerCase().includes(lowercasedQuery)
      );
    }
    if (selectedType !== "All") {
      filtered = filtered.filter((inv) => inv.type === selectedType);
    }
    if (dateRange.startDate && dateRange.endDate) {
      filtered = filtered.filter((inv) => {
        const invDate = new Date(inv.date);
        return invDate >= dateRange.startDate && invDate <= dateRange.endDate;
      });
    }
    filtered.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case "amount":
          aValue = parseFloat(a.total_cost || 0);
          bValue = parseFloat(b.total_cost || 0);
          break;
        case "title":
          aValue = a.title?.toLowerCase();
          bValue = b.title?.toLowerCase();
          break;
        default:
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
      }
      if (sortOrder === "asc") return aValue > bValue ? 1 : -1;
      return aValue < bValue ? 1 : -1;
    });
    setFilteredInvestments(filtered);
  }, [investments, searchQuery, selectedType, sortBy, sortOrder, dateRange]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchInvestments(true); // Always fetch prices on refresh
    setRefreshing(false);
  }, [fetchInvestments]);

  const onSyncPrices = async () => {
    setIsSyncing(true);
    const investmentsWithPrices = await fetchInvestmentPrices(investments);
    setInvestments(investmentsWithPrices);
    setIsSyncing(false);
  };

  const handleOpenModal = (investment = null) => {
    if (investment) {
      // If editing, map `total_cost` from DB to `amount` for the form
      setEditingInvestment({
        ...investment,
        amount: investment.total_cost ? String(investment.total_cost) : "",
      });
    } else {
      // If adding, create a new object with default values
      setEditingInvestment({
        id: null,
        title: "",
        amount: "",
        type: "Stocks",
        date: new Date().toISOString().slice(0, 10),
        description: "",
        api_symbol: "",
        quantity: "",
      });
    }
    setShowEditModal(true);
  };

  const showSuccessAlert = (message) =>
    setAlertProps({
      open: true,
      title: "Success",
      message,
      confirmText: "OK",
      showCancel: false,
      icon: <DollarSign color="#fff" size={40} />,
      iconBg: theme.colors.primary,
      confirmColor: theme.colors.primary,
      onConfirm: () => setAlertProps((p) => ({ ...p, open: false })),
    });
  const showErrorAlert = (message) =>
    setAlertProps({
      open: true,
      title: "Error",
      message,
      confirmText: "OK",
      showCancel: false,
      icon: <Trash2 color="#fff" size={40} />,
      iconBg: theme.colors.error,
      confirmColor: theme.colors.error,
      onConfirm: () => setAlertProps((p) => ({ ...p, open: false })),
    });

  const confirmDelete = (investment) =>
    setAlertProps({
      open: true,
      title: "Delete Investment",
      message: `Delete "${investment.title}"?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      icon: <Trash2 color="#fff" size={40} />,
      iconBg: theme.colors.error,
      confirmColor: theme.colors.error,
      onConfirm: () => {
        setAlertProps((p) => ({ ...p, open: false }));
        deleteInvestment(investment.id);
      },
      onCancel: () => setAlertProps((p) => ({ ...p, open: false })),
    });

  const deleteInvestment = async (id) => {
    const { error } = await supabase.from("investments").delete().eq("id", id);
    if (!error) {
      setInvestments((prev) => prev.filter((inv) => inv.id !== id));
      showSuccessAlert("Investment deleted successfully!");
    } else {
      showErrorAlert("Failed to delete. Try again.");
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(null);
    if (selectedDate) {
      if (showDatePicker === "startDate") {
        setDateRange({ ...dateRange, startDate: selectedDate });
      } else {
        setDateRange({ ...dateRange, endDate: selectedDate });
      }
    }
  };

  const totalInvested = useMemo(
    () =>
      filteredInvestments.reduce(
        (sum, inv) => sum + parseFloat(inv.total_cost || 0),
        0
      ),
    [filteredInvestments]
  );
  const totalCurrentValue = useMemo(
    () =>
      filteredInvestments.reduce(
        (sum, inv) =>
          sum + (inv.currentValue || parseFloat(inv.total_cost || 0)),
        0
      ),
    [filteredInvestments]
  );
  const totalProfitLoss = totalCurrentValue - totalInvested;
  const isTotalProfit = totalProfitLoss >= 0;

  const handleSaveInvestment = async () => {
    if (
      !editingInvestment ||
      !editingInvestment.title ||
      !editingInvestment.amount
    ) {
      showErrorAlert("Please fill in the Title and Amount fields.");
      return;
    }

    // Prepare the payload for Supabase, mapping form `amount` to `total_cost`
    const { id, amount, ...rest } = editingInvestment;
    const payload = {
      ...rest,
      total_cost: parseFloat(amount) || 0,
      quantity: parseFloat(editingInvestment.quantity) || null,
    };
    // Remove the 'amount' property from the payload to avoid inserting it into the DB
    delete payload.amount;

    if (id) {
      // Update existing investment
      const { error } = await supabase
        .from("investments")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (!error) {
        showSuccessAlert("Investment updated successfully!");
        setShowEditModal(false);
        fetchInvestments();
      } else {
        showErrorAlert(`Update failed: ${error.message}`);
      }
    } else {
      // Add new investment
      const { data, error } = await supabase
        .from("investments")
        .insert([{ ...payload, user_id: session.user.id }])
        .select();
      if (!error && data) {
        showSuccessAlert("Investment added successfully!");
        setShowEditModal(false);
        fetchInvestments();
      } else {
        showErrorAlert(`Add failed: ${error.message}`);
      }
    }
  };

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
          Investments
        </Text>
        <TouchableOpacity
          style={[
            styles.headerButton,
            { backgroundColor: theme.colors.buttonSecondary },
          ]}
          onPress={() => handleOpenModal()}
        >
          <Plus color={theme.colors.primary} size={24} />
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
        <View style={styles.summaryItem}>
          <Text
            style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}
          >
            Total Invested
          </Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
            ₹{totalInvested.toLocaleString()}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text
            style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}
          >
            Current Value
          </Text>
          <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>
            ₹
            {totalCurrentValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text
            style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}
          >
            Total P/L
          </Text>
          <Text
            style={[
              styles.summaryValue,
              {
                color: isTotalProfit
                  ? theme.colors.success
                  : theme.colors.error,
              },
            ]}
          >
            {isTotalProfit ? "+" : ""}₹
            {totalProfitLoss.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </Text>
        </View>
      </View>

      <View style={styles.actionBar}>
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
            placeholder="Search investments..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.iconButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderLight,
            },
          ]}
          onPress={onSyncPrices}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator color={theme.colors.primary} size="small" />
          ) : (
            <RefreshCw color={theme.colors.primary} size={20} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.iconButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderLight,
            },
          ]}
          onPress={() => setShowFilters(true)}
        >
          <Filter color={theme.colors.primary} size={20} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          style={{ marginTop: 50 }}
          size="large"
          color={theme.colors.primary}
        />
      ) : (
        <FlatList
          data={filteredInvestments}
          renderItem={({ item }) => (
            <InvestmentCard
              investment={item}
              onEdit={() => handleOpenModal(item)}
              onDelete={() => confirmDelete(item)}
            />
          )}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Eye color={theme.colors.textTertiary} size={64} />
              <Text
                style={[styles.emptyStateTitle, { color: theme.colors.text }]}
              >
                No investments found
              </Text>
              <Text
                style={[
                  styles.emptyStateText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {searchQuery || selectedType !== "All"
                  ? "Try adjusting your search or filters."
                  : "Tap the '+' to add a new investment."}
              </Text>
            </View>
          }
        />
      )}

      <Alert {...alertProps} />

      {showFilters && (
        <Modal
          visible={showFilters}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowFilters(false)}
        >
          <TouchableOpacity
            style={styles.filterOverlay}
            onPress={() => setShowFilters(false)}
            activeOpacity={1}
          >
            <View
              style={[
                styles.filterModal,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <View style={styles.filterHeader}>
                <Text
                  style={[styles.filterTitle, { color: theme.colors.text }]}
                >
                  Filter & Sort
                </Text>
                <TouchableOpacity onPress={() => setShowFilters(false)}>
                  <Text
                    style={[
                      styles.closeButton,
                      { color: theme.colors.textTertiary },
                    ]}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView>
                <View style={styles.filterSection}>
                  <Text
                    style={[
                      styles.filterSectionTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    Date Range
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => setShowDatePicker("startDate")}
                      style={[
                        styles.datePickerButton,
                        { borderColor: theme.colors.border },
                      ]}
                    >
                      <Text style={{ color: theme.colors.text }}>
                        {dateRange.startDate
                          ? formatDate(dateRange.startDate)
                          : "Start Date"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker("endDate")}
                      style={[
                        styles.datePickerButton,
                        { borderColor: theme.colors.border },
                      ]}
                    >
                      <Text style={{ color: theme.colors.text }}>
                        {dateRange.endDate
                          ? formatDate(dateRange.endDate)
                          : "End Date"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {showDatePicker && (
                    <DateTimePicker
                      value={
                        (showDatePicker === "startDate"
                          ? dateRange.startDate
                          : dateRange.endDate) || new Date()
                      }
                      mode="date"
                      display="default"
                      onChange={onDateChange}
                    />
                  )}
                </View>
                <View style={styles.filterSection}>
                  <Text
                    style={[
                      styles.filterSectionTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    Type
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {INVESTMENT_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.categoryFilter,
                          {
                            backgroundColor:
                              selectedType === type
                                ? theme.colors.primary
                                : theme.colors.buttonSecondary,
                          },
                        ]}
                        onPress={() => setSelectedType(type)}
                      >
                        <Text
                          style={{
                            color:
                              selectedType === type
                                ? "#fff"
                                : theme.colors.textSecondary,
                          }}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={styles.filterSection}>
                  <Text
                    style={[
                      styles.filterSectionTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    Sort By
                  </Text>
                  <View style={styles.sortOptions}>
                    {[
                      { key: "date", label: "Date" },
                      { key: "amount", label: "Amount" },
                      { key: "title", label: "Title" },
                    ].map((opt) => (
                      <TouchableOpacity
                        key={opt.key}
                        style={[
                          styles.sortOption,
                          {
                            backgroundColor:
                              sortBy === opt.key
                                ? theme.colors.primary
                                : theme.colors.buttonSecondary,
                          },
                        ]}
                        onPress={() => setSortBy(opt.key)}
                      >
                        <Text
                          style={{
                            color:
                              sortBy === opt.key
                                ? "#fff"
                                : theme.colors.textSecondary,
                          }}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.filterSection}>
                  <Text
                    style={[
                      styles.filterSectionTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    Sort Order
                  </Text>
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
                        color={
                          sortOrder === "desc"
                            ? "#fff"
                            : theme.colors.textSecondary
                        }
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
                        color={
                          sortOrder === "asc"
                            ? "#fff"
                            : theme.colors.textSecondary
                        }
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
                  style={[
                    styles.applyFiltersButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={() => setShowFilters(false)}
                >
                  <Text style={styles.applyFiltersText}>Apply</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {showEditModal && editingInvestment && (
        <Modal
          visible={showEditModal}
          animationType="slide"
          onRequestClose={() => setShowEditModal(false)}
        >
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                {
                  backgroundColor: theme.colors.surface,
                  borderBottomColor: theme.colors.border,
                },
              ]}
            >
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <ArrowLeft color={theme.colors.text} size={24} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {editingInvestment.id ? "Edit" : "Add"} Investment
              </Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView style={styles.modalContent}>
              <Text style={[styles.modalLabel, { color: theme.colors.text }]}>
                Title
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderLight,
                    color: theme.colors.text,
                  },
                ]}
                value={editingInvestment.title}
                onChangeText={(text) =>
                  setEditingInvestment((e) => ({ ...e, title: text }))
                }
                placeholder="e.g., Apple Inc."
              />
              <Text style={[styles.modalLabel, { color: theme.colors.text }]}>
                Amount Invested
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderLight,
                    color: theme.colors.text,
                  },
                ]}
                value={editingInvestment.amount}
                onChangeText={(text) =>
                  setEditingInvestment((e) => ({ ...e, amount: text }))
                }
                placeholder="e.g., 5000"
                keyboardType="decimal-pad"
              />
              <Text style={[styles.modalLabel, { color: theme.colors.text }]}>
                Date
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderLight,
                    color: theme.colors.text,
                  },
                ]}
                value={editingInvestment.date}
                onChangeText={(text) =>
                  setEditingInvestment((e) => ({ ...e, date: text }))
                }
                placeholder="YYYY-MM-DD"
              />
              <Text style={[styles.modalLabel, { color: theme.colors.text }]}>
                Type
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {INVESTMENT_TYPES.slice(1).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.categoryFilter,
                      {
                        backgroundColor:
                          editingInvestment.type === type
                            ? theme.colors.primary
                            : theme.colors.buttonSecondary,
                      },
                    ]}
                    onPress={() =>
                      setEditingInvestment((e) => ({ ...e, type }))
                    }
                  >
                    <Text
                      style={{
                        color:
                          editingInvestment.type === type
                            ? "#fff"
                            : theme.colors.textSecondary,
                      }}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {(editingInvestment.type === "Stocks" ||
                editingInvestment.type === "Crypto") && (
                <>
                  <Text
                    style={[styles.modalLabel, { color: theme.colors.text }]}
                  >
                    API Symbol
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.borderLight,
                        color: theme.colors.text,
                      },
                    ]}
                    value={editingInvestment.api_symbol}
                    onChangeText={(text) =>
                      setEditingInvestment((e) => ({
                        ...e,
                        api_symbol: text.toUpperCase(),
                      }))
                    }
                    placeholder={
                      editingInvestment.type === "Stocks"
                        ? "e.g., AAPL"
                        : "e.g., BTC"
                    }
                    autoCapitalize="characters"
                  />
                  <Text
                    style={[styles.modalLabel, { color: theme.colors.text }]}
                  >
                    Quantity
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.borderLight,
                        color: theme.colors.text,
                      },
                    ]}
                    value={String(editingInvestment.quantity || "")}
                    onChangeText={(text) =>
                      setEditingInvestment((e) => ({ ...e, quantity: text }))
                    }
                    placeholder="e.g., 10"
                    keyboardType="decimal-pad"
                  />
                </>
              )}
              <Text style={[styles.modalLabel, { color: theme.colors.text }]}>
                Description
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  styles.modalTextArea,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderLight,
                    color: theme.colors.text,
                  },
                ]}
                value={editingInvestment.description || ""}
                onChangeText={(text) =>
                  setEditingInvestment((e) => ({ ...e, description: text }))
                }
                placeholder="(Optional)"
                multiline
              />
            </ScrollView>
            <View
              style={[
                styles.modalButtonContainer,
                { borderTopColor: theme.colors.border },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.buttonSecondary },
                ]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={handleSaveInvestment}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
  },
  headerButton: { padding: 8, borderRadius: 12 },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  summaryCard: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  summaryValue: { fontSize: 18, fontWeight: "700" },
  actionBar: {
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
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, paddingVertical: 10 },
  iconButton: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  investmentCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardEmoji: { fontSize: 20 },
  cardInfo: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardType: { fontSize: 14, color: "#666", marginTop: 2 },
  cardDate: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  cardDateText: { fontSize: 12, marginLeft: 4 },
  cardAmountContainer: { alignItems: "flex-end" },
  amountText: { fontSize: 16, fontWeight: "700" },
  realTimeSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  realTimeItem: { alignItems: "center", flex: 1 },
  realTimeLabel: { fontSize: 12, marginBottom: 4 },
  currentValue: { fontSize: 14, fontWeight: "bold" },
  profitLoss: { fontSize: 14, fontWeight: "bold" },
  percentageChange: { fontSize: 14, fontWeight: "bold" },
  cardDescription: {
    fontSize: 14,
    marginTop: 12,
    lineHeight: 20,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    marginTop: 12,
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
  actionButtonText: { fontWeight: "600", fontSize: 14, marginLeft: 6 },
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
    marginBottom: 24,
  },
  filterOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  filterModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  filterTitle: { fontSize: 20, fontWeight: "700" },
  closeButton: { fontSize: 24, fontWeight: "300" },
  filterSection: { marginBottom: 24 },
  filterSectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  datePickerButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  categoryFilter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  sortOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  sortOptionText: { fontSize: 14, fontWeight: "600", marginLeft: 6 },
  applyFiltersButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  applyFiltersText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  modalContent: { flex: 1, padding: 20 },
  modalLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
  },
  modalInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  modalTextArea: { height: 100, textAlignVertical: "top" },
  modalButtonContainer: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  modalButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: "center" },
});
