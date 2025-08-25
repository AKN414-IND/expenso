import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Edit3, Trash2, TrendingUp, TrendingDown } from 'lucide-react-native';
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

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

const formatCurrency = (value, isProfitLoss = false) => {
    if (value === null || value === undefined || isNaN(value)) return '₹--';
    const valueToFormat = isProfitLoss ? Math.abs(value) : value;
    return `₹${valueToFormat.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

const InvestmentCard = ({ investment, onEdit, onDelete }) => {
    const { theme } = useTheme();

    const {
        title,
        type,
        total_cost,
        description,
        currentValue,
        quantity,
        purchase_price,
    } = investment;

    const profitLoss = currentValue !== null ? currentValue - total_cost : null;
    const percentageChange =
      profitLoss !== null && total_cost > 0
        ? (profitLoss / total_cost) * 100
        : null;
    const isProfit = profitLoss !== null && profitLoss >= 0;

    return (
        <View style={[styles.cardContainer, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>
          {/* Header Section */}
          <View style={styles.section}>
            <View style={styles.header}>
                <View style={[styles.iconWrapper, {backgroundColor: theme.colors.background}]}>
                    <Text style={styles.iconEmoji}>{ICONS[type] || ICONS["Others"]}</Text>
                </View>
                <View style={styles.titleContainer}>
                    <Text style={[styles.title, {color: theme.colors.text}]} numberOfLines={1}>{title}</Text>
                    <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>{type}</Text>
                </View>
                <Text style={[styles.totalCost, {color: theme.colors.text}]}>{formatCurrency(total_cost)}</Text>
            </View>
          </View>

          {/* Real-time Data Section */}
          {currentValue !== null && profitLoss !== null && (
            <View style={[styles.section, {borderTopColor: theme.colors.borderLight}]}>
                <View style={styles.realTimeRow}>
                    <View style={styles.realTimeItem}>
                        <Text style={[styles.realTimeLabel, {color: theme.colors.textTertiary}]}>Current Value</Text>
                        <Text style={[styles.realTimeValue, {color: theme.colors.primary}]}>{formatCurrency(currentValue)}</Text>
                    </View>
                    <View style={styles.realTimeItem}>
                        <Text style={[styles.realTimeLabel, {color: theme.colors.textTertiary}]}>P/L</Text>
                        <Text style={[styles.realTimeValue, {color: isProfit ? theme.colors.success : theme.colors.error}]}>
                            {formatCurrency(profitLoss, true)}
                        </Text>
                    </View>
                    <View style={styles.realTimeItem}>
                        <Text style={[styles.realTimeLabel, {color: theme.colors.textTertiary}]}>Change</Text>
                        <View style={styles.percentageWrapper}>
                            {isProfit ? <TrendingUp color={theme.colors.success} size={14} /> : <TrendingDown color={theme.colors.error} size={14} />}
                            <Text style={[styles.percentageText, {color: isProfit ? theme.colors.success : theme.colors.error}]}>
                                {percentageChange?.toFixed(2)}%
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
          )}
          
          {/* Details Section */}
          {(quantity || purchase_price) && (
            <View style={[styles.section, {borderTopColor: theme.colors.borderLight}]}>
                <View style={styles.detailsRow}>
                    {quantity && <Text style={[styles.detailText, {color: theme.colors.textSecondary}]}>Qty: {quantity}</Text>}
                    {purchase_price && <Text style={[styles.detailText, {color: theme.colors.textSecondary}]}>Avg. Price: {formatCurrency(purchase_price)}</Text>}
                </View>
            </View>
          )}

          {/* Description Section */}
          {description ? (
            <View style={[styles.section, {borderTopColor: theme.colors.borderLight}]}>
                <Text style={[styles.descriptionText, {color: theme.colors.textSecondary}]}>{description}</Text>
            </View>
          ) : null}

          {/* Actions Section */}
          <View style={[styles.section, {borderTopColor: theme.colors.borderLight}]}>
            <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionButton, {backgroundColor: theme.colors.buttonSecondary}]} onPress={onEdit}>
                    <Edit3 color={theme.colors.textSecondary} size={16} />
                    <Text style={[styles.actionButtonText, {color: theme.colors.textSecondary}]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, {backgroundColor: theme.colors.buttonSecondary}]} onPress={onDelete}>
                    <Trash2 color={theme.colors.error} size={16} />
                    <Text style={[styles.actionButtonText, {color: theme.colors.error}]}>Delete</Text>
                </TouchableOpacity>
            </View>
          </View>
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        borderRadius: 16,
        marginBottom: 16,
        elevation: 3,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    section: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: 1,
    },
    header: { flexDirection: 'row', alignItems: 'center' },
    iconWrapper: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    iconEmoji: { fontSize: 20 },
    titleContainer: { flex: 1, marginRight: 8 },
    title: { fontSize: isSmallScreen ? 15 : 16, fontWeight: 'bold' },
    subtitle: { fontSize: 13, marginTop: 2 },
    totalCost: { fontSize: isSmallScreen ? 15 : 16, fontWeight: 'bold' },
    realTimeRow: { flexDirection: 'row', justifyContent: 'space-between' },
    realTimeItem: { flex: 1, alignItems: 'flex-start' },
    realTimeLabel: { fontSize: 12, fontWeight: '500', marginBottom: 6 },
    realTimeValue: { fontSize: 14, fontWeight: 'bold' },
    percentageWrapper: { flexDirection: 'row', alignItems: 'center' },
    percentageText: { fontSize: 14, fontWeight: 'bold', marginLeft: 4 },
    detailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    detailText: { fontSize: 13, fontStyle: 'italic' },
    descriptionText: { fontSize: 14, lineHeight: 20 },
    actionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
    actionButtonText: { fontSize: isSmallScreen ? 13 : 14, fontWeight: 'bold', marginLeft: 8 },
});

export default InvestmentCard;
