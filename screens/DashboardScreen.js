import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  forwardRef,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
} from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Alert from "../components/Alert";
import {
  Trash2,
  X,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  LayoutGrid,
  GripVertical,
  Eye,
  EyeOff,
} from "lucide-react-native";
import Carousel from "react-native-reanimated-carousel";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import CalendarHeatmap from "../components/Heatmap";
import FloatingTaskbar from "../components/FloatingTaskbar";
import TransactionItem from "../components/TransactionItem";
import AsyncStorage from "@react-native-async-storage/async-storage";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

const TAGLINES = [
  "Let’s track your money 🚀",
  "Your finances, at a glance 💡",
  "Stay on top of every rupee 💸",
  "Smart moves start here 📊",
  "Your money, your control 🔑",
  "Keep spending in check ✅",
  "Budget smarter, live better 🌱",
  "Money made simple ✨",
  "Ready to master your finances? ⚡",
  "Every expense counts 🧾",
];

const ONBOARDING_STEPS = [
  {
    id: "welcome",
    title: "Welcome to Expenso! ",
    description:
      "Let's quickly walk through the key features to get you started on managing your finances.",
    targetId: null,
    position: "center",
  },
  {
    id: "quick-stats",
    title: "Your Financial Snapshot",
    description:
      "Here, you can instantly see your total spending for the current month and today. No more guessing!",
    targetId: "stats-container",
    position: "bottom",
  },
  {
    id: "heatmap",
    title: "Visualize Your Spending",
    description:
      "This heatmap shows your spending patterns at a glance. Darker days mean more spending.",
    targetId: "chart-container",
    position: "bottom",
  },
  {
    id: "budget",
    title: "Stay Within Your Budget",
    description:
      "Keep an eye on your category budgets here. We'll show you how much you have left to spend.",
    targetId: "budget-section",
    position: "top",
  },
  {
    id: "recent-activity",
    title: "Track Your Transactions",
    description:
      "Your latest expenses, income, and investments are listed here. Tap the tabs to switch views.",
    targetId: "recent-activity-section",
    position: "top",
  },
  {
    id: "taskbar",
    title: "Add a Transaction",
    description:
      "This is the most important button! Tap the '+' to log a new expense, income, or investment.",
    targetId: "taskbar",
    position: "top",
  },
  {
    id: "complete",
    title: "You're All Set! 🚀",
    description:
      "You're ready to take control of your finances. Start by adding your first transaction now!",
    targetId: null,
    position: "center",
  },
];
const ONBOARDING_FLAG_KEY = "onboarding_completed";
const LAYOUT_STORAGE_KEY = "@dashboard_layout_order";
const DEFAULT_ORDER = [
  { key: "stats", isVisible: true },
  { key: "reminders", isVisible: true },
  { key: "budgets", isVisible: true },
  { key: "activity", isVisible: true },
];

