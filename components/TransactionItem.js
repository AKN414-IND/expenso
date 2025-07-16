// components/TransactionItem.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

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
  let amountColor = theme.colors.primary;
  let leftBorderColor = "transparent";
  let icon = "📝";
  let title = item.title || "";
  let category = item.category || "";
  let date =
    item.date && !isNaN(new Date(item.date))
      ? new Date(item.date).toLocaleDateString()
      : "No date";
  let description = "";

  if (type === "income") {
    amountColor = theme.colors.success;
    leftBorderColor = theme.colors.success;
    icon = "💵";
    title = item.source || "Other Income";
    description = item.frequency === "one-time" ? "One-time" : item.frequency || "Recurring";
    if (item.is_recurring) description += " • 🔄";
  } else if (type === "investment") {
    amountColor = theme.colors.success;
    leftBorderColor = theme.colors.success;
    icon = "📈";
    title = item.title || "Investment";
    description = item.type || "N/A";
  } else if (type === "expense") {
    const catObj = EXPENSE_CATEGORIES.find((c) => c.name === item.category);
    icon = catObj?.icon || "📝";
    title = item.title || "Untitled";
    description = category;
  }

  return (
    <TouchableOpacity
      style={[
        styles.item,
        {
          backgroundColor: theme.colors.surface,
          borderLeftWidth: leftBorderColor !== "transparent" ? 4 : 0,
          borderLeftColor: leftBorderColor,
        },
      ]}
      onLongPress={onLongPress}
      onPress={onPress}
      activeOpacity={onPress || onLongPress ? 0.7 : 1}
    >
      <View style={styles.info}>
        <Text style={[styles.title, { color: theme.colors.textSecondary }]}>
          {title}
        </Text>
        <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
          {date}
        </Text>
        {!!description && (
          <Text style={[styles.desc, { color: theme.colors.textTertiary }]}>
            {icon} {description}
          </Text>
        )}
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {type === "income" ? "+" : ""}
        ₹{(parseFloat(item.amount) || 0).toFixed(2)}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.1)",
    elevation: 1,
  },
  info: { flex: 1 },
  title: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
    opacity: 0.7,
  },
  desc: {
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.6,
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
});

export default TransactionItem;
