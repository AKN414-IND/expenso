// components/TransactionItem.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";

// This array can be moved to a separate constants file in a larger application.
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
  // --- Derive Display Data based on Type ---
  let icon = "📝";
  let iconBgColor = "#747D8C";
  let title = item.title || "Untitled";

  if (type === "income") {
    icon = "💵";
    iconBgColor = theme.colors.success;
    title = item.source || "Income";
  } else if (type === "investment") {
    icon = "📈";
    iconBgColor = theme.colors.info || theme.colors.success;
    title = item.title || "Investment";
  } else { // 'expense'
    const catObj = EXPENSE_CATEGORIES.find((c) => c.name === item.category);
    if (catObj) {
      icon = catObj.icon;
      iconBgColor = catObj.color;
    }
  }

  // --- Format Date and Amount ---
  const date =
    item.date && !isNaN(new Date(item.date))
      ? new Date(item.date).toLocaleDateString('en-GB', { // en-GB for DD-MM-YYYY
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : "No date";

  const formatAmount = (amount) => {
    const num = parseFloat(amount) || 0;
    // Formats amount and places the currency symbol at the end, as per the reference image.
    return num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + '₹';
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          // The shadow is now more defined, matching the reference style.
          ...styles.shadow,
        },
      ]}
      onLongPress={onLongPress}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Icon: A rounded square with a solid background color. */}
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>

      {/* Info: Title and Date */}
      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
          {date}
        </Text>
      </View>

      {/* Amount */}
      <View style={styles.amountContainer}>
        <Text style={[styles.amount, { color: theme.colors.textPrimary }]}>
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
  },
  shadow: {
    // A more pronounced, cross-platform shadow similar to the image.
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12, // Rounded square
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: 22,
    // Note: Emojis have their own color and cannot be styled with 'color'.
    // For monochrome icons, a library like react-native-vector-icons would be needed.
  },
  infoContainer: {
    flex: 1, // Takes up available space to push amount to the right
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700", // Bolder title
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    opacity: 0.7,
  },
  amountContainer: {
    paddingLeft: 10, // Ensure space between info and amount
  },
  amount: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default TransactionItem;