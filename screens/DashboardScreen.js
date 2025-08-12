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
  ScrollView,
  RefreshControl,
  Dimensions,
  Modal,
} from "react-native";
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
} from "lucide-react-native";
import Carousel from "react-native-reanimated-carousel";
import ReminderCard from "../components/ReminderCard";
import {
  useFocusEffect,
  useRoute,
  useNavigation,
} from "@react-navigation/native";
import CalendarHeatmap from "../components/Heatmap";
import FloatingTaskbar from "../components/FloatingTaskbar";
import TransactionItem from "../components/TransactionItem";
import AsyncStorage from "@react-native-async-storage/async-storage";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

// --- Onboarding Configuration (Updated for New UI) ---
const ONBOARDING_STEPS = [
  {
    id: "welcome",
    title: "Welcome to Your Financial Hub! 🎉",
    description:
      "Let's take a quick tour to see how you can master your money.",
    targetId: null,
    position: "center",
    icon: "🚀",
  },
  {
    id: "profile",
    title: "Your Profile & Insights",
    description:
      "Tap the 'Insights' icon for smart analysis or your avatar for account details.",
    targetId: "header-actions",
    position: "bottom",
    icon: "👤",
  },
  {
    id: "quick-stats",
    title: "At-a-Glance Stats",
    description:
      "Instantly see your total spending for the current month and today.",
    targetId: "stats-container",
    position: "bottom",
    icon: "📊",
  },
  {
    id: "heatmap",
    title: "Spending Heatmap",
    description:
      "Visualize your daily spending habits. Darker squares mean more spending!",
    targetId: "chart-container",
    position: "bottom",
    icon: "🔥",
  },
  {
    id: "reminders",
    title: "Never Miss a Bill",
    description:
      "Your upcoming reminders appear here. Swipe through them to see them all.",
    targetId: "reminders-section",
    position: "top",
    icon: "🔔",
  },
  {
    id: "budget",
    title: "Stay on Budget",
    description:
      "Quickly monitor your spending against your category budgets right here.",
    targetId: "budget-section",
    position: "top",
    icon: "💰",
  },
  {
    id: "recent-activity",
    title: "Recent Activity",
    description:
      "All your latest transactions are organized here. Tap the tabs to switch between expenses, income, and investments.",
    targetId: "recent-activity-section",
    position: "top",
    icon: "📚",
  },
  {
    id: "taskbar",
    title: "Quick Actions",
    description:
      "This navigation bar gives you one-tap access to key features. Tap the '+' to add a new transaction.",
    targetId: "taskbar",
    position: "top",
    icon: "⚡️",
  },
  {
    id: "complete",
    title: "You're All Set! ✅",
    description:
      "You're ready to take charge of your finances. Start by adding your first transaction!",
    targetId: null,
    position: "center",
    icon: "🎯",
  },
];

const ONBOARDING_FLAG_KEY = "onboarding_completed";

