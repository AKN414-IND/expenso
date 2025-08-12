import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
 StyleSheet,
  Dimensions,
} from "react-native";
import { useNavigationState } from "@react-navigation/native";
import {
  Wallet,
  TrendingUp,
  Bell,
  List,
  Plus,
} from "lucide-react-native";

const screenWidth = Dimensions.get("window").width;

// Updated array to include only the requested navigation items
const NAV_ITEMS = [
  { name: "BudgetScreen", label: "Budgets", Icon: Wallet, refId: "budget-btn" },
  { name: "InvestmentsScreen", label: "Invest", Icon: TrendingUp, refId: "investment-btn" },
  { name: "PaymentReminder", label: "Reminder", Icon: Bell, refId: "reminders-btn" },
  { name: "AllExpenses", label: "Activity", Icon: List, refId: "expenses-btn" },
];

const FloatingTaskbar = ({ theme, navigation, setTargetRef }) => {
  const currentRouteName = useNavigationState(
    (state) => state.routes[state.index].name
  );

  // This automatically creates a balanced 2x2 layout
  const leftItems = NAV_ITEMS.slice(0, 2);
  const rightItems = NAV_ITEMS.slice(2);

  const NavItem = ({ item }) => {
    const isActive = currentRouteName === item.name;
    const color = isActive ? theme.colors.primary : theme.colors.textSecondary;

    return (
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate(item.name)}
        activeOpacity={0.7}
        ref={(ref) => setTargetRef(item.refId, ref)}
      >
        <item.Icon color={color} size={24} strokeWidth={isActive ? 2.5 : 2} />
        <Text style={[styles.navLabel, { color }]}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container} ref={(ref) => setTargetRef("taskbar", ref)}>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate("AddExpense")}
        activeOpacity={0.8}
        ref={(ref) => setTargetRef("add-button", ref)}
      >
        <Plus color="#FFF" size={32} strokeWidth={3} />
      </TouchableOpacity>

      <View style={[styles.taskbar, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.navItemGroup}>
          {leftItems.map((item) => (
            <NavItem item={item} key={item.name} />
          ))}
        </View>

        <View style={{ width: 80 }} />

        <View style={styles.navItemGroup}>
          {rightItems.map((item) => (
            <NavItem item={item} key={item.name} />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    height: 90,
    paddingBottom: Math.max(screenWidth * 0.05, 20),
  },
  taskbar: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 65,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    
  },
  navItemGroup: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 5,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  addButton: {
    position: "absolute",
    top: 0,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    elevation: 15,
    zIndex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
});

export default FloatingTaskbar;