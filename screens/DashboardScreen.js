import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Dimensions,
  Alert as RNAlert,
  Modal,
  Animated,
  UIManager,
  findNodeHandle,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { PieChart } from "react-native-chart-kit";
import Alert from "../components/Alert";
import { LogOut, Trash2, X, ArrowLeft, ArrowRight } from "lucide-react-native";
import Carousel from "react-native-reanimated-carousel";
import ReminderCard from "../components/ReminderCard";
import { useFocusEffect } from "@react-navigation/native";
import { useRoute, useNavigation } from "@react-navigation/native";
import CalendarHeatmap from "../components/Heatmap";
import FloatingTaskbar from "../components/FloatingTaskbar";
import TransactionItem from "../components/TransactionItem";
import AsyncStorage from "@react-native-async-storage/async-storage";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

global.targetRefs = {};

const EXPENSE_CATEGORIES = [
  { name: "Food & Dining", icon: "🍽️", color: "#FF6B6B" },
  { name: "Transportation", icon: "🚗", color: "#4ECDC4" },
  { name: "Shopping", icon: "🛍️", color: "#45B7D1" },
  { name: "Entertainment", icon: "🎬", color: "#96CEB4" },
  { name: "Bills & Utilities", icon: "💡", color: "#FECA57" },
  { name: "Healthcare", icon: "🏥", color: "#FF9FF3" },
  { name: "Education", icon: "📚", color: "#54A0FF" },
  { name: "Travel", icon: "✈️", color: "#5F27CD" },
  { name: "Groceries", icon: "🛒", color: "#00D2D3" },
  { name: "Other", icon: "📝", color: "#747D8C" },
];

const CHART_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
];

const ONBOARDING_STEPS = [
  {
    id: "welcome",
    title: "Welcome to ExpenseTracker! 🎉",
    description:
      "Let's take a quick tour to help you get started with managing your finances effectively.",
    targetId: null,
    position: "center",
    icon: "🎉",
  },
  {
    id: "profile",
    title: "Your Profile",
    description:
      "Tap your avatar to view and edit your profile and preferences.",
    targetId: "profile-avatar",
    position: "bottom",
    icon: "👤",
  },
  {
    id: "quick-stats",
    title: "Quick Stats",
    description:
      "These cards show your current month's total and today's expenses at a glance.",
    targetId: "stats-container",
    position: "bottom",
    icon: "📊",
  },
  {
    id: "heatmap",
    title: "Spending Heatmap",
    description:
      "See your daily spending pattern for the month. Tap any day for a breakdown.",
    targetId: "chart-container",
    position: "bottom",
    icon: "🔥",
  },
  {
    id: "reminders",
    title: "Payment Reminders",
    description:
      "Set up reminders for bills, subscriptions, and recurring payments so you never miss one.",
    targetId: "reminders-section",
    position: "top",
    icon: "🔔",
  },
  {
    id: "budget",
    title: "Budget Tracking",
    description:
      "Monitor your spending against your budgets. The progress bars help you stay within your limits.",
    targetId: "budget-section",
    position: "top",
    icon: "💰",
  },
  {
    id: "recent-income",
    title: "Recent Income",
    description:
      "View your latest income entries here. Tap to see more details or manage them.",
    targetId: "recent-income-section",
    position: "bottom",
    icon: "💵",
  },
  {
    id: "recent",
    title: "Recent Expenses",
    description:
      "Here are your latest expenses. Long-press any item to delete or edit it.",
    targetId: "recent-section",
    position: "top",
    icon: "📝",
  },
  {
    id: "investments",
    title: "Recent Investments",
    description:
      "Track your stocks, crypto, and mutual fund investments. Tap for the detailed investments page.",
    targetId: "investments-section",
    position: "bottom",
    icon: "📈",
  },
  {
    id: "taskbar",
    title: "Quick Actions",
    description:
      "This floating taskbar lets you quickly access budgets, reminders, add new expense, view all expenses, or get insights.",
    targetId: "taskbar",
    position: "top",
    icon: "⚡",
  },
  {
    id: "add-expense",
    title: "Add New Expense",
    description:
      "The plus button is your main tool. Tap it to record a new expense instantly.",
    targetId: "add-button",
    position: "top",
    icon: "➕",
  },
  {
    id: "budget-btn",
    title: "Budget Management",
    description:
      "Create and manage your budgets for different categories here.",
    targetId: "budget-btn",
    position: "top",
    icon: "💰",
  },
  {
    id: "reminders-btn",
    title: "Payment Reminders",
    description: "Set up reminders for bills and recurring payments here.",
    targetId: "reminders-btn",
    position: "top",
    icon: "🔔",
  },
  {
    id: "expenses-btn",
    title: "All Expenses",
    description: "View and analyze all your expenses with powerful filters.",
    targetId: "expenses-btn",
    position: "top",
    icon: "📊",
  },
  {
    id: "insights-btn",
    title: "Smart Insights",
    description:
      "Get AI-powered insights and personalized recommendations for your spending.",
    targetId: "insights-btn",
    position: "top",
    icon: "🧠",
  },
  {
    id: "complete",
    title: "You're All Set! 🚀",
    description:
      "Start by adding your first expense, income, or investment. Happy tracking!",
    targetId: null,
    position: "center",
    icon: "🚀",
  },
];

const ONBOARDING_FLAG_KEY = "onboarding_completed";