const SimpleReminderCard = ({ item, onPress, theme }) => {
  const formatAmount = (amount) =>
    amount
      ? `₹${parseFloat(amount).toLocaleString("en-IN", {
          maximumFractionDigits: 0,
        })}`
      : "N/A";
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleString("default", { month: "short" }).toUpperCase(),
    };
  };
  const { day, month } = formatDate(item.next_due_date);
  const priorityColor =
    item.priority === 1
      ? theme.colors.error
      : item.priority === 3
      ? theme.colors.success
      : theme.colors.warning;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.simpleCard,
        {
          backgroundColor: theme.colors.surface,
          shadowColor: theme.colors.shadow,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={[styles.simpleCardDate, { borderLeftColor: priorityColor }]}>
        <Text style={[styles.simpleCardDay, { color: theme.colors.text }]}>
          {day}
        </Text>
        <Text
          style={[
            styles.simpleCardMonth,
            { color: theme.colors.textSecondary },
          ]}
        >
          {month}
        </Text>
      </View>
      <View style={styles.simpleCardDetails}>
        <Text
          style={[styles.simpleCardTitle, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text
          style={[styles.simpleCardAmount, { color: theme.colors.primary }]}
        >
          {formatAmount(item.amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const BudgetGridItem = ({ item, theme, onPress, style }) => {
  const budgetAmount = Number(item.amount);
  const spentAmount = Number(item.spent);
  const remaining = budgetAmount - spentAmount;
  const percent =
    budgetAmount > 0 ? Math.min((spentAmount / budgetAmount) * 100, 100) : 0;
  const statusColor =
    percent >= 100
      ? theme.colors.error
      : percent >= 75
      ? theme.colors.warning
      : theme.colors.success;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.budgetGridItem,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderLight,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.budgetItemCategory,
          { color: theme.colors.textSecondary },
        ]}
      >
        {item.category}
      </Text>
      <Text style={[styles.budgetItemRemaining, { color: theme.colors.text }]}>
        ₹{remaining.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
      </Text>
      <Text
        style={[styles.budgetItemLabel, { color: theme.colors.textSecondary }]}
      >
        {remaining >= 0 ? "left to spend" : "overspent"}
      </Text>
      <View
        style={[
          styles.budgetItemProgressBarTrack,
          { backgroundColor: theme.colors.borderLight },
        ]}
      >
        <View
          style={[
            styles.budgetItemProgressBarFill,
            { width: `${percent}%`, backgroundColor: statusColor },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
};

const DashboardOnboarding = ({
  isVisible,
  onComplete,
  targetRefs,
  scrollViewRef,
}) => {
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetLayout, setTargetLayout] = useState(null);

  const measureAndScrollToTarget = useCallback(() => {
    const step = ONBOARDING_STEPS[currentStep];
    if (!step.targetId) {
      setTargetLayout(null);
      return;
    }
    const targetRef = targetRefs?.[step.targetId];
    if (targetRef && typeof targetRef.measure === "function") {
      targetRef.measure((x, y, width, height, pageX, pageY) => {
        if (width > 0 || height > 0) {
          setTargetLayout({ x: pageX, y: pageY, width, height });
          if (scrollViewRef?.current?.scrollToOffset) {
            const yOffset =
              step.position === "top"
                ? pageY - screenHeight * 0.5
                : pageY - 150;
            scrollViewRef.current.scrollToOffset({
              offset: Math.max(0, yOffset),
              animated: true,
            });
          }
        }
      });
    }
  }, [currentStep, targetRefs, scrollViewRef]);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(measureAndScrollToTarget, 250);
      return () => clearTimeout(timer);
    }
  }, [isVisible, currentStep, measureAndScrollToTarget]);

  if (!isVisible) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const isCentered = step.position === "center" || !targetLayout;

  const handleNext = () =>
    currentStep < ONBOARDING_STEPS.length - 1
      ? setCurrentStep(currentStep + 1)
      : onComplete();
  const handlePrevious = () =>
    currentStep > 0 && setCurrentStep(currentStep - 1);

  const highlightPosition = targetLayout
    ? {
        left: targetLayout.x - 8,
        top: targetLayout.y - 8,
        width: targetLayout.width + 16,
        height: targetLayout.height + 16,
      }
    : null;

  const getTooltipPosition = () => {
    if (isCentered) return styles.onboardingTooltipCenter;
    const tooltipBaseStyle = {
      position: "absolute",
      left: 20,
      right: 20,
      marginHorizontal: "auto",
    };
    if (step.position === "bottom")
      return {
        ...tooltipBaseStyle,
        top: targetLayout.y + targetLayout.height + 12,
      };
    if (step.position === "top")
      return {
        ...tooltipBaseStyle,
        bottom: screenHeight - targetLayout.y + 12,
      };
    return styles.onboardingTooltipCenter;
  };

  const getArrowPosition = () => {
    if (isCentered) return null;
    const arrowBaseStyle = {
      position: "absolute",
      left: targetLayout.x + targetLayout.width / 2 - 10,
    };
    if (step.position === "bottom") return { ...arrowBaseStyle, top: -10 };
    if (step.position === "top") return { ...arrowBaseStyle, bottom: -10 };
    return null;
  };

  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <View style={styles.onboardingOverlay}>
        {highlightPosition && (
          <View
            style={[
              styles.onboardingHighlight,
              highlightPosition,
              { borderColor: theme.colors.primary },
            ]}
          />
        )}
        <View
          style={[
            styles.onboardingTooltip,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
            getTooltipPosition(),
          ]}
        >
          {!isCentered && (
            <View
              style={[
                styles.tooltipArrow,
                getArrowPosition(),
                step.position === "bottom"
                  ? {
                      borderBottomColor: theme.colors.surface,
                      ...styles.tooltipArrowUp,
                    }
                  : {
                      borderTopColor: theme.colors.surface,
                      ...styles.tooltipArrowDown,
                    },
              ]}
            />
          )}
          <TouchableOpacity style={styles.onboardingSkip} onPress={onComplete}>
            <X size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <Text
            style={[styles.onboardingTitle, { color: theme.colors.primary }]}
          >
            {step.title}
          </Text>
          <Text
            style={[
              styles.onboardingDesc,
              { color: theme.colors.textSecondary },
            ]}
          >
            {step.description}
          </Text>
          <View style={styles.onboardingNav}>
            {currentStep > 0 && (
              <TouchableOpacity
                style={[
                  styles.onboardingButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={handlePrevious}
              >
                <ArrowLeft size={16} color={theme.colors.primary} />
                <Text
                  style={[
                    styles.onboardingButtonText,
                    { color: theme.colors.primary },
                  ]}
                >
                  Back
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.onboardingButton,
                { backgroundColor: theme.colors.primary, flex: 1 },
              ]}
              onPress={handleNext}
            >
              <Text style={[styles.onboardingButtonText, { color: "#FFF" }]}>
                {currentStep === ONBOARDING_STEPS.length - 1
                  ? "Get Started"
                  : "Next"}
              </Text>
              {currentStep < ONBOARDING_STEPS.length - 1 && (
                <ArrowRight size={16} color={"#FFF"} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const Avatar = forwardRef(({ name, email, size = 50, style, onPress }, ref) => {
  const { theme } = useTheme();
  const initials = useMemo(
    () =>
      name && name.trim()
        ? name
            .trim()
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : email
        ? email.charAt(0).toUpperCase()
        : "U",
    [name, email]
  );
  const backgroundColor = useMemo(() => {
    const colors = [
      theme.colors.primary,
      theme.colors.success,
      theme.colors.warning,
      theme.colors.error,
      theme.colors.primaryDark,
    ];
    let hash = 0;
    for (let i = 0; i < (name || email || "").length; i++)
      hash = (name || email).charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }, [name, email, theme]);
  return (
    <TouchableOpacity
      ref={ref}
      onPress={onPress}
      style={[
        style,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: theme.colors.surface,
          elevation: 4,
        },
      ]}
    >
      <Text
        style={{
          color: theme.colors.surface,
          fontSize: size * 0.4,
          fontWeight: "bold",
        }}
      >
        {initials}
      </Text>
    </TouchableOpacity>
  );
});

const SectionHeader = ({ title, theme }) => (
  <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>
    {title}
  </Text>
);

export default function DashboardScreen({ navigation }) {
  const { session } = useAuth();
  const { theme } = useTheme();
  const route = useRoute();
  const targetRefs = useRef({});
  const flatListRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState("expenses");
  const [isEditMode, setIsEditMode] = useState(false);
  const [componentOrder, setComponentOrder] = useState(DEFAULT_ORDER);
  const [tagline, setTagline] = useState("");

  const TRANSACTION_THEME = useMemo(
    () => ({
      expenses: { color: theme.colors.error },
      income: { color: theme.colors.success },
      investments: { color: theme.colors.primary },
    }),
    [theme]
  );

  const setTargetRef = useCallback((id, ref) => {
    if (ref && id) targetRefs.current[id] = ref;
  }, []);

  const fetchData = useCallback(async () => {
    try {
      if (!session?.user?.id) return;
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      const { data: expensesData } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false });
      const { data: budgetsData } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", session.user.id);
      const { data: remindersData } = await supabase
        .from("payment_reminders")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .order("next_due_date", { ascending: true });
      const { data: incomesData } = await supabase
        .from("side_incomes")
        .select("*")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false });
      const { data: investmentsData } = await supabase
        .from("investments")
        .select("*")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false });
      setProfile(profileData || null);
      setExpenses(expensesData || []);
      setBudgets(budgetsData || []);
      setReminders(remindersData || []);
      setIncomes(incomesData || []);
      setInvestments(investmentsData || []);
    } catch (err) {
      console.error("Error fetching dashboard data:", err.message);
    }
  }, [session]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleDelete = useCallback(async () => {
    if (!expenseToDelete) return;
    try {
      setExpenses((prev) =>
        prev.filter((exp) => exp.id !== expenseToDelete.id)
      );
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseToDelete.id);
      if (error) throw error;
    } catch (err) {
      setExpenses((prev) => [...prev, expenseToDelete]);
    } finally {
      setExpenseToDelete(null);
    }
  }, [expenseToDelete]);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_FLAG_KEY, "true");
    setShowOnboarding(false);
  };

  useFocusEffect(
    useCallback(() => {
      const initialize = async () => {
        setLoading(true);
        try {
          const savedLayout = await AsyncStorage.getItem(LAYOUT_STORAGE_KEY);
          if (savedLayout) setComponentOrder(JSON.parse(savedLayout));
        } catch (e) {}
        await fetchData();
        setLoading(false);
        const hasCompleted = await AsyncStorage.getItem(ONBOARDING_FLAG_KEY);
        if (route.params?.showOnboarding || hasCompleted !== "true") {
          setShowOnboarding(true);
          navigation.setParams({ showOnboarding: undefined });
        }
        // 🎯 generate tagline once when screen loads
        const randomTagline =
          TAGLINES[Math.floor(Math.random() * TAGLINES.length)];
        setTagline(randomTagline);
      };
      initialize();
    }, [fetchData, route.params?.showOnboarding, navigation])
  );

  const { monthlyTotal, todayTotal } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    let monthly = 0,
      today = 0;
    expenses.forEach((exp) => {
      const expDate = new Date(exp.date);
      if (
        expDate.getMonth() === now.getMonth() &&
        expDate.getFullYear() === now.getFullYear()
      )
        monthly += Number(exp.amount) || 0;
      if (exp.date === todayStr) today += Number(exp.amount) || 0;
    });
    return { monthlyTotal: monthly, todayTotal: today };
  }, [expenses]);

  const budgetProgress = useMemo(() => {
    const getSpent = (category) =>
      expenses
        .filter((exp) => exp.category === category)
        .reduce((sum, exp) => sum + Number(exp.amount), 0);
    return budgets.map((b) => ({ ...b, spent: getSpent(b.category) }));
  }, [budgets, expenses]);

  const budgetPairs = useMemo(() => {
    const pairs = [];
    for (let i = 0; i < budgetProgress.length; i += 2)
      pairs.push(budgetProgress.slice(i, i + 2));
    return pairs;
  }, [budgetProgress]);

  const resetLayout = async () => {
    setComponentOrder(DEFAULT_ORDER);
    await AsyncStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify(DEFAULT_ORDER)
    );
    setIsEditMode(false);
  };

  const renderTransactionList = () => {
    const dataMap = {
      expenses: expenses.slice(0, 5),
      income: incomes.slice(0, 5),
      investments: investments.slice(0, 5),
    };
    const data = dataMap[activeTab];
    if (data.length === 0)
      return (
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text
            style={[
              styles.emptyStateText,
              { color: theme.colors.textSecondary },
            ]}
          >
            No {activeTab} recorded yet.
          </Text>
        </View>
      );
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, padding: 0 },
        ]}
      >
        <FlatList
          data={data}
          renderItem={({ item }) => (
            <TransactionItem
              item={item}
              type={activeTab}
              theme={theme}
              onLongPress={() =>
                activeTab === "expenses" && setExpenseToDelete(item)
              }
            />
          )}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
        />
      </View>
    );
  };

  const componentsMap = useMemo(
    () => ({
      stats: (
        <View style={styles.statisticsContainer}>
          <View
            style={styles.statsContainer}
            ref={(ref) => setTargetRef("stats-container", ref)}
          >
            <View
              style={[
                styles.statCard,
                styles.statCardMargin,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                ₹{monthlyTotal.toFixed(2)}
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
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                ₹{todayTotal.toFixed(2)}
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
      ),
      reminders: reminders.length > 0 && (
        <View
          style={styles.section}
          ref={(ref) => setTargetRef("reminders-section", ref)}
        >
          <SectionHeader title="Upcoming Payments" theme={theme} />
          <Carousel
            width={screenWidth - 40}
            height={90}
            data={reminders}
            loop={false}
            renderItem={({ item }) => (
              <SimpleReminderCard
                item={item}
                theme={theme}
                onPress={() => navigation.navigate("PaymentReminder")}
              />
            )}
          />
        </View>
      ),
      budgets: (
        <View
          style={styles.section}
          ref={(ref) => setTargetRef("budget-section", ref)}
        >
          <SectionHeader title="Budget Hub" theme={theme} />
          {budgetPairs.length > 0 ? (
            <Carousel
              loop={false}
              width={screenWidth - 40}
              height={140}
              data={budgetPairs}
              renderItem={({ item: pair }) => (
                <View style={styles.budgetCarouselItemContainer}>
                  {pair[0] && (
                    <BudgetGridItem
                      item={pair[0]}
                      theme={theme}
                      onPress={() => navigation.navigate("BudgetScreen")}
                      style={{ width: (screenWidth - 40) / 2 - 8 }}
                    />
                  )}
                  {pair[1] && (
                    <BudgetGridItem
                      item={pair[1]}
                      theme={theme}
                      onPress={() => navigation.navigate("BudgetScreen")}
                      style={{ width: (screenWidth - 40) / 2 - 8 }}
                    />
                  )}
                </View>
              )}
            />
          ) : (
            <View
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
            >
              <Text
                style={[
                  styles.emptyStateText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                No budgets set yet.
              </Text>
            </View>
          )}
        </View>
      ),
      activity: (
        <View
          style={styles.section}
          ref={(ref) => setTargetRef("recent-activity-section", ref)}
        >
          <SectionHeader title="Recent Activity" theme={theme} />
          <View
            style={[
              styles.tabContainer,
              { backgroundColor: theme.colors.borderLight },
            ]}
          >
            {["expenses", "income", "investments"].map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tabButton,
                  activeTab === tab && {
                    backgroundColor: TRANSACTION_THEME[tab].color,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === tab ? "#FFF" : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {renderTransactionList()}
        </View>
      ),
    }),
    [
      theme,
      monthlyTotal,
      todayTotal,
      expenses,
      reminders,
      budgetPairs,
      activeTab,
      navigation,
      setTargetRef,
      renderTransactionList,
    ]
  );

  const toggleVisibility = async (key) => {
    const updated = componentOrder.map((c) =>
      c.key === key ? { ...c, isVisible: !c.isVisible } : c
    );
    setComponentOrder(updated);
    await AsyncStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(updated));
  };

  const renderDashboardItem = useCallback(
    ({ item, drag, isActive }) => {
      const componentToRender = componentsMap[item.key];
      if (!componentToRender) return null;
      return (
        <ScaleDecorator>
          <View
            style={[
              styles.draggableItemContainer,
              isActive && { backgroundColor: theme.colors.borderLight },
            ]}
          >
            {isEditMode && (
              <View style={styles.editControls}>
                <TouchableOpacity
                  onLongPress={drag}
                  disabled={isActive}
                  style={styles.dragHandle}
                >
                  <GripVertical size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => toggleVisibility(item.key)}
                  style={styles.visibilityToggle}
                >
                  {item.isVisible ? (
                    <EyeOff size={20} color={theme.colors.error} />
                  ) : (
                    <Eye size={20} color={theme.colors.success} />
                  )}
                </TouchableOpacity>
              </View>
            )}
            {item.isVisible && (
              <View style={{ flex: 1 }}>{componentToRender}</View>
            )}
          </View>
        </ScaleDecorator>
      );
    },
    [componentsMap, isEditMode, theme]
  );

  if (loading)
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <DraggableFlatList
          ref={flatListRef}
          data={componentOrder}
          renderItem={renderDashboardItem}
          keyExtractor={(item) => item.key}
          onDragEnd={async ({ data }) => {
            setComponentOrder(data);
            await AsyncStorage.setItem(
              LAYOUT_STORAGE_KEY,
              JSON.stringify(data)
            );
          }}
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text
                  style={[styles.welcomeText, { color: theme.colors.text }]}
                >
                  Hi, {profile?.full_name || "User"}!
                </Text>
                <Text
                  style={[
                    styles.subText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {tagline}
                </Text>
              </View>

              <View style={styles.headerRight}>
                {isEditMode && (
                  <TouchableOpacity
                    onPress={resetLayout}
                    style={styles.resetButton}
                  >
                    <Text style={styles.resetButtonText}>Reset</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setIsEditMode(!isEditMode)}
                  style={[
                    styles.headerIconContainer,
                    {
                      backgroundColor: isEditMode
                        ? theme.colors.primary
                        : theme.colors.borderLight,
                    },
                  ]}
                >
                  <LayoutGrid
                    color={isEditMode ? "#FFF" : theme.colors.primary}
                    size={22}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.navigate("SmartInsights")}
                  style={[
                    styles.headerIconContainer,
                    { backgroundColor: theme.colors.borderLight },
                  ]}
                >
                  <Sparkles color={theme.colors.primary} size={22} />
                </TouchableOpacity>

                <Avatar
                  name={profile?.full_name}
                  email={profile?.email || session?.user?.email}
                  size={44}
                  onPress={() => navigation.navigate("Profile", { profile })}
                />
              </View>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        />
        <FloatingTaskbar
          theme={theme}
          navigation={navigation}
          setTargetRef={setTargetRef}
        />
        <DashboardOnboarding
          isVisible={showOnboarding}
          onComplete={completeOnboarding}
          targetRefs={targetRefs.current}
          scrollViewRef={flatListRef}
        />
        <Alert
          open={!!expenseToDelete}
          onConfirm={handleDelete}
          onCancel={() => setExpenseToDelete(null)}
          title="Delete Expense"
          message={`Delete "${expenseToDelete?.title}"? This is permanent.`}
          confirmText="Delete"
          icon={<Trash2 color="#fff" size={32} />}
          iconBg={theme.colors.error}
          confirmColor={theme.colors.error}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FBFC" },
  scrollContent: { paddingBottom: 100, paddingTop: 20 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Math.max(screenWidth * 0.05, 16),
    paddingTop: Math.max(screenHeight * 0.0, 45),
    paddingBottom: Math.max(screenHeight * 0.03, 18),
  },
  headerContent: { flex: 1 },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  welcomeText: {
    fontSize: Math.max(Math.min(screenWidth * 0.06, 26), 18),
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subText: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  resetButton: {
    backgroundColor: "red",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  resetButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 12,
  },
  statisticsContainer: {
    flexDirection: "column",
    gap: 1,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: "row",
    paddingTop: 10,
    gap: Math.max(screenWidth * 0.02, 8),
  },
  statCard: {
    flex: 1,
    padding: Math.max(screenWidth * 0.03, 10),
    borderRadius: Math.max(screenWidth * 0.04, 14),
    alignItems: "center",
    minHeight: Math.max(screenWidth * 0.22, 90),
    borderWidth: 2,
    justifyContent: "center",
    elevation: 2,
  },
  statCardMargin: { marginRight: 0 },
  statValue: {
    fontSize: Math.max(Math.min(screenWidth * 0.04, 18), 13),
    fontWeight: "900",
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
  chartsContainer: { marginVertical: Math.max(screenWidth * 0.02, 8) },
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionHeader: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  card: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#EEE",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 24,
    fontStyle: "italic",
  },
  budgetCarouselItemContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  budgetGridItem: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  budgetItemCategory: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  budgetItemRemaining: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  budgetItemLabel: { fontSize: 12, marginBottom: 12 },
  budgetItemProgressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  budgetItemProgressBarFill: { height: "100%" },
  tabContainer: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  tabText: { fontSize: 14, fontWeight: "600" },
  onboardingOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.85)" },
  onboardingHighlight: {
    position: "absolute",
    borderRadius: 16,
    borderWidth: 3,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    zIndex: 1,
  },
  onboardingTooltip: {
    borderRadius: 16,
    padding: 24,
    elevation: 10,
    borderWidth: 1,
    zIndex: 2,
    maxWidth: 400,
  },
  onboardingTooltipCenter: {
    position: "absolute",
    top: "50%",
    left: 20,
    right: 20,
    transform: [{ translateY: -100 }],
  },
  onboardingSkip: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3,
  },
  onboardingTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "left",
    marginBottom: 8,
  },
  onboardingDesc: {
    fontSize: 15,
    textAlign: "left",
    lineHeight: 22,
    marginBottom: 24,
  },
  onboardingNav: { flexDirection: "row", width: "100%", gap: 12 },
  onboardingButton: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  onboardingButtonText: { fontSize: 16, fontWeight: "bold" },
  tooltipArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderStyle: "solid",
    backgroundColor: "transparent",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  tooltipArrowUp: { borderBottomWidth: 10 },
  tooltipArrowDown: { borderTopWidth: 10 },
  simpleCard: {
    borderRadius: 16,
    elevation: 2,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    height: 80,
  },
  simpleCardDate: {
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    borderLeftWidth: 5,
  },
  simpleCardDay: { fontSize: 24, fontWeight: "800" },
  simpleCardMonth: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  simpleCardDetails: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  simpleCardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  simpleCardAmount: { fontSize: 16, fontWeight: "800" },
  draggableItemContainer: { flexDirection: "row", alignItems: "center" },
  editControls: { flexDirection: "row", alignItems: "center", marginRight: 8 },
  dragHandle: {
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  visibilityToggle: {
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },
});
