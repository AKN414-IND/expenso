import React, { useState, useRef, useEffect } from "react";
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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Toast from 'react-native-toast-message';


const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || "AIzaSyATzDTXJJ64CUQLAwDdOrJFNXJB207dWRk";
const { width, height } = Dimensions.get("window");

const CATEGORIES = [
  {
    id: "Food",
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

export default function CombinedExpenseScreen({ navigation }) {
  const { session } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState("ai"); // "ai" or "manual"

  // AI Scanner states
  const [image, setImage] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [editableData, setEditableData] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [showImagePreview, setShowImagePreview] = useState(false);

  // Manual entry states
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [recentExpenses, setRecentExpenses] = useState([]);

  // Common states
  const [isSaving, setIsSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Animations
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchRecentExpenses();
  }, []);

  useEffect(() => {
    // Animate tab transition
    Animated.timing(tabAnim, {
      toValue: activeTab === "ai" ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [activeTab]);

  const fetchRecentExpenses = async () => {
    try {
      const { data } = await supabase
        .from("expenses")
        .select("title, category")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data) setRecentExpenses(data);
    } catch (error) {
      console.error("Error fetching recent expenses:", error);
    }
  };

  // AI Scanner Functions
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library to select receipt images.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
        base64: false,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets?.length > 0) {
        const selectedImage = result.assets[0];
        setImage(selectedImage.uri);
        setExtractedData(null);
        setEditableData(null);

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow camera access to take receipt photos."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.9,
        base64: false,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets?.length > 0) {
        const takenPhoto = result.assets[0];
        setImage(takenPhoto.uri);
        setExtractedData(null);
        setEditableData(null);

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const showImageSourceOptions = () => {
    Alert.alert(
      "Add Receipt Image",
      "Choose how you want to add your receipt:",
      [
        {
          text: "📷 Camera",
          onPress: takePhoto,
          style: "default",
        },
        {
          text: "🖼️ Photo Library",
          onPress: pickImage,
          style: "default",
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const simulateProgress = () => {
    setExtractionProgress(0);
    const interval = setInterval(() => {
      setExtractionProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
    return interval;
  };

  const extractReceiptData = async (base64Image) => {
    const prompt = `
Analyze this receipt image and extract the following information. Return ONLY valid JSON with these exact fields:

{
  "merchant": "If the receipt shows only one item, return the item's name. If multiple items or a group, return the seller/store/restaurant name.",
  "amount": "Total amount as number (no currency symbols)",
  "category": "Category (Food, Shopping, Transportation, Entertainment, Healthcare, Utilities, Other)",
  "date": "Date in YYYY-MM-DD format; if not found, use today's date",
  "items": ["item1", "item2", "item3"],
  "confidence": "High/Medium/Low"
}

If any field cannot be determined, use these defaults:
- merchant: "Unknown Merchant"
- amount: "0"
- category: "Other"
- date: "${new Date().toISOString().split("T")[0]}"
- items: []
- confidence: "Low"

Logic for "merchant":
- If only one item is detected in the receipt, set "merchant" to the item's name.
- If more than one item is detected, set "merchant" to the store/restaurant/seller name.

Ensure the response is valid JSON only, no additional text or formatting.
`;


    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const result = await response.json();
    const generatedText =
      result?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!generatedText) {
      throw new Error("No text generated from image");
    }

    let cleanedText = generatedText.trim();

    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
    }

    try {
      const parsedData = JSON.parse(cleanedText);

      const requiredFields = ["merchant", "amount", "category", "date"];
      const missingFields = requiredFields.filter(
        (field) => !parsedData[field]
      );

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }

      const amount = parseFloat(parsedData.amount);
      if (isNaN(amount) || amount < 0) {
        throw new Error("Invalid amount value");
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(parsedData.date)) {
        throw new Error("Invalid date format");
      }

      return {
        ...parsedData,
        amount: amount.toString(),
        items: parsedData.items || [],
        confidence: parsedData.confidence || "Medium",
      };
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      console.error("Raw response:", cleanedText);
      throw new Error(
        "Failed to parse AI response. Please try with a clearer image."
      );
    }
  };

  const handleExtractData = async () => {
    if (!image) {
      Alert.alert("No Image", "Please select a receipt image first.");
      return;
    }

    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY_HERE") {
      Alert.alert("Configuration Error", "API key not configured properly.");
      return;
    }

    setIsExtracting(true);
    setExtractedData(null);
    setEditableData(null);

    const progressInterval = simulateProgress();

    try {
      const base64Image = await FileSystem.readAsStringAsync(image, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const extractedInfo = await extractReceiptData(base64Image);

      clearInterval(progressInterval);
      setExtractionProgress(100);

      setTimeout(() => {
        setExtractedData(extractedInfo);
        setEditableData({ ...extractedInfo });
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Extraction error:", error);
      Alert.alert(
        "Extraction Failed",
        error.message ||
          "Could not extract data from the image. Please try with a clearer receipt image."
      );
    } finally {
      setTimeout(() => {
        setIsExtracting(false);
        setExtractionProgress(0);
      }, 500);
    }
  };

  // Manual Entry Functions
  const handleQuickAmount = (quickAmount) => {
    setAmount(quickAmount.toString());
  };

  const handleCategorySelect = (selectedCategory) => {
    if (activeTab === "ai") {
      setEditableData((prev) => ({ ...prev, category: selectedCategory.id }));
    } else {
      setCategory(selectedCategory.name);
    }
    setShowCategoryModal(false);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const formatDate = (date) => {
    return date.toISOString().split("T")[0];
  };

  const validateInputs = () => {
    if (activeTab === "ai") {
      if (!extractedData) {
        Alert.alert("No Data", "Please extract data from receipt first.");
        return false;
      }
      const { merchant, amount, category, date } = extractedData;
      if (!merchant || !amount || !category || !date) {
        Alert.alert("Incomplete Data", "Some required fields are missing.");
        return false;
      }
    } else {
      if (!title.trim()) {
        Alert.alert("Missing Title", "Please enter a title for your expense");
        return false;
      }
      if (!amount || parseFloat(amount) <= 0) {
        Alert.alert(
          "Invalid Amount",
          "Please enter a valid amount greater than 0"
        );
        return false;
      }
      if (!category) {
        Alert.alert(
          "Missing Category",
          "Please select a category for your expense"
        );
        return false;
      }
    }
    return true;
  };

  const handleSaveExpense = async () => {
    if (!validateInputs()) return;

    setIsSaving(true);

    try {
      let expenseData;

      if (activeTab === "ai") {
        const {
          merchant,
          amount: aiAmount,
          category: aiCategory,
          date: aiDate,
        } = extractedData;
        expenseData = {
          user_id: session?.user?.id,
          title: merchant,
          amount: parseFloat(aiAmount),
          category: aiCategory,
          date: aiDate,
          created_at: new Date().toISOString(),
        };
      } else {
        expenseData = {
          user_id: session.user.id,
          title: title.trim(),
          amount: parseFloat(amount),
          category,
          date: formatDate(date),
          created_at: new Date().toISOString(),
        };
      }

      const { error } = await supabase.from("expenses").insert([expenseData]);

      if (error) {
        throw error;
      }

      Toast.show({
        type: 'success',
        text1: '✅ Success',
        text2: 'Expense saved successfully!',
        position: 'top',
        visibilityTime: 3000,
      });
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert(
        "Save Failed",
        error.message || "Could not save expense. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    // Reset AI states
    setImage(null);
    setExtractedData(null);
    setEditableData(null);
    fadeAnim.setValue(0);

    // Reset manual states
    setTitle("");
    setAmount("");
    setCategory("");
    setDate(new Date());
  };

  // Helper functions
  const getCategoryIcon = (categoryId) => {
    const cat = CATEGORIES.find((c) => c.id === categoryId);
    return cat ? cat.icon : "ellipsis-horizontal";
  };

  const getCategoryColor = (categoryId) => {
    const cat = CATEGORIES.find((c) => c.id === categoryId);
    return cat ? cat.color : "#A8A8A8";
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case "High":
        return "#48BB78";
      case "Medium":
        return "#ED8936";
      case "Low":
        return "#F56565";
      default:
        return "#A8A8A8";
    }
  };

  const selectedCategoryData = CATEGORIES.find((cat) =>
    activeTab === "ai"
      ? cat.id === editableData?.category
      : cat.name === category
  );

  // Render functions
  const renderTabBar = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === "ai" && styles.activeTab]}
        onPress={() => setActiveTab("ai")}
      >
        <Ionicons
          name="scan"
          size={20}
          color={activeTab === "ai" ? "#4299E1" : "#718096"}
        />
        <Text
          style={[styles.tabText, activeTab === "ai" && styles.activeTabText]}
        >
          AI Scanner
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === "manual" && styles.activeTab]}
        onPress={() => setActiveTab("manual")}
      >
        <Ionicons
          name="create"
          size={20}
          color={activeTab === "manual" ? "#4299E1" : "#718096"}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === "manual" && styles.activeTabText,
          ]}
        >
          Manual Entry
        </Text>
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.tabIndicator,
          {
            left: tabAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ["2%", "52%"],
            }),
          },
        ]}
      />
    </View>
  );

  const renderAIScanner = () => (
    <View style={styles.tabContent}>
      {/* Image Section */}
      <View style={styles.imageSection}>
        {image ? (
          <Animated.View style={[styles.imageContainer, { opacity: fadeAnim }]}>
            <TouchableOpacity onPress={() => setShowImagePreview(true)}>
              <Image source={{ uri: image }} style={styles.receiptImage} />
              <View style={styles.imageOverlay}>
                <Ionicons name="expand" size={20} color="#FFF" />
              </View>
            </TouchableOpacity>
            <View style={styles.imageActions}>
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={showImageSourceOptions}
              >
                <Ionicons name="camera" size={16} color="#4A5568" />
                <Text style={styles.changeImageText}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={resetForm}
              >
                <Ionicons name="trash" size={16} color="#E53E3E" />
                <Text style={styles.removeImageText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={showImageSourceOptions}
          >
            <View style={styles.uploadIconContainer}>
              <Ionicons name="camera" size={32} color="#4299E1" />
            </View>
            <Text style={styles.uploadText}>Add Receipt Image</Text>
            <Text style={styles.uploadSubtext}>
              Take a photo or select from gallery
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Extract Button */}
      {image && !extractedData && (
        <TouchableOpacity
          style={[styles.extractButton, isExtracting && styles.buttonDisabled]}
          onPress={handleExtractData}
          disabled={isExtracting}
        >
          {isExtracting ? (
            <View style={styles.extractingContainer}>
              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${extractionProgress}%` },
                  ]}
                />
              </View>
              <Text style={styles.extractingText}>
                Analyzing Receipt... {Math.round(extractionProgress)}%
              </Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons name="scan" size={20} color="#FFF" />
              <Text style={styles.buttonText}>Extract Data</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Results Card */}
      {extractedData && (
        <View style={styles.resultsCard}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>Extracted Information</Text>
            <View style={styles.confidenceBadge}>
              <View
                style={[
                  styles.confidenceDot,
                  {
                    backgroundColor: getConfidenceColor(
                      extractedData.confidence
                    ),
                  },
                ]}
              />
              <Text style={styles.confidenceText}>
                {extractedData.confidence} Confidence
              </Text>
            </View>
          </View>

          <View style={styles.dataContainer}>
            <View style={styles.dataRow}>
              <View style={styles.dataLabelContainer}>
                <Ionicons name="storefront" size={16} color="#4A5568" />
                <Text style={styles.dataLabel}>Merchant</Text>
              </View>
              <Text style={styles.dataValue}>{extractedData.merchant}</Text>
            </View>

            <View style={styles.dataRow}>
              <View style={styles.dataLabelContainer}>
                <Ionicons name="cash" size={16} color="#4A5568" />
                <Text style={styles.dataLabel}>Amount</Text>
              </View>
              <Text style={[styles.dataValue, styles.amountValue]}>
                ₹{extractedData.amount}
              </Text>
            </View>

            <View style={styles.dataRow}>
              <View style={styles.dataLabelContainer}>
                <Ionicons
                  name={getCategoryIcon(extractedData.category)}
                  size={16}
                  color="#4A5568"
                />
                <Text style={styles.dataLabel}>Category</Text>
              </View>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: getCategoryColor(extractedData.category) },
                ]}
              >
                <Text style={styles.categoryBadgeText}>
                  {extractedData.category}
                </Text>
              </View>
            </View>

            <View style={styles.dataRow}>
              <View style={styles.dataLabelContainer}>
                <Ionicons name="calendar" size={16} color="#4A5568" />
                <Text style={styles.dataLabel}>Date</Text>
              </View>
              <Text style={styles.dataValue}>{extractedData.date}</Text>
            </View>

            {extractedData.items && extractedData.items.length > 0 && (
              <View style={styles.itemsSection}>
                <Text style={styles.itemsTitle}>Items</Text>
                {extractedData.items.slice(0, 3).map((item, index) => (
                  <Text key={index} style={styles.itemText}>
                    • {item}
                  </Text>
                ))}
                {extractedData.items.length > 3 && (
                  <Text style={styles.moreItemsText}>
                    +{extractedData.items.length - 3} more items
                  </Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setShowEditModal(true)}
            >
              <Ionicons name="create" size={18} color="#4299E1" />
              <Text style={styles.editButtonText}>Edit Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.buttonDisabled]}
              onPress={handleSaveExpense}
              disabled={isSaving}
            >
              {isSaving ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.buttonText}>Saving...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                  <Text style={styles.buttonText}>Save Expense</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderManualEntry = () => (
    <View style={styles.tabContent}>
      <View style={styles.form}>
        {/* Title Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Expense Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Lunch at restaurant"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#999"
          />
        </View>

        {/* Amount Input with Quick Buttons */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
          />
          <View style={styles.quickAmounts}>
            {QUICK_AMOUNTS.map((quickAmount) => (
              <TouchableOpacity
                key={quickAmount}
                style={styles.quickAmountButton}
                onPress={() => handleQuickAmount(quickAmount)}
              >
                <Text style={styles.quickAmountText}>₹{quickAmount}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Category Selection */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={[
              styles.categoryButton,
              selectedCategoryData && {
                borderColor: selectedCategoryData.color,
              },
            ]}
            onPress={() => setShowCategoryModal(true)}
          >
            {selectedCategoryData ? (
              <View style={styles.selectedCategory}>
                <Text style={styles.categoryIcon}>
                  {selectedCategoryData.emoji}
                </Text>
                <Text style={styles.categoryText}>
                  {selectedCategoryData.name}
                </Text>
              </View>
            ) : (
              <Text style={styles.categoryPlaceholder}>Select a category</Text>
            )}
            <Ionicons name="chevron-down" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Date Selection */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar" size={20} color="#666" />
            <Text style={styles.dateText}>{formatDate(date)}</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Expenses for Quick Reference */}
        {recentExpenses.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
            {recentExpenses.map((expense, index) => (
              <TouchableOpacity
                key={index}
                style={styles.recentItem}
                onPress={() => {
                  setTitle(expense.title);
                  setCategory(expense.category);
                }}
              >
                <Text style={styles.recentTitle}>{expense.title}</Text>
                <Text style={styles.recentCategory}>{expense.category}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.buttonDisabled]}
          onPress={handleSaveExpense}
          disabled={isSaving}
        >
          {isSaving ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.buttonText}>Saving...</Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons name="checkmark" size={18} color="#FFF" />
              <Text style={styles.buttonText}>Save Expense</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEditModal = () => (
    <Modal
      visible={showEditModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowEditModal(false)}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Edit Details</Text>
          <TouchableOpacity
            onPress={() => {
              setExtractedData({ ...editableData });
              setShowEditModal(false);
            }}
          >
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.editField}>
            <Text style={styles.editLabel}>Merchant</Text>
            <TextInput
              style={styles.editInput}
              value={editableData?.merchant}
              onChangeText={(text) =>
                setEditableData((prev) => ({ ...prev, merchant: text }))
              }
              placeholder="Enter merchant name"
            />
          </View>

          <View style={styles.editField}>
            <Text style={styles.editLabel}>Amount</Text>
            <TextInput
              style={styles.editInput}
              value={editableData?.amount}
              onChangeText={(text) =>
                setEditableData((prev) => ({ ...prev, amount: text }))
              }
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.editField}>
            <Text style={styles.editLabel}>Category</Text>
            <TouchableOpacity
              style={styles.editCategoryButton}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text style={styles.editCategoryText}>
                {editableData?.category || "Select Category"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.editField}>
            <Text style={styles.editLabel}>Date</Text>
            <TextInput
              style={styles.editInput}
              value={editableData?.date}
              onChangeText={(text) =>
                setEditableData((prev) => ({ ...prev, date: text }))
              }
              placeholder="YYYY-MM-DD"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderCategoryModal = () => (
    <Modal
      visible={showCategoryModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Select Category</Text>
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          data={CATEGORIES}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.categoryItem}
              onPress={() => handleCategorySelect(item)}
            >
              <View
                style={[
                  styles.categoryIconContainer,
                  { backgroundColor: item.color },
                ]}
              >
                <Text style={styles.categoryEmoji}>{item.emoji}</Text>
              </View>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{item.name}</Text>
                <Ionicons name={item.icon} size={16} color="#666" />
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.categoryList}
        />
      </SafeAreaView>
    </Modal>
  );

  const renderImagePreviewModal = () => (
    <Modal
      visible={showImagePreview}
      animationType="fade"
      presentationStyle="fullScreen"
    >
      <View style={styles.imagePreviewContainer}>
        <TouchableOpacity
          style={styles.closePreviewButton}
          onPress={() => setShowImagePreview(false)}
        >
          <Ionicons name="close" size={30} color="#FFF" />
        </TouchableOpacity>
        {image && (
          <Image
            source={{ uri: image }}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
        )}
      </View>
    </Modal>
  );

  const renderDatePicker = () => {
    if (showDatePicker) {
      return (
        <DateTimePicker
          value={date}
          mode="date"
          display="spinner"
          onChange={handleDateChange}
        />
      );
    }
    return null;
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F7FAFC" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#2D3748" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Expense</Text>
          <TouchableOpacity onPress={resetForm}>
            <Ionicons name="refresh" size={24} color="#4299E1" />
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        {renderTabBar()}

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === "ai" ? renderAIScanner() : renderManualEntry()}
        </ScrollView>

        {/* Modals */}
        {renderEditModal()}
        {renderCategoryModal()}
        {renderImagePreviewModal()}
        {renderDatePicker()}
      </SafeAreaView>
    </ScrollView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FAFC",
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D3748",
  },

  // Tab Styles
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    position: "relative",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    zIndex: 2,
  },
  activeTab: {
    backgroundColor: "transparent",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
    color: "#718096",
  },
  activeTabText: {
    color: "#4299E1",
  },
  tabIndicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    width: "46%",
    backgroundColor: "#E6F3FF",
    borderRadius: 8,
    zIndex: 1,
  },

  // Content Styles
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  tabContent: {
    padding: 20,
  },

  // AI Scanner Styles
  imageSection: {
    marginBottom: 24,
  },
  uploadButton: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E6F3FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  uploadText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D3748",
    marginBottom: 8,
  },
  uploadSubtext: {
    fontSize: 14,
    color: "#718096",
    textAlign: "center",
  },
  imageContainer: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  receiptImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: "#F7FAFC",
  },
  imageOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    padding: 8,
  },
  imageActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  changeImageButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#F7FAFC",
    borderRadius: 8,
  },
  changeImageText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#4A5568",
    fontWeight: "500",
  },
  removeImageButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#FED7D7",
    borderRadius: 8,
  },
  removeImageText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#E53E3E",
    fontWeight: "500",
  },

  // Extract Button Styles
  extractButton: {
    backgroundColor: "#4299E1",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#4299E1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  extractingContainer: {
    alignItems: "center",
  },
  progressContainer: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    marginBottom: 12,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#FFF",
    borderRadius: 2,
  },
  extractingText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "500",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Results Card Styles
  resultsCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D3748",
  },
  confidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7FAFC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4A5568",
  },
  dataContainer: {
    marginBottom: 20,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dataLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dataLabel: {
    fontSize: 14,
    color: "#4A5568",
    marginLeft: 8,
    fontWeight: "500",
  },
  dataValue: {
    fontSize: 14,
    color: "#2D3748",
    fontWeight: "500",
    textAlign: "right",
    flex: 1,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#48BB78",
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  itemsSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#F7FAFC",
    borderRadius: 12,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D3748",
    marginBottom: 8,
  },
  itemText: {
    fontSize: 13,
    color: "#4A5568",
    marginBottom: 4,
  },
  moreItemsText: {
    fontSize: 12,
    color: "#718096",
    fontStyle: "italic",
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#4299E1",
    backgroundColor: "#FFF",
  },
  editButtonText: {
    color: "#4299E1",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  saveButton: {
    flex: 2,
    backgroundColor: "#48BB78",
    borderRadius: 12,
    padding: 14,
    elevation: 2,
    shadowColor: "#48BB78",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  // Manual Entry Styles
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D3748",
  },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    color: "#2D3748",
  },
  quickAmounts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  quickAmountButton: {
    backgroundColor: "#E6F3FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#4299E1",
  },
  quickAmountText: {
    color: "#4299E1",
    fontSize: 14,
    fontWeight: "500",
  },
  categoryButton: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedCategory: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  categoryText: {
    fontSize: 16,
    color: "#2D3748",
    fontWeight: "500",
  },
  categoryPlaceholder: {
    fontSize: 16,
    color: "#A0AEC0",
  },
  dateButton: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    fontSize: 16,
    color: "#2D3748",
    marginLeft: 12,
    fontWeight: "500",
  },
  recentSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D3748",
    marginBottom: 12,
  },
  recentItem: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2D3748",
    marginBottom: 4,
  },
  recentCategory: {
    fontSize: 12,
    color: "#718096",
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#F7FAFC",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D3748",
  },
  saveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4299E1",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  editField: {
    marginBottom: 20,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D3748",
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    color: "#2D3748",
  },
  editCategoryButton: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editCategoryText: {
    fontSize: 16,
    color: "#2D3748",
    fontWeight: "500",
  },
  categoryList: {
    padding: 20,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2D3748",
  },

  // Image Preview Modal
  imagePreviewContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  closePreviewButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 10,
  },
  fullscreenImage: {
    width: width,
    height: height,
  },
});
