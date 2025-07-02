import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Bell, AlertCircle, Calendar, Clock } from "lucide-react-native";

const ReminderCard = ({ item, onPress }) => {
  // Returns days until the next due date
  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Sets label/color per daysUntil
  const getReminderPriority = (daysUntil) => {
    if (daysUntil < 0)
      return {
        color: "#ef4444",
        label: "Overdue",
        bg: "#fef2f2",
        border: "#fecaca",
      };
    if (daysUntil === 0)
      return {
        color: "#f59e0b",
        label: "Due Today",
        bg: "#fffbeb",
        border: "#fed7aa",
      };
    if (daysUntil <= 3)
      return {
        color: "#f59e0b",
        label: "Due Soon",
        bg: "#fffbeb",
        border: "#fed7aa",
      };
    return {
      color: "#06b6d4",
      label: "Upcoming",
      bg: "#f0f9ff",
      border: "#bae6fd",
    };
  };

  // Date format: "Mon, Jul 2"
  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  };

  // Time format: "12:30 PM"
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
      style={[styles.reminderCard, { borderColor: priority.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Faint Background */}
      <View
        style={[
          styles.reminderGradient,
          { backgroundColor: priority.bg },
        ]}
      />
      {/* Badge */}
      <View
        style={[
          styles.reminderStatusBadge,
          { backgroundColor: priority.color },
        ]}
      >
        <Text style={styles.reminderStatusText}>{priority.label}</Text>
      </View>

      <View style={styles.reminderMainContent}>
        {/* Header */}
        <View style={styles.reminderHeaderSection}>
          <View style={styles.reminderTitleContainer}>
            <View style={styles.reminderIconWrapper}>
              {daysUntil < 0 ? (
                <AlertCircle size={18} color={priority.color} />
              ) : (
                <Bell size={18} color={priority.color} />
              )}
            </View>
            <Text style={styles.reminderTitle} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
        </View>
        {/* Info Section */}
        <View style={styles.reminderInfoSection}>
          <View style={styles.reminderInfoGrid}>
            {/* Date */}
            <View style={styles.reminderInfoItem}>
              <View style={styles.reminderInfoIcon}>
                <Calendar size={14} color="#64748b" />
              </View>
              <Text style={styles.reminderInfoText}>
                {formatDate(item.next_due_date)}
              </Text>
            </View>
            {/* Time */}
            <View style={styles.reminderInfoItem}>
              <View style={styles.reminderInfoIcon}>
                <Clock size={14} color="#64748b" />
              </View>
              <Text style={styles.reminderInfoText}>
                {formatTime(item.reminder_time)}
              </Text>
            </View>
          </View>
        </View>
        {/* Footer */}
        <View style={styles.reminderFooterSection}>
          {/* Days Counter */}
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
          {/* Amount */}
          {item.amount && (
            <View style={styles.reminderAmountChip}>
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
      {/* Priority Color Line */}
      <View
        style={[styles.reminderPriorityLine, { backgroundColor: priority.color }]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  reminderCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
    backgroundColor: "rgba(6,182,212,0.13)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  reminderTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1e293b",
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
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
    color: "#334155",
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
    backgroundColor: "#f8fafc",
    marginRight: 8,
  },
  reminderDaysText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    letterSpacing: 0.1,
  },
  reminderAmountChip: {
    backgroundColor: "#06b6d4",
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
