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
  let iconBgColor = "#747D8C";
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
    iconBgColor = theme.colors.success;
    title = item.source || "Other Income";
    description = item.frequency === "one-time" ? "One-time" : item.frequency || "Recurring";
    if (item.is_recurring) description += " • 🔄";
  } else if (type === "investment") {
    amountColor = theme.colors.success;
    leftBorderColor = theme.colors.success;
    icon = "📈";
    iconBgColor = theme.colors.success;
    title = item.title || "Investment";
    description = item.type || "N/A";
  } else if (type === "expense") {
    const catObj = EXPENSE_CATEGORIES.find((c) => c.name === item.category);
    icon = catObj?.icon || "📝";
    iconBgColor = catObj?.color || "#747D8C";
    title = item.title || "Untitled";
    description = category;
  }

  const formatAmount = (amount) => {
    const num = parseFloat(amount) || 0;
    return num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getAmountPrefix = () => {
    if (type === "income") return "+";
    if (type === "investment") return "";
    return "-";
  };

  return (
    <TouchableOpacity
      style={[
        styles.item,
        {
          backgroundColor: theme.colors.surface,
          borderLeftWidth: leftBorderColor !== "transparent" ? 4 : 0,
          borderLeftColor: leftBorderColor,
          shadowColor: theme.colors.textPrimary,
        },
      ]}
      onLongPress={onLongPress}
      onPress={onPress}
      activeOpacity={onPress || onLongPress ? 0.7 : 1}
    >
      {/* Icon Section */}
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor + '15' }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>

      {/* Content Section */}
      <View style={styles.contentContainer}>
        <View style={styles.mainInfo}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.amount, { color: amountColor }]}>
            {getAmountPrefix()}₹{formatAmount(item.amount)}
          </Text>
        </View>
        
        <View style={styles.subInfo}>
          <View style={styles.leftSubInfo}>
            {!!description && (
              <Text style={[styles.category, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {description}
              </Text>
            )}
            <Text style={[styles.date, { color: theme.colors.textTertiary }]}>
              {date}
            </Text>
          </View>
          
          {/* Status indicator */}
          {type === "income" && item.is_recurring && (
            <View style={[styles.statusBadge, { backgroundColor: theme.colors.success + '20' }]}>
              <Text style={[styles.statusText, { color: theme.colors.success }]}>
                Recurring
              </Text>
            </View>
          )}
          
          {type === "expense" && (
            <View style={styles.typeIndicator}>
              <Text style={[styles.typeText, { color: theme.colors.textTertiary }]}>
                Expense
              </Text>
            </View>
          )}
          
          {type === "investment" && (
            <View style={[styles.statusBadge, { backgroundColor: theme.colors.success + '20' }]}>
              <Text style={[styles.statusText, { color: theme.colors.success }]}>
                Investment
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  mainInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
    lineHeight: 20,
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
    textAlign: "right",
  },
  subInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftSubInfo: {
    flex: 1,
  },
  category: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 2,
    opacity: 0.8,
  },
  date: {
    fontSize: 12,
    fontWeight: "400",
    opacity: 0.6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  typeIndicator: {
    marginLeft: 8,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    opacity: 0.5,
  },
});

export default TransactionItem;