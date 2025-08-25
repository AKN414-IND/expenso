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
  Search,
  Filter,
  DollarSign,
  Trash2,
  Eye,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../lib/supabase";
import Alert from "../components/Alert";
import DateTimePicker from "@react-native-community/datetimepicker";
import { fetchInvestmentPrices } from "../services/api";
import InvestmentCard from "../components/InvestmentCard";

const formatDate = (date) => {
  if (!date) return "No Date";
  // Ensure date is treated as UTC to prevent timezone shifts
  const d = new Date(date);
  return new Date(
    d.getTime() + d.getTimezoneOffset() * 60000
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

      // Ensure numeric fields are numbers
      const parsedData = data.map((inv) => ({
        ...inv,
        total_cost: parseFloat(inv.total_cost),
        quantity: inv.quantity ? parseFloat(inv.quantity) : null,
        purchase_price: inv.purchase_price
          ? parseFloat(inv.purchase_price)
          : null,
      }));

      if (withPrices && parsedData) {
        setIsSyncing(true);
        const investmentsWithPrices = await fetchInvestmentPrices(parsedData);
        setInvestments(investmentsWithPrices);
        setIsSyncing(false);
      } else if (parsedData) {
        setInvestments(parsedData);
      }
      setLoading(false);
    },
    [session]
  );

  useEffect(() => {
    if (session) {
      fetchInvestments();
    }
  }, [session, fetchInvestments]);

  // Filtering and Sorting Logic
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
          aValue = a.total_cost || 0;
          bValue = b.total_cost || 0;
          break;
        case "title":
          aValue = a.title?.toLowerCase() || "";
          bValue = b.title?.toLowerCase() || "";
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
    await fetchInvestments(true);
    setRefreshing(false);
  }, [fetchInvestments]);

  const onSyncPrices = async () => {
    setIsSyncing(true);
    const investmentsWithPrices = await fetchInvestmentPrices(investments);
    setInvestments(investmentsWithPrices);
    setIsSyncing(false);
  };

  // Modal and Alert handlers
  const handleOpenModal = (investment = null) => {
    if (investment) {
      // When editing, map DB fields to form state, ensuring values are strings for TextInput
      setEditingInvestment({
        ...investment,
        total_cost: String(investment.total_cost || ""),
        quantity: String(investment.quantity || ""),
        purchase_price: String(investment.purchase_price || ""),
      });
    } else {
      // When adding, initialize with default values
      setEditingInvestment({
        id: null,
        title: "",
        total_cost: "",
        type: "Stocks",
        date: new Date().toISOString().slice(0, 10),
        description: "",
        api_symbol: "",
        quantity: "",
        purchase_price: "",
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
      showSuccessAlert("Investment deleted successfully!");
      fetchInvestments(false); // Refetch without price sync for speed
    } else {
      showErrorAlert(`Failed to delete: ${error.message}`);
    }
  };

  // Date Picker handler
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

  // Memoized calculations for summary
  const totalInvested = useMemo(
    () =>
      filteredInvestments.reduce((sum, inv) => sum + (inv.total_cost || 0), 0),
    [filteredInvestments]
  );
  const totalCurrentValue = useMemo(
    () =>
      filteredInvestments.reduce(
        (sum, inv) => sum + (inv.currentValue || inv.total_cost || 0),
        0
      ),
    [filteredInvestments]
  );
  const totalProfitLoss = totalCurrentValue - totalInvested;
  const isTotalProfit = totalProfitLoss >= 0;

  // Main save/update logic
  const handleSaveInvestment = async () => {
    if (
      !editingInvestment ||
      !editingInvestment.title ||
      !editingInvestment.total_cost
    ) {
      showErrorAlert("Please fill in the Title and Total Cost fields.");
      return;
    }

    // Prepare the payload for Supabase, ensuring correct data types
    const payload = {
      title: editingInvestment.title,
      total_cost: parseFloat(editingInvestment.total_cost) || 0,
      type: editingInvestment.type,
      date: editingInvestment.date,
      description: editingInvestment.description || null,
      api_symbol: editingInvestment.api_symbol?.toUpperCase() || null,
      quantity: parseFloat(editingInvestment.quantity) || null,
      purchase_price: parseFloat(editingInvestment.purchase_price) || null,
    };

    if (payload.total_cost <= 0) {
      showErrorAlert("Total Cost must be a positive number.");
      return;
    }

    if (editingInvestment.id) {
      // Update existing investment
      const { error } = await supabase
        .from("investments")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editingInvestment.id);
      if (!error) {
        showSuccessAlert("Investment updated successfully!");
        setShowEditModal(false);
        fetchInvestments();
      } else {
        showErrorAlert(`Update failed: ${error.message}`);
      }
    } else {
      // Add new investment
      const { error } = await supabase
        .from("investments")
        .insert([{ ...payload, user_id: session.user.id }]);
      if (!error) {
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

      {/* Summary Card */}
      <View
        style={[
          styles.summaryContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={styles.summaryRow}>
          <Text
            style={[
              styles.summaryMainLabel,
              { color: theme.colors.textSecondary },
            ]}
          >
            Current Value
          </Text>
          <Text style={[styles.summaryMainValue, { color: theme.colors.text }]}>
            ₹
            {totalCurrentValue.toLocaleString("en-IN", {
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
        <View style={styles.summaryRow}>
          <View style={styles.summarySubItem}>
            <Text
              style={[
                styles.summarySubLabel,
                { color: theme.colors.textTertiary },
              ]}
            >
              Total Invested
            </Text>
            <Text
              style={[
                styles.summarySubValue,
                { color: theme.colors.textSecondary },
              ]}
            >
              ₹
              {totalInvested.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
          <View style={styles.summarySubItem}>
            <Text
              style={[
                styles.summarySubLabel,
                { color: theme.colors.textTertiary },
              ]}
            >
              Total P/L
            </Text>
            <Text
              style={[
                styles.summarySubValue,
                {
                  color: isTotalProfit
                    ? theme.colors.success
                    : theme.colors.error,
                },
              ]}
            >
              {isTotalProfit ? "+" : ""}₹
              {totalProfitLoss.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Bar */}
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

      {/* Investments List */}
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

      {/* Filter Modal */}
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
              {/* Filter content... */}
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Add/Edit Modal */}
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
                Total Cost
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
                value={editingInvestment.total_cost}
                onChangeText={(text) =>
                  setEditingInvestment((e) => ({ ...e, total_cost: text }))
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
                      setEditingInvestment((e) => ({ ...e, api_symbol: text }))
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
                    value={editingInvestment.quantity}
                    onChangeText={(text) =>
                      setEditingInvestment((e) => ({ ...e, quantity: text }))
                    }
                    placeholder="e.g., 10"
                    keyboardType="decimal-pad"
                  />

                  <Text
                    style={[styles.modalLabel, { color: theme.colors.text }]}
                  >
                    Purchase Price (per unit)
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
                    value={editingInvestment.purchase_price}
                    onChangeText={(text) =>
                      setEditingInvestment((e) => ({
                        ...e,
                        purchase_price: text,
                      }))
                    }
                    placeholder="e.g., 150.50"
                    keyboardType="decimal-pad"
                  />
                </>
              )}

              {editingInvestment.type === "FD" && (
                <>
                  <Text
                    style={[styles.modalLabel, { color: theme.colors.text }]}
                  >
                    Interest Rate (% p.a.)
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
                    value={String(editingInvestment.purchase_price || "")}
                    onChangeText={(text) =>
                      setEditingInvestment((e) => ({
                        ...e,
                        purchase_price: text,
                      }))
                    }
                    placeholder="e.g., 7.5"
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
  summaryContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryMainLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  summaryMainValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  summaryDivider: {
    height: 1,
    marginVertical: 16,
  },
  summarySubItem: {
    alignItems: "flex-start",
  },
  summarySubLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  summarySubValue: {
    fontSize: 16,
    fontWeight: "700",
  },
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
  categoryFilter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
});
