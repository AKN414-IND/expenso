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
  Modal,
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
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../lib/supabase";
import Alert from "../components/Alert";

export default function InvestmentsScreen({ navigation }) {
  const { session } = useAuth();
  const { theme } = useTheme();
  const [investments, setInvestments] = useState([]);
  const [filteredInvestments, setFilteredInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [alertProps, setAlertProps] = useState({ open: false });

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

  useEffect(() => {
    fetchInvestments();
  }, []);
  useEffect(() => {
    filterAndSortInvestments();
  }, [investments, searchQuery, selectedType, sortBy, sortOrder]);

  const fetchInvestments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("investments")
      .select("*")
      .eq("user_id", session.user.id)
      .order("date", { ascending: false });
    if (!error) setInvestments(data || []);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInvestments();
    setRefreshing(false);
  };

  const filterAndSortInvestments = () => {
    let filtered = [...investments];
    if (searchQuery) {
      filtered = filtered.filter(
        (inv) =>
          inv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inv.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inv.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedType !== "All") {
      filtered = filtered.filter((inv) => inv.type === selectedType);
    }
    filtered.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case "amount":
          aValue = parseFloat(a.amount);
          bValue = parseFloat(b.amount);
          break;
        case "title":
          aValue = a.title?.toLowerCase();
          bValue = b.title?.toLowerCase();
          break;
        case "date":
        default:
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
      }
      if (sortOrder === "asc") return aValue > bValue ? 1 : -1;
      else return aValue < bValue ? 1 : -1;
    });
    setFilteredInvestments(filtered);
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
      confirmTextColor: "#fff",
      onConfirm: () => setAlertProps((prev) => ({ ...prev, open: false })),
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
      confirmTextColor: "#fff",
      onConfirm: () => setAlertProps((prev) => ({ ...prev, open: false })),
    });

  const confirmDelete = (investment) =>
    setAlertProps({
      open: true,
      title: "Delete Investment",
      message: `Are you sure you want to delete "${investment.title}"?`,
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
        deleteInvestment(investment.id);
      },
      onCancel: () => setAlertProps((prev) => ({ ...prev, open: false })),
    });

  const deleteInvestment = async (id) => {
    const { error } = await supabase.from("investments").delete().eq("id", id);
    if (!error) {
      await supabase.from("expenses").delete().match({
        user_id: session.user.id,
        category: "Investments",
        investment_id: id,
      });
      setInvestments((prev) => prev.filter((inv) => inv.id !== id));
      showSuccessAlert("Investment deleted successfully!");
    } else showErrorAlert("Failed to delete. Try again.");
  };

  const totalAmount = useMemo(
    () =>
      filteredInvestments.reduce(
        (sum, inv) => sum + parseFloat(inv.amount || 0),
        0
      ),
    [filteredInvestments]
  );

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const InvestmentCard = ({ investment, index }) => (
    <View
      style={[
        styles.investmentCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderLight,
          marginBottom: index === filteredInvestments.length - 1 ? 20 : 14,
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
          <Text style={styles.cardEmoji}>
            {ICONS[investment.type] || ICONS["Others"]}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text
            style={[styles.cardTitle, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {investment.title}
          </Text>
          <Text
            style={[styles.cardType, { color: theme.colors.textSecondary }]}
          >
            {investment.type}
          </Text>
          <View style={styles.cardDate}>
            <Calendar color={theme.colors.textTertiary} size={12} />
            <Text
              style={[
                styles.cardDateText,
                { color: theme.colors.textTertiary },
              ]}
            >
              {formatDate(investment.date)}
            </Text>
          </View>
        </View>
        <View style={styles.cardAmount}>
          <Text style={[styles.amountText, { color: theme.colors.primary }]}>
            ₹{parseFloat(investment.amount).toLocaleString()}
          </Text>
        </View>
      </View>
      {investment.description ? (
        <Text
          style={[
            styles.cardDescription,
            { color: theme.colors.textSecondary },
          ]}
          numberOfLines={2}
        >
          {investment.description}
        </Text>
      ) : null}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: theme.colors.warning + "15" },
          ]}
          onPress={() => {
            setEditingInvestment(investment);
            setShowEditModal(true);
          }}
        >
          <Edit3 color={theme.colors.warning} size={16} />
          <Text
            style={[styles.editButtonText, { color: theme.colors.warning }]}
          >
            Edit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: theme.colors.error + "15" },
          ]}
          onPress={() => confirmDelete(investment)}
        >
          <Trash2 color={theme.colors.error} size={16} />
          <Text
            style={[styles.deleteButtonText, { color: theme.colors.error }]}
          >
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const FilterModal = () =>
    showFilters && (
      <View style={styles.filterOverlay}>
        <View
          style={[
            styles.filterModal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <View style={styles.filterHeader}>
            <Text style={[styles.filterTitle, { color: theme.colors.text }]}>
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
          <View style={styles.filterSection}>
            <Text
              style={[styles.filterSectionTitle, { color: theme.colors.text }]}
            >
              Type
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryFilters}>
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
                      style={[
                        styles.categoryFilterText,
                        {
                          color:
                            selectedType === type
                              ? "#fff"
                              : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          <View style={styles.filterSection}>
            <Text
              style={[styles.filterSectionTitle, { color: theme.colors.text }]}
            >
              Sort By
            </Text>
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
            <Text
              style={[styles.filterSectionTitle, { color: theme.colors.text }]}
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
            style={[
              styles.applyFiltersButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => setShowFilters(false)}
          >
            <Text style={styles.applyFiltersText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    );

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
          Investments
        </Text>
        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: theme.colors.buttonSecondary },
          ]}
          onPress={() => {
            setEditingInvestment({
              id: null,
              title: "",
              amount: "",
              type: "Stocks",
              date: new Date().toISOString().slice(0, 10),
              description: "",
            });
            setShowEditModal(true);
          }}
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
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text
              style={[
                styles.summaryLabel,
                { color: theme.colors.textTertiary },
              ]}
            >
              Total Investments
            </Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              {filteredInvestments.length}
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
              style={[
                styles.summaryLabel,
                { color: theme.colors.textTertiary },
              ]}
            >
              Total Amount
            </Text>
            <Text
              style={[styles.summaryAmount, { color: theme.colors.primary }]}
            >
              ₹{totalAmount.toLocaleString()}
            </Text>
          </View>
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
            placeholder="Search investments..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
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
          onPress={() => setShowFilters(true)}
        >
          <Filter color={theme.colors.primary} size={20} />
        </TouchableOpacity>
      </View>
      {(selectedType !== "All" || searchQuery) && (
        <View style={styles.activeFilters}>
          <Text
            style={[
              styles.activeFiltersLabel,
              { color: theme.colors.textSecondary },
            ]}
          >
            Active filters:
          </Text>
          {selectedType !== "All" && (
            <View
              style={[
                styles.activeFilterTag,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Text style={styles.activeFilterText}>{selectedType}</Text>
              <TouchableOpacity onPress={() => setSelectedType("All")}>
                <Text style={styles.removeFilterText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          {searchQuery && (
            <View
              style={[
                styles.activeFilterTag,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Text style={styles.activeFilterText}>"{searchQuery}"</Text>
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Text style={styles.removeFilterText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      <FlatList
        data={filteredInvestments}
        renderItem={({ item, index }) => (
          <InvestmentCard investment={item} index={index} />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Eye color={theme.colors.textTertiary} size={64} />
            <Text
              style={[styles.emptyStateTitle, { color: theme.colors.text }]}
            >
              {loading ? "Loading..." : "No investments found"}
            </Text>
            <Text
              style={[
                styles.emptyStateText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {searchQuery || selectedType !== "All"
                ? "Try adjusting your search or filters"
                : "Start tracking your investments by adding your first investment"}
            </Text>
            <TouchableOpacity
              style={[
                styles.addExpenseButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => {
                setEditingInvestment({
                  id: null,
                  title: "",
                  amount: "",
                  type: "Stocks",
                  date: new Date().toISOString().slice(0, 10),
                  description: "",
                });
                setShowEditModal(true);
              }}
            >
              <Plus color="#fff" size={20} />
              <Text style={styles.addExpenseButtonText}>Add Investment</Text>
            </TouchableOpacity>
          </View>
        }
      />
      <FilterModal />
      <Alert {...alertProps} />
      <Modal visible={showEditModal} animationType="slide" transparent={false}>
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
              {editingInvestment?.id ? "Edit Investment" : "Add Investment"}
            </Text>
            <View style={styles.placeholder} />
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalSection}>
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
                value={editingInvestment?.title}
                onChangeText={(text) =>
                  setEditingInvestment({ ...editingInvestment, title: text })
                }
                placeholder="Investment Title"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: theme.colors.text }]}>
                Amount
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
                value={String(editingInvestment?.amount)}
                onChangeText={(text) =>
                  setEditingInvestment({ ...editingInvestment, amount: text })
                }
                placeholder="Amount"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.modalSection}>
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
                value={editingInvestment?.date}
                onChangeText={(text) =>
                  setEditingInvestment({ ...editingInvestment, date: text })
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: theme.colors.text }]}>
                Type
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryEditScroll}
              >
                {INVESTMENT_TYPES.slice(1).map((type) => {
                  const isActive = editingInvestment?.type === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.categoryEditChip,
                        isActive && [
                          styles.categoryEditChipActive,
                          { backgroundColor: "#eee", borderColor: "#333" },
                        ],
                      ]}
                      onPress={() =>
                        setEditingInvestment({ ...editingInvestment, type })
                      }
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.categoryEditChipEmoji,
                          isActive && styles.categoryEditChipEmojiActive,
                        ]}
                      >
                        {ICONS[type]}
                      </Text>
                      <Text
                        style={[
                          styles.categoryEditChipText,
                          isActive && styles.categoryEditChipTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
            <View style={styles.modalSection}>
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
                value={editingInvestment?.description || ""}
                onChangeText={(text) =>
                  setEditingInvestment({
                    ...editingInvestment,
                    description: text,
                  })
                }
                placeholder="Description (optional)"
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>
          <View
            style={[
              styles.modalButtonContainer,
              {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.border,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.modalCancelButton,
                {
                  backgroundColor: theme.colors.buttonSecondary,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => setShowEditModal(false)}
            >
              <Text
                style={[
                  styles.modalCancelButtonText,
                  { color: theme.colors.text },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={async () => {
                if (editingInvestment?.id) {
                  const { error } = await supabase
                    .from("investments")
                    .update({
                      title: editingInvestment.title,
                      amount: editingInvestment.amount,
                      type: editingInvestment.type,
                      date: editingInvestment.date,
                      description: editingInvestment.description,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", editingInvestment.id);

                  if (!error) {
                    await supabase
                      .from("expenses")
                      .update({
                        title: editingInvestment.title,
                        amount: editingInvestment.amount,
                        date: editingInvestment.date,
                        description: `Investment: ${editingInvestment.type}`,
                      })
                      .match({
                        user_id: session.user.id,
                        category: "Investments",
                        investment_id: editingInvestment.id,
                      });
                    setShowEditModal(false);
                    fetchInvestments();
                    showSuccessAlert("Investment updated successfully!");
                  } else {
                    showErrorAlert("Failed to update. Please try again.");
                  }
                } else {
                  const { data, error } = await supabase
                    .from("investments")
                    .insert([
                      {
                        user_id: session.user.id,
                        title: editingInvestment.title,
                        amount: editingInvestment.amount,
                        type: editingInvestment.type,
                        date: editingInvestment.date,
                        description: editingInvestment.description,
                      },
                    ])
                    .select();

                  if (!error && data && data[0]) {
                    const investment = data[0];
                    await supabase.from("expenses").insert([
                      {
                        user_id: session.user.id,
                        title: investment.title,
                        amount: investment.amount,
                        category: "Investments",
                        date: investment.date,
                        description: `Investment: ${investment.type}`,
                        investment_id: investment.id,
                      },
                    ]);
                    setShowEditModal(false);
                    fetchInvestments();
                    showSuccessAlert("Investment added successfully!");
                  } else {
                    showErrorAlert(
                      "Failed to add investment. Please try again."
                    );
                  }
                }
              }}
            >
              <Text style={styles.modalButtonText}>
                {editingInvestment?.id ? "Save Changes" : "Add Investment"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  summaryCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    elevation: 2,
  },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryDivider: { width: 1, height: 40, marginHorizontal: 20 },
  summaryLabel: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  summaryValue: { fontSize: 24, fontWeight: "700" },
  summaryAmount: { fontSize: 24, fontWeight: "700" },
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
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16 },
  filterButton: { borderRadius: 12, padding: 12, borderWidth: 1, elevation: 1 },
  activeFilters: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexWrap: "wrap",
  },
  activeFiltersLabel: { fontSize: 14, marginRight: 8 },
  activeFilterTag: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
  },
  activeFilterText: { fontSize: 12, fontWeight: "600", marginRight: 4 },
  removeFilterText: { fontSize: 12, fontWeight: "700" },
  listContainer: { paddingHorizontal: 20, paddingTop: 10 },
  investmentCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    elevation: 2,
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
  cardInfo: { flex: 1, marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  cardType: { fontSize: 14, marginBottom: 4 },
  cardDate: { flexDirection: "row", alignItems: "center" },
  cardDateText: { fontSize: 12, marginLeft: 4 },
  cardAmount: { alignItems: "flex-end" },
  amountText: { fontSize: 18, fontWeight: "700" },
  cardDescription: { fontSize: 14, marginBottom: 12, lineHeight: 20 },
  cardActions: {
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
  viewButtonText: { fontWeight: "600", fontSize: 14, marginLeft: 4 },
  editButtonText: { fontWeight: "600", fontSize: 14, marginLeft: 4 },
  deleteButtonText: { fontWeight: "600", fontSize: 14, marginLeft: 4 },
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
  filterTitle: { fontSize: 20, fontWeight: "700" },
  closeButton: { fontSize: 24, fontWeight: "300" },
  filterSection: { marginBottom: 24 },
  filterSectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  categoryFilters: { flexDirection: "row", paddingVertical: 4 },
  categoryFilter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryFilterText: { fontSize: 14, fontWeight: "600" },
  sortOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  sortOptionText: { fontSize: 14, fontWeight: "600", marginLeft: 6 },
  applyFiltersButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  applyFiltersText: { fontSize: 16, fontWeight: "700" },
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
  modalTitle: { fontSize: 20, fontWeight: "700", letterSpacing: 0.3 },
  modalContent: { flex: 1, padding: 20 },
  modalSection: { marginBottom: 24 },
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
  modalTextArea: { height: 100, textAlignVertical: "top" },
  categoryEditScroll: { flexDirection: "row", paddingVertical: 8, gap: 12 },
  categoryEditChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  categoryEditChipActive: { borderWidth: 2 },
  categoryEditChipEmoji: { fontSize: 16, marginRight: 8 },
  categoryEditChipText: { fontSize: 14, fontWeight: "600" },
  categoryEditChipTextActive: { fontWeight: "700" },
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
  modalButtonText: { fontWeight: "700", fontSize: 16, letterSpacing: 0.3 },
  modalCancelButton: {
    shadowColor: "transparent",
    elevation: 0,
    borderWidth: 1,
  },
});
