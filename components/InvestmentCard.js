import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Edit3, Trash2, Calendar, TrendingUp, TrendingDown } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const ICONS = {
    Stocks: "📈",
    "Mutual Funds": "💹",
    FD: "🏦",
    Crypto: "🪙",
    Gold: "🥇",
    Bonds: "💵",
    "Real Estate": "🏠",
    Others: "🗂️",
};

const formatDate = (date) => {
    if (!date) return 'No Date';
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
};

const InvestmentCard = ({ investment, onEdit, onDelete }) => {
    const { theme } = useTheme();

    // Use `total_cost` as the primary field for cost.
    const { title, type, date, total_cost, description, currentValue } =
      investment;

    // 1. Ensure totalCost is always a valid number, defaulting to 0.
    const totalCost = parseFloat(total_cost || 0);

    // 2. Safely calculate profit & loss
    const profitLoss = currentValue !== null ? currentValue - totalCost : null;

    // 3. Safely calculate percentage change, preventing division by zero.
    const percentageChange =
      profitLoss !== null && totalCost > 0
        ? (profitLoss / totalCost) * 100
        : null;

    const isProfit = profitLoss !== null && profitLoss >= 0;

    return (
        <View
          style={[
            styles.investmentCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderLight,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.cardIcon,
                { backgroundColor: theme.colors.buttonSecondary },
              ]}
            >
              <Text style={styles.cardEmoji}>{ICONS[type] || ICONS["Others"]}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text
                style={[styles.cardTitle, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {title}
              </Text>
              <Text
                style={[styles.cardType, { color: theme.colors.textSecondary }]}
              >
                {type}
              </Text>
              <View style={styles.cardDate}>
                <Calendar color={theme.colors.textTertiary} size={12} />
                <Text
                  style={[
                    styles.cardDateText,
                    { color: theme.colors.textTertiary },
                  ]}
                >
                  {formatDate(date)}
                </Text>
              </View>
            </View>
            <View style={styles.cardAmountContainer}>
              <Text style={[styles.amountText, { color: theme.colors.text }]}>
                ₹{totalCost.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Render real-time data only if it's valid */}
          {currentValue !== null && profitLoss !== null && (
            <View
              style={[
                styles.realTimeSection,
                { borderTopColor: theme.colors.borderLight },
              ]}
            >
              <View style={styles.realTimeItem}>
                <Text
                  style={[
                    styles.realTimeLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Current Value
                </Text>
                <Text
                  style={[styles.currentValue, { color: theme.colors.primary }]}
                >
                  ₹
                  {currentValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
              <View style={styles.realTimeItem}>
                <Text
                  style={[
                    styles.realTimeLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  P/L
                </Text>
                <Text
                  style={[
                    styles.profitLoss,
                    { color: isProfit ? theme.colors.success : theme.colors.error },
                  ]}
                >
                  {isProfit ? "+" : ""}₹
                  {profitLoss.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
              <View style={styles.realTimeItem}>
                <Text
                  style={[
                    styles.realTimeLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Change
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {isProfit ? (
                    <TrendingUp color={theme.colors.success} size={14} />
                  ) : (
                    <TrendingDown color={theme.colors.error} size={14} />
                  )}
                  <Text
                    style={[
                      styles.percentageChange,
                      {
                        color: isProfit ? theme.colors.success : theme.colors.error,
                        marginLeft: 4,
                      },
                    ]}
                  >
                    {typeof percentageChange === "number"
                      ? `${percentageChange.toFixed(2)}%`
                      : "--"}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {description ? (
            <Text
              style={[
                styles.cardDescription,
                {
                  color: theme.colors.textSecondary,
                  borderTopColor: theme.colors.borderLight,
                },
              ]}
            >
              {description}
            </Text>
          ) : null}

          <View
            style={[
              styles.cardActions,
              { borderTopColor: theme.colors.borderLight },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.warning + "15" },
              ]}
              onPress={onEdit}
            >
              <Edit3 color={theme.colors.warning} size={16} />
              <Text
                style={[styles.actionButtonText, { color: theme.colors.warning }]}
              >
                Edit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.error + "15" },
              ]}
              onPress={onDelete}
            >
              <Trash2 color={theme.colors.error} size={16} />
              <Text
                style={[styles.actionButtonText, { color: theme.colors.error }]}
              >
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
    );
};

const styles = StyleSheet.create({
    investmentCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        marginBottom: 14,
    },
    cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    cardIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    cardEmoji: { fontSize: 20 },
    cardInfo: { flex: 1, marginRight: 8 },
    cardTitle: { fontSize: 16, fontWeight: "700" },
    cardType: { fontSize: 14, color: "#666", marginTop: 2 },
    cardDate: { flexDirection: "row", alignItems: "center", marginTop: 4 },
    cardDateText: { fontSize: 12, marginLeft: 4 },
    cardAmountContainer: { alignItems: "flex-end" },
    amountText: { fontSize: 16, fontWeight: "700" },
    realTimeSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingTop: 12,
        marginTop: 8,
        borderTopWidth: 1,
    },
    realTimeItem: { alignItems: "center", flex: 1 },
    realTimeLabel: { fontSize: 12, marginBottom: 4 },
    currentValue: { fontSize: 14, fontWeight: "bold" },
    profitLoss: { fontSize: 14, fontWeight: "bold" },
    percentageChange: { fontSize: 14, fontWeight: "bold" },
    cardDescription: {
        fontSize: 14,
        marginTop: 12,
        lineHeight: 20,
        borderTopWidth: 1,
        paddingTop: 12,
    },
    cardActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingTop: 12,
        marginTop: 12,
        borderTopWidth: 1,
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 4,
        justifyContent: "center",
    },
    actionButtonText: { fontWeight: "600", fontSize: 14, marginLeft: 6 },
});

export default InvestmentCard;