const OnboardingOverlay = ({
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
          if (scrollViewRef?.current?.scrollTo) {
            scrollViewRef.current.scrollTo({
              y: Math.max(0, pageY - 200),
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
          ]}
        >
          <TouchableOpacity
            style={[
              styles.onboardingSkip,
              { backgroundColor: theme.colors.buttonSecondary },
            ]}
            onPress={onComplete}
          >
            <X size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.onboardingIcon}>{step.icon || "🎓"}</Text>
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
                  ? "Finish"
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
  const initials = useMemo(() => {
    if (name && name.trim())
      return name
        .trim()
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    if (email) return email.charAt(0).toUpperCase();
    return "U";
  }, [name, email]);

  const backgroundColor = useMemo(() => {
    const colors = [
      theme.colors.primary,
      theme.colors.success,
      theme.colors.warning,
      theme.colors.error,
      theme.colors.primaryDark,
    ];
    let hash = 0;
    for (let i = 0; i < (name || email || "").length; i++) {
      hash = (name || email).charCodeAt(i) + ((hash << 5) - hash);
    }
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

const BudgetBar = ({ label, spent, budget, color, theme }) => {
  const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  return (
    <View style={styles.budgetBarContainer}>
      <View style={styles.budgetBarHeader}>
        <Text style={[styles.budgetBarLabel, { color: theme.colors.text }]}>
          {label}
        </Text>
        <Text
          style={[
            styles.budgetBarAmount,
            { color: theme.colors.textSecondary },
          ]}
        >
          ₹{spent.toFixed(0)} /{" "}
          <Text style={{ color: theme.colors.textTertiary }}>
            ₹{budget.toFixed(0)}
          </Text>
        </Text>
      </View>
      <View
        style={[
          styles.budgetBarTrack,
          { backgroundColor: theme.colors.borderLight },
        ]}
      >
        <View
          style={[
            styles.budgetBarFill,
            {
              width: `${percent}%`,
              backgroundColor: spent > budget ? theme.colors.error : color,
            },
          ]}
        />
      </View>
    </View>
  );
};

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
  const scrollViewRef = useRef(null);

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
      const [
        profileRes,
        expensesRes,
        budgetsRes,
        remindersRes,
        incomesRes,
        investmentsRes,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single(),
        supabase
          .from("expenses")
          .select("*")
          .eq("user_id", session.user.id)
          .order("date", { ascending: false }),
        supabase.from("budgets").select("*").eq("user_id", session.user.id),
        supabase
          .from("payment_reminders")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("is_active", true)
          .order("next_due_date", { ascending: true }),
        supabase
          .from("side_incomes")
          .select("*")
          .eq("user_id", session.user.id)
          .order("date", { ascending: false }),
        supabase
          .from("investments")
          .select("*")
          .eq("user_id", session.user.id)
          .order("date", { ascending: false }),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (expensesRes.data) setExpenses(expensesRes.data);
      if (budgetsRes.data) setBudgets(budgetsRes.data);
      if (remindersRes.data) setReminders(remindersRes.data);
      if (incomesRes.data) setIncomes(incomesRes.data);
      if (investmentsRes.data) setInvestments(investmentsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error.message);
    }
  }, [session]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleDelete = useCallback(async () => {
    if (!expenseToDelete) return;
    setExpenses((prev) => prev.filter((exp) => exp.id !== expenseToDelete.id));
    await supabase.from("expenses").delete().eq("id", expenseToDelete.id);
    setExpenseToDelete(null);
  }, [expenseToDelete]);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_FLAG_KEY, "true");
    setShowOnboarding(false);
  };

  useFocusEffect(
    useCallback(() => {
      const initialize = async () => {
        setLoading(true);
        await fetchData();
        setLoading(false);
        const hasCompleted = await AsyncStorage.getItem(ONBOARDING_FLAG_KEY);
        if (route.params?.showOnboarding || hasCompleted !== "true") {
          setShowOnboarding(true);
          navigation.setParams({ showOnboarding: undefined });
        }
      };
      initialize();
    }, [fetchData, route.params?.showOnboarding, navigation])
  );

  const { monthlyTotal, todayTotal } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    let monthly = 0,
      today = 0;
    for (const exp of expenses) {
      const expDate = new Date(exp.date);
      if (
        expDate.getMonth() === now.getMonth() &&
        expDate.getFullYear() === now.getFullYear()
      )
        monthly += Number(exp.amount) || 0;
      if (exp.date === todayStr) today += Number(exp.amount) || 0;
    }
    return { monthlyTotal: monthly, todayTotal: today };
  }, [expenses]);

  const budgetProgress = useMemo(() => {
    const getSpent = (category) =>
      expenses
        .filter((exp) => exp.category === category)
        .reduce((sum, exp) => sum + Number(exp.amount), 0);
    return budgets.map((b) => ({ ...b, spent: getSpent(b.category) }));
  }, [budgets, expenses]);

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
    <>
      <ScrollView
        ref={scrollViewRef}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.unchangedHeader,
            { backgroundColor: theme.colors.surface },
          ]}
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
          <View
            style={styles.headerActions}
            ref={(ref) => setTargetRef("header-actions", ref)}
          >
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

        {reminders.length > 0 && (
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
                <ReminderCard
                  item={item}
                  onPress={() => navigation.navigate("PaymentReminder")}
                />
              )}
            />
          </View>
        )}

        <View
          style={styles.section}
          ref={(ref) => setTargetRef("budget-section", ref)}
        >
          <SectionHeader title="Budget Hub" theme={theme} />
          <View
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            {budgetProgress.length > 0 ? (
              budgetProgress
                .slice(0, 4)
                .map((b) => (
                  <BudgetBar
                    key={b.id}
                    label={b.category}
                    spent={b.spent}
                    budget={Number(b.amount)}
                    color={theme.colors.primary}
                    theme={theme}
                  />
                ))
            ) : (
              <Text
                style={[
                  styles.emptyStateText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                No budgets set yet.
              </Text>
            )}
          </View>
        </View>

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
      </ScrollView>

      <FloatingTaskbar
        theme={theme}
        navigation={navigation}
        setTargetRef={setTargetRef}
      />
      <OnboardingOverlay
        isVisible={showOnboarding}
        onComplete={completeOnboarding}
        targetRefs={targetRefs.current}
        scrollViewRef={scrollViewRef}
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
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FBFC" },
  scrollContent: { paddingBottom: 100, paddingTop: 20 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  unchangedHeader: {
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
    gap: 12,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
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
  budgetBarContainer: { paddingVertical: 8 },
  budgetBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  budgetBarLabel: { fontSize: 15, fontWeight: "600" },
  budgetBarAmount: { fontSize: 14, fontWeight: "500" },
  budgetBarTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  budgetBarFill: { height: "100%" },
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
  onboardingOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  onboardingHighlight: {
    position: "absolute",
    borderRadius: 16,
    borderWidth: 3,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  onboardingTooltip: {
    borderRadius: 16,
    padding: 24,
    margin: 24,
    maxWidth: screenWidth - 48,
    alignItems: "center",
    elevation: 10,
    borderWidth: 1,
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
  },
  onboardingIcon: { fontSize: 48, marginBottom: 12 },
  onboardingTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  onboardingDesc: {
    fontSize: 15,
    textAlign: "center",
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
});
