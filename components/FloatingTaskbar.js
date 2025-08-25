import React, { useState, useRef, useEffect } from "react"; // NEW: Add useState, useRef, useEffect
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
  Animated, // NEW: Import Animated
} from "react-native";
import { useNavigationState } from "@react-navigation/native";
import { Wallet, TrendingUp, Bell, List, Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics"; // NEW: Import Haptics

const screenWidth = Dimensions.get("window").width;

const NAV_ITEMS = [
  { name: "BudgetScreen", label: "Budgets", Icon: Wallet, refId: "budget-btn" },
  {
    name: "InvestmentsScreen",
    label: "Invest",
    Icon: TrendingUp,
    refId: "investment-btn",
  },
  {
    name: "PaymentReminder",
    label: "Reminder",
    Icon: Bell,
    refId: "reminders-btn",
  },
  { name: "AllExpenses", label: "Activity", Icon: List, refId: "expenses-btn" },
];

const FloatingTaskbar = ({ theme, navigation, setTargetRef }) => {
  const currentRouteName = useNavigationState(
    (state) => state.routes[state.index].name
  );
  // --- NEW: Easter Egg State & Animation Setup ---
  const [isMorphed, setIsMorphed] = useState(false);
  const morphAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(morphAnim, {
      toValue: isMorphed ? 1 : 0,
      useNativeDriver: true,
      bounciness: 8,
    }).start();
  }, [isMorphed]);

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsMorphed(!isMorphed);
  };

  // Interpolations for the Plus icon
  const plusIconStyle = {
    opacity: morphAnim.interpolate({
      inputRange: [0, 0.5],
      outputRange: [1, 0],
    }),
    transform: [
      {
        scale: morphAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.5],
        }),
      },
      {
        rotate: morphAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "90deg"],
        }),
      },
    ],
  };

  // Interpolations for the Rupee icon
  const rupeeIconStyle = {
    opacity: morphAnim.interpolate({
      inputRange: [0.5, 1],
      outputRange: [0, 1],
    }),
    transform: [
      {
        scale: morphAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 1],
        }),
      },
      {
        rotate: morphAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ["-90deg", "0deg"],
        }),
      },
    ],
  };
  // --- End of Easter Egg Setup ---

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
        style={[
          styles.addButton,
          {
            backgroundColor: theme.colors.primary,
            shadowColor: theme.colors.shadow,
          },
        ]}
        onPress={() => navigation.navigate("AddExpense")}
        onLongPress={handleLongPress} // NEW: Added long press handler
        activeOpacity={0.8}
        ref={(ref) => setTargetRef("add-button", ref)}
      >
        {/* NEW: Replaced the single Plus icon with two animated views */}
        <Animated.View style={[styles.iconWrapper, plusIconStyle]}>
          <Plus color={theme.colors.onPrimary} size={32} strokeWidth={3} />
        </Animated.View>
        <Animated.View style={[styles.iconWrapper, rupeeIconStyle]}>
          <Text style={styles.rupeeText}>₹</Text>
        </Animated.View>
      </TouchableOpacity>

      <View
        style={[
          styles.taskbar,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            shadowColor: theme.colors.shadow,
          },
        ]}
      >
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
    elevation: 6,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
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
  navLabel: { fontSize: 11, fontWeight: "600" },
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
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  // --- NEW: Styles for the animated icons ---
  iconWrapper: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  rupeeText: {
    fontSize: 32,
    color: "white",
    fontWeight: "bold",
  },
});

export default FloatingTaskbar;