// components/TransactionItem.js
import React, { useRef } from "react"; // NEW: import useRef
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Pressable, // NEW: import Pressable for the icon tap
  Animated, // NEW: import Animated for the jiggle effect
} from "react-native";
import * as Haptics from "expo-haptics"; // NEW: import Haptics for feedback

const EXPENSE_CATEGORIES = [
  { name: "Food & Dining", icon: "🍽️", color: "#FF6B6B" },
  { name: "Transportation", icon: "🚗", color: "#4ECDC4" },
  { name: "Shopping", icon: "🛍️", color: "#45B7D1" },
  { name: "Entertainment", icon: "🎬", color: "#96CEB4" },
  { name: "Bills & Utilities", icon: "💡", color: "#FECA57" },
  { name: "Healthcare", icon: "🏥", color: "#FF9FF3" },
  { name: "Education", icon: "📚", color: "#54A0FF" },
  { name: "Travel", icon: "✈️", color: "#5F27CD" },
  { name: "Groceries", icon: "🛒", color: "#00D2D3" },
  { name: "Other", icon: "📝", color: "#747D8C" },
];

const TransactionItem = ({
  item,
  type = "expense",
  onPress,
  onLongPress,
  theme,
}) => {
  // --- NEW: Easter Egg Animation Setup ---
  const jiggleAnim = useRef(new Animated.Value(0)).current;

  const handleIconPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    jiggleAnim.setValue(0); // Reset animation
    Animated.sequence([
      Animated.timing(jiggleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(jiggleAnim, {
        toValue: -1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(jiggleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(jiggleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const jiggleInterpolation = jiggleAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-10deg", "0deg", "10deg"],
  });
  // --- End of Easter Egg Setup ---

  let icon = "📝";
  let iconBgColor = "#747D8C";
  let title = item.title || "Untitled";

  if (type === "income") {
    icon = "💵";
    iconBgColor = theme.colors.success;
    title = item.source || "Income";
  } else if (type === "investment") {
    icon = "📈";
    iconBgColor = theme.colors.success;
    title = item.title || "Investment";
  } else {
    const catObj = EXPENSE_CATEGORIES.find((c) => c.name === item.category);
    if (catObj) {
      icon = catObj.icon;
      iconBgColor = catObj.color;
    }
  }

  const date =
    item.date && !isNaN(new Date(item.date))
      ? new Date(item.date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "No date";

  const formatAmount = (amount) => {
    const num = parseFloat(amount) || 0;
    const isNegative = num < 0 && type === "expense";
    const prefix = isNegative ? "" : type === "expense" ? "-" : "+";

    return (
      prefix +
      " ₹" +
      Math.abs(num).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const amountColor =
    type === "expense" ? theme.colors.error : theme.colors.success;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          ...styles.shadow,
        },
      ]}
      onLongPress={onLongPress}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* NEW: Wrapped the icon in a Pressable to trigger the easter egg */}
      <Pressable onPress={handleIconPress}>
        <Animated.View
          style={[
            styles.iconContainer,
            {
              backgroundColor: iconBgColor,
              transform: [{ rotate: jiggleInterpolation }], // Apply animation here
            },
          ]}
        >
          <Text style={styles.iconText}>{icon}</Text>
        </Animated.View>
      </Pressable>

      <View style={styles.infoContainer}>
        <Text
          style={[styles.title, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
          {date}
        </Text>
      </View>

      <View style={styles.amountContainer}>
        {/* NEW: Updated amount text to use color based on type */}
        <Text style={[styles.amount, { color: amountColor }]}>
          {formatAmount(item.amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconText: { fontSize: 22 },
  infoContainer: { flex: 1, justifyContent: "center" },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  date: { fontSize: 13, opacity: 0.7 },
  amountContainer: { paddingLeft: 10 },
  amount: { fontSize: 16, fontWeight: "600", letterSpacing: 0.5 },
});

export default TransactionItem;
