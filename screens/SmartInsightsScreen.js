import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import Slider from '@react-native-community/slider';

import {
  Brain,
  ArrowLeft,
  CreditCard,
  Scissors,
  TrendingUp as TrendingUpIcon
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export default function SmartInsightsScreen({ navigation }) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [animatedValue] = useState(new Animated.Value(0));
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [showSimulation, setShowSimulation] = useState(false);
  const [simSpend, setSimSpend] = useState(1);

  const [insights, setInsights] = useState({
    spendingTrend: [],
    categoryBreakdown: [],
    predictions: { nextMonth: 0, budgetOverrun: 0 },
    recommendations: [],
    achievements: [],
    alerts: [],
    financialScore: 0,
    savingsOpportunities: [],
    subscriptionAnalysis: {
      activeSubscriptions: [],
      potentialCancellations: [],
      totalMonthlyCost: 0,
      potentialSavings: 0,
    },
    costCuttingAI: {
      categories: [],
      suggestions: [],
      totalPotentialSavings: 0,
    },
    investmentOpportunities: {
      suggestions: [],
      availableAmount: 0,
      riskProfile: 'moderate',
    },
  });

  useEffect(() => {
    fetchProfileData();
    fetchInsightsData();
    startAnimation();
  }, [selectedPeriod]);

  const fetchProfileData = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    setProfile(data);
  };

  const startAnimation = () => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  const fetchInsightsData = async () => {
    setLoading(true);
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false });
    const processedInsights = await generateInsights(expenses || []);
    setInsights(processedInsights);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInsightsData();
    setRefreshing(false);
  };

  const analyzeSubscriptions = async (expenses) => {
    const subscriptionKeywords = [
      'netflix', 'spotify', 'amazon prime', 'youtube premium', 'disney+',
      'adobe', 'microsoft', 'google', 'dropbox', 'icloud', 'subscription',
      'monthly', 'annual', 'premium', 'pro', 'plus', 'membership'
    ];
    const potentialSubscriptions = expenses.filter(expense => {
      const title = expense.title?.toLowerCase() || '';
      const merchant = expense.merchant?.toLowerCase() || '';
      return subscriptionKeywords.some(keyword =>
        title.includes(keyword) || merchant.includes(keyword)
      );
    });
    const subscriptionGroups = {};
    potentialSubscriptions.forEach(expense => {
      const key = expense.merchant || expense.title;
      if (!subscriptionGroups[key]) {
        subscriptionGroups[key] = [];
      }
      subscriptionGroups[key].push(expense);
    });
    const activeSubscriptions = [];
    const potentialCancellations = [];
    let totalMonthlyCost = 0;
    let potentialSavings = 0;
    for (const [key, group] of Object.entries(subscriptionGroups)) {
      if (group.length >= 2) {
        const avgAmount = group.reduce((sum, exp) => sum + parseFloat(exp.amount), 0) / group.length;
        const lastUsed = new Date(group[0].date);
        const daysSinceLastUsed = Math.floor((new Date() - lastUsed) / (1000 * 60 * 60 * 24));
        const subscriptionData = {
          name: key,
          amount: avgAmount,
          frequency: 'Monthly',
          lastUsed: lastUsed,
          daysSinceLastUsed,
          category: group[0].category || 'Entertainment',
          usagePattern: group.length > 6 ? 'Regular' : 'Occasional',
        };
        activeSubscriptions.push(subscriptionData);
        totalMonthlyCost += avgAmount;
        if (daysSinceLastUsed > 60 || subscriptionData.usagePattern === 'Occasional') {
          potentialCancellations.push({
            ...subscriptionData,
            reason: daysSinceLastUsed > 60 ? 'Not used recently' : 'Low usage pattern',
            potentialSaving: avgAmount,
          });
          potentialSavings += avgAmount;
        }
      }
    }
    return {
      activeSubscriptions,
      potentialCancellations,
      totalMonthlyCost,
      potentialSavings,
    };
  };

  const analyzeCostCutting = async (expenses) => {
    const categorySpending = {};
    const spendingPatterns = {};
    expenses.forEach(expense => {
      const category = expense.category || 'Other';
      const date = new Date(expense.date);
      const month = date.toISOString().slice(0, 7);
      if (!categorySpending[category]) {
        categorySpending[category] = { total: 0, count: 0, items: [] };
      }
      categorySpending[category].total += parseFloat(expense.amount);
      categorySpending[category].count += 1;
      categorySpending[category].items.push(expense);
      if (!spendingPatterns[month]) {
        spendingPatterns[month] = {};
      }
      if (!spendingPatterns[month][category]) {
        spendingPatterns[month][category] = 0;
      }
      spendingPatterns[month][category] += parseFloat(expense.amount);
    });
    const suggestions = [];
    let totalPotentialSavings = 0;
    for (const [category, data] of Object.entries(categorySpending)) {
      if (data.total > 1000) {
        const avgMonthlySpending = data.total / 3;
        const suggestion = await generateCostCuttingSuggestion(category, data, avgMonthlySpending);
        if (suggestion) {
          suggestions.push(suggestion);
          totalPotentialSavings += suggestion.potentialSaving;
        }
      }
    }
    return {
      categories: Object.entries(categorySpending).map(([category, data]) => ({
        category,
        ...data,
        avgPerTransaction: data.total / data.count,
      })),
      suggestions,
      totalPotentialSavings,
    };
  };

  const generateCostCuttingSuggestion = async (category, data, avgMonthlySpending) => {
    const suggestions = {
      'Food': {
        title: 'Optimize Food Spending',
        description: 'Consider meal planning, bulk buying, or cooking at home more often',
        potentialSaving: avgMonthlySpending * 0.25,
        actionItems: [
          'Plan weekly meals',
          'Buy groceries in bulk',
          'Cook at home 2-3 more times per week',
          'Use food delivery apps less frequently'
        ],
        impact: 'High'
      },
      'Transportation': {
        title: 'Reduce Transportation Costs',
        description: 'Explore carpooling, public transport, or ride-sharing alternatives',
        potentialSaving: avgMonthlySpending * 0.20,
        actionItems: [
          'Use public transport when possible',
          'Carpool with colleagues',
          'Consider bike or walk for short distances',
          'Optimize ride-sharing usage'
        ],
        impact: 'Medium'
      },
      'Entertainment': {
        title: 'Smart Entertainment Spending',
        description: 'Review subscriptions and find free or cheaper alternatives',
        potentialSaving: avgMonthlySpending * 0.30,
        actionItems: [
          'Cancel unused subscriptions',
          'Share family plans with relatives',
          'Explore free entertainment options',
          'Look for promotional offers'
        ],
        impact: 'Medium'
      },
      'Shopping': {
        title: 'Strategic Shopping Approach',
        description: 'Implement the 24-hour rule and focus on needs vs wants',
        potentialSaving: avgMonthlySpending * 0.35,
        actionItems: [
          'Wait 24 hours before non-essential purchases',
          'Create shopping lists and stick to them',
          'Compare prices across platforms',
          'Buy during sales and discounts'
        ],
        impact: 'High'
      },
    };
    return suggestions[category] || null;
  };

  const analyzeInvestmentOpportunities = async (expenses) => {
    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const monthlyExpenses = totalExpenses / 3;
    const potentialMonthlySavings = insights.costCuttingAI.totalPotentialSavings +
      insights.subscriptionAnalysis.potentialSavings;
    const estimatedDisposableIncome = monthlyExpenses * 0.15;
    const availableAmount = potentialMonthlySavings + estimatedDisposableIncome;
    const suggestions = [];
    if (availableAmount > 500) {
      suggestions.push({
        type: 'SIP',
        title: 'Start Mutual Fund SIP',
        description: `Begin with ₹${Math.floor(availableAmount * 0.6)} monthly SIP in diversified equity funds`,
        expectedReturn: '12-15% annually',
        risk: 'Moderate',
        amount: Math.floor(availableAmount * 0.6),
        timeHorizon: '3-5 years',
      });
    }
    if (availableAmount > 1000) {
      suggestions.push({
        type: 'PPF',
        title: 'Public Provident Fund',
        description: `Allocate ₹${Math.floor(availableAmount * 0.3)} monthly for tax-saving investment`,
        expectedReturn: '7-8% annually',
        risk: 'Low',
        amount: Math.floor(availableAmount * 0.3),
        timeHorizon: '15 years',
      });
    }
    if (availableAmount > 2000) {
      suggestions.push({
        type: 'Emergency Fund',
        title: 'Build Emergency Fund',
        description: `Save ₹${Math.floor(availableAmount * 0.4)} monthly for 6-month expense coverage`,
        expectedReturn: '4-6% annually',
        risk: 'Very Low',
        amount: Math.floor(availableAmount * 0.4),
        timeHorizon: '1-2 years',
      });
    }
    return {
      suggestions,
      availableAmount,
      riskProfile: availableAmount > 2000 ? 'aggressive' :
        availableAmount > 1000 ? 'moderate' : 'conservative',
    };
  };

  const generateInsights = async (expenses) => {
    const baseInsights = await generateBaseInsights(expenses);
    const subscriptionAnalysis = await analyzeSubscriptions(expenses);
    const costCuttingAI = await analyzeCostCutting(expenses);
    const investmentOpportunities = await analyzeInvestmentOpportunities(expenses);
    return {
      ...baseInsights,
      subscriptionAnalysis,
      costCuttingAI,
      investmentOpportunities,
    };
  };

  const generateBaseInsights = async (expenses) => {
    const periodData = filterExpensesByPeriod(expenses, selectedPeriod);
    return {
      spendingTrend: generateSpendingTrend(periodData),
      categoryBreakdown: generateCategoryBreakdown(periodData),
      predictions: generatePredictions(expenses),
      recommendations: [],
      achievements: [],
      alerts: [],
      financialScore: 75,
      savingsOpportunities: [],
    };
  };

  const filterExpensesByPeriod = (expenses, period) => {
    const now = new Date();
    return expenses.filter(exp => {
      const expenseDate = new Date(exp.date);
      const diffDays = Math.floor((now - expenseDate) / (1000 * 60 * 60 * 24));
      switch (period) {
        case 'week': return diffDays <= 7;
        case 'month': return diffDays <= 30;
        case 'quarter': return diffDays <= 90;
        case 'year': return diffDays <= 365;
        default: return true;
      }
    });
  };

  const generateSpendingTrend = (expenses) => {
    const trendData = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayExpenses = expenses.filter(exp =>
        new Date(exp.date).toDateString() === date.toDateString()
      );
      const total = dayExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
      trendData.push({
        date: date.toLocaleDateString('en', { weekday: 'short' }),
        amount: total,
      });
    }
    return trendData;
  };

  const generateCategoryBreakdown = (expenses) => {
    const categoryTotals = {};
    expenses.forEach(exp => {
      const category = exp.category || 'Other';
      categoryTotals[category] = (categoryTotals[category] || 0) + parseFloat(exp.amount || 0);
    });
    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  };

  const generatePredictions = (expenses) => {
    if (expenses.length === 0) {
      return { nextMonth: 0, budgetOverrun: 0 };
    }
    const last30Days = expenses.filter(exp => {
      const expenseDate = new Date(exp.date);
      const now = new Date();
      const diffDays = Math.floor((now - expenseDate) / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    });
    const totalLast30Days = last30Days.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
    const dailyAverage = totalLast30Days / 30;
    const nextMonthPrediction = dailyAverage * 30;
    return {
      nextMonth: Math.round(nextMonthPrediction),
      budgetOverrun: 0,
    };
  };

  const FinancialHealthCard = ({ income, expenses, investments }) => {
    const ratio = income ? (expenses / income) : 0;
    let advice = '';
    if (!income) advice = "Add your income for better insights!";
    else if (ratio > 0.7) advice = "High spend: try to keep under 60%!";
    else if (ratio < 0.4) advice = "Great savings! Consider investing more.";
    return (
      <View style={styles.finHealthCard}>
        <Text style={styles.finHealthTitle}>Financial Health</Text>
        <Text>Income: ₹{income || '--'} | Expenses: ₹{expenses.toFixed(0)}</Text>
        <Text>Investments: ₹{investments || '--'}</Text>
        <Text>Expense/Income: {(ratio * 100).toFixed(0)}%</Text>
        <Text style={{ color: ratio > 0.7 ? 'red' : 'green' }}>{advice}</Text>
        <Text style={styles.aiBadge}>Premium AI</Text>
      </View>
    );
  };

  const SubscriptionAnalysisCard = () => (
    <Animated.View style={[styles.aiCard, { opacity: animatedValue }]}>
      <View style={styles.aiCardHeader}>
        <CreditCard color="#E74C3C" size={24} />
        <Text style={styles.aiCardTitle}>Subscription Analysis</Text>
      </View>
      <View style={styles.aiMetrics}>
        <View style={styles.aiMetric}>
          <Text style={styles.aiMetricValue}>
            ₹{insights.subscriptionAnalysis.totalMonthlyCost.toFixed(0)}
          </Text>
          <Text style={styles.aiMetricLabel}>Monthly Cost</Text>
        </View>
        <View style={styles.aiMetric}>
          <Text style={[styles.aiMetricValue, { color: '#27AE60' }]}>
            ₹{insights.subscriptionAnalysis.potentialSavings.toFixed(0)}
          </Text>
          <Text style={styles.aiMetricLabel}>Potential Savings</Text>
        </View>
      </View>
      {insights.subscriptionAnalysis.potentialCancellations.length > 0 && (
        <View style={styles.aiSuggestions}>
          <Text style={styles.aiSuggestionsTitle}>Suggested Cancellations:</Text>
          {insights.subscriptionAnalysis.potentialCancellations.slice(0, 3).map((sub, index) => (
            <TouchableOpacity key={index} style={styles.aiSuggestionItem}
              onPress={() => {
                Alert.alert(
                  "Cancel Subscription",
                  `Copy message to cancel ${sub.name}?`,
                  [
                    { text: "Cancel" },
                    {
                      text: "Copy Message",
                      onPress: () => {
                        const msg = `I want to cancel my ${sub.name} subscription as it's not in use.`;
                        if (navigator.clipboard) navigator.clipboard.writeText(msg);
                      }
                    }
                  ]
                );
              }}>
              <Text style={styles.aiSuggestionText}>
                {sub.name} - ₹{sub.amount.toFixed(0)}/month
              </Text>
              <Text style={styles.aiSuggestionReason}>{sub.reason}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Animated.View>
  );

  const CostCuttingCard = () => (
    <Animated.View style={[styles.aiCard, { opacity: animatedValue }]}>
      <View style={styles.aiCardHeader}>
        <Scissors color="#F39C12" size={24} />
        <Text style={styles.aiCardTitle}>AI Cost Cutting</Text>
      </View>
      <View style={styles.aiMetrics}>
        <View style={styles.aiMetric}>
          <Text style={[styles.aiMetricValue, { color: '#27AE60' }]}>
            ₹{insights.costCuttingAI.totalPotentialSavings.toFixed(0)}
          </Text>
          <Text style={styles.aiMetricLabel}>Potential Monthly Savings</Text>
        </View>
      </View>
      {insights.costCuttingAI.suggestions.length > 0 && (
        <View style={styles.aiSuggestions}>
          {insights.costCuttingAI.suggestions.slice(0, 2).map((suggestion, index) => (
            <TouchableOpacity key={index} style={styles.costCuttingSuggestion}
              onPress={() => setShowSimulation(true)}>
              <Text style={styles.costCuttingTitle}>{suggestion.title}</Text>
              <Text style={styles.costCuttingDescription}>{suggestion.description}</Text>
              <Text style={styles.costCuttingSaving}>
                Save up to ₹{suggestion.potentialSaving.toFixed(0)}/month
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Animated.View>
  );

  const InvestmentOpportunityCard = () => (
    <Animated.View style={[styles.aiCard, { opacity: animatedValue }]}>
      <View style={styles.aiCardHeader}>
        <TrendingUpIcon color="#27AE60" size={24} />
        <Text style={styles.aiCardTitle}>Investment Opportunities</Text>
      </View>
      <View style={styles.aiMetrics}>
        <View style={styles.aiMetric}>
          <Text style={styles.aiMetricValue}>
            ₹{insights.investmentOpportunities.availableAmount.toFixed(0)}
          </Text>
          <Text style={styles.aiMetricLabel}>Available to Invest</Text>
        </View>
      </View>
      {insights.investmentOpportunities.suggestions.length > 0 && (
        <View style={styles.aiSuggestions}>
          {insights.investmentOpportunities.suggestions.slice(0, 2).map((investment, index) => (
            <TouchableOpacity key={index} style={styles.investmentSuggestion}
              onPress={() => {
                Alert.alert(
                  "Invest Now",
                  `Add ₹${investment.amount} to "${investment.title}"?`,
                  [
                    { text: "Cancel" },
                    {
                      text: "Add Investment",
                      onPress: () => {
                        Alert.alert("Added!", "Your investment has been added to the tracker.");
                      }
                    }
                  ]
                );
              }}>
              <Text style={styles.investmentTitle}>{investment.title}</Text>
              <Text style={styles.investmentDescription}>{investment.description}</Text>
              <View style={styles.investmentMeta}>
                <Text style={styles.investmentReturn}>{investment.expectedReturn}</Text>
                <Text style={styles.investmentRisk}>{investment.risk} Risk</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Animated.View>
  );

  const runAIAnalysis = async () => {
    setAiAnalysisLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await fetchInsightsData();
    Alert.alert('Analysis Complete', 'AI has updated your insights with new recommendations!');
    setAiAnalysisLoading(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Analyzing your expenses with AI...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color="#1e293b" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Smart Insights</Text>
        <TouchableOpacity
          style={styles.aiButton}
          onPress={runAIAnalysis}
          disabled={aiAnalysisLoading}
        >
          {aiAnalysisLoading ? (
            <ActivityIndicator color="#4A90E2" size={20} />
          ) : (
            <Brain color="#4A90E2" size={24} />
          )}
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {profile && (
          <FinancialHealthCard
            income={profile.monthly_income}
            investments={profile.total_investments}
            expenses={insights.categoryBreakdown.reduce((sum, c) => sum + c.amount, 0)}
          />
        )}
        <SubscriptionAnalysisCard />
        <CostCuttingCard />
        <InvestmentOpportunityCard />
        <TouchableOpacity
          style={styles.deepAnalysisButton}
          onPress={runAIAnalysis}
          disabled={aiAnalysisLoading}
        >
          <Brain color="#fff" size={20} />
          <Text style={styles.deepAnalysisText}>
            {aiAnalysisLoading ? 'Analyzing...' : 'Run Deep AI Analysis'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <Modal
        visible={showSimulation}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSimulation(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(30,41,59,0.8)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 20,
            padding: 28,
            width: '85%'
          }}>
            <Text style={{ fontWeight: '700', fontSize: 18, marginBottom: 20 }}>Simulate Cost Cutting</Text>
            <Text>Adjust Food Spending:</Text>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={0.6}
              maximumValue={1}
              value={simSpend}
              minimumTrackTintColor="#27AE60"
              maximumTrackTintColor="#ccc"
              step={0.05}
              onValueChange={setSimSpend}
            />
            <Text style={{ marginVertical: 10 }}>
              {`Spending: ${(simSpend * 100).toFixed(0)}% of current`}
            </Text>
            <Text style={{ marginVertical: 10 }}>
              {`Estimated Savings: ₹${(insights.costCuttingAI.suggestions.length > 0
                ? insights.costCuttingAI.suggestions[0].potentialSaving * (1 - simSpend)
                : 0).toFixed(0)}/month`}
            </Text>
            <TouchableOpacity
              style={{
                marginTop: 18,
                backgroundColor: '#27AE60',
                borderRadius: 12,
                padding: 14,
                alignItems: 'center'
              }}
              onPress={() => setShowSimulation(false)}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  backButton: {
    padding: 8,
  },
  aiButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  aiCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 8,
  },
  aiMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  aiMetric: {
    alignItems: 'center',
  },
  aiMetricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#4A90E2',
  },
  aiMetricLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  aiSuggestions: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
  },
  aiSuggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  aiSuggestionItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  aiSuggestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  aiSuggestionReason: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  costCuttingSuggestion: {
    backgroundColor: '#fff8dc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F39C12',
  },
  costCuttingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  costCuttingDescription: {
    fontSize: 12,
    color: '#64748b',
    marginVertical: 4,
  },
  costCuttingSaving: {
    fontSize: 12,
    fontWeight: '600',
    color: '#27AE60',
  },
  investmentSuggestion: {
    backgroundColor: '#f0fff4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#27AE60',
  },
  investmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  investmentDescription: {
    fontSize: 12,
    color: '#64748b',
    marginVertical: 4,
  },
  investmentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  investmentReturn: {
    fontSize: 12,
    fontWeight: '600',
    color: '#27AE60',
  },
  investmentRisk: {
    fontSize: 12,
    color: '#64748b',
  },
  deepAnalysisButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  deepAnalysisText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  finHealthCard: {
    backgroundColor: '#e0f2fe',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#4A90E2',
  },
  finHealthTitle: {
    fontWeight: '700',
    fontSize: 17,
    color: '#1e293b',
    marginBottom: 4,
  },
  aiBadge: {
    backgroundColor: '#4A90E2',
    color: '#fff',
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 9,
    marginTop: 7,
    fontSize: 12,
    fontWeight: '600',
  }
};
