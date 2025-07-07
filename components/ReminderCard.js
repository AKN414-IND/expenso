import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Bell, AlertCircle, Calendar, Clock } from "lucide-react-native";
import { useTheme } from "../context/ThemeContext";

const ReminderCard = ({ item, onPress }) => {
  const { theme } = useTheme();

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getReminderPriority = (daysUntil) => {
    if (daysUntil < 0)
      return {
        color: theme.colors.error,
        label: "Overdue",
        bg: theme.colors.error + "18",
        border: theme.colors.error + "30",
      };
    if (daysUntil === 0)
      return {
        color: theme.colors.warning,
        label: "Due Today",
        bg: theme.colors.warning + "18",
        border: theme.colors.warning + "30",
      };
    if (daysUntil <= 3)
      return {
        color: theme.colors.warning,
        label: "Due Soon",
        bg: theme.colors.warning + "10",
        border: theme.colors.warning + "30",
      };
    return {
      color: theme.colors.primary,
      label: "Upcoming",
      bg: theme.colors.primary + "18",
      border: theme.colors.primary + "30",
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return "9:00 AM";
    const [hours, minutes] = timeString.split(":");
    const hour12 = hours % 12 || 12;
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${hour12}:${minutes} ${ampm}`;
  };

  const daysUntil = getDaysUntilDue(item.next_due_date);
  const priority = getReminderPriority(daysUntil);

  return (
    <TouchableOpacity
      style={[styles.reminderCard, { borderColor: priority.border, backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View
        style={[
          styles.reminderGradient,
          { backgroundColor: priority.bg },
        ]}
      />
      <View
        style={[
          styles.reminderStatusBadge,
          { backgroundColor: priority.color },
        ]}
      >
        <Text style={styles.reminderStatusText}>{priority.label}</Text>
      </View>
      <View style={styles.reminderMainContent}>
        <View style={styles.reminderHeaderSection}>
          <View style={styles.reminderTitleContainer}>
            <View style={[styles.reminderIconWrapper, { backgroundColor: priority.color + "13" }]}>
              {daysUntil < 0 ? (
                <AlertCircle size={18} color={priority.color} />
              ) : (
                <Bell size={18} color={priority.color} />
              )}
            </View>
            <Text style={[styles.reminderTitle, { color: theme.colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
        </View>
        <View style={styles.reminderInfoSection}>
          <View style={styles.reminderInfoGrid}>
            <View style={[styles.reminderInfoItem, { backgroundColor: theme.colors.buttonSecondary, borderColor: theme.colors.border }]}>
              <View style={styles.reminderInfoIcon}>
                <Calendar size={14} color={theme.colors.textTertiary} />
              </View>
              <Text style={[styles.reminderInfoText, { color: theme.colors.textSecondary }]}>
                {formatDate(item.next_due_date)}
              </Text>
            </View>
            <View style={[styles.reminderInfoItem, { backgroundColor: theme.colors.buttonSecondary, borderColor: theme.colors.border }]}>
              <View style={styles.reminderInfoIcon}>
                <Clock size={14} color={theme.colors.textTertiary} />
              </View>
              <Text style={[styles.reminderInfoText, { color: theme.colors.textSecondary }]}>
                {formatTime(item.reminder_time)}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.reminderFooterSection}>
          <View
            style={[
              styles.reminderDaysChip,
              {
                backgroundColor: priority.color + "20",
                borderColor: priority.color + "40",
              },
            ]}
          >
            <Text style={[styles.reminderDaysText, { color: priority.color }]}>
              {daysUntil < 0
                ? `${Math.abs(daysUntil)} days overdue`
                : daysUntil === 0
                ? "Today"
                : daysUntil === 1
                ? "Tomorrow"
                : `${daysUntil} days left`}
            </Text>
          </View>
          {item.amount && (
            <View style={[styles.reminderAmountChip, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.reminderAmountText}>
                ₹
                {parseFloat(item.amount).toLocaleString("en-IN", {
                  maximumFractionDigits: 0,
                })}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View
        style={[styles.reminderPriorityLine, { backgroundColor: priority.color }]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  reminderCard: {
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 180,
    overflow: "hidden",
    position: "relative",
  },
  reminderGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.06,
  },
  reminderStatusBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    elevation: 2,
    zIndex: 2,
  },
  reminderStatusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reminderMainContent: {
    padding: 18,
    flex: 1,
    justifyContent: "space-between",
  },
  reminderHeaderSection: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  reminderTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  reminderIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  reminderTitle: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
    flex: 1,
    letterSpacing: 0.1,
  },
  reminderInfoSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  reminderInfoGrid: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reminderInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 10,
  },
  reminderInfoIcon: {
    marginRight: 6,
    width: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  reminderInfoText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.15,
  },
  reminderFooterSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  reminderDaysChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  reminderDaysText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  reminderAmountChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    elevation: 1,
    marginLeft: 8,
  },
  reminderAmountText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.2,
  },
  reminderPriorityLine: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
});

export default ReminderCard;
