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
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Toast from "react-native-toast-message";
import { useTheme } from "../context/ThemeContext";
import { useRoute } from "@react-navigation/native";
import { GEMINI_API_KEY } from "@env";

const { width, height } = Dimensions.get("window");

const CATEGORIES = [
  { id: "Food", name: "Food & Dining", icon: "restaurant", emoji: "🍽️", color: "#FF6B6B" },
  { id: "Shopping", name: "Shopping", icon: "bag", emoji: "🛍️", color: "#4ECDC4" },
  { id: "Transportation", name: "Transportation", icon: "car", emoji: "🚗", color: "#45B7D1" },
  { id: "Entertainment", name: "Entertainment", icon: "game-controller", emoji: "🎬", color: "#96CEB4" },
  { id: "Healthcare", name: "Healthcare", icon: "medical", emoji: "🏥", color: "#FF9FF3" },
  { id: "Utilities", name: "Bills & Utilities", icon: "flash", emoji: "💡", color: "#FECA57" },
  { id: "Education", name: "Education", icon: "school", emoji: "📚", color: "#54A0FF" },
  { id: "Travel", name: "Travel", icon: "airplane", emoji: "✈️", color: "#5F27CD" },
  { id: "Groceries", name: "Groceries", icon: "basket", emoji: "🛒", color: "#00D2D3" },
  { id: "Other", name: "Other", icon: "ellipsis-horizontal", emoji: "📝", color: "#A8A8A8" },
];

const QUICK_AMOUNTS = [10, 25, 50, 100, 200, 500];

