// components/ReminderCard.js

import React from "react";
import { TouchableOpacity, View, Text, StyleSheet, Linking } from "react-native";
import { ExternalLink, CheckSquare, Clock, Pencil, Trash2 } from "lucide-react-native";
import { useTheme } from "../context/ThemeContext";

const ReminderCard = ({ item, onEdit, onMarkPaid, onSnooze, onDelete }) => {
  const { theme } = useTheme();

  // --- Helper Functions ---
  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatAmount = (amount) => {
    if (!amount) return "N/A";
    return `₹${parseFloat(amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  };
  
  const formatDate = (dateString) => {
      const date = new Date(dateString);
      const day = date.getDate();
      const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
      return { day, month };
  }

  const { day, month } = formatDate(item.next_due_date);
  const priorityColor = item.priority === 1 ? theme.colors.error : item.priority === 3 ? theme.colors.success : theme.colors.border;

  return (
    <View style={[ styles.card, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>
        {/* Main content area, pressable for editing */}
        <TouchableOpacity activeOpacity={0.8} onPress={onEdit}>
            <View style={styles.contentContainer}>
                {/* Date and Priority Section */}
                <View style={[styles.dateSection, { borderLeftColor: priorityColor }]}>
                    <Text style={[styles.dateDay, { color: theme.colors.text }]}>{day}</Text>
                    <Text style={[styles.dateMonth, { color: theme.colors.textSecondary }]}>{month}</Text>
                </View>

                {/* Details Section */}
                <View style={styles.detailsSection}>
                    <View style={styles.header}>
                        <View style={[styles.iconContainer, { backgroundColor: item.color ? `${item.color}20` : theme.colors.background }]}>
                            <Text style={styles.iconText}>{item.icon || '💰'}</Text>
                        </View>
                        <View style={styles.titleContainer}>
                            <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
                            {item.payee && <Text style={[styles.payee, { color: theme.colors.textSecondary }]}>{item.payee}</Text>}
                        </View>
                        <Text style={[styles.amount, { color: theme.colors.primary }]}>{formatAmount(item.amount)}</Text>
                    </View>
                    {item.tags?.length > 0 && (
                        <View style={styles.tagsContainer}>
                        {item.tags.map(tag => (
                            <View key={tag} style={[styles.tag, { backgroundColor: theme.colors.borderLight }]}>
                            <Text style={[styles.tagText, { color: theme.colors.textSecondary }]}>{tag}</Text>
                            </View>
                        ))}
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>

        {/* Action Bar */}
        <View style={styles.actionBar}>
            {item.pay_url && item.is_active ? (
                <TouchableOpacity
                    style={[styles.payButton, { backgroundColor: theme.colors.primary }]}
                    onPress={(e) => { e.stopPropagation(); Linking.openURL(item.pay_url); }}
                >
                    <Text style={[styles.payButtonText, { color: theme.colors.onPrimary }]}>Pay Now</Text>
                    <ExternalLink size={14} color={theme.colors.onPrimary} />
                </TouchableOpacity>
            ) : (
                <Text style={[styles.statusText, { color: !item.is_active ? theme.colors.success : theme.colors.textSecondary }]}>
                    {!item.is_active ? "Paid" : `Due in ${getDaysUntilDue(item.next_due_date)} days`}
                </Text>
            )}

            <View style={styles.actionIcons}>
                <TouchableOpacity style={styles.actionButton} onPress={onMarkPaid}>
                    <CheckSquare size={20} color={item.is_active ? theme.colors.textSecondary : theme.colors.success} />
                </TouchableOpacity>
                 <TouchableOpacity style={styles.actionButton} onPress={onSnooze}>
                    <Clock size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
                    <Pencil size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
                    <Trash2 size={20} color={theme.colors.error} />
                </TouchableOpacity>
            </View>
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  contentContainer: {
    flexDirection: 'row',
  },
  dateSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 5,
  },
  dateDay: { fontSize: 24, fontWeight: '800' },
  dateMonth: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },
  detailsSection: { flex: 1, paddingVertical: 12, paddingRight: 16, paddingLeft: 10 },
  header: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  iconText: { fontSize: 20 },
  titleContainer: { flex: 1, marginRight: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  payee: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800' },
  tagsContainer: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  tag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { fontSize: 11, fontWeight: '600' },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE' // Use a light border from theme if available
  },
  payButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  payButtonText: { fontWeight: '700', fontSize: 13 },
  statusText: { fontSize: 13, fontWeight: '600' },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  }
});

export default ReminderCard;