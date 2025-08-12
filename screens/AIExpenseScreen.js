import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  TextInput,
  Modal,
  Animated,
  StatusBar,
  FlatList,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Toast from "react-native-toast-message";
import { useTheme } from "../context/ThemeContext";
// Recommendation: For amount fields, consider using a library like 'react-native-currency-input'.
// It provides formatting and validation out of the box, improving user experience and data consistency.
// import CurrencyInput from 'react-native-currency-input';

const { width, height } = Dimensions.get("window");

// Constants can be moved to a separate file (e.g., constants.js)
const CATEGORIES = [
  {
    id: "Food & Dining",
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
const QUICK_AMOUNTS = [10, 25, 50, 100, 200, 500];

// --- Refactored and New Components ---

// Reusable Input Component for Modals/Forms
const FormInput = ({ label, theme, children }) => (
  <View style={styles.inputGroup}>
    <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
      {label}
    </Text>
    {children}
  </View>
);

// Category Selection Modal
const CategoryModal = ({ visible, onClose, onSelect, theme }) => (
  <Modal
    visible={visible}
    animationType="slide"
    presentationStyle="pageSheet"
    onRequestClose={onClose}
  >
    <SafeAreaView
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
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color={theme.colors.textTertiary} />
        </TouchableOpacity>
        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
          Select Category
        </Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryItem,
              { backgroundColor: theme.colors.surface },
            ]}
            onPress={() => onSelect(item)}
          >
            <View
              style={[
                styles.categoryIconContainer,
                { backgroundColor: item.color },
              ]}
            >
              <Text style={styles.categoryEmoji}>{item.emoji}</Text>
            </View>
            <Text style={[styles.categoryName, { color: theme.colors.text }]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.categoryList}
      />
    </SafeAreaView>
  </Modal>
);