export default function AddEditEntryScreen({ navigation }) {
  const { session } = useAuth();
  const { theme } = useTheme();
  const route = useRoute();
  const { transaction: routeTransaction, screen: routeScreen } = route.params || {};

  const [editingTransaction, setEditingTransaction] = useState(routeTransaction);
  const [activeTab, setActiveTab] = useState("manual");
  const [image, setImage] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [editableData, setEditableData] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date());

  const [incomeSource, setIncomeSource] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeDescription, setIncomeDescription] = useState("");
  const [incomeDate, setIncomeDate] = useState(new Date());
  const [incomeFrequency, setIncomeFrequency] = useState("monthly");
  const [incomeIsRecurring, setIncomeIsRecurring] = useState(true);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (editingTransaction) {
      if (routeScreen === 'expenses') {
        setActiveTab('manual');
        setTitle(editingTransaction.title);
        setAmount(String(editingTransaction.amount));
        setCategory(editingTransaction.category);
        setDate(new Date(editingTransaction.date));
      } else if (routeScreen === 'income') {
        setActiveTab('income');
        setIncomeSource(editingTransaction.source);
        setIncomeAmount(String(editingTransaction.amount));
        setIncomeDescription(editingTransaction.description || "");
        setIncomeDate(new Date(editingTransaction.date));
        setIncomeFrequency(editingTransaction.frequency || 'monthly');
        setIncomeIsRecurring(editingTransaction.is_recurring ?? true);
      }
    } else {
        setActiveTab(routeScreen === 'income' ? 'income' : 'ai');
    }
  }, [editingTransaction, routeScreen]);

  useEffect(() => {
    Animated.timing(tabAnim, {
      toValue: activeTab === "ai" ? 0 : activeTab === "manual" ? 1 : 2,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [activeTab]);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photo library.", [{ text: "OK" }]);
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.9 });
      if (!result.canceled && result.assets?.length > 0) {
        setImage(result.assets[0].uri);
        setExtractedData(null);
        setEditableData(null);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select image.");
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow camera access.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.9 });
      if (!result.canceled && result.assets?.length > 0) {
        setImage(result.assets[0].uri);
        setExtractedData(null);
        setEditableData(null);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo.");
    }
  };

  const showImageSourceOptions = () => {
    Alert.alert("Add Receipt Image", "Choose an option:", [
        { text: "📷 Camera", onPress: takePhoto },
        { text: "🖼️ Photo Library", onPress: pickImage },
        { text: "Cancel", style: "cancel" },
      ], { cancelable: true });
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
- items": []
- confidence: "Low"
Logic for "merchant":
- If only one item is detected, set "merchant" to the item's name.
- If more than one item, set "merchant" to the store/restaurant/seller name.
Ensure the response is valid JSON only, no additional text or formatting.`;
    const requestBody = {
      contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: base64Image } }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
    };
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) }
    );
    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
    const result = await response.json();
    const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!generatedText) throw new Error("No text generated from image");
    let cleanedText = generatedText.trim().replace(/^```json\s*|```\s*$/g, "");
    try {
      return JSON.parse(cleanedText);
    } catch (parseError) {
      throw new Error("Failed to parse AI response. Please try with a clearer image.");
    }
  };

  const handleExtractData = async () => {
    if (!image) {
      Alert.alert("No Image", "Please select a receipt image first.");
      return;
    }
    setIsExtracting(true);
    setExtractedData(null);
    setEditableData(null);
    const progressInterval = simulateProgress();
    try {
      const base64Image = await FileSystem.readAsStringAsync(image, { encoding: 'base64' });
      const extractedInfo = await extractReceiptData(base64Image);
      clearInterval(progressInterval);
      setExtractionProgress(100);
      setTimeout(() => {
        setExtractedData(extractedInfo);
        setEditableData({ ...extractedInfo });
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      Alert.alert("Extraction Failed", error.message || "Could not extract data from the image.");
    } finally {
      setTimeout(() => {
        setIsExtracting(false);
        setExtractionProgress(0);
      }, 500);
    }
  };

  const handleQuickAmount = (quickAmount) => setAmount(quickAmount.toString());

  const handleCategorySelect = (selectedCategory) => {
    if (activeTab === "ai" && editableData) {
      setEditableData((prev) => ({ ...prev, category: selectedCategory.id }));
    } else {
      setCategory(selectedCategory.id);
    }
    setShowCategoryModal(false);
  };
  
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (activeTab === "income") setIncomeDate(selectedDate);
      else setDate(selectedDate);
    }
  };

  const formatDate = (d) => {
    if (!(d instanceof Date) || isNaN(d)) return new Date().toISOString().split("T")[0];
    return d.toISOString().split("T")[0];
  };

  const handleSaveExpense = async () => {
    setIsSaving(true);
    let expenseData, dataIsValid = true;
    
    if (activeTab === "ai") {
        if (!extractedData) {
            Alert.alert("No Data", "Please extract data from receipt first.");
            dataIsValid = false;
        } else {
            expenseData = {
              title: extractedData.merchant,
              amount: parseFloat(extractedData.amount),
              category: extractedData.category,
              date: extractedData.date,
            };
        }
    } else {
        if (!title.trim() || !amount || !category) {
            Alert.alert("Missing Fields", "Please fill in Title, Amount, and Category.");
            dataIsValid = false;
        } else {
            expenseData = {
              title: title.trim(),
              amount: parseFloat(amount),
              category: category,
              date: formatDate(date),
            };
        }
    }

    if (!dataIsValid || parseFloat(expenseData.amount) <= 0) {
        if (dataIsValid) Alert.alert("Invalid Amount", "Amount must be greater than 0.");
        setIsSaving(false);
        return;
    }

    try {
        let error;
        const successMessage = `Expense ${editingTransaction ? 'updated' : 'saved'}!`;

        if (editingTransaction) {
            ({ error } = await supabase.from("expenses").update(expenseData).eq('id', editingTransaction.id));
        } else {
            ({ error } = await supabase.from("expenses").insert([{ ...expenseData, user_id: session.user.id }]));
        }

        if (error) throw error;
        
        Toast.show({ type: "success", text1: "✅ Success", text2: successMessage });
        resetForm();
        navigation.goBack();
    } catch (error) {
        Alert.alert("Save Failed", error.message || "Could not save expense.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleSaveIncome = async () => {
    if (!incomeSource.trim() || !incomeAmount || parseFloat(incomeAmount) <= 0) {
        Alert.alert("Invalid Input", "Please enter a valid source and amount.");
        return;
    }
    setIsSaving(true);

    const incomeData = {
        source: incomeSource.trim(),
        amount: parseFloat(incomeAmount),
        description: incomeDescription.trim(),
        frequency: incomeFrequency,
        is_recurring: incomeIsRecurring,
        date: formatDate(incomeDate),
        updated_at: new Date().toISOString(),
    };
    
    try {
        let error;
        const successMessage = `Income ${editingTransaction ? 'updated' : 'saved'}!`;

        if (editingTransaction) {
            ({ error } = await supabase.from("income").update(incomeData).eq('id', editingTransaction.id));
        } else {
            ({ error } = await supabase.from("income").insert([{ ...incomeData, user_id: session.user.id }]));
        }

        if (error) throw error;
        
        Toast.show({ type: "success", text1: "✅ Success", text2: successMessage });
        resetForm();
        navigation.goBack();
    } catch (error) {
        Alert.alert("Save Failed", error.message || "Could not save income.");
    } finally {
        setIsSaving(false);
    }
  };
  
  const resetForm = () => {
    setImage(null);
    setExtractedData(null);
    setEditableData(null);
    fadeAnim.setValue(0);
    setTitle("");
    setAmount("");
    setCategory("");
    setDate(new Date());
    setIncomeSource("");
    setIncomeAmount("");
    setIncomeDescription("");
    setIncomeDate(new Date());
    setEditingTransaction(null);
  };

  const getCategoryDetails = (categoryId, key) => {
    const cat = CATEGORIES.find((c) => c.id === categoryId);
    if (!cat) return key === 'color' ? '#A8A8A8' : 'ellipsis-horizontal';
    return cat[key];
  };

  const getConfidenceColor = (confidence) => ({ High: "#48BB78", Medium: "#ED8936", Low: "#F56565" }[confidence] || "#A8A8A8");

  const selectedCategoryData = CATEGORIES.find((cat) => activeTab === "ai" ? cat.id === editableData?.category : cat.id === category);

  const renderTabBar = () => (
    <View style={[styles.tabContainer, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>
      <TouchableOpacity style={[styles.tab, activeTab === "ai" && { backgroundColor: theme.colors.card }]} onPress={() => setActiveTab("ai")}>
        <Ionicons name="scan" size={20} color={activeTab === "ai" ? theme.colors.primary : theme.colors.textTertiary}/>
        <Text style={[styles.tabText, { color: activeTab === "ai" ? theme.colors.primary : theme.colors.textTertiary }]}>AI Scanner</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.tab, activeTab === "manual" && { backgroundColor: theme.colors.card }]} onPress={() => setActiveTab("manual")}>
        <Ionicons name="create" size={20} color={activeTab === "manual" ? theme.colors.primary : theme.colors.textTertiary}/>
        <Text style={[styles.tabText, { color: activeTab === "manual" ? theme.colors.primary : theme.colors.textTertiary }]}>Manual</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.tab, activeTab === "income" && { backgroundColor: theme.colors.card }]} onPress={() => setActiveTab("income")}>
        <Ionicons name="cash" size={20} color={activeTab === "income" ? theme.colors.primary : theme.colors.textTertiary}/>
        <Text style={[styles.tabText, { color: activeTab === "income" ? theme.colors.primary : theme.colors.textTertiary }]}>Income</Text>
      </TouchableOpacity>
      <Animated.View style={[styles.tabIndicator, { left: tabAnim.interpolate({ inputRange: [0, 1, 2], outputRange: ["2%", "35%", "68%"] }), backgroundColor: theme.colors.primary + "33" }]}/>
    </View>
  );

  const renderAIScanner = () => (
    <View style={styles.tabContent}>
      <View style={styles.imageSection}>
        {image ? (
          <Animated.View style={[styles.imageContainer, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow, opacity: fadeAnim }]}>
            <TouchableOpacity onPress={() => setShowImagePreview(true)}>
              <Image source={{ uri: image }} style={styles.receiptImage} />
              <View style={[styles.imageOverlay, { backgroundColor: theme.colors.overlay }]}><Ionicons name="expand" size={20} color={theme.colors.text} /></View>
            </TouchableOpacity>
            <View style={styles.imageActions}>
              <TouchableOpacity style={[styles.changeImageButton, { backgroundColor: theme.colors.background }]} onPress={showImageSourceOptions}>
                <Ionicons name="camera" size={16} color={theme.colors.textSecondary}/><Text style={[styles.changeImageText, { color: theme.colors.textSecondary }]}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.removeImageButton, { backgroundColor: theme.colors.error + "22" }]} onPress={resetForm}>
                <Ionicons name="trash" size={16} color={theme.colors.error}/><Text style={[styles.removeImageText, { color: theme.colors.error }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : (
          <TouchableOpacity style={[styles.uploadButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={showImageSourceOptions}>
            <View style={[styles.uploadIconContainer, { backgroundColor: theme.colors.primary + "33" }]}><Ionicons name="camera" size={32} color={theme.colors.primary} /></View>
            <Text style={[styles.uploadText, { color: theme.colors.text }]}>Add Receipt Image</Text>
            <Text style={[styles.uploadSubtext, { color: theme.colors.textTertiary }]}>Take a photo or select from gallery</Text>
          </TouchableOpacity>
        )}
      </View>
      {image && !extractedData && (
        <TouchableOpacity style={[styles.extractButton, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }, isExtracting && styles.buttonDisabled]} onPress={handleExtractData} disabled={isExtracting}>
          {isExtracting ? (
            <View style={styles.extractingContainer}>
              <View style={[styles.progressContainer, { backgroundColor: theme.colors.primary + '55'}]}><View style={[styles.progressBar, { width: `${extractionProgress}%`, backgroundColor: theme.colors.surface }]} /></View>
              <Text style={[styles.extractingText, { color: theme.colors.surface }]}>Analyzing... {Math.round(extractionProgress)}%</Text>
            </View>
          ) : (
            <View style={styles.buttonContent}><Ionicons name="scan" size={20} color={theme.colors.surface} /><Text style={[styles.buttonText, { color: theme.colors.surface }]}>Extract Data</Text></View>
          )}
        </TouchableOpacity>
      )}
      {extractedData && (
        <View style={[styles.resultsCard, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>
          <View style={styles.resultsHeader}>
            <Text style={[styles.resultsTitle, { color: theme.colors.text }]}>Extracted Information</Text>
            <View style={[styles.confidenceBadge, { backgroundColor: theme.colors.background }]}>
              <View style={[styles.confidenceDot, { backgroundColor: getConfidenceColor(extractedData.confidence) }]}/>
              <Text style={[styles.confidenceText, { color: theme.colors.textSecondary }]}>{extractedData.confidence} Confidence</Text>
            </View>
          </View>
          <View style={styles.dataContainer}>
            {[
              { icon: 'storefront', label: 'Merchant', value: extractedData.merchant },
              { icon: 'cash', label: 'Amount', value: `₹${extractedData.amount}`, style: { color: theme.colors.success, fontWeight: '600' } },
              { icon: getCategoryDetails(extractedData.category, 'icon'), label: 'Category', value: extractedData.category, isBadge: true },
              { icon: 'calendar', label: 'Date', value: extractedData.date },
            ].map((item, index) => (
              <View key={index} style={[styles.dataRow, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.dataLabelContainer}><Ionicons name={item.icon} size={16} color={theme.colors.textTertiary}/><Text style={[styles.dataLabel, { color: theme.colors.textSecondary }]}>{item.label}</Text></View>
                {item.isBadge ? (
                  <View style={[styles.categoryBadge, { backgroundColor: getCategoryDetails(item.value, 'color') }]}><Text style={styles.categoryBadgeText}>{item.value}</Text></View>
                ) : (
                  <Text style={[styles.dataValue, { color: theme.colors.text }, item.style]}>{item.value}</Text>
                )}
              </View>
            ))}
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.editButton, { borderColor: theme.colors.primary, backgroundColor: theme.colors.surface }]} onPress={() => setShowEditModal(true)}>
              <Ionicons name="create" size={18} color={theme.colors.primary}/><Text style={[styles.editButtonText, { color: theme.colors.primary }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveButton, styles.flexOne, { backgroundColor: theme.colors.success, shadowColor: theme.colors.success }, isSaving && styles.buttonDisabled]} onPress={handleSaveExpense} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color={theme.colors.surface} /> : <><Ionicons name="checkmark" size={18} color={theme.colors.surface} /><Text style={[styles.buttonText, { color: theme.colors.surface }]}>{editingTransaction ? 'Update' : 'Save'}</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderManualEntry = () => (
    <View style={styles.tabContent}>
      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Expense Title</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]} placeholder="e.g., Lunch with friends" value={title} onChangeText={setTitle} placeholderTextColor={theme.colors.textTertiary} />
        </View>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Amount</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]} placeholder="0.00" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholderTextColor={theme.colors.textTertiary}/>
          <View style={styles.quickAmounts}>
            {QUICK_AMOUNTS.map((qa) => <TouchableOpacity key={qa} style={[styles.quickAmountButton, { backgroundColor: theme.colors.primary + "33", borderColor: theme.colors.primary }]} onPress={() => handleQuickAmount(qa)}><Text style={[styles.quickAmountText, { color: theme.colors.primary }]}>₹{qa}</Text></TouchableOpacity>)}
          </View>
        </View>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Category</Text>
          <TouchableOpacity style={[styles.categoryButton, { backgroundColor: theme.colors.surface, borderColor: selectedCategoryData ? selectedCategoryData.color : theme.colors.border }]} onPress={() => setShowCategoryModal(true)}>
            {selectedCategoryData ? (<View style={styles.selectedCategory}><Text style={styles.categoryIcon}>{selectedCategoryData.emoji}</Text><Text style={[styles.categoryText, { color: theme.colors.text }]}>{selectedCategoryData.name}</Text></View>) : (<Text style={[styles.categoryPlaceholder, { color: theme.colors.textTertiary }]}>Select a category</Text>)}
            <Ionicons name="chevron-down" size={24} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Date</Text>
          <TouchableOpacity style={[styles.dateButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar" size={20} color={theme.colors.textTertiary} /><Text style={[styles.dateText, { color: theme.colors.text }]}>{formatDate(date)}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.colors.success, shadowColor: theme.colors.success, marginTop: 16 }, isSaving && styles.buttonDisabled]} onPress={handleSaveExpense} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color={theme.colors.surface} /> : <><Ionicons name="checkmark" size={18} color={theme.colors.surface} /><Text style={[styles.buttonText, { color: theme.colors.surface }]}>{editingTransaction ? 'Update Expense' : 'Save Expense'}</Text></>}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderIncomeEntry = () => (
    <View style={styles.tabContent}>
      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Income Source</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]} placeholder="e.g., Monthly Salary" value={incomeSource} onChangeText={setIncomeSource} placeholderTextColor={theme.colors.textTertiary}/>
        </View>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Amount</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]} placeholder="0.00" value={incomeAmount} onChangeText={setIncomeAmount} keyboardType="decimal-pad" placeholderTextColor={theme.colors.textTertiary}/>
        </View>
        <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Description (Optional)</Text>
            <TextInput style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]} placeholder="e.g., September salary" value={incomeDescription} onChangeText={setIncomeDescription} placeholderTextColor={theme.colors.textTertiary} />
        </View>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Date</Text>
          <TouchableOpacity style={[styles.dateButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar" size={20} color={theme.colors.textTertiary} /><Text style={[styles.dateText, { color: theme.colors.text }]}>{formatDate(incomeDate)}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Frequency</Text>
            <View style={styles.quickAmounts}>
                {["monthly", "weekly", "one-time"].map((freq) => (
                    <TouchableOpacity key={freq} style={[ styles.quickAmountButton, { backgroundColor: incomeFrequency === freq ? theme.colors.primary : theme.colors.primary + "33", borderColor: theme.colors.primary }]} onPress={() => setIncomeFrequency(freq)}>
                        <Text style={[ styles.quickAmountText, { color: incomeFrequency === freq ? "#fff" : theme.colors.primary }]}>{freq.charAt(0).toUpperCase() + freq.slice(1)}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
        <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.checkboxContainer} onPress={() => setIncomeIsRecurring(!incomeIsRecurring)}>
                <View style={[ styles.checkbox, { borderColor: theme.colors.border, backgroundColor: incomeIsRecurring ? theme.colors.primary : theme.colors.surface }]}>
                    {incomeIsRecurring && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={{ color: theme.colors.text }}>This is a recurring income</Text>
            </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.colors.success, shadowColor: theme.colors.success, marginTop: 16 }, isSaving && styles.buttonDisabled]} onPress={handleSaveIncome} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color={theme.colors.surface} /> : <><Ionicons name="checkmark" size={18} color={theme.colors.surface} /><Text style={[styles.buttonText, { color: theme.colors.surface }]}>{editingTransaction ? 'Update Income' : 'Save Income'}</Text></>}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEditModal = () => (
    <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEditModal(false)}>
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => setShowEditModal(false)}><Ionicons name="close" size={24} color={theme.colors.textTertiary} /></TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Details</Text>
          <TouchableOpacity onPress={() => { setExtractedData({ ...editableData }); setShowEditModal(false); }}><Text style={[styles.saveText, { color: theme.colors.primary }]}>Save</Text></TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          <View style={styles.editField}>
            <Text style={[styles.editLabel, { color: theme.colors.text }]}>Merchant</Text>
            <TextInput style={[styles.editInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]} value={editableData?.merchant} onChangeText={(text) => setEditableData((prev) => ({ ...prev, merchant: text }))} placeholder="Enter merchant name" placeholderTextColor={theme.colors.textTertiary} />
          </View>
          <View style={styles.editField}>
            <Text style={[styles.editLabel, { color: theme.colors.text }]}>Amount</Text>
            <TextInput style={[styles.editInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]} value={editableData?.amount} onChangeText={(text) => setEditableData((prev) => ({ ...prev, amount: text }))} placeholder="0.00" keyboardType="decimal-pad" placeholderTextColor={theme.colors.textTertiary} />
          </View>
          <View style={styles.editField}>
            <Text style={[styles.editLabel, { color: theme.colors.text }]}>Category</Text>
            <TouchableOpacity style={[styles.editCategoryButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => setShowCategoryModal(true)}>
              <Text style={[styles.editCategoryText, { color: theme.colors.text }]}>{editableData?.category || "Select Category"}</Text>
              <Ionicons name="chevron-down" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>
          <View style={styles.editField}>
            <Text style={[styles.editLabel, { color: theme.colors.text }]}>Date</Text>
            <TextInput style={[styles.editInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]} value={editableData?.date} onChangeText={(text) => setEditableData((prev) => ({ ...prev, date: text }))} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.textTertiary} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderCategoryModal = () => (
    <Modal visible={showCategoryModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCategoryModal(false)}>
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => setShowCategoryModal(false)}><Ionicons name="close" size={24} color={theme.colors.textTertiary} /></TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Category</Text>
          <View style={{ width: 24 }} />
        </View>
        <FlatList data={CATEGORIES} keyExtractor={(item) => item.id} renderItem={({ item }) => (
            <TouchableOpacity style={[styles.categoryItem, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]} onPress={() => handleCategorySelect(item)}>
              <View style={[styles.categoryIconContainer, { backgroundColor: item.color }]}><Text style={styles.categoryEmoji}>{item.emoji}</Text></View>
              <View style={styles.categoryInfo}><Text style={[styles.categoryName, { color: theme.colors.text }]}>{item.name}</Text></View>
            </TouchableOpacity>
          )} contentContainerStyle={styles.categoryList} />
      </SafeAreaView>
    </Modal>
  );
  
  const renderImagePreviewModal = () => (
    <Modal visible={showImagePreview} animationType="fade" transparent={true} onRequestClose={() => setShowImagePreview(false)}>
      <View style={styles.imagePreviewContainer}>
        <TouchableOpacity style={styles.closePreviewButton} onPress={() => setShowImagePreview(false)}><Ionicons name="close" size={30} color="#FFF" /></TouchableOpacity>
        {image && <Image source={{ uri: image }} style={styles.fullscreenImage} resizeMode="contain" />}
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.name === "dark" ? "light-content" : "dark-content"} backgroundColor={theme.colors.background}/>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={theme.colors.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{editingTransaction ? 'Edit' : 'Add'} Entry</Text>
        <TouchableOpacity onPress={resetForm}><Ionicons name="refresh" size={24} color={theme.colors.primary} /></TouchableOpacity>
      </View>
      {renderTabBar()}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {activeTab === "ai" ? renderAIScanner() : activeTab === "manual" ? renderManualEntry() : renderIncomeEntry()}
      </ScrollView>
      {renderEditModal()}
      {renderCategoryModal()}
      {renderImagePreviewModal()}
      {showDatePicker && (<DateTimePicker value={date} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleDateChange} />)}
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
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: 20,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    position: "relative",
    elevation: 1,
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
  tabText: { fontSize: 14, fontWeight: "500", marginLeft: 8 },
  tabIndicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    width: "30%",
    borderRadius: 8,
    zIndex: 1,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  tabContent: { padding: 20 },
  imageSection: { marginBottom: 24 },
  uploadButton: {
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 2,
    borderStyle: "dashed",
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  uploadText: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  uploadSubtext: { fontSize: 14, textAlign: "center" },
  imageContainer: {
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  receiptImage: { width: "100%", height: 200, borderRadius: 12 },
  imageOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
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
    borderRadius: 8,
  },
  changeImageText: { marginLeft: 8, fontSize: 14, fontWeight: "500" },
  removeImageButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  removeImageText: { marginLeft: 8, fontSize: 14, fontWeight: "500" },
  extractButton: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  extractingContainer: { alignItems: "center" },
  progressContainer: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
    overflow: "hidden",
  },
  progressBar: { height: "100%", borderRadius: 2 },
  extractingText: { fontSize: 14, fontWeight: "500" },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 16, fontWeight: "600", marginLeft: 8 },
  buttonDisabled: { opacity: 0.6 },
  resultsCard: {
    borderRadius: 16,
    padding: 20,
    elevation: 2,
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
  resultsTitle: { fontSize: 18, fontWeight: "600" },
  confidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  confidenceDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  confidenceText: { fontSize: 12, fontWeight: "500" },
  dataContainer: { marginBottom: 12 },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dataLabelContainer: { flexDirection: "row", alignItems: "center", flex: 1 },
  dataLabel: { fontSize: 14, marginLeft: 8, fontWeight: "500" },
  dataValue: { fontSize: 14, fontWeight: "500", textAlign: "right", flex: 1 },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryBadgeText: { color: "#FFF", fontSize: 12, fontWeight: "600" },
  actionButtons: { flexDirection: "row", gap: 12, marginTop: 12 },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  editButtonText: { fontSize: 14, fontWeight: "600", marginLeft: 6 },
  saveButton: {
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  flexOne: { flex: 1 },
  form: { gap: 20 },
  inputContainer: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600" },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    padding: 16,
  },
  quickAmounts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  quickAmountButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickAmountText: { fontSize: 14, fontWeight: "600" },
  categoryButton: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedCategory: { flexDirection: "row", alignItems: "center" },
  categoryIcon: { fontSize: 20, marginRight: 12 },
  categoryText: { fontSize: 16, fontWeight: "500" },
  categoryPlaceholder: { fontSize: 16 },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  dateText: { fontSize: 16, marginLeft: 12, fontWeight: "500" },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "600" },
  saveText: { fontSize: 16, fontWeight: "600" },
  modalContent: { flex: 1, padding: 20 },
  editField: { marginBottom: 20 },
  editLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  editInput: { borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1 },
  editCategoryButton: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editCategoryText: { fontSize: 16, fontWeight: "500" },
  categoryList: { padding: 20 },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
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
  categoryEmoji: { fontSize: 20 },
  categoryInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryName: { fontSize: 16, fontWeight: "500" },
  imagePreviewContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  closePreviewButton: {
    position: "absolute",
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 8,
  },
  fullscreenImage: { width: width, height: height * 0.8 },
});