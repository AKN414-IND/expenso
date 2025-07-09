import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

const CELL_MARGIN = 2;
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];


function getColor(amount, maxSpending, theme) {
    if (!amount || maxSpending === 0) return theme.colors.surface;
    const percent = amount / maxSpending;
    if (percent < 0.2) return theme.colors.border;
    if (percent < 0.4) return "#7ee3cc";
    if (percent < 0.6) return "#53c2e7";
    if (percent < 0.8) return "#3ab5e2";
    return theme.colors.error;
  }
  
  function getEmojiColor(amount, maxSpending, theme) {
    if (!amount || maxSpending === 0) return theme.colors.textTertiary;
    if (amount / maxSpending > 0.8) return theme.colors.error;
    return theme.colors.primary;
  }
  
  function getEmojiForAmount(amount, maxSpending) {
    if (!amount || maxSpending === 0) return "😴";
    const percent = amount / maxSpending;
    if (percent < 0.2) return "🧊";
    if (percent < 0.4) return "🙂";
    if (percent < 0.6) return "😐";
    if (percent < 0.8) return "😰";
    return "🔥";
  }
  
  function formatDate(isoDate) {
    const d = new Date(isoDate);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  
  const getCellSize = () => {
    const screenWidth = Dimensions.get("window").width;
    const totalMargin = 18 * 2 + CELL_MARGIN * 2 * 7;
    return Math.floor((screenWidth - totalMargin) / 7);
  };
  
  const EMOJI_LEGEND = [
    { emoji: "😴", label: "No expenses: calm, not spending" },
    { emoji: "🧊", label: "Very low: chill, “cool as ice”" },
    { emoji: "🙂", label: "Low: feeling good, controlled spending" },
    { emoji: "😐", label: "Moderate: neutral, okay spending" },
    { emoji: "😰", label: "High: sweating, a bit worried!" },
    { emoji: "🔥", label: "Very high: burning, spent a LOT today!" },
  ];
  
  const CalendarHeatmap = ({ expenses }) => {
    const { theme } = useTheme();
    const [selected, setSelected] = useState(null);
    const [showInfo, setShowInfo] = useState(false);
  
    const CELL_SIZE = useMemo(() => getCellSize(), []);
  
    const { weeks } = useMemo(() => {
      const expensesByDay = {};
      const expensesByDayCat = {};
      expenses.forEach((exp) => {
        if (exp.date) {
          if (!expensesByDay[exp.date]) expensesByDay[exp.date] = 0;
          expensesByDay[exp.date] += parseFloat(exp.amount) || 0;
          if (!expensesByDayCat[exp.date]) expensesByDayCat[exp.date] = {};
          const cat = exp.category || "Other";
          expensesByDayCat[exp.date][cat] =
            (expensesByDayCat[exp.date][cat] || 0) + (parseFloat(exp.amount) || 0);
        }
      });
  
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      let maxSpending = 0;
      for (let i = 1; i <= daysInMonth; i++) {
        const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
        maxSpending = Math.max(maxSpending, expensesByDay[dateString] || 0);
      }
  
      const firstDay = new Date(year, month, 1).getDay();
      const newWeeks = [];
      let day = 1 - firstDay;
      while (day <= daysInMonth) {
        const week = [];
        for (let w = 0; w < 7; w++) {
          if (day > 0 && day <= daysInMonth) {
            const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const amount = expensesByDay[dateString] || 0;
            week.push({
              day,
              dateString,
              amount,
              color: getColor(amount, maxSpending, theme),
              emojiColor: getEmojiColor(amount, maxSpending, theme),
              emoji: getEmojiForAmount(amount, maxSpending),
              categories: expensesByDayCat[dateString] || null,
            });
          } else {
            week.push(null);
          }
          day++;
        }
        newWeeks.push(week);
      }
      return { weeks: newWeeks };
    }, [expenses, theme]);
  
    const handleCellPress = useCallback((cell) => {
      setSelected(cell);
    }, []);
  
    const handleCloseModal = useCallback(() => {
      setSelected(null);
    }, []);
  
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Monthly Spending</Text>
          <TouchableOpacity style={styles.infoButton} onPress={() => setShowInfo(true)}>
            <Text style={{ fontSize: 17, color: theme.colors.primary, fontWeight: "bold" }}>i</Text>
          </TouchableOpacity>
        </View>
  
        <View style={styles.gridWrap}>
          {weeks.map((week, i) => (
            <View key={`week-${i}`} style={styles.row}>
              {week.map((cell, j) =>
                cell ? (
                  <TouchableOpacity
                    key={`cell-${i}-${j}`}
                    style={[
                      styles.cell,
                      {
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        backgroundColor: cell.color,
                        borderColor: theme.colors.border,
                        shadowColor: cell.amount > 0 ? theme.colors.primary : "transparent",
                      },
                    ]}
                    onPress={() => handleCellPress(cell)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cellText, { color: cell.amount > 0 ? theme.colors.text : theme.colors.textTertiary }]}>
                      {cell.day}
                    </Text>
                    <Text style={[styles.cellEmoji, { color: cell.emojiColor }]}>{cell.emoji}</Text>
                  </TouchableOpacity>
                ) : (
                  <View
                    key={`empty-${i}-${j}`}
                    style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE, backgroundColor: "transparent", borderWidth: 0 }]}
                  />
                )
              )}
            </View>
          ))}
        </View>
  
        <Text style={[styles.caption, { color: theme.colors.textTertiary }]}>
          Tap a date to view spending details
        </Text>
  
        {/* Info Modal for Emoji Legend */}
        <Modal visible={showInfo} transparent animationType="fade" onRequestClose={() => setShowInfo(false)}>
          <Pressable style={styles.infoModalOverlay} onPress={() => setShowInfo(false)}>
            <Pressable style={[styles.infoModalContent, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.infoModalTitle, { color: theme.colors.primary }]}>What do these symbols mean?</Text>
              {EMOJI_LEGEND.map(({ emoji, label }) => (
                <View style={styles.infoLegendRow} key={emoji}>
                  <Text style={styles.infoEmoji}>{emoji}</Text>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
                </View>
              ))}
              <TouchableOpacity style={styles.infoCloseBtn} onPress={() => setShowInfo(false)}>
                <Text style={{ color: theme.colors.primary, fontWeight: "bold", fontSize: 15 }}>Close</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
  
        {/* Day Details Modal */}
        <Modal visible={!!selected} transparent animationType="slide" onRequestClose={handleCloseModal}>
          <Pressable style={styles.modalOverlay} onPress={handleCloseModal}>
            <Pressable style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.modalHandle} />
              {selected && (
                <>
                  <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>
                    {formatDate(selected.dateString)}
                  </Text>
                  <Text style={[styles.modalAmount, { color: theme.colors.text }]}>
                    {selected.amount > 0 ? `₹${selected.amount.toFixed(2)}` : "No Expenses"}
                  </Text>
                  <Text style={[styles.modalEmojiLabel, { color: selected.emojiColor }]}>
                    {selected.emoji} {selected.amount > 0 ? "Spending Level" : "All Clear"}
                  </Text>
  
                  {selected.categories ? (
                    <View style={[styles.catBreakdown, { backgroundColor: theme.colors.background }]}>
                      {Object.entries(selected.categories)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, amt]) => (
                          <View key={cat} style={styles.catRow}>
                            <Text style={[styles.catLabel, { color: theme.colors.textSecondary }]}>{cat}</Text>
                            <Text style={[styles.catAmt, { color: theme.colors.primary }]}>₹{amt.toFixed(2)}</Text>
                          </View>
                        ))}
                    </View>
                  ) : (
                    <Text style={[styles.noCat, { color: theme.colors.textTertiary }]}>
                      No spending categories for this day.
                    </Text>
                  )}
                  <TouchableOpacity style={styles.closeBtn} onPress={handleCloseModal}>
                    <Text style={{ color: theme.colors.primary, fontWeight: "bold", fontSize: 16 }}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  };
  
  const styles = StyleSheet.create({
    card: {
      borderRadius: 20,
      padding: 18,
      marginVertical: 12,
      marginHorizontal: 5,
      borderWidth: 1,
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      alignItems: "center",
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 5,
      alignSelf: "center",
    },
    title: {
      fontWeight: "700",
      fontSize: 19,
    },
    infoButton: {
      marginLeft: 6,
      width: 22,
      height: 22,
      borderRadius: 15,
      backgroundColor: "#e0f2fe",
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#bae6fd",
      shadowColor: "#7dd3fc",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 2,
      elevation: 2,
    },
    gridWrap: {
      width: "100%",
      marginBottom: 8,
    },
    row: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    cell: {
      margin: CELL_MARGIN,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
    },
    cellText: {
      fontSize: 11,
      fontWeight: "bold",
    },
    cellEmoji: {
      fontSize: 13,
      marginTop: 2,
      marginBottom: -1,
    },
    caption: {
      fontSize: 13,
      marginTop: 8,
      opacity: 0.9,
      fontWeight: "500",
    },
    // Info Modal
    infoModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.24)",
      justifyContent: "center",
      alignItems: "center",
    },
    infoModalContent: {
      borderRadius: 18,
      padding: 22,
      minWidth: 270,
      maxWidth: 320,
      alignItems: "center",
      elevation: 12,
    },
    infoModalTitle: {
      fontWeight: "800",
      fontSize: 17,
      marginBottom: 15,
      textAlign: "center",
    },
    infoLegendRow: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 5,
      gap: 10,
    },
    infoEmoji: {
      fontSize: 22,
      marginRight: 9,
    },
    infoLabel: {
      fontSize: 14,
      flex: 1,
      flexWrap: "wrap",
    },
    infoCloseBtn: {
      marginTop: 18,
      paddingVertical: 7,
      paddingHorizontal: 32,
      backgroundColor: "#e0e7ef",
      borderRadius: 15,
      elevation: 1,
    },
    // Modal for day
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.3)",
      justifyContent: "flex-end",
    },
    modalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingTop: 15,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -5 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 20,
    },
    modalHandle: {
      width: 40,
      height: 5,
      backgroundColor: "#ccc",
      borderRadius: 3,
      marginBottom: 15,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "800",
      marginBottom: 6,
    },
    modalAmount: {
      fontSize: 28,
      fontWeight: "bold",
      marginVertical: 4,
    },
    modalEmojiLabel: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 16,
    },
    catBreakdown: {
      width: "100%",
      marginTop: 8,
      marginBottom: 20,
      borderRadius: 12,
      padding: 12,
    },
    catRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 6,
    },
    catLabel: {
      fontWeight: "600",
      fontSize: 15,
    },
    catAmt: {
      fontWeight: "700",
      fontSize: 15,
    },
    noCat: {
      marginVertical: 20,
      textAlign: "center",
      fontSize: 14,
    },
    closeBtn: {
      marginTop: 10,
      paddingVertical: 10,
      paddingHorizontal: 30,
    },
  });
  
  export default CalendarHeatmap;