const checkOnboardingCompleted = async () => {
  try {
    const flag = await AsyncStorage.getItem(ONBOARDING_FLAG_KEY);
    return flag === "true";
  } catch {
    return false;
  }
};

const setOnboardingCompleted = async () => {
  try {
    await AsyncStorage.setItem(ONBOARDING_FLAG_KEY, "true");
  } catch {}
};

const OnboardingOverlay = ({ isVisible, onComplete, onStepChange }) => {
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [overlayOpacity] = useState(new Animated.Value(0));
  const [highlightOpacity] = useState(new Animated.Value(0));
  const [targetLayout, setTargetLayout] = useState(null);
  const [tooltipLayout, setTooltipLayout] = useState({ width: 0, height: 0 });
  const [tooltipMeasured, setTooltipMeasured] = useState(false);

  useEffect(() => {
    if (isVisible) {
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      Animated.timing(highlightOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  useEffect(() => {
    if (isVisible && tooltipMeasured) measureTargetElement();
    // eslint-disable-next-line
  }, [currentStep, isVisible, tooltipMeasured]);

  const measureTargetElement = useCallback(() => {
    const step = ONBOARDING_STEPS[currentStep];
    if (!step.targetId) {
      setTargetLayout(null);
      return;
    }

    // Add a longer delay for better reliability
    setTimeout(() => {
      try {
        const targetRef = global.targetRefs?.[step.targetId];
        if (targetRef && targetRef.measure) {
          targetRef.measure((x, y, width, height, pageX, pageY) => {
            if (width > 0 && height > 0) {
              setTargetLayout({
                x: pageX,
                y: pageY,
                width,
                height,
              });
            } else {
              // Retry once if measurements are invalid
              setTimeout(() => {
                targetRef.measure((x2, y2, width2, height2, pageX2, pageY2) => {
                  if (width2 > 0 && height2 > 0) {
                    setTargetLayout({
                      x: pageX2,
                      y: pageY2,
                      width: width2,
                      height: height2,
                    });
                  }
                });
              }, 100);
            }
          });
        }
      } catch (error) {
        console.warn("Error measuring target element:", error);
        setTargetLayout(null);
      }
    }, 400); // Increased delay for better reliability
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      if (onStepChange) onStepChange(ONBOARDING_STEPS[nextStepIndex].id);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleComplete = () => {
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onComplete();
    });
  };

  const handleSkip = handleComplete;

  const getTooltipPosition = () => {
    const step = ONBOARDING_STEPS[currentStep];
    if (!step.targetId || !targetLayout || !tooltipMeasured) {
      return {
        top: screenHeight / 2 - tooltipLayout.height / 2,
        left: screenWidth / 2 - tooltipLayout.width / 2,
      };
    }
    const margin = 18;
    let top, left;
    switch (step.position) {
      case "top":
        top = targetLayout.y - tooltipLayout.height - margin;
        left =
          targetLayout.x + targetLayout.width / 2 - tooltipLayout.width / 2;
        break;
      case "bottom":
        top = targetLayout.y + targetLayout.height + margin;
        left =
          targetLayout.x + targetLayout.width / 2 - tooltipLayout.width / 2;
        break;
      case "left":
        top =
          targetLayout.y + targetLayout.height / 2 - tooltipLayout.height / 2;
        left = targetLayout.x - tooltipLayout.width - margin;
        break;
      case "right":
        top =
          targetLayout.y + targetLayout.height / 2 - tooltipLayout.height / 2;
        left = targetLayout.x + targetLayout.width + margin;
        break;
      default:
        top = screenHeight / 2 - tooltipLayout.height / 2;
        left = screenWidth / 2 - tooltipLayout.width / 2;
    }
    top = Math.max(
      margin,
      Math.min(top, screenHeight - tooltipLayout.height - margin)
    );
    left = Math.max(
      margin,
      Math.min(left, screenWidth - tooltipLayout.width - margin)
    );
    return { top, left };
  };

  const getHighlightPosition = () => {
    if (!targetLayout) return null;
    const padding = 10;
    return {
      left: targetLayout.x - padding,
      top: targetLayout.y - padding,
      width: targetLayout.width + padding * 2,
      height: targetLayout.height + padding * 2,
    };
  };

  if (!isVisible) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;
  const tooltipPosition = getTooltipPosition();
  const highlightPosition = getHighlightPosition();

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <Animated.View
        style={[
          {
            flex: 1,
            opacity: overlayOpacity,
            backgroundColor: "rgba(15, 23, 42, 0.72)", // Nice dark glassmorphism
          },
        ]}
      >
        {step.targetId && highlightPosition && (
          <Animated.View
            style={{
              position: "absolute",
              borderRadius: 18,
              borderWidth: 3,
              borderColor: theme.colors.primary,
              left: highlightPosition.left,
              top: highlightPosition.top,
              width: highlightPosition.width,
              height: highlightPosition.height,
              backgroundColor: "rgba(255,255,255,0.15)",
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 18,
              elevation: 10,
              opacity: highlightOpacity,
            }}
          />
        )}

        <View
          style={[
            {
              position: "absolute",
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              minWidth: Math.max(screenWidth * 0.68, 240),
              maxWidth: Math.max(screenWidth * 0.92, 340),
              borderRadius: 20,
              backgroundColor: theme.colors.surface + "F2",
              padding: 26,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: 0.17,
              shadowRadius: 26,
              elevation: 14,
              borderWidth: 1.5,
              borderColor: theme.colors.primary + "29",
              alignItems: "center",
            },
          ]}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setTooltipLayout({ width, height });
            setTooltipMeasured(true);
          }}
        >
          {/* Skip button */}
          <TouchableOpacity
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              zIndex: 3,
              backgroundColor: theme.colors.background,
              borderRadius: 22,
              width: 32,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              elevation: 2,
            }}
            onPress={handleSkip}
          >
            <X size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          {/* Icon/Illustration */}
          <Text style={{ fontSize: 38, marginBottom: 6 }}>
            {step.icon || "🎓"}
          </Text>

          {/* Step title */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: theme.colors.primary,
              marginBottom: 10,
              textAlign: "center",
            }}
          >
            {step.title}
          </Text>

          {/* Description */}
          <Text
            style={{
              fontSize: 15,
              color: theme.colors.textSecondary,
              marginBottom: 16,
              textAlign: "center",
              lineHeight: 22,
            }}
          >
            {step.description}
          </Text>

          {/* Progress Stepper Dots */}
          <View
            style={{
              flexDirection: "row",
              gap: 7,
              marginBottom: 18,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {ONBOARDING_STEPS.map((_, i) => (
              <View
                key={i}
                style={{
                  width: currentStep === i ? 20 : 10,
                  height: 10,
                  borderRadius: 6,
                  backgroundColor:
                    currentStep === i
                      ? theme.colors.primary
                      : theme.colors.border,
                  marginHorizontal: 2,
                  transition: "all 0.22s",
                }}
              />
            ))}
          </View>

          {/* Navigation Buttons */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              width: "100%",
              marginTop: 6,
              gap: 12,
            }}
          >
            {currentStep > 0 && (
              <TouchableOpacity
                onPress={handlePrevious}
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.primary,
                  borderWidth: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 7,
                }}
              >
                <ArrowLeft size={16} color={theme.colors.primary} />
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontWeight: "600",
                    fontSize: 15,
                  }}
                >
                  Previous
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleNext}
              style={{
                flex: 1,
                backgroundColor: theme.colors.primary,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 7,
              }}
            >
              <Text
                style={{
                  color: theme.colors.surface,
                  fontWeight: "600",
                  fontSize: 15,
                }}
              >
                {currentStep === ONBOARDING_STEPS.length - 1
                  ? "Get Started"
                  : "Next"}
              </Text>
              {currentStep < ONBOARDING_STEPS.length - 1 && (
                <ArrowRight size={16} color={theme.colors.surface} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
};

const Avatar = ({ name, email, size = 50, style, onPress, nativeID }) => {
  const getInitials = useCallback((name, email) => {
    if (name && name.trim()) {
      return name
        .trim()
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return "U";
  }, []);

  const getAvatarColor = useCallback((text) => {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FECA57",
      "#FF9FF3",
      "#54A0FF",
      "#5F27CD",
    ];
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, []);

  const initials = useMemo(
    () => getInitials(name, email),
    [name, email, getInitials]
  );
  const backgroundColor = useMemo(
    () => getAvatarColor(name || email || "User"),
    [name, email, getAvatarColor]
  );

  return (
    <TouchableOpacity
      nativeID={nativeID}
      onPress={onPress}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: "white",
          elevation: 4,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: "white",
          fontSize: size * 0.4,
          fontWeight: "bold",
          letterSpacing: 1,
        }}
      >
        {initials}
      </Text>
    </TouchableOpacity>
  );
};

