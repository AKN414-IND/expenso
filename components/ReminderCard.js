import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Bell, AlertCircle, Calendar, Clock, DollarSign, Timer } from "lucide-react-native";
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
        accent: theme.colors.error + "35",
        glow: theme.colors.error + "15",
        pillBg: theme.colors.error + "29",
        pillText: "#fff",
        intensity: 1,
      };
    if (daysUntil === 0)
      return {
        color: theme.colors.warning,
        label: "Due Today",
        accent: theme.colors.warning + "35",
        glow: theme.colors.warning + "15",
        pillBg: theme.colors.warning + "29",
        pillText: "#fff",
        intensity: 0.88,
      };
    if (daysUntil <= 3)
      return {
        color: theme.colors.warning,
        label: "Due Soon",
        accent: theme.colors.warning + "24",
        glow: theme.colors.warning + "09",
        pillBg: theme.colors.warning + "19",
        pillText: "#885700",
        intensity: 0.62,
      };
    return {
      color: theme.colors.primary,
      label: "Upcoming",
      accent: theme.colors.primary + "24",
      glow: theme.colors.primary + "09",
      pillBg: theme.colors.primary + "17",
      pillText: "#075985",
      intensity: 0.32,
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

  const formatAmount = (amount) => {
    if (!amount) return null;
    const num = parseFloat(amount);
    return num.toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    });
  };

  const getDaysText = (daysUntil) => {
    if (daysUntil < 0) return `${Math.abs(daysUntil)} days overdue`;
    if (daysUntil === 0) return "Due today";
    if (daysUntil === 1) return "Due tomorrow";
    return `${daysUntil} days remaining`;
  };

  const daysUntil = getDaysUntilDue(item.next_due_date);
  const priority = getReminderPriority(daysUntil);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface + "F5",
          shadowColor: priority.color,
        },
      ]}
      activeOpacity={0.93}
      onPress={onPress}
    >
      {/* Vertical Accent Bar */}
      <View style={[styles.accentBar, { backgroundColor: priority.color }]} />

      {/* Glow effect (backdrop) */}
      <View
        style={[
          styles.glow,
          { backgroundColor: priority.glow, shadowColor: priority.color },
        ]}
      />

      <View style={styles.content}>
        {/* Icon and status */}
        <View style={styles.leftColumn}>
          <View style={[styles.iconCircle, { backgroundColor: priority.accent }]}>
            {daysUntil < 0 ? (
              <AlertCircle size={30} color={priority.color} strokeWidth={2.7} />
            ) : (
              <Bell size={30} color={priority.color} strokeWidth={2.5} />
            )}
          </View>
        </View>
        <View style={styles.mainColumn}>
          {/* Title and Status badge */}
          <View style={styles.headerRow}>
            <Text
              style={[
                styles.title,
                { color: theme.colors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: priority.pillBg },
              ]}
            >
              <Text style={[styles.badgeText, { color: priority.pillText }]}>
                {priority.label}
              </Text>
            </View>
          </View>

          {/* Details Row */}
          <View style={styles.detailsRow}>
            <View style={[styles.detailPill, { backgroundColor: theme.colors.buttonSecondary + "90" }]}>
              <Calendar size={15} color={theme.colors.textSecondary} />
              <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>{formatDate(item.next_due_date)}</Text>
            </View>
            <View style={[styles.detailPill, { backgroundColor: theme.colors.buttonSecondary + "90" }]}>
              <Clock size={15} color={theme.colors.textSecondary} />
              <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>{formatTime(item.reminder_time)}</Text>
            </View>
            {item.amount && (
              <View style={[styles.detailPill, { backgroundColor: priority.pillBg }]}>
                <DollarSign size={15} color={priority.color} />
                <Text style={[styles.detailText, { color: priority.color, fontWeight: "700" }]}>
                  ₹{formatAmount(item.amount)}
                </Text>
              </View>
            )}
          </View>

          {/* Days Left Row */}
          <View style={styles.daysRow}>
            <View style={[styles.daysBox, { backgroundColor: priority.accent }]}>
              <Timer size={16} color={priority.color} />
            </View>
            <Text style={[styles.daysText, { color: priority.color }]}>
              {getDaysText(daysUntil)}
            </Text>
          </View>

          {/* Progress */}
          <View style={styles.progressBarWrap}>
            <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: priority.color,
                    width: `${100 * priority.intensity}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 0,
    marginBottom: 20,
    
    overflow: "visible",
    position: "relative",
    minHeight: 110,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    opacity: 0.23,
    zIndex: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 32,
    shadowOpacity: 0.22,
  },
  content: {
    flexDirection: "row",
    alignItems: "stretch",
    zIndex: 1,
  },
  leftColumn: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 18,
    paddingRight: 10,
    paddingTop: 22,
    paddingBottom: 22,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 7,
    elevation: 2,
  },
  mainColumn: {
    flex: 1,
    justifyContent: "center",
    paddingTop: 22,
    paddingBottom: 22,
    paddingRight: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
    marginRight: 10,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 13,
    alignSelf: "flex-start",
    minWidth: 74,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 8,
  },
  detailPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
  },
  detailText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  daysRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 7,
  },
  daysBox: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: "#e0e7ef",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },
  daysText: {
    fontSize: 13.5,
    fontWeight: "700",
    letterSpacing: 0.08,
    flex: 1,
  },
  progressBarWrap: {
    marginTop: 8,
  },
  progressTrack: {
    width: "100%",
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "#e5e7eb",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
});

export default ReminderCard;
