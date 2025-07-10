import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
  Animated,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

const CELL_MARGIN = 3;
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function getColor(amount, max, theme) {
  if (!amount || max === 0) return theme.colors.surface;
  const percent = Math.min(amount / max, 1);
  if (percent === 0) return theme.colors.surface;
  if (percent < 0.15) return "#e9ecef";
  if (percent < 0.3) return theme.colors.info;
  if (percent < 0.5) return theme.colors.primary + "AA";
  if (percent < 0.7) return theme.colors.primary;
  if (percent < 0.9) return theme.colors.warning;
  return theme.colors.error;
}

const LEGEND_SCALE = [
  { color: "#e9ecef", label: "No Expenses" },
  { color: "info", label: "Very Low" },
  { color: "primaryAA", label: "Low" },
  { color: "primary", label: "Moderate" },
  { color: "warning", label: "High" },
  { color: "error", label: "Very High" },
];

const CalendarHeatmap = ({ expenses }) => {
  const { theme } = useTheme();
  const [selected, setSelected] = useState(null);
  const [showLegend, setShowLegend] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const CELL_SIZE = useMemo(() => {
    const w = Dimensions.get("window").width;
    const margins = 24 * 2 + CELL_MARGIN * 2 * 7;
    return Math.floor((w - margins) / 7) * 0.8; // 0.8x of current
  }, []);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const { weeks, maxSpending } = useMemo(() => {
    const byDay = {};
    const byCat = {};
    expenses.forEach((e) => {
      if (!e.date) return;
      if (!byDay[e.date]) byDay[e.date] = 0;
      byDay[e.date] += parseFloat(e.amount) || 0;
      if (!byCat[e.date]) byCat[e.date] = {};
      const cat = e.category || "Other";
      byCat[e.date][cat] =
        (byCat[e.date][cat] || 0) + (parseFloat(e.amount) || 0);
    });
    let max = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        i
      ).padStart(2, "0")}`;
      max = Math.max(max, byDay[dateStr] || 0);
    }
    const firstDay = new Date(year, month, 1).getDay();
    const newWeeks = [];
    let day = 1 - firstDay;
    while (day <= daysInMonth) {
      const week = [];
      for (let w = 0; w < 7; w++) {
        if (day > 0 && day <= daysInMonth) {
          const dateStr = `${year}-${String(month + 1).padStart(
            2,
            "0"
          )}-${String(day).padStart(2, "0")}`;
          week.push({
            day,
            dateStr,
            amount: byDay[dateStr] || 0,
            color: getColor(byDay[dateStr], max, theme),
            categories: byCat[dateStr] || null,
          });
        } else {
          week.push(null);
        }
        day++;
      }
      newWeeks.push(week);
    }
    return { weeks: newWeeks, maxSpending: max };
  }, [expenses, theme]);

  const showModal = (cell) => {
    setSelected(cell);
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };
  const closeModal = () => setSelected(null);

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const legendColors = [
    "#e9ecef",
    theme.colors.info,
    theme.colors.primary + "AA",
    theme.colors.primary,
    theme.colors.warning,
    theme.colors.error,
  ];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: theme.colors.primary }]}>
            {now.toLocaleString("default", { month: "long" })} {year}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textTertiary }]}>
            Tap any day to see details
          </Text>
        </View>
        <TouchableOpacity
          style={styles.legendBtn}
          onPress={() => setShowLegend(true)}
        >
          <Text style={{ color: theme.colors.info, fontWeight: "600" }}>
            i
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.weekLabels}>
        {DAY_LABELS.map((l, idx) => (
          <Text
            key={`${l}-${idx}`}
            style={[styles.weekLabel, { color: theme.colors.textSecondary }]}
          >
            {l}
          </Text>
        ))}
      </View>
      <View style={styles.gridWrap}>
        {weeks.map((week, i) => (
          <View key={`week-${i}`} style={styles.row}>
            {week.map((cell, j) =>
              cell ? (
                <TouchableOpacity
                  key={`cell-${i}-${j}-${cell.day}`}
                  style={[
                    styles.cell,
                    {
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      backgroundColor: cell.color,
                      borderColor: theme.colors.border,
                      shadowColor:
                        cell.amount > 0 ? theme.colors.primary : "transparent",
                      borderWidth:
                        selected && selected.dateStr === cell.dateStr ? 3 : 1.5,
                      borderStyle:
                        selected && selected.dateStr === cell.dateStr
                          ? "solid"
                          : "dashed",
                      zIndex:
                        selected && selected.dateStr === cell.dateStr ? 2 : 1,
                      elevation:
                        selected && selected.dateStr === cell.dateStr ? 6 : 2,
                    },
                  ]}
                  onPress={() => showModal(cell)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.cellText,
                      {
                        color:
                          cell.amount > 0
                            ? theme.colors.text
                            : theme.colors.textTertiary,
                        fontWeight:
                          selected && selected.dateStr === cell.dateStr
                            ? "800"
                            : "600",
                        fontSize:
                          selected && selected.dateStr === cell.dateStr
                            ? 15
                            : 11,
                      },
                    ]}
                  >
                    {cell.day}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View
                  key={`empty-${i}-${j}`}
                  style={[
                    styles.cell,
                    {
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      backgroundColor: "transparent",
                      borderWidth: 0,
                    },
                  ]}
                />
              )
            )}
          </View>
        ))}
      </View>
      <Modal
        visible={showLegend}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLegend(false)}
      >
        <Pressable
          style={styles.infoModalOverlay}
          onPress={() => setShowLegend(false)}
        >
          <Pressable
            style={[
              styles.infoModalContent,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text
              style={[styles.infoModalTitle, { color: theme.colors.primary }]}
            >
              Spending Intensity
            </Text>
            <View style={{ width: "100%", marginVertical: 14 }}>
              <View style={styles.legendBarWrap}>
                {legendColors.map((color, idx) => (
                  <View
                    key={`${color}-${idx}`}
                    style={[
                      styles.legendBar,
                      {
                        backgroundColor: color,
                        borderTopLeftRadius: idx === 0 ? 10 : 0,
                        borderBottomLeftRadius: idx === 0 ? 10 : 0,
                        borderTopRightRadius:
                          idx === legendColors.length - 1 ? 10 : 0,
                        borderBottomRightRadius:
                          idx === legendColors.length - 1 ? 10 : 0,
                      },
                    ]}
                  />
                ))}
              </View>

              <View style={styles.legendLabelsRow}>
                <Text style={styles.legendLabel}>None</Text>
                <Text style={styles.legendLabel}>Very Low</Text>
                <Text style={styles.legendLabel}>Low</Text>
                <Text style={styles.legendLabel}>Moderate</Text>
                <Text style={styles.legendLabel}>High</Text>
                <Text style={styles.legendLabel}>Max</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.infoCloseBtn}
              onPress={() => setShowLegend(false)}
            >
              <Text
                style={{
                  color: theme.colors.primary,
                  fontWeight: "bold",
                  fontSize: 15,
                }}
              >
                Close
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Animated.View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.surface, opacity: fadeAnim },
            ]}
          >
            <View style={styles.modalHandle} />
            {selected && (
              <>
                <Text
                  style={[styles.modalTitle, { color: theme.colors.primary }]}
                >
                  {formatDate(selected.dateStr)}
                </Text>
                <Text
                  style={[styles.modalAmount, { color: theme.colors.text }]}
                >
                  {selected.amount > 0
                    ? `₹${selected.amount.toFixed(2)}`
                    : "No Expenses"}
                </Text>
                <View style={styles.modalBar}>
                  <View
                    style={{
                      backgroundColor: getColor(
                        selected.amount,
                        maxSpending,
                        theme
                      ),
                      width: `${Math.min(
                        (selected.amount / maxSpending) * 100,
                        100
                      )}%`,
                      height: 8,
                      borderRadius: 4,
                    }}
                  />
                </View>
                {selected.categories &&
                Object.keys(selected.categories).length > 0 ? (
                  <View
                    style={[
                      styles.catBreakdown,
                      { backgroundColor: theme.colors.background },
                    ]}
                  >
                    {Object.entries(selected.categories)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, amt]) => (
                        <View key={cat} style={styles.catRow}>
                          <Text
                            style={[
                              styles.catLabel,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {cat}
                          </Text>
                          <Text
                            style={[
                              styles.catAmt,
                              { color: theme.colors.primary },
                            ]}
                          >
                            ₹{amt.toFixed(2)}
                          </Text>
                        </View>
                      ))}
                  </View>
                ) : (
                  <Text
                    style={[styles.noCat, { color: theme.colors.textTertiary }]}
                  >
                    No category breakdown for this day.
                  </Text>
                )}
                <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontWeight: "bold",
                      fontSize: 16,
                    }}
                  >
                    Close
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 22,

    borderWidth: 1.5,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 15,
    alignItems: "center",
  },
  headerRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 6,
  },
  title: {
    fontWeight: "800",
    fontSize: 22,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  legendBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  weekLabels: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    paddingHorizontal: 1,
  },
  weekLabel: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
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
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,

    backgroundColor: "#fff",
    transitionProperty: "all",
    transitionDuration: "180ms",
    transitionTimingFunction: "ease-in-out",
  },
  cellText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  infoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoModalContent: {
    borderRadius: 20,
    padding: 24,
    minWidth: 260,
    maxWidth: 330,
    alignItems: "center",
    elevation: 12,
  },
  infoModalTitle: {
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 10,
    textAlign: "center",
  },
  infoCloseBtn: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 36,
    backgroundColor: "#e0e7ef",
    borderRadius: 15,
    elevation: 1,
  },
  legendBarWrap: {
    flexDirection: "row",
    height: 16,
    width: "100%",
    marginBottom: 4,
    overflow: "hidden",
  },
  legendBar: {
    flex: 1,
    marginRight: 1,
    marginLeft: 1,
    height: "100%",
  },
  legendLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 4,
  },
  legendLabel: {
    fontSize: 11,
    color: "#64748b",
    flex: 1,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.16)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 23,
    paddingTop: 17,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 20,
    minHeight: 260,
  },
  modalHandle: {
    width: 48,
    height: 6,
    backgroundColor: "#cbd5e1",
    borderRadius: 5,
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 6,
  },
  modalAmount: {
    fontSize: 29,
    fontWeight: "bold",
    marginVertical: 4,
    letterSpacing: 0.4,
  },
  modalBar: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f1f5f9",
    marginBottom: 14,
    marginTop: 5,
    overflow: "hidden",
  },
  catBreakdown: {
    width: "100%",
    marginTop: 10,
    marginBottom: 15,
    borderRadius: 10,
    padding: 12,
  },
  catRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
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
    marginVertical: 18,
    textAlign: "center",
    fontSize: 14,
  },
  closeBtn: {
    marginTop: 7,
    paddingVertical: 10,
    paddingHorizontal: 34,
  },
});

export default CalendarHeatmap;
