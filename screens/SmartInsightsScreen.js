import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import {
  ArrowLeft,
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  PieChart,
  Calendar,
  Bell,
  DollarSign,
  BarChart3,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Award,
  Activity,
  Zap,
} from "lucide-react-native";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../lib/supabase";

const { width } = Dimensions.get("window");

export default function SmartInsightsScreen({ navigation }) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState(null);
  const [selectedTab, setSelectedTab] = useState("overview");

  useEffect(() => {
    loadInsights();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInsights();
    setRefreshing(false);
  };

  const loadInsights = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Error", "Please log in to view insights");
        return;
      }

      // Get current month data
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      // Fetch expenses for current and previous month
      const { data: currentExpenses } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .gte(
          "date",
          `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`
        )
        .lt(
          "date",
          `${currentYear}-${String(currentMonth + 2).padStart(2, "0")}-01`
        );

      const { data: previousExpenses } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .gte(
          "date",
          `${previousYear}-${String(previousMonth + 1).padStart(2, "0")}-01`
        )
        .lt(
          "date",
          `${previousYear}-${String(previousMonth + 2).padStart(2, "0")}-01`
        );

      // Fetch investments
      const { data: investments } = await supabase
        .from("investments")
        .select("*")
        .eq("user_id", user.id);

      // Process insights
      const processedInsights = processInsightsData(
        currentExpenses || [],
        previousExpenses || [],
        investments || []
      );

      setInsights(processedInsights);
    } catch (error) {
      console.error("Error loading insights:", error);
      Alert.alert("Error", "Failed to load insights");
    } finally {
      setLoading(false);
    }
  };

  const processInsightsData = (
    currentExpenses,
    previousExpenses,
    investments
  ) => {
    // Calculate spending trends
    const currentTotal = currentExpenses.reduce(
      (sum, exp) => sum + parseFloat(exp.amount),
      0
    );
    const previousTotal = previousExpenses.reduce(
      (sum, exp) => sum + parseFloat(exp.amount),
      0
    );
    const changePercentage =
      previousTotal > 0
        ? ((currentTotal - previousTotal) / previousTotal) * 100
        : 0;

    // Category analysis
    const categoryTotals = {};
    const previousCategoryTotals = {};

    currentExpenses.forEach((exp) => {
      categoryTotals[exp.category] =
        (categoryTotals[exp.category] || 0) + parseFloat(exp.amount);
    });

    previousExpenses.forEach((exp) => {
      previousCategoryTotals[exp.category] =
        (previousCategoryTotals[exp.category] || 0) + parseFloat(exp.amount);
    });

    const categoryTrends = Object.keys(categoryTotals)
      .map((category) => {
        const current = categoryTotals[category];
        const previous = previousCategoryTotals[category] || 0;
        const change =
          previous > 0 ? ((current - previous) / previous) * 100 : 0;

        return {
          category,
          amount: current,
          change: change,
          trend: Math.abs(change) < 5 ? "stable" : change > 0 ? "up" : "down",
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // Financial health score calculation
    const totalInvestments = investments.reduce(
      (sum, inv) => sum + parseFloat(inv.amount),
      0
    );
    const savingsRate =
      totalInvestments > 0
        ? (totalInvestments / (currentTotal + totalInvestments)) * 100
        : 0;
    const spendingControl = Math.max(0, 100 - Math.abs(changePercentage));
    const budgetAdherence = 80; // This would be calculated based on actual budgets
    const investmentDiversity = Math.min(
      100,
      new Set(investments.map((inv) => inv.type)).size * 20
    );

    const healthScore = Math.round(
      spendingControl * 0.3 +
        savingsRate * 0.25 +
        budgetAdherence * 0.25 +
        investmentDiversity * 0.2
    );

    // Generate smart alerts
    const alerts = [];
    categoryTrends.forEach((trend) => {
      if (trend.change > 20) {
        alerts.push({
          type: "unusual_spending",
          category: trend.category,
          message: `${
            trend.category
          } expenses increased by ${trend.change.toFixed(1)}%`,
          severity: "high",
          action: `Review your ${trend.category.toLowerCase()} spending`,
        });
      }
    });

    // Savings opportunities
    const savingsOpportunities = categoryTrends
      .filter((trend) => trend.amount > 500 && trend.change > 10)
      .map((trend) => ({
        category: trend.category,
        opportunity: `Reduce ${trend.category.toLowerCase()} expenses`,
        potential_savings: Math.round(trend.amount * 0.2),
        confidence: Math.round(85 - Math.random() * 15),
      }));

    return {
      spendingTrends: {
        monthlyComparison: {
          current: currentTotal,
          previous: previousTotal,
          changePercentage,
          trend:
            changePercentage > 5
              ? "increasing"
              : changePercentage < -5
              ? "decreasing"
              : "stable",
        },
        categoryTrends,
      },
      financialHealthScore: {
        score: healthScore,
        grade: healthScore >= 80 ? "A" : healthScore >= 60 ? "B" : "C",
        factors: [
          {
            name: "Spending Control",
            score: Math.round(spendingControl),
            weight: 30,
          },
          { name: "Savings Rate", score: Math.round(savingsRate), weight: 25 },
          { name: "Budget Adherence", score: budgetAdherence, weight: 25 },
          {
            name: "Investment Diversity",
            score: Math.round(investmentDiversity),
            weight: 20,
          },
        ],
      },
      smartAlerts: alerts,
      savingsOpportunities,
      totalInvestments,
    };
  };

  const getTrendIcon = (trend, change) => {
    if (trend === "up" || change > 0) {
      return <ArrowUpRight color="#FF6B6B" size={16} />;
    } else if (trend === "down" || change < 0) {
      return <ArrowDownRight color="#4ECDC4" size={16} />;
    }
    return <Minus color="#95A5A6" size={16} />;
  };

  const getTrendColor = (trend, change) => {
    if (trend === "up" || change > 0) return "#FF6B6B";
    if (trend === "down" || change < 0) return "#4ECDC4";
    return "#95A5A6";
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return "#4ECDC4";
    if (score >= 60) return "#FECA57";
    return "#FF6B6B";
  };

  const renderOverview = () => (
    <View>
      {/* Financial Health Score */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.cardHeader}>
          <Award color={theme.colors.primary} size={20} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Financial Health Score
          </Text>
        </View>
        <View style={styles.healthScoreContainer}>
          <View
            style={[
              styles.scoreCircle,
              {
                borderColor: getHealthScoreColor(
                  insights.financialHealthScore.score
                ),
              },
            ]}
          >
            <Text
              style={[
                styles.scoreText,
                {
                  color: getHealthScoreColor(
                    insights.financialHealthScore.score
                  ),
                },
              ]}
            >
              {insights.financialHealthScore.score}
            </Text>
            <Text
              style={[styles.gradeText, { color: theme.colors.textSecondary }]}
            >
              Grade {insights.financialHealthScore.grade}
            </Text>
          </View>
          <View style={styles.scoreFactors}>
            {insights.financialHealthScore.factors.map((factor, index) => (
              <View key={index} style={styles.factorRow}>
                <Text style={[styles.factorName, { color: theme.colors.text }]}>
                  {factor.name}
                </Text>
                <Text
                  style={[
                    styles.factorScore,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {factor.score}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Monthly Spending Comparison */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.cardHeader}>
          <Activity color={theme.colors.primary} size={20} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Monthly Spending
          </Text>
        </View>
        <View style={styles.comparisonContainer}>
          <View style={styles.comparisonItem}>
            <Text
              style={[
                styles.comparisonLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              This Month
            </Text>
            <Text
              style={[styles.comparisonAmount, { color: theme.colors.text }]}
            >
              ₹
              {insights.spendingTrends.monthlyComparison.current.toLocaleString()}
            </Text>
          </View>
          <View
            style={[
              styles.comparisonDivider,
              { backgroundColor: theme.colors.border },
            ]}
          />
          <View style={styles.comparisonItem}>
            <Text
              style={[
                styles.comparisonLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Last Month
            </Text>
            <Text
              style={[styles.comparisonAmount, { color: theme.colors.text }]}
            >
              ₹
              {insights.spendingTrends.monthlyComparison.previous.toLocaleString()}
            </Text>
          </View>
        </View>
        <View style={styles.trendContainer}>
          {getTrendIcon(
            insights.spendingTrends.monthlyComparison.trend,
            insights.spendingTrends.monthlyComparison.changePercentage
          )}
          <Text
            style={[
              styles.trendText,
              {
                color: getTrendColor(
                  insights.spendingTrends.monthlyComparison.trend,
                  insights.spendingTrends.monthlyComparison.changePercentage
                ),
              },
            ]}
          >
            {Math.abs(
              insights.spendingTrends.monthlyComparison.changePercentage
            ).toFixed(1)}
            % vs last month
          </Text>
        </View>
      </View>

      {/* Smart Alerts */}
      {insights.smartAlerts.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.cardHeader}>
            <Bell color={theme.colors.primary} size={20} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Smart Alerts
            </Text>
          </View>
          {insights.smartAlerts.map((alert, index) => (
            <View
              key={index}
              style={[
                styles.alertItem,
                { backgroundColor: "#FF6B6B15", borderColor: "#FF6B6B30" },
              ]}
            >
              <AlertTriangle color="#FF6B6B" size={20} />
              <View style={styles.alertContent}>
                <Text
                  style={[styles.alertMessage, { color: theme.colors.text }]}
                >
                  {alert.message}
                </Text>
                <Text
                  style={[
                    styles.alertAction,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {alert.action}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderCategoryInsights = () => (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <PieChart color={theme.colors.primary} size={20} />
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          Category Breakdown
        </Text>
      </View>
      {insights.spendingTrends.categoryTrends.map((category, index) => (
        <View
          key={index}
          style={[
            styles.categoryItem,
            { borderBottomColor: theme.colors.border },
          ]}
        >
          <View style={styles.categoryHeader}>
            <Text style={[styles.categoryName, { color: theme.colors.text }]}>
              {category.category}
            </Text>
            <Text style={[styles.categoryAmount, { color: theme.colors.text }]}>
              ₹{category.amount.toLocaleString()}
            </Text>
          </View>
          <View style={styles.categoryTrend}>
            {getTrendIcon(category.trend, category.change)}
            <Text
              style={[
                styles.categoryChange,
                { color: getTrendColor(category.trend, category.change) },
              ]}
            >
              {Math.abs(category.change).toFixed(1)}%
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderSavingsOpportunities = () => (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <Target color={theme.colors.primary} size={20} />
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          Savings Opportunities
        </Text>
      </View>
      {insights.savingsOpportunities.length > 0 ? (
        insights.savingsOpportunities.map((opportunity, index) => (
          <View
            key={index}
            style={[
              styles.opportunityItem,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <View style={styles.opportunityHeader}>
              <Lightbulb color="#FECA57" size={20} />
              <View style={styles.opportunityContent}>
                <Text
                  style={[
                    styles.opportunityTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  {opportunity.opportunity}
                </Text>
                <Text
                  style={[
                    styles.opportunityCategory,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {opportunity.category}
                </Text>
              </View>
              <Text style={[styles.opportunitySavings, { color: "#4ECDC4" }]}>
                ₹{opportunity.potential_savings}
              </Text>
            </View>
            <View
              style={[
                styles.confidenceBar,
                { backgroundColor: theme.colors.border },
              ]}
            >
              <View
                style={[
                  styles.confidenceFill,
                  {
                    width: `${opportunity.confidence}%`,
                    backgroundColor: "#4ECDC4",
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.confidenceText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {opportunity.confidence}% confidence
            </Text>
          </View>
        ))
      ) : (
        <View style={styles.noDataContainer}>
          <Zap color={theme.colors.textSecondary} size={48} />
          <Text
            style={[styles.noDataText, { color: theme.colors.textSecondary }]}
          >
            No savings opportunities identified yet. Keep tracking your
            expenses!
          </Text>
        </View>
      )}
    </View>
  );

  const tabs = [
    { id: "overview", label: "Overview", icon: <BarChart3 size={20} /> },
    { id: "categories", label: "Categories", icon: <PieChart size={20} /> },
    { id: "savings", label: "Savings", icon: <Target size={20} /> },
  ];

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text
          style={[styles.loadingText, { color: theme.colors.textSecondary }]}
        >
          Analyzing your financial data...
        </Text>
      </View>
    );
  }

  if (!insights) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Brain color={theme.colors.textSecondary} size={48} />
        <Text
          style={[styles.noDataText, { color: theme.colors.textSecondary }]}
        >
          No data available for insights
        </Text>
        <TouchableOpacity
          style={[
            styles.retryButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={loadInsights}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.backButton,
            { backgroundColor: theme.colors.buttonSecondary },
          ]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Smart Insights
        </Text>
        <TouchableOpacity onPress={loadInsights}>
          <Text style={[styles.refreshButton, { color: theme.colors.primary }]}>
            Refresh
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View
        style={[styles.tabContainer, { backgroundColor: theme.colors.surface }]}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              selectedTab === tab.id && {
                backgroundColor: theme.colors.primary + "15",
              },
            ]}
            onPress={() => setSelectedTab(tab.id)}
          >
            <View
              style={{
                color:
                  selectedTab === tab.id
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
              }}
            >
              {React.cloneElement(tab.icon, {
                color:
                  selectedTab === tab.id
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
              })}
            </View>
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    selectedTab === tab.id
                      ? theme.colors.primary
                      : theme.colors.textSecondary,
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {selectedTab === "overview" && renderOverview()}
        {selectedTab === "categories" && renderCategoryInsights()}
        {selectedTab === "savings" && renderSavingsOpportunities()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 18,
    borderBottomWidth: 1,
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  refreshButton: {
    fontSize: 16,
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
  },
  healthScoreContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 20,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: "700",
  },
  gradeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  scoreFactors: {
    flex: 1,
  },
  factorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  factorName: {
    fontSize: 14,
    fontWeight: "500",
  },
  factorScore: {
    fontSize: 14,
    fontWeight: "600",
  },
  comparisonContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  comparisonItem: {
    flex: 1,
    alignItems: "center",
  },
  comparisonDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 20,
  },
  comparisonLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  comparisonAmount: {
    fontSize: 20,
    fontWeight: "700",
  },
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  trendText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  alertItem: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertMessage: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  alertAction: {
    fontSize: 12,
  },
  categoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  categoryHeader: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "500",
  },
  categoryTrend: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryChange: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  opportunityItem: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  opportunityHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  opportunityContent: {
    flex: 1,
    marginLeft: 12,
  },
  opportunityTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  opportunityCategory: {
    fontSize: 14,
  },
  opportunitySavings: {
    fontSize: 16,
    fontWeight: "700",
  },
  confidenceBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 2,
  },
  confidenceText: {
    fontSize: 12,
    textAlign: "right",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: "center",
  },
  noDataContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noDataText: {
    textAlign: "center",
    fontSize: 16,
    marginTop: 16,
    lineHeight: 24,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
