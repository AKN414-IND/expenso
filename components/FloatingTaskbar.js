// components/FloatingTaskbar.js
import React from "react";
import { View, TouchableOpacity, Text, StyleSheet, Dimensions } from "react-native";

const screenWidth = Dimensions.get("window").width;

const FloatingTaskbar = ({ theme, navigation, setTargetRef }) => (
  <View style={styles.taskbarContainer}>
    <View style={[styles.taskbar, { backgroundColor: theme.colors.surface }]} ref={ref => setTargetRef("taskbar", ref)}>
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: theme.colors.buttonSecondary }]}
        onPress={() => navigation.navigate("BudgetScreen")}
        activeOpacity={0.7}
        ref={ref => setTargetRef("budget-btn", ref)}
      >
        <Text style={styles.actionIcon}>💰</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: theme.colors.buttonSecondary }]}
        onPress={() => navigation.navigate("InvestmentsScreen")}
        activeOpacity={0.7}
        ref={ref => setTargetRef("investment-btn", ref)}
      >
        <Text style={styles.actionIcon}>📈</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: theme.colors.buttonSecondary }]}
        onPress={() => navigation.navigate("PaymentReminder")}
        activeOpacity={0.7}
        ref={ref => setTargetRef("reminders-btn", ref)}
      >
        <Text style={styles.actionIcon}>🔔</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate("AddExpense")}
        activeOpacity={0.8}
        ref={ref => setTargetRef("add-button", ref)}
      >
        <Text style={styles.addIcon}>+</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: theme.colors.buttonSecondary }]}
        onPress={() => navigation.navigate("AllExpenses")}
        activeOpacity={0.7}
        ref={ref => setTargetRef("expenses-btn", ref)}
      >
        <Text style={styles.actionIcon}>📊</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: theme.colors.buttonSecondary }]}
        onPress={() => navigation.navigate("SmartInsights")}
        activeOpacity={0.7}
        ref={ref => setTargetRef("insights-btn", ref)}
      >
        <Text style={styles.actionIcon}>🧠</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  taskbarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    paddingHorizontal: Math.max(screenWidth * 0.03, 8),
    paddingBottom: Math.max(screenWidth * 0.06, 20),
  },
  taskbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: Math.max(screenWidth * 0.07, 24),
    paddingHorizontal: Math.max(screenWidth * 0.04, 14),
    paddingVertical: Math.max(screenWidth * 0.022, 8),
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.1)",
  },
  actionButton: {
    alignItems: "center",
    paddingVertical: Math.max(screenWidth * 0.012, 6),
    paddingHorizontal: Math.max(screenWidth * 0.025, 8),
    borderRadius: Math.max(screenWidth * 0.04, 15),
    backgroundColor: "transparent",
  },
  actionIcon: {
    fontSize: Math.max(Math.min(screenWidth * 0.045, 19), 12),
    marginBottom: 4,
  },
  addButton: {
    backgroundColor: "#06b6d4",
    width: Math.max(Math.min(screenWidth * 0.14, 56), 38),
    height: Math.max(Math.min(screenWidth * 0.14, 56), 38),
    borderRadius: Math.max(Math.min(screenWidth * 0.07, 28), 19),
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addIcon: {
    fontSize: Math.max(Math.min(screenWidth * 0.07, 28), 18),
    color: "#fff",
    fontWeight: "300",
    lineHeight: 32,
  },
});

export default FloatingTaskbar;