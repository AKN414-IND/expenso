import React, { useState, useRef } from "react";
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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyATzDTXJJ64CUQLAwDdOrJFNXJB207dWRk";
const { width, height } = Dimensions.get("window");

const CATEGORIES = [
  { id: "Food", icon: "restaurant", color: "#FF6B6B" },
  { id: "Shopping", icon: "bag", color: "#4ECDC4" },
  { id: "Transportation", icon: "car", color: "#45B7D1" },
  { id: "Entertainment", icon: "game-controller", color: "#96CEB4" },
  { id: "Healthcare", icon: "medical", color: "#FFEAA7" },
  { id: "Utilities", icon: "flash", color: "#DDA0DD" },
  { id: "Other", icon: "ellipsis-horizontal", color: "#A8A8A8" },
];

export default function AIExpenseScreen({ navigation }) {
  const { session } = useAuth();
  const [image, setImage] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [editableData, setEditableData] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [showImagePreview, setShowImagePreview] = useState(false);
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
        
        // Animate image appearance
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
          style: "default"
        },
        { 
          text: "🖼️ Photo Library", 
          onPress: pickImage,
          style: "default"
        },
        { 
          text: "Cancel", 
          style: "cancel" 
        },
      ],
      { cancelable: true }
    );
  };

  const simulateProgress = () => {
    setExtractionProgress(0);
    const interval = setInterval(() => {
      setExtractionProgress(prev => {
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
  "merchant": "Store/restaurant name",
  "amount": "Total amount as number (no currency symbols)",
  "category": "Category (Food, Shopping, Transportation, Entertainment, Healthcare, Utilities, Other)",
  "date": "Date in YYYY-MM-DD format",
  "items": ["item1", "item2", "item3"],
  "confidence": "High/Medium/Low"
}

If any field cannot be determined, use these defaults:
- merchant: "Unknown Merchant"
- amount: "0"
- category: "Other"
- date: "${new Date().toISOString().split('T')[0]}"
- items: []
- confidence: "Low"

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
    const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";

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
      const missingFields = requiredFields.filter(field => !parsedData[field]);
      
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
      throw new Error("Failed to parse AI response. Please try with a clearer image.");
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
        error.message || "Could not extract data from the image. Please try with a clearer receipt image."
      );
    } finally {
      setTimeout(() => {
        setIsExtracting(false);
        setExtractionProgress(0);
      }, 500);
    }
  };

  const handleEditData = () => {
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    setExtractedData({ ...editableData });
    setShowEditModal(false);
  };

  const handleSaveExpense = async () => {
    if (!extractedData) {
      Alert.alert("No Data", "Please extract data from receipt first.");
      return;
    }

    const { merchant, amount, category, date } = extractedData;
    
    if (!merchant || !amount || !category || !date) {
      Alert.alert("Incomplete Data", "Some required fields are missing.");
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.from("expenses").insert([
        {
          user_id: session?.user?.id,
          title: merchant,
          amount: parseFloat(amount),
          category,
          date,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        throw error;
      }

      Alert.alert(
        "✅ Success", 
        "Expense saved successfully!",
        [
          {
            text: "Add Another",
            onPress: resetForm,
          },
          {
            text: "View Expenses",
            onPress: () => navigation.navigate("Expenses"),
          },
        ]
      );
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Save Failed", error.message || "Could not save expense. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setImage(null);
    setExtractedData(null);
    setEditableData(null);
    fadeAnim.setValue(0);
  };

  const getCategoryIcon = (category) => {
    const cat = CATEGORIES.find(c => c.id === category);
    return cat ? cat.icon : "ellipsis-horizontal";
  };

  const getCategoryColor = (category) => {
    const cat = CATEGORIES.find(c => c.id === category);
    return cat ? cat.color : "#A8A8A8";
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case "High": return "#48BB78";
      case "Medium": return "#ED8936";
      case "Low": return "#F56565";
      default: return "#A8A8A8";
    }
  };

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
          <TouchableOpacity onPress={handleSaveEdit}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <View style={styles.editField}>
            <Text style={styles.editLabel}>Merchant</Text>
            <TextInput
              style={styles.editInput}
              value={editableData?.merchant}
              onChangeText={(text) => setEditableData(prev => ({ ...prev, merchant: text }))}
              placeholder="Enter merchant name"
            />
          </View>
          
          <View style={styles.editField}>
            <Text style={styles.editLabel}>Amount</Text>
            <TextInput
              style={styles.editInput}
              value={editableData?.amount}
              onChangeText={(text) => setEditableData(prev => ({ ...prev, amount: text }))}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.editField}>
            <Text style={styles.editLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: editableData?.category === cat.id ? cat.color : "#F7F7F7" }
                  ]}
                  onPress={() => setEditableData(prev => ({ ...prev, category: cat.id }))}
                >
                  <Ionicons 
                    name={cat.icon} 
                    size={16} 
                    color={editableData?.category === cat.id ? "#FFF" : "#666"} 
                  />
                  <Text style={[
                    styles.categoryChipText,
                    { color: editableData?.category === cat.id ? "#FFF" : "#666" }
                  ]}>
                    {cat.id}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          <View style={styles.editField}>
            <Text style={styles.editLabel}>Date</Text>
            <TextInput
              style={styles.editInput}
              value={editableData?.date}
              onChangeText={(text) => setEditableData(prev => ({ ...prev, date: text }))}
              placeholder="YYYY-MM-DD"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderImagePreviewModal = () => (
    <Modal
      visible={showImagePreview}
      animationType="fade"
      transparent={true}
    >
      <View style={styles.previewModalContainer}>
        <TouchableOpacity 
          style={styles.previewModalOverlay}
          onPress={() => setShowImagePreview(false)}
        >
          <Image source={{ uri: image }} style={styles.previewImage} />
          <TouchableOpacity style={styles.closePreviewButton} onPress={() => setShowImagePreview(false)}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#1A202C" />
            </TouchableOpacity>
            <Text style={styles.title}>AI Receipt Scanner</Text>
            <View style={{ width: 24 }} />
          </View>
          <Text style={styles.subtitle}>
            Scan receipts instantly with AI-powered text extraction
          </Text>
        </View>

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
                <TouchableOpacity style={styles.changeImageButton} onPress={showImageSourceOptions}>
                  <Ionicons name="camera" size={16} color="#4A5568" />
                  <Text style={styles.changeImageText}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.removeImageButton} onPress={resetForm}>
                  <Ionicons name="trash" size={16} color="#E53E3E" />
                  <Text style={styles.removeImageText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={showImageSourceOptions}>
              <View style={styles.uploadIconContainer}>
                <Ionicons name="camera" size={32} color="#4299E1" />
              </View>
              <Text style={styles.uploadText}>Add Receipt Image</Text>
              <Text style={styles.uploadSubtext}>Take a photo or select from gallery</Text>
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
                  <View style={[styles.progressBar, { width: `${extractionProgress}%` }]} />
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
                <View style={[styles.confidenceDot, { backgroundColor: getConfidenceColor(extractedData.confidence) }]} />
                <Text style={styles.confidenceText}>{extractedData.confidence} Confidence</Text>
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
                <Text style={[styles.dataValue, styles.amountValue]}>₹{extractedData.amount}</Text>
              </View>
              
              <View style={styles.dataRow}>
                <View style={styles.dataLabelContainer}>
                  <Ionicons name={getCategoryIcon(extractedData.category)} size={16} color="#4A5568" />
                  <Text style={styles.dataLabel}>Category</Text>
                </View>
                <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(extractedData.category) }]}>
                  <Text style={styles.categoryBadgeText}>{extractedData.category}</Text>
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
                    <Text key={index} style={styles.itemText}>• {item}</Text>
                  ))}
                  {extractedData.items.length > 3 && (
                    <Text style={styles.moreItemsText}>+{extractedData.items.length - 3} more items</Text>
                  )}
                </View>
              )}
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.editButton} onPress={handleEditData}>
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
      </ScrollView>

      {renderEditModal()}
      {renderImagePreviewModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A202C",
  },
  subtitle: {
    fontSize: 16,
    color: "#718096",
    lineHeight: 22,
  },
  imageSection: {
    marginBottom: 24,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    backgroundColor: "#FFF",
    minHeight: 200,
    justifyContent: "center",
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EBF8FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  uploadText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D3748",
    marginBottom: 4,
  },
  uploadSubtext: {
    fontSize: 14,
    color: "#718096",
  },
  imageContainer: {
    alignItems: "center",
  },
  receiptImage: {
    width: width - 40,
    height: 280,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
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
    marginTop: 16,
    gap: 12,
  },
  changeImageButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#F7FAFC",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  changeImageText: {
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FEB2B2",
    gap: 6,
  },
  removeImageText: {
    fontSize: 14,
    color: "#E53E3E",
    fontWeight: "500",
  },
  extractButton: {
    backgroundColor: "#4299E1",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: "#4299E1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
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
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#FFF",
    borderRadius: 2,
  },
  extractingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  resultsCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A202C",
  },
  confidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7FAFC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: "#4A5568",
    fontWeight: "500",
  },
  dataContainer: {
    marginBottom: 24,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F7FAFC",
  },
  dataLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dataLabel: {
    fontSize: 16,
    color: "#4A5568",
    fontWeight: "500",
  },
  dataValue: {
    fontSize: 16,
    color: "#1A202C",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  amountValue: {
    fontSize: 18,
    color: "#48BB78",
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryBadgeText: {
    fontSize: 14,
    color: "#FFF",
    fontWeight: "600",
  },
  itemsSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#F7FAFC",
    borderRadius: 12,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D3748",
    marginBottom: 8,
  },
  itemText: {
    fontSize: 14,
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
    paddingVertical: 14,
    backgroundColor: "#EBF8FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BEE3F8",
    gap: 6,
  },
  editButtonText: {
    fontSize: 16,
    color: "#4299E1",
    fontWeight: "600",
  },
  saveButton: {
    flex: 2,
    backgroundColor: "#48BB78",
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#48BB78",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A202C",
  },
  saveText: {
    fontSize: 16,
    color: "#4299E1",
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  editField: {
    marginBottom: 24,
  },
  editLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D3748",
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#F7FAFC",
  },
  categoryScroll: {
    marginTop: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  
  // Preview Modal Styles
  previewModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewModalOverlay: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: width - 40,
    height: height * 0.7,
    borderRadius: 12,
  },
  closePreviewButton: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    padding: 8,
  },
});