// Main Screen Component
export default function AIExpenseScreen({ navigation }) {
  const { session } = useAuth();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState("ai");

  // State for AI Scanner
  const [image, setImage] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // State for Manual Entry
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(null); // Use category object now
  const [date, setDate] = useState(new Date());

  // State for Income Entry
  const [incomeSource, setIncomeSource] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");

  // Shared State
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const tabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(tabAnim, {
      toValue: activeTab === "ai" ? 0 : activeTab === "manual" ? 1 : 2,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [activeTab]);

  const handleImagePicker = async (useCamera = false) => {
    Haptics.selectionAsync();
    const action = useCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
    const permission = useCamera
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;

    const { status } = await permission();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        `Please grant ${
          useCamera ? "camera" : "photo library"
        } access to continue.`
      );
      return;
    }

    const result = await action({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8, // Slightly lower quality for faster uploads
    });

    if (!result.canceled && result.assets?.length > 0) {
      setImage(result.assets[0].uri);
      setExtractedData(null); // Reset previous data
    }
  };

  const extractReceiptData = async () => {
    if (!image) return;

    setIsExtracting(true);
    try {
      const base64Image = await FileSystem.readAsStringAsync(image, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // =================================================================
      // SECURE API CALL: This should be made to YOUR backend endpoint.
      // Your backend will then securely call the Gemini API.
      // The Gemini API key should never be stored in the app's code.
      // Replace 'YOUR_BACKEND_URL' with your actual backend endpoint.
      // =================================================================
      const response = await fetch("YOUR_BACKEND_URL/api/extract-receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`, // Secure your endpoint
        },
        body: JSON.stringify({ image: base64Image }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract data.");
      }

      // Recommendation: Add a confidence score to the extracted data.
      // This can be used to highlight fields that the AI is unsure about.
      setExtractedData(data);
      Toast.show({
        type: "success",
        text1: "Data Extracted!",
        text2: "Please review and save.",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Extraction Failed",
        text2: error.message,
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);
    let dataToSave = {};
    let table = "expenses";
    let successMessage = "Expense Saved!";

    if (activeTab === "ai") {
      if (!extractedData) {
        Toast.show({ type: "error", text1: "No data to save." });
        setIsSaving(false);
        return;
      }
      dataToSave = {
        title: extractedData.merchant,
        amount: parseFloat(extractedData.amount),
        category: extractedData.category,
        date: extractedData.date,
      };
    } else if (activeTab === "manual") {
      if (!title.trim() || !amount || !category) {
        Toast.show({
          type: "error",
          text1: "Missing Fields",
          text2: "Please fill all required fields.",
        });
        setIsSaving(false);
        return;
      }
      dataToSave = {
        title: title.trim(),
        amount: parseFloat(amount),
        category: category.id,
        date: date.toISOString().split("T")[0],
      };
    } else {
      // Income
      table = "side_incomes";
      successMessage = "Income Saved!";
      if (!incomeSource.trim() || !incomeAmount) {
        Toast.show({
          type: "error",
          text1: "Missing Fields",
          text2: "Please fill all required fields.",
        });
        setIsSaving(false);
        return;
      }
      dataToSave = {
        source: incomeSource.trim(),
        amount: parseFloat(incomeAmount),
        date: date.toISOString().split("T")[0],
      };
    }

    try {
      const { error } = await supabase
        .from(table)
        .insert([{ ...dataToSave, user_id: session.user.id }]);
      if (error) throw error;

      Toast.show({ type: "success", text1: "Success!", text2: successMessage });
      resetForm();
      navigation.goBack();
    } catch (error) {
      Toast.show({ type: "error", text1: "Save Failed", text2: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setImage(null);
    setExtractedData(null);
    setTitle("");
    setAmount("");
    setCategory(null);
    setDate(new Date());
    setIncomeSource("");
    setIncomeAmount("");
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const renderTabContent = () => {
    // This could be further broken down into separate components (AIScanner.js, ManualEntry.js, etc.)
    switch (activeTab) {
      case "ai":
        return (
          <View style={styles.tabContent}>
            <TouchableOpacity
              style={[
                styles.uploadButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => handleImagePicker()}
            >
              {image ? (
                <Image source={{ uri: image }} style={styles.receiptImage} />
              ) : (
                <>
                  <Ionicons
                    name="camera-outline"
                    size={32}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[styles.uploadText, { color: theme.colors.text }]}
                  >
                    Add Receipt
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {image && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: theme.colors.primary },
                  isExtracting && styles.buttonDisabled,
                ]}
                onPress={extractReceiptData}
                disabled={isExtracting}
              >
                {isExtracting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionButtonText}>Extract Data</Text>
                )}
              </TouchableOpacity>
            )}
            {extractedData && (
              <View
                style={[
                  styles.resultsCard,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Text>Merchant: {extractedData.merchant}</Text>
                <Text>Amount: {extractedData.amount}</Text>
                <Text>Category: {extractedData.category}</Text>
                <Text>Date: {extractedData.date}</Text>
              </View>
            )}
          </View>
        );
      case "manual":
        return (
          <View style={styles.tabContent}>
            <FormInput label="Expense Title" theme={theme}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                  },
                ]}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Coffee with friends"
              />
            </FormInput>
            <FormInput label="Amount" theme={theme}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                  },
                ]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0.00"
              />
            </FormInput>
            <FormInput label="Category" theme={theme}>
              <TouchableOpacity
                style={[
                  styles.input,
                  styles.pickerButton,
                  { backgroundColor: theme.colors.card },
                ]}
                onPress={() => setShowCategoryModal(true)}
              >
                <Text
                  style={{
                    color: category
                      ? theme.colors.text
                      : theme.colors.textTertiary,
                  }}
                >
                  {category
                    ? `${category.emoji} ${category.name}`
                    : "Select a category"}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={theme.colors.textTertiary}
                />
              </TouchableOpacity>
            </FormInput>
            <FormInput label="Date" theme={theme}>
              <TouchableOpacity
                style={[
                  styles.input,
                  styles.pickerButton,
                  { backgroundColor: theme.colors.card },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: theme.colors.text }}>
                  {date.toLocaleDateString()}
                </Text>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={theme.colors.textTertiary}
                />
              </TouchableOpacity>
            </FormInput>
          </View>
        );
      case "income":
        return (
          <View style={styles.tabContent}>
            <FormInput label="Income Source" theme={theme}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                  },
                ]}
                value={incomeSource}
                onChangeText={setIncomeSource}
                placeholder="e.g., Monthly Salary, Project X"
              />
            </FormInput>
            <FormInput label="Amount" theme={theme}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                  },
                ]}
                value={incomeAmount}
                onChangeText={setIncomeAmount}
                keyboardType="numeric"
                placeholder="0.00"
              />
            </FormInput>
            <FormInput label="Date" theme={theme}>
              <TouchableOpacity
                style={[
                  styles.input,
                  styles.pickerButton,
                  { backgroundColor: theme.colors.card },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: theme.colors.text }}>
                  {date.toLocaleDateString()}
                </Text>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={theme.colors.textTertiary}
                />
              </TouchableOpacity>
            </FormInput>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar
        barStyle={theme.name === "dark" ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.background}
      />
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Add Entry
        </Text>
        <TouchableOpacity onPress={resetForm}>
          <Ionicons name="refresh" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View
        style={[styles.tabContainer, { backgroundColor: theme.colors.surface }]}
      >
        {["ai", "manual", "income"].map((tab, index) => (
          <TouchableOpacity
            key={tab}
            style={styles.tab}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === tab
                      ? theme.colors.primary
                      : theme.colors.textTertiary,
                },
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              backgroundColor: theme.colors.primary,
              left: tabAnim.interpolate({
                inputRange: [0, 1, 2],
                outputRange: ["2%", "35%", "68%"],
              }),
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {renderTabContent()}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: theme.colors.success },
            isSaving && styles.buttonDisabled,
          ]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>
              Save {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <CategoryModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSelect={(item) => {
          setCategory(item);
          setShowCategoryModal(false);
        }}
        theme={theme}
      />
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 40 : 20,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    position: "relative",
    backgroundColor: "#eee",
  },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  tabText: { fontSize: 14, fontWeight: "500" },
  tabIndicator: {
    position: "absolute",
    height: "100%",
    width: "30%",
    top: 0,
    borderRadius: 8,
    zIndex: -1,
    margin: 4,
  },
  scrollContent: { paddingBottom: 32 },
  tabContent: { padding: 20 },
  uploadButton: {
    borderRadius: 16,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderStyle: "dashed",
  },
  receiptImage: { width: "100%", height: "100%", borderRadius: 14 },
  uploadText: { fontSize: 16, fontWeight: "600", marginTop: 8 },
  actionButton: {
    borderRadius: 12,
    padding: 16,
    margin: 20,
    alignItems: "center",
  },
  actionButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  buttonDisabled: { opacity: 0.7 },
  resultsCard: { borderRadius: 16, padding: 20, marginTop: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 8 },
  input: { borderRadius: 12, borderWidth: 1, fontSize: 16, padding: 16 },
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footer: { padding: 20, borderTopWidth: 1, borderColor: "#eee" },

  // Modal and Category Styles
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "600" },
  categoryList: { padding: 20 },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  categoryEmoji: { fontSize: 20 },
  categoryName: { fontSize: 16, fontWeight: "500" },
});