const BudgetBar = ({ label, spent, budget, color, icon, theme }) => {
  const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const isOverBudget = spent > budget && budget > 0;

  return (
    <View
      style={[
        styles.budgetBarContainer,
        { backgroundColor: theme.colors.surface },
      ]}
    >
      <View style={styles.budgetBarHeader}>
        {icon && <Text style={styles.budgetBarIcon}>{icon}</Text>}
        <Text
          style={[styles.budgetBarLabel, { color: theme.colors.textSecondary }]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.budgetBarAmount,
            { color: isOverBudget ? theme.colors.error : theme.colors.primary },
          ]}
        >
          ₹{spent.toFixed(0)} / ₹{budget.toFixed(0)}
        </Text>
      </View>
      <View
        style={[
          styles.budgetBarTrack,
          { backgroundColor: theme.colors.border },
        ]}
      >
        <View
          style={[
            styles.budgetBarFill,
            {
              width: `${percent}%`,
              backgroundColor: isOverBudget ? theme.colors.error : color,
            },
          ]}
        />
      </View>
      {isOverBudget && (
        <Text style={[styles.budgetBarOverage, { color: theme.colors.error }]}>
          Over budget by ₹{(spent - budget).toFixed(0)}
        </Text>
      )}
      <Text
        style={[styles.budgetBarPercent, { color: theme.colors.textTertiary }]}
      >
        {percent.toFixed(1)}% used
      </Text>
    </View>
  );
};

