import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Bell, AlertCircle, Calendar } from "lucide-react-native";
import { useTheme } from "../context/ThemeContext";

const ReminderCard = ({ item, onPress }) => {
  const { theme } = useTheme();

  // Helper function to calculate days until the due date
  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0); // Normalize due date
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Simplified priority logic to match the new UI style
  const getReminderPriority = (daysUntil) => {
    if (daysUntil < 0) {
      return {
        color: theme.colors.error,
        backgroundColor: theme.colors.error + "20", // Light background for the icon
        label: `${Math.abs(daysUntil)} days Overdue`,
        icon: <AlertCircle size={28} color={theme.colors.error} />,
      };
    }
    if (daysUntil === 0) {
      return {
        color: theme.colors.warning,
        backgroundColor: theme.colors.warning + "20",
        label: "Due Today",
        icon: <Bell size={28} color={theme.colors.warning} />,
      };
    }
    if (daysUntil <= 3) {
      return {
        color: theme.colors.warning,
        backgroundColor: theme.colors.warning + "20",
        label: `Due in ${daysUntil} days`,
        icon: <Bell size={28} color={theme.colors.warning} />,
      };
    }
    return {
      color: theme.colors.primary,
      backgroundColor: theme.colors.primary + "15",
      label: `Due in ${daysUntil} days`,
      icon: <Bell size={28} color={theme.colors.primary} />,
    };
  };

  // Formatting functions remain useful
  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
  };

  const formatAmount = (amount) => {
    if (!amount) return "N/A";
    return `₹${parseFloat(amount).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })}`;
  };

  const daysUntil = getDaysUntilDue(item.next_due_date);
  const priority = getReminderPriority(daysUntil);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          shadowColor: theme.colors.shadow,
        },
      ]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: priority.backgroundColor },
        ]}
      >
        {priority.icon}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text
            style={[styles.title, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={[styles.amount, { color: priority.color }]}>
            {formatAmount(item.amount)}
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.detailGroup}>
            <Calendar size={14} color={theme.colors.textTertiary} />
            <Text
              style={[styles.detailText, { color: theme.colors.textSecondary }]}
            >
              {formatDate(item.next_due_date)}
            </Text>
          </View>
          <Text style={[styles.statusText, { color: priority.color }]}>
            {priority.label}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEE",
    elevation: 2,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 17,
    fontWeight: "800",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    fontWeight: "500",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
});


export default ReminderCard;
