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
  },
  {
    id: "profile",
    title: "Your Profile",
    description:
      "Tap your avatar to view and edit your profile information, including your name and preferences.",
    targetId: "profile-avatar",
    position: "bottom",
  },
  {
    id: "stats",
    title: "Quick Stats",
    description:
      "These cards show your spending summary - current month total and today's expenses at a glance.",
    targetId: "stats-container",
    position: "bottom",
  },
  {
    id: "chart",
    title: "Spending Breakdown",
    description:
      "This pie chart visualizes your expenses by category, helping you understand where your money goes.",
    targetId: "chart-container",
    position: "bottom",
  },
  {
    id: "reminders",
    title: "Payment Reminders",
    description:
      "Set up reminders for bills and recurring payments. Never miss a payment again!",
    targetId: "reminders-section",
    position: "bottom",
  },
  {
    id: "budget",
    title: "Budget Tracking",
    description:
      "Monitor your spending against set budgets. The progress bars show how much you've spent vs. your limits.",
    targetId: "budget-section",
    position: "bottom",
  },
  {
    id: "recent",
    title: "Recent Expenses",
    description:
      "View your latest transactions here. Long-press any expense to delete it quickly.",
    targetId: "recent-section",
    position: "top",
  },
  {
    id: "taskbar",
    title: "Quick Actions",
    description:
      "Use this floating taskbar to quickly access all major features of the app.",
    targetId: "taskbar",
    position: "top",
  },
  {
    id: "add-expense",
    title: "Add New Expense",
    description:
      "The plus button is your main tool - tap it whenever you make a purchase to track your spending.",
    targetId: "add-button",
    position: "top",
  },
  {
    id: "budget-btn",
    title: "Budget Management",
    description:
      "Create and manage your budgets here. Set spending limits for different categories.",
    targetId: "budget-btn",
    position: "top",
  },
  {
    id: "reminders-btn",
    title: "Payment Reminders",
    description:
      "Set up reminders for bills, subscriptions, and other recurring payments.",
    targetId: "reminders-btn",
    position: "top",
  },
  {
    id: "expenses-btn",
    title: "All Expenses",
    description:
      "View, filter, and analyze all your expenses with powerful sorting and filtering options.",
    targetId: "expenses-btn",
    position: "top",
  },
  {
    id: "insights-btn",
    title: "Smart Insights",
    description:
      "Get AI-powered insights about your spending patterns and personalized recommendations.",
    targetId: "insights-btn",
    position: "top",
  },
  {
    id: "complete",
    title: "You're All Set! 🚀",
    description:
      "Start by adding your first expense or setting up a budget. Happy tracking!",
    targetId: null,
    position: "center",
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
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  useEffect(() => {
    if (isVisible && tooltipMeasured) {
      measureTargetElement();
    }
  }, [currentStep, isVisible, tooltipMeasured]);

  const measureTargetElement = () => {
    const step = ONBOARDING_STEPS[currentStep];
    if (!step.targetId) {
      setTargetLayout(null);
      return;
    }
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
            }
          });
        }
      } catch {
        setTargetLayout(null);
      }
    }, 200);
  };

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
      duration: 300,
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
    const margin = 20;
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
      animationType="none"
      statusBarTranslucent={true}
    >
      <Animated.View
        style={[styles.onboardingOverlay, { opacity: overlayOpacity }]}
      >
        <View
          style={[
            styles.overlayBackground,
            { backgroundColor: theme.colors.overlay },
          ]}
        />

        {step.targetId && highlightPosition && (
          <Animated.View
            style={[
              styles.highlightCircle,
              {
                opacity: highlightOpacity,
                left: highlightPosition.left,
                top: highlightPosition.top,
                width: highlightPosition.width,
                height: highlightPosition.height,
                borderColor: theme.colors.primary,
                shadowColor: theme.colors.primary,
              },
            ]}
          />
        )}

        <View
          style={[
            styles.tooltip,
            {
              backgroundColor: theme.colors.surface,
              shadowColor: theme.colors.shadow,
              position: "absolute",
              top: tooltipPosition.top,
              left: tooltipPosition.left,
            },
          ]}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setTooltipLayout({ width, height });
            setTooltipMeasured(true);
          }}
        >
          <TouchableOpacity
            style={[
              styles.skipButton,
              { backgroundColor: theme.colors.background },
            ]}
            onPress={handleSkip}
          >
            <X size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <Text style={[styles.tooltipTitle, { color: theme.colors.text }]}>
            {step.title}
          </Text>
          <Text
            style={[
              styles.tooltipDescription,
              { color: theme.colors.textSecondary },
            ]}
          >
            {step.description}
          </Text>

          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: theme.colors.border },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.colors.primary,
                    width: `${progress}%`,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.progressText,
                { color: theme.colors.textTertiary },
              ]}
            >
              {currentStep + 1} of {ONBOARDING_STEPS.length}
            </Text>
          </View>

          <View style={styles.tooltipButtons}>
            {currentStep > 0 && (
              <TouchableOpacity
                style={[
                  styles.previousButton,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={handlePrevious}
              >
                <ArrowLeft size={16} color={theme.colors.textTertiary} />
                <Text
                  style={[
                    styles.previousButtonText,
                    { color: theme.colors.textTertiary },
                  ]}
                >
                  Previous
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.nextButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleNext}
            >
              <Text
                style={[styles.nextButtonText, { color: theme.colors.surface }]}
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
  const targetRefs = useRef({});
  const scrollViewRef = useRef(null);
  const nav = useNavigation();

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

  const [showOnboarding, setShowOnboarding] = useState(false);

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
    return () => { isMounted = false; };
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

  const checkFirstVisit = async () => {
    try {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("onboarding_completed")
        .eq("user_id", session.user.id)
        .single();

      if (error || !data?.onboarding_completed) {
        setShowOnboarding(true);
        setIsFirstVisit(true);
      } else {
        setIsFirstVisit(false);
      }
    } catch (error) {
      setShowOnboarding(true);
      setIsFirstVisit(true);
    }
  };

  const setTargetRef = (id, ref) => {
    if (ref && global.targetRefs) {
      global.targetRefs[id] = ref;
    }
  };

  const completeOnboarding = async () => {
    await setOnboardingCompleted();
    setShowOnboarding(false);
  };
  

  const initializeData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchExpenses(),
        fetchBudgets(),
        fetchProfile(),
        fetchReminders(),
      ]);
    } catch (error) {
      RNAlert.alert(
        "Error",
        "Failed to load dashboard data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchExpenses(), fetchBudgets(), fetchReminders()]).finally(
      () => setRefreshing(false)
    );
  }, []);

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

  const handleDelete = useCallback((expense) => {
    setExpenseToDelete(expense);
    setShowDeleteAlert(true);
  }, []);

  const deleteExpense = async (expenseId) => {
    try {
      await supabase.from("expenses").delete().eq("id", expenseId);
      await fetchExpenses();
      RNAlert.alert("Success", "Expense deleted successfully!");
    } catch {
      RNAlert.alert("Error", "Failed to delete expense. Please try again.");
    }
  };

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

  const handleLogout = async () => {
    try {
      setShowLogoutAlert(false);
      await supabase.auth.signOut();
    } catch {
      RNAlert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  const overallMonthlyBudgetProgress = useMemo(() => {
    const totalBudget = parseFloat(profile?.monthly_budget) || 0;
    const spent = monthlyExpenses;
    return {
      total: totalBudget,
      spent: spent,
      isSet: totalBudget > 0,
    };
  }, [profile, monthlyExpenses]);

  const renderExpenseItem = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={[styles.expenseItem, { backgroundColor: theme.colors.surface }]}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <View style={styles.expenseInfo}>
          <Text
            style={[styles.expenseTitle, { color: theme.colors.textSecondary }]}
          >
            {item.title || "Untitled"}
          </Text>
          <Text
            style={[styles.expenseDate, { color: theme.colors.textSecondary }]}
          >
            {item.date ? new Date(item.date).toLocaleDateString() : "No date"}
          </Text>
          {item.category && (
            <Text
              style={[
                styles.expenseCategory,
                { color: theme.colors.textSecondary },
              ]}
            >
              {EXPENSE_CATEGORIES.find((cat) => cat.name === item.category)
                ?.icon || "📝"}{" "}
              {item.category}
            </Text>
          )}
        </View>
        <Text style={[styles.expenseAmount, { color: theme.colors.primary }]}>
          ₹{(parseFloat(item.amount) || 0).toFixed(2)}
        </Text>
      </TouchableOpacity>
    ),
    [handleDelete, theme]
  );

  if (loading || !session?.user) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text
          style={[styles.loadingText, { color: theme.colors.textSecondary }]}
        >
          Loading your dashboard...
        </Text>
      </View>
    );
  }

  const recentExpenses = expenses.slice(0, 5);

  const today = new Date();
  const todayString = today.toISOString().split("T")[0];
  const todaysTotal = expenses
    .filter((exp) => exp.date === todayString)
    .reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

  const handleOnboardingStepChange = (stepId) => {
    if (
      stepId === "budget" &&
      scrollViewRef.current &&
      global.targetRefs["budget-section"]
    ) {
      global.targetRefs["budget-section"].measure(
        (x, y, width, height, pageX, pageY) => {
          const offset =
            pageY - Dimensions.get("window").height / 2 + height / 2;
          scrollViewRef.current.scrollTo({
            y: Math.max(offset, 0),
            animated: true,
          });
        }
      );
    }
    if (
      stepId === "recent" &&
      scrollViewRef.current &&
      global.targetRefs["recent-section"]
    ) {
      global.targetRefs["recent-section"].measure(
        (x, y, width, height, pageX, pageY) => {
          scrollViewRef.current.scrollTo({ y: pageY - 80, animated: true });
        }
      );
    }
  };

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        ref={scrollViewRef}
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

          {expenses.length > 0 && getPieChartData.length > 0 && (
            <View
              style={styles.chartsContainer}
              ref={(ref) => setTargetRef("chart-container", ref)}
            >
              <View
                style={[
                  styles.chartCard,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <View style={styles.chartRow}>
                  <View style={styles.chartSide}>
                    <PieChart
                      data={getPieChartData}
                      width={screenWidth}
                      height={200}
                      chartConfig={{
                        backgroundColor: theme.colors.surface,
                        backgroundGradientFrom: theme.colors.surface,
                        backgroundGradientTo: theme.colors.surface,
                        color: (opacity = 1) => `rgba(6,182,212,${opacity})`,
                      }}
                      accessor={"amount"}
                      backgroundColor={"transparent"}
                      paddingLeft={100}
                      center={[0, 0]}
                      absolute
                      hasLegend={false}
                    />
                  </View>
                  <View style={styles.legendSide}>
                    <View style={styles.chartLegendGrid}>
                      {getPieChartData.map((item) => (
                        <View key={item.name} style={styles.legendGridItem}>
                          <View
                            style={[
                              styles.legendColor,
                              { backgroundColor: item.color },
                            ]}
                          />
                          <Text
                            style={[
                              styles.legendText,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {item.icon} {item.name}: ₹{item.amount.toFixed(0)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
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
              {budgetProgress.map((item) => (
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
        {/* --- Recent Expenses Section --- */}
        <View
          style={styles.recentSection}
          ref={(ref) => setTargetRef("recent-section", ref)}
        >
          <View style={styles.sectionHeader}>
            
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Recent Expenses
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("AllExpenses")}
            >
              <Text
                style={[styles.seeAllText, { color: theme.colors.primary }]}
              >
                See All
              </Text>
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
            <View
              style={[
                styles.emptyState,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text
                style={[
                  styles.emptyStateText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                No expenses yet
              </Text>
              <Text
                style={[
                  styles.emptyStateSubtext,
                  { color: theme.colors.textTertiary },
                ]}
              >
                Add your first expense to get started!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* --- Floating Taskbar --- */}
      <View style={styles.taskbarContainer}>
        <View
          style={[styles.taskbar, { backgroundColor: theme.colors.surface }]}
          ref={(ref) => setTargetRef("taskbar", ref)}
        >
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.buttonSecondary },
            ]}
            onPress={() => navigation.navigate("BudgetScreen")}
            activeOpacity={0.7}
            ref={(ref) => setTargetRef("budget-btn", ref)}
          >
            <Text style={styles.actionIcon}>💰</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.buttonSecondary },
            ]}
            onPress={() => navigation.navigate("PaymentReminder")}
            activeOpacity={0.7}
            ref={(ref) => setTargetRef("reminders-btn", ref)}
          >
            <Text style={styles.actionIcon}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => navigation.navigate("AddExpense")}
            activeOpacity={0.8}
            ref={(ref) => setTargetRef("add-button", ref)}
          >
            <Text style={styles.addIcon}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.buttonSecondary },
            ]}
            onPress={() => navigation.navigate("AllExpenses")}
            activeOpacity={0.7}
            ref={(ref) => setTargetRef("expenses-btn", ref)}
          >
            <Text style={styles.actionIcon}>📊</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.buttonSecondary },
            ]}
            onPress={() => navigation.navigate("SmartInsights")}
            activeOpacity={0.7}
            ref={(ref) => setTargetRef("insights-btn", ref)}
          >
            <Text style={styles.actionIcon}>🧠</Text>
          </TouchableOpacity>
        </View>
      </View>

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
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: screenHeight * 0.02,
    fontSize: Math.max(Math.min(screenWidth * 0.04, 18), 12),
    fontWeight: "500",
  },
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
    marginBottom: Math.max(screenWidth * 0.025, 8),
  },
  sectionTitle: {
    fontSize: Math.max(Math.min(screenWidth * 0.055, 23), 14),
    fontWeight: "700",
    color: "#334155",
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: Math.max(Math.min(screenWidth * 0.04, 16), 11),
    color: "#06b6d4",
    fontWeight: "600",
  },
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
    fontSize: Math.max(Math.min(screenWidth * 0.045, 18), 11),
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
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