export default function DashboardScreen({ navigation }) {
  const route = useRoute();
  const { session } = useAuth();
  const { theme } = useTheme();
  const nav = useNavigation();

  // All refs should be declared early
  const targetRefs = useRef({});
  const scrollViewRef = useRef(null);

  // All useState hooks should be declared together at the top
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // All useCallback hooks should be declared together
  const setTargetRef = useCallback((id, ref) => {
    if (ref && id) {
      if (!global.targetRefs) {
        global.targetRefs = {};
      }
      global.targetRefs[id] = ref;
    }
  }, []);

  const handleOnboardingStepChange = useCallback((stepId) => {
    const step = ONBOARDING_STEPS.find((s) => s.id === stepId);

    if (!step) return;

    // If no target, don't scroll
    if (!step.targetId) return;

    // Wait a bit for any animations to complete
    setTimeout(() => {
      const targetRef = global.targetRefs?.[step.targetId];

      if (!targetRef || !scrollViewRef.current) return;

      try {
        targetRef.measure((x, y, width, height, pageX, pageY) => {
          if (width <= 0 || height <= 0) return;

          const windowHeight = Dimensions.get("window").height;

          // Calculate optimal scroll position based on step position
          let targetScrollY;

          switch (step.position) {
            case "top":
              // For top tooltips, scroll so element is in lower half
              targetScrollY = pageY - windowHeight * 0.7;
              break;
            case "bottom":
              // For bottom tooltips, scroll so element is in upper half
              targetScrollY = pageY - windowHeight * 0.3;
              break;
            case "center":
              // For center tooltips, center the element
              targetScrollY = pageY - windowHeight * 0.5 + height * 0.5;
              break;
            default:
              targetScrollY = pageY - windowHeight * 0.5;
          }

          // Add some padding and ensure we don't scroll beyond bounds
          const scrollPadding = 50;
          targetScrollY = Math.max(0, targetScrollY - scrollPadding);

          scrollViewRef.current.scrollTo({
            y: targetScrollY,
            animated: true,
          });
        });
      } catch (error) {
        console.warn("Error measuring target element:", error);
      }
    }, 300);
  }, []);

  const calculateStatistics = useCallback((expenseData) => {
    const now = new Date();
    setMonthlyExpenses(
      expenseData
        .filter((e) => {
          if (!e.date) return false;
          const d = new Date(e.date);
          return (
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          );
        })
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
    );
  }, []);

  const getMonthlyCategorySpending = useCallback(
    (category) => {
      const now = new Date();
      return expenses
        .filter((expense) => {
          if (expense.category !== category || !expense.date) return false;
          const expenseDate = new Date(expense.date);
          return (
            expenseDate.getFullYear() === now.getFullYear() &&
            expenseDate.getMonth() === now.getMonth()
          );
        })
        .reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
    },
    [expenses]
  );

  const handleDelete = useCallback((expense) => {
    setExpenseToDelete(expense);
    setShowDeleteAlert(true);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchExpenses(), fetchBudgets(), fetchReminders()]).finally(
      () => setRefreshing(false)
    );
  }, []);

  const renderExpenseItem = useCallback(
    ({ item }) => (
      <TransactionItem
        item={item}
        type="expense"
        theme={theme}
        onLongPress={() => handleDelete(item)}
      />
    ),
    [handleDelete, theme]
  );

  const renderIncomeItem = useCallback(
    ({ item }) => <TransactionItem item={item} type="income" theme={theme} />,
    [theme]
  );

  const renderInvestmentItem = useCallback(
    ({ item }) => (
      <TransactionItem item={item} type="investment" theme={theme} />
    ),
    [theme]
  );

  // All useMemo hooks should be declared together
  const getPieChartData = useMemo(() => {
    const categoryMap = {};
    expenses.forEach((item) => {
      const amount = parseFloat(item.amount);
      if (!item.category || isNaN(amount) || amount <= 0) return;
      categoryMap[item.category] = (categoryMap[item.category] || 0) + amount;
    });
    return Object.entries(categoryMap)
      .filter(([cat, amt]) => cat && amt > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([category, amount], index) => {
        const categoryObj = EXPENSE_CATEGORIES.find((c) => c.name === category);
        return {
          name: category,
          amount: amount,
          color:
            categoryObj?.color || CHART_COLORS[index % CHART_COLORS.length],
          legendFontColor: "#222",
          legendFontSize: 14,
          icon: categoryObj?.icon || "📝",
        };
      });
  }, [expenses]);

  const budgetProgress = useMemo(() => {
    return budgets.map((budget) => {
      const spent = getMonthlyCategorySpending(budget.category);
      const categoryData = EXPENSE_CATEGORIES.find(
        (cat) => cat.name === budget.category
      );
      return {
        ...budget,
        spent,
        icon: categoryData?.icon || "📝",
        color: categoryData?.color || "#747D8C",
        isOverBudget: spent > parseFloat(budget.amount || 0),
      };
    });
  }, [budgets, getMonthlyCategorySpending]);

  const uniqueReminders = useMemo(() => {
    return reminders
      .sort((a, b) => {
        const dateA = new Date(
          `${a.next_due_date}T${a.reminder_time || "00:00"}`
        );
        const dateB = new Date(
          `${b.next_due_date}T${b.reminder_time || "00:00"}`
        );
        return dateA - dateB;
      })
      .filter(
        (rem, idx, arr) =>
          arr.findIndex(
            (r) =>
              r.title === rem.title &&
              r.next_due_date === rem.next_due_date &&
              r.reminder_time === rem.reminder_time
          ) === idx
      );
  }, [reminders]);

  const overallMonthlyBudgetProgress = useMemo(() => {
    const totalBudget = parseFloat(profile?.monthly_budget) || 0;
    const spent = monthlyExpenses;
    return {
      total: totalBudget,
      spent: spent,
      isSet: totalBudget > 0,
    };
  }, [profile, monthlyExpenses]);

  // Function declarations (not hooks)
  const fetchInvestments = async () => {
    try {
      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false });
      if (!error) setInvestments(data || []);
    } catch {}
  };

  const fetchIncomes = async () => {
    try {
      const { data, error } = await supabase
        .from("side_incomes")
        .select("*")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false });
      if (!error) setIncomes(data || []);
    } catch {}
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (data) setProfile(data);
      if (error && error.code !== "PGRST116") return;
      if (data) {
        setProfile(data);
      } else {
        const { data: newProfile } = await supabase
          .from("profiles")
          .insert([
            {
              id: session.user.id,
              full_name: session.user.user_metadata?.full_name || "",
              username: session.user.email?.split("@")[0] || "",
              email: session.user.email,
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();
        if (newProfile) setProfile(newProfile);
      }
    } catch {}
  };

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false });
      if (!error) {
        setExpenses(data || []);
        calculateStatistics(data || []);
      }
    } catch {}
  };

  const fetchBudgets = async () => {
    try {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", session.user.id);
      if (!error) setBudgets(data || []);
    } catch {}
  };

  const fetchReminders = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_reminders")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .order("next_due_date", { ascending: true });
      if (!error) setReminders(data || []);
    } catch {}
  };

  const completeOnboarding = async () => {
    await setOnboardingCompleted();
    setShowOnboarding(false);
  };

  const initializeData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchProfile(),
        fetchExpenses(),
        fetchBudgets(),
        fetchReminders(),
        fetchIncomes(),
        fetchInvestments(),
      ]).finally(() => setRefreshing(false));
    } catch (error) {
      RNAlert.alert(
        "Error",
        "Failed to load dashboard data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (expenseId) => {
    try {
      await supabase.from("expenses").delete().eq("id", expenseId);
      await fetchExpenses();
      RNAlert.alert("Success", "Expense deleted successfully!");
    } catch {
      RNAlert.alert("Error", "Failed to delete expense. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      setShowLogoutAlert(false);
      await supabase.auth.signOut();
    } catch {
      RNAlert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  // All useEffect hooks should be declared together after other hooks
  useEffect(() => {
    let isMounted = true;
    if (session?.user) {
      initializeData();
      if (route.params?.showOnboarding) {
        setShowOnboarding(true);
        navigation.setParams({ showOnboarding: undefined });
        return;
      }
    }
    return () => {
      isMounted = false;
    };
  }, [session, route.params?.showOnboarding]);

  useEffect(() => {
    global.targetRefs = {};
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (session?.user) {
        initializeData();
      }
    }, [session])
  );

  useFocusEffect(
    useCallback(() => {
      if (
        navigation.getState().routes[navigation.getState().index].params
          ?.showOnboarding
      ) {
        setShowOnboarding(true);
        navigation.setParams({ showOnboarding: undefined });
      }
    }, [navigation])
  );

  // Early return should come after all hooks
  if (loading || !session?.user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  const recentExpenses = expenses.slice(0, 5);
  const today = new Date();
  const todayString = today.toISOString().split("T")[0];
  const todaysTotal = expenses
    .filter((exp) => exp.date === todayString)
    .reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* --- Header Section --- */}
        <View
          style={[styles.header, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.headerContent}>
            <Text style={[styles.welcomeText, { color: theme.colors.text }]}>
              Good Morning, {profile?.full_name || "User"}!
            </Text>
            <Text
              style={[
                styles.subGreeting,
                { color: theme.colors.textSecondary },
              ]}
            >
              Let's keep your spending on Track
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Avatar
              name={profile?.full_name}
              email={profile?.email || session?.user?.email}
              size={44}
              onPress={() => navigation.navigate("Profile", { profile })}
              ref={(ref) => setTargetRef("profile-avatar", ref)}
            />
          </View>
        </View>
        {/* --- Statistics Section --- */}
        <View style={styles.statisticsContainer}>
          <View
            style={styles.statsContainer}
            ref={(ref) => setTargetRef("stats-container", ref)}
          >
            <View
              style={[
                styles.statCard,
                styles.statCardMargin,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                ₹{monthlyExpenses.toFixed(2)}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                This Month
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                ₹{todaysTotal.toFixed(2)}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Today's Total
              </Text>
            </View>
          </View>

          {expenses.length > 0 && (
            <View
              style={styles.chartsContainer}
              ref={(ref) => setTargetRef("chart-container", ref)}
            >
              <CalendarHeatmap expenses={expenses} theme={theme} />
            </View>
          )}
        </View>
        {/* --- Reminders Section --- */}
        {uniqueReminders.length > 0 && (
          <View
            style={styles.remindersSection2}
            ref={(ref) => setTargetRef("reminders-section", ref)}
          >
            <View style={styles.sectionHeader2}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Payment Reminders
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("PaymentReminder")}
              >
                <Text
                  style={[styles.seeAllText, { color: theme.colors.primary }]}
                >
                  View All
                </Text>
              </TouchableOpacity>
            </View>
            <Carousel
              width={screenWidth - 40}
              height={190}
              data={uniqueReminders}
              mode="parallax"
              autoPlay={true}
              scrollAnimationDuration={800}
              renderItem={({ item }) => (
                <ReminderCard
                  item={item}
                  onPress={() => navigation.navigate("PaymentReminder")}
                />
              )}
            />
          </View>
        )}
        {/* --- Budgets Section --- */}
        <View
          style={styles.budgetSection}
          ref={(ref) => setTargetRef("budget-section", ref)}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Budget Progress
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("BudgetScreen")}
            >
              <Text
                style={[styles.seeAllText, { color: theme.colors.primary }]}
              >
                Manage Budgets
              </Text>
            </TouchableOpacity>
          </View>

          {/* Overall Monthly Budget */}
          {overallMonthlyBudgetProgress.isSet ? (
            <BudgetBar
              label="Monthly Budget"
              spent={overallMonthlyBudgetProgress.spent}
              budget={overallMonthlyBudgetProgress.total}
              color={theme.colors.primary}
              icon="💰"
              theme={theme}
            />
          ) : (
            <View
              style={[
                styles.emptyBudgetState,
                { backgroundColor: theme.colors.surface, marginBottom: 12 },
              ]}
            >
              <Text
                style={[
                  styles.emptyStateText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                No Overall Budget Set
              </Text>
              <Text
                style={[
                  styles.emptyStateSubtext,
                  { color: theme.colors.textTertiary },
                ]}
              >
                Go to your Profile to set a monthly budget.
              </Text>
            </View>
          )}

          {/* Category Specific Budgets */}
          {budgets.length > 0 && (
            <>
              {budgetProgress
                .sort((a, b) =>
                  b.budget > 0 && a.budget > 0
                    ? b.spent / b.budget - a.spent / a.budget
                    : 0
                )
                .slice(0, 5)
                .map((item) => (
                  <BudgetBar
                    key={item.id}
                    label={item.category}
                    spent={item.spent}
                    budget={parseFloat(item.amount) || 0}
                    color={item.color}
                    icon={item.icon}
                    theme={theme}
                  />
                ))}
            </>
          )}
        </View>
        {/* --- Recent Income Section --- */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Income</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("IncomeManagement")}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {incomes.length > 0 ? (
            <FlatList
              data={incomes.slice(0, 5)}
              renderItem={renderIncomeItem}
              keyExtractor={(item) =>
                item.id?.toString() || Math.random().toString()
              }
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <Text style={styles.emptyStateText}>No income yet</Text>
          )}
        </View>

        {/* --- Recent Expenses Section --- */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("AllExpenses")}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentExpenses.length > 0 ? (
            <FlatList
              data={recentExpenses}
              renderItem={renderExpenseItem}
              keyExtractor={(item) =>
                item.id?.toString() || Math.random().toString()
              }
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <Text style={styles.emptyStateText}>No expenses yet</Text>
          )}
        </View>

        {/* --- Recent Investments Section --- */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Investments</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("InvestmentsScreen")}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {investments.length > 0 ? (
            <FlatList
              data={investments.slice(0, 5)}
              renderItem={renderInvestmentItem}
              keyExtractor={(item) =>
                item.id?.toString() || Math.random().toString()
              }
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <Text style={styles.emptyStateText}>No investments yet</Text>
          )}
        </View>
      </ScrollView>

      {/* --- Floating Taskbar --- */}
      <FloatingTaskbar
        theme={theme}
        navigation={navigation}
        setTargetRef={() => {}} // If you use onboarding/targets, pass the real handler here!
      />

      <OnboardingOverlay
        isVisible={showOnboarding}
        onComplete={completeOnboarding}
        onStepChange={handleOnboardingStepChange}
      />

      {/* --- Alerts --- */}
      <Alert
        open={showDeleteAlert}
        onConfirm={async () => {
          setShowDeleteAlert(false);
          if (expenseToDelete) {
            await deleteExpense(expenseToDelete.id);
            setExpenseToDelete(null);
          }
        }}
        onCancel={() => {
          setShowDeleteAlert(false);
          setExpenseToDelete(null);
        }}
        title="Delete Expense"
        message={`Are you sure you want to delete "${expenseToDelete?.title}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        icon={<Trash2 color="#fff" size={40} />}
        iconBg="#ef4444"
        confirmColor="#ef4444"
        confirmTextColor="#fff"
        cancelColor="#f1f5f9"
        cancelTextColor="#334155"
      />
      <Alert
        open={showLogoutAlert}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutAlert(false)}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        icon={<LogOut color="#fff" size={40} />}
        iconBg="#ef4444"
        confirmColor="#ef4444"
        confirmTextColor="#fff"
        cancelColor="#f1f5f9"
        cancelTextColor="#334155"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FBFC" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: "500" },
  section: { paddingHorizontal: 16, marginTop: 18 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Math.max(screenWidth * 0.05, 16),
    paddingTop: Math.max(screenHeight * 0.07, 36),
    paddingBottom: Math.max(screenHeight * 0.03, 18),
    borderBottomLeftRadius: Math.max(screenWidth * 0.06, 15),
    borderBottomRightRadius: Math.max(screenWidth * 0.06, 15),
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerContent: { flex: 1 },
  welcomeText: {
    fontSize: Math.max(Math.min(screenWidth * 0.05, 22), 14),
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: Math.max(Math.min(screenWidth * 0.035, 16), 11),
    fontWeight: "500",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Math.max(screenWidth * 0.025, 8),
  },
  notificationButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: Math.max(screenWidth * 0.1, 36),
    height: Math.max(screenWidth * 0.1, 36),
    borderRadius: Math.max(screenWidth * 0.05, 18),
    justifyContent: "center",
    alignItems: "center",
    marginRight: Math.max(screenWidth * 0.02, 6),
  },
  notificationIcon: {
    fontSize: Math.max(screenWidth * 0.05, 18),
    color: "#fff",
  },
  logoutButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: Math.max(screenWidth * 0.04, 12),
    paddingVertical: Math.max(screenHeight * 0.01, 8),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: Math.max(Math.min(screenWidth * 0.032, 14), 10),
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  statisticsContainer: { flexDirection: "column", gap: 1 },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: Math.max(screenWidth * 0.04, 12),
    paddingTop: 10,
    gap: Math.max(screenWidth * 0.02, 8),
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: Math.max(screenWidth * 0.03, 10),
    borderRadius: Math.max(screenWidth * 0.04, 14),
    alignItems: "center",
    minHeight: Math.max(screenWidth * 0.22, 90),
    borderWidth: 2,
    borderColor: "rgba(6, 182, 212, 0.1)",
    justifyContent: "center",
    elevation: 2,
  },
  statCardMargin: { marginRight: 0 },
  statValue: {
    fontSize: Math.max(Math.min(screenWidth * 0.04, 18), 13),
    fontWeight: "900",
    color: "#06b6d4",
    marginBottom: 8,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  statLabel: {
    fontSize: Math.max(Math.min(screenWidth * 0.032, 13), 10),
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 16,
  },
  chartsContainer: {
    marginHorizontal: Math.max(screenWidth * 0.035, 10),
    marginVertical: Math.max(screenWidth * 0.02, 8),
  },
  chartCard: {
    borderRadius: Math.max(screenWidth * 0.06, 16),
    padding: Math.max(screenWidth * 0.035, 12),
    borderWidth: 2,
    borderColor: "rgba(6, 182, 212, 0.1)",
    justifyContent: "center",
    elevation: 2,
  },
  chartRow: {
    flexDirection: screenWidth < 400 ? "column" : "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chartSide: { flex: 1, alignItems: "center", justifyContent: "center" },
  legendSide: {
    flex: 1,
    justifyContent: "center",
    marginTop: screenWidth < 400 ? 20 : 0,
  },
  chartLegendGrid: { flexDirection: "column", justifyContent: "center" },
  legendGridItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Math.max(screenWidth * 0.025, 8),
  },
  legendColor: {
    width: Math.max(screenWidth * 0.04, 14),
    height: Math.max(screenWidth * 0.04, 14),
    borderRadius: Math.max(screenWidth * 0.02, 7),
    marginRight: Math.max(screenWidth * 0.025, 8),
  },
  legendText: {
    fontSize: Math.max(Math.min(screenWidth * 0.032, 13), 10),
    color: "#334155",
    fontWeight: "600",
    flex: 1,
  },
  budgetSection: {
    paddingHorizontal: Math.max(screenWidth * 0.04, 12),
  },
  budgetBarContainer: {
    marginBottom: Math.max(screenWidth * 0.04, 12),
    backgroundColor: "#fff",
    borderRadius: Math.max(screenWidth * 0.04, 14),
    padding: Math.max(screenWidth * 0.035, 10),
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.1)",
    elevation: 2,
  },
  budgetBarHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Math.max(screenWidth * 0.025, 8),
  },
  budgetBarIcon: {
    fontSize: Math.max(Math.min(screenWidth * 0.05, 22), 16),
    marginRight: Math.max(screenWidth * 0.02, 7),
  },
  budgetBarLabel: {
    flex: 1,
    fontSize: Math.max(Math.min(screenWidth * 0.04, 16), 12),
    fontWeight: "600",
    color: "#334155",
  },
  budgetBarAmount: {
    fontSize: Math.max(Math.min(screenWidth * 0.035, 15), 10),
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  budgetBarTrack: {
    height: Math.max(screenWidth * 0.018, 8),
    backgroundColor: "#f5f7fa",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: Math.max(screenWidth * 0.02, 8),
  },
  budgetBarFill: { height: "100%", borderRadius: 4 },
  budgetBarOverage: {
    fontSize: Math.max(Math.min(screenWidth * 0.03, 13), 9),
    color: "#facc15",
    fontWeight: "600",
    marginTop: 4,
  },
  budgetBarPercent: {
    fontSize: Math.max(Math.min(screenWidth * 0.03, 13), 9),
    color: "#334155",
    fontWeight: "500",
  },
  subSectionTitle: {
    fontSize: Math.max(Math.min(screenWidth * 0.04, 16), 12),
    fontWeight: "600",
    color: "#334155",
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  remindersSection2: {
    paddingHorizontal: Math.max(screenWidth * 0.04, 12),
    marginTop: Math.max(screenWidth * 0.06, 16),
  },
  sectionHeader2: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Math.max(screenWidth * 0.025, 8),
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  seeAllText: { fontSize: 14, color: "#06b6d4", fontWeight: "600" },

  emptyBudgetState: {
    backgroundColor: "#fff",
    borderRadius: Math.max(screenWidth * 0.04, 14),
    padding: Math.max(screenWidth * 0.07, 18),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.1)",
    elevation: 1,
  },
  emptyStateText: {
    color: "#888",
    marginTop: 12,
    textAlign: "center",
    fontSize: 14,
  },
  emptyStateSubtext: {
    fontSize: Math.max(Math.min(screenWidth * 0.035, 14), 9),
    color: "#334155",
    textAlign: "center",
    opacity: 0.7,
  },
  recentSection: {
    paddingHorizontal: Math.max(screenWidth * 0.04, 12),
    marginTop: Math.max(screenWidth * 0.05, 14),
    marginBottom: Math.max(screenWidth * 0.22, 80),
  },
  recentSectioni: {
    paddingHorizontal: Math.max(screenWidth * 0.04, 12),
    marginTop: Math.max(screenWidth * 0.05, 14),
  },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: Math.max(screenWidth * 0.035, 10),
    borderRadius: Math.max(screenWidth * 0.03, 10),
    marginBottom: Math.max(screenWidth * 0.025, 8),
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.1)",
    elevation: 1,
  },
  expenseInfo: { flex: 1 },
  expenseTitle: {
    fontSize: Math.max(Math.min(screenWidth * 0.04, 16), 10),
    fontWeight: "600",
    color: "#334155",
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: Math.max(Math.min(screenWidth * 0.03, 12), 8),
    color: "#334155",
    fontWeight: "500",
    marginBottom: 2,
    opacity: 0.7,
  },
  expenseCategory: {
    fontSize: Math.max(Math.min(screenWidth * 0.03, 12), 8),
    color: "#334155",
    fontWeight: "500",
    opacity: 0.6,
  },
  expenseAmount: {
    fontSize: Math.max(Math.min(screenWidth * 0.04, 16), 11),
    fontWeight: "700",
    color: "#06b6d4",
    letterSpacing: -0.2,
  },
  emptyState: {
    backgroundColor: "#fff",
    borderRadius: Math.max(screenWidth * 0.04, 14),
    padding: Math.max(screenWidth * 0.07, 18),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.1)",
    elevation: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: Math.max(screenWidth * 0.04, 12),
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: Math.max(screenWidth * 0.05, 16),
    padding: Math.max(screenWidth * 0.07, 18),
    width: "100%",
    maxWidth: Math.max(screenWidth * 0.95, 320),
    elevation: 10,
  },
  modalTitle: {
    fontSize: Math.max(Math.min(screenWidth * 0.05, 22), 13),
    fontWeight: "700",
    color: "#334155",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.2)",
    borderRadius: Math.max(screenWidth * 0.03, 9),
    padding: Math.max(screenWidth * 0.035, 12),
    fontSize: Math.max(Math.min(screenWidth * 0.04, 16), 10),
    marginBottom: 16,
    backgroundColor: "#f5f7fa",
    color: "#334155",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Math.max(screenWidth * 0.04, 14),
    borderRadius: Math.max(screenWidth * 0.03, 9),
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f5f7fa",
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.2)",
  },
  saveButton: { backgroundColor: "#06b6d4" },
  cancelButtonText: {
    color: "#334155",
    fontSize: Math.max(Math.min(screenWidth * 0.04, 16), 10),
    fontWeight: "600",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: Math.max(Math.min(screenWidth * 0.04, 16), 10),
    fontWeight: "600",
  },
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
    backgroundColor: "#fff",
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
  onboardingOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  highlightCircle: {
    position: "absolute",
    backgroundColor: "transparent",
    borderRadius: 15,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  tooltip: {
    position: "absolute",
    borderRadius: Math.max(screenWidth * 0.05, 14),
    padding: Math.max(screenWidth * 0.04, 12),
    maxWidth: screenWidth - Math.max(screenWidth * 0.08, 40),
    minWidth: Math.max(screenWidth * 0.6, 200),
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Math.max(screenWidth * 0.035, 12),
  },
  progressBar: {
    flex: 1,
    height: Math.max(screenWidth * 0.012, 4),
    borderRadius: 2,
    overflow: "hidden",
    marginRight: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: Math.max(Math.min(screenWidth * 0.03, 13), 9),
    fontWeight: "500",
  },
  skipButton: {
    position: "absolute",
    top: 15,
    right: 15,
    width: Math.max(screenWidth * 0.08, 28),
    height: Math.max(screenWidth * 0.08, 28),
    borderRadius: Math.max(screenWidth * 0.04, 14),
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  tooltipTitle: {
    fontSize: Math.max(Math.min(screenWidth * 0.048, 19), 13),
    fontWeight: "700",
    marginBottom: 12,
    lineHeight: 24,
  },
  tooltipDescription: {
    fontSize: Math.max(Math.min(screenWidth * 0.035, 14), 10),
    lineHeight: 20,
    marginBottom: 20,
  },
  tooltipButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previousButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Math.max(screenWidth * 0.045, 13),
    paddingVertical: Math.max(screenWidth * 0.028, 10),
    borderRadius: Math.max(screenWidth * 0.03, 11),
    borderWidth: 1,
  },
  previousButtonText: {
    fontSize: Math.max(Math.min(screenWidth * 0.035, 14), 10),
    fontWeight: "600",
    marginLeft: 8,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Math.max(screenWidth * 0.065, 19),
    paddingVertical: Math.max(screenWidth * 0.035, 11),
    borderRadius: Math.max(screenWidth * 0.03, 11),
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  nextButtonText: {
    fontSize: Math.max(Math.min(screenWidth * 0.035, 14), 10),
    fontWeight: "600",
    marginRight: 8,
  },
});
