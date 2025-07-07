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
} from 'react-native';
import {
  LineChart,
  BarChart,
  PieChart,
  ProgressChart,
} from 'react-native-chart-kit';
import {
  TrendingUp,
  TrendingDown,
  Brain,
  Target,
  AlertTriangle,
  DollarSign,
  Calendar,
  ArrowLeft,
  Lightbulb,
  Star,
  Award,
  Zap,
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
  
  // Data states
  const [insights, setInsights] = useState({
    spendingTrend: [],
    categoryBreakdown: [],
    predictions: {
      nextMonth: 0,
      budgetOverrun: 0,
    },
    recommendations: [],
    achievements: [],
    alerts: [],
    financialScore: 0,
    savingsOpportunities: [],
  });

  useEffect(() => {
    fetchInsightsData();
    startAnimation();
  }, [selectedPeriod]);

  const startAnimation = () => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  const fetchInsightsData = async () => {
    try {
      setLoading(true);
      
      // Fetch expenses for analysis
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', session.user.id)
        .order('date', { ascending: false });

      if (error) throw error;

      // Process data for insights
      const processedInsights = await generateInsights(expenses || []);
      setInsights(processedInsights);
      
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInsightsData();
    setRefreshing(false);
  };

  // Helper function to filter expenses by period
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

  // Generate spending trend data
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

  // Generate category breakdown
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
        percentage: 0, // Will be calculated after sorting
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // Top 5 categories
  };

  // Generate predictions
  const generatePredictions = (expenses) => {
    if (expenses.length === 0) {
      return {
        nextMonth: 0,
        budgetOverrun: 0,
      };
    }

    // Simple prediction based on last 30 days average
    const last30Days = expenses.filter(exp => {
      const expenseDate = new Date(exp.date);
      const now = new Date();
      const diffDays = Math.floor((now - expenseDate) / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    });

    const totalLast30Days = last30Days.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
    const dailyAverage = totalLast30Days / 30;
    const nextMonthPrediction = dailyAverage * 30;

    // Predict budget overrun for food category (example)
    const foodExpenses = last30Days.filter(exp => 
      exp.category && exp.category.toLowerCase().includes('food')
    );
    const foodTotal = foodExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
    const assumedFoodBudget = 5000; // Example budget
    const budgetOverrun = Math.max(0, foodTotal - assumedFoodBudget);

    return {
      nextMonth: Math.round(nextMonthPrediction),
      budgetOverrun: Math.round(budgetOverrun),
    };
  };

  // Detect recurring expenses
  const detectRecurringExpenses = (expenses) => {
    const titleCounts = {};
    
    expenses.forEach(exp => {
      const title = exp.title?.toLowerCase() || '';
      if (title) {
        titleCounts[title] = (titleCounts[title] || []);
        titleCounts[title].push(exp);
      }
    });

    // Find titles that appear more than twice with similar amounts
    return Object.values(titleCounts)
      .filter(expenseGroup => expenseGroup.length > 2)
      .flat()
      .slice(0, 5); // Limit to 5 recurring expenses
  };

  // Calculate financial score
  const calculateFinancialScore = (expenses) => {
    if (expenses.length === 0) return 75; // Default score for new users

    let score = 100;
    
    // Deduct points for high spending variance
    const amounts = expenses.map(exp => parseFloat(exp.amount || 0));
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / amounts.length;
    
    if (variance > 10000) score -= 20;
    if (variance > 50000) score -= 30;
    
    // Deduct points for lack of categorization
    const uncategorized = expenses.filter(exp => 
      !exp.category || exp.category === 'Other' || exp.category === ''
    ).length;
    score -= Math.min(uncategorized * 2, 30);
    
    // Add points for regular tracking
    const uniqueDays = new Set(expenses.map(exp => 
      new Date(exp.date).toDateString()
    )).size;
    if (uniqueDays > 20) score += 10;
    if (uniqueDays > 50) score += 15;
    
    // Deduct points for very high spending days
    const highSpendingDays = expenses.filter(exp => parseFloat(exp.amount || 0) > mean * 3).length;
    score -= Math.min(highSpendingDays * 5, 25);
    
    return Math.max(30, Math.min(100, Math.round(score)));
  };

  // Generate recommendations
  const generateRecommendations = (expenses) => {
    const recommendations = [];
    
    if (expenses.length === 0) {
      recommendations.push({
        id: 1,
        type: 'start_tracking',
        title: 'Start Tracking Expenses',
        description: 'Begin your financial journey by logging your daily expenses.',
        impact: 'High',
        savings: 0,
        icon: 'target',
        color: '#4A90E2',
      });
      return recommendations;
    }
    
    // Analyze spending patterns
    const categoryTotals = {};
    expenses.forEach(exp => {
      const category = exp.category || 'Other';
      categoryTotals[category] = (categoryTotals[category] || 0) + parseFloat(exp.amount || 0);
    });
    
    // High spending category recommendation
    const sortedCategories = Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b - a);
    
    if (sortedCategories.length > 0 && sortedCategories[0][1] > 3000) {
      const [category, amount] = sortedCategories[0];
      recommendations.push({
        id: 1,
        type: 'reduce_spending',
        title: `Optimize ${category} Spending`,
        description: `You've spent ₹${amount.toFixed(0)} on ${category}. Consider setting a budget limit to track this category.`,
        impact: 'High',
        savings: Math.round(amount * 0.15),
        icon: 'target',
        color: '#FF6B6B',
      });
    }
    
    // Recurring subscription detection
    const recurringExpenses = detectRecurringExpenses(expenses);
    if (recurringExpenses.length > 0) {
      const totalRecurring = recurringExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
      recommendations.push({
        id: 2,
        type: 'subscription_audit',
        title: 'Review Recurring Expenses',
        description: `Found ${recurringExpenses.length} potentially recurring expenses totaling ₹${totalRecurring.toFixed(0)}. Review to identify unused subscriptions.`,
        impact: 'Medium',
        savings: Math.round(totalRecurring * 0.3),
        icon: 'refresh-cw',
        color: '#4ECDC4',
      });
    }
    
    // Budget suggestion
    if (Object.keys(categoryTotals).length > 2) {
      const totalSpending = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
      recommendations.push({
        id: 3,
        type: 'budget_creation',
        title: 'Create Smart Budgets',
        description: 'Based on your spending patterns, setting category-wise budgets could help you save money.',
        impact: 'High',
        savings: Math.round(totalSpending * 0.1),
        icon: 'pie-chart',
        color: '#45B7D1',
      });
    }

    // Categorization improvement
    const uncategorized = expenses.filter(exp => 
      !exp.category || exp.category === 'Other' || exp.category === ''
    ).length;
    
    if (uncategorized > expenses.length * 0.3) {
      recommendations.push({
        id: 4,
        type: 'categorize_expenses',
        title: 'Improve Expense Categorization',
        description: `${uncategorized} expenses are uncategorized. Better categorization helps track spending patterns.`,
        impact: 'Medium',
        savings: 0,
        icon: 'tag',
        color: '#9B59B6',
      });
    }
    
    return recommendations;
  };

  // Generate achievements
  const generateAchievements = (expenses) => {
    const achievements = [];
    
    if (expenses.length >= 10) {
      achievements.push({
        id: 1,
        title: 'Expense Tracker',
        description: 'Logged 10+ expenses',
        icon: 'star',
        unlocked: true,
      });
    }
    
    if (expenses.length >= 50) {
      achievements.push({
        id: 2,
        title: 'Dedicated Saver',
        description: 'Logged 50+ expenses',
        icon: 'award',
        unlocked: true,
      });
    }
    
    return achievements;
  };

  // Generate alerts
  const generateAlerts = (expenses) => {
    const alerts = [];
    
    // Check for high spending in last 7 days
    const last7Days = expenses.filter(exp => {
      const expenseDate = new Date(exp.date);
      const now = new Date();
      const diffDays = Math.floor((now - expenseDate) / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    });
    
    const weeklyTotal = last7Days.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
    
    if (weeklyTotal > 5000) {
      alerts.push({
        id: 1,
        type: 'high_spending',
        title: 'High Weekly Spending',
        message: `You've spent ₹${weeklyTotal.toFixed(0)} this week`,
        severity: 'warning',
      });
    }
    
    return alerts;
  };

  // Find savings opportunities
  const findSavingsOpportunities = (expenses) => {
    const opportunities = [];
    
    // Example: frequent small purchases that could be bulk bought
    const smallExpenses = expenses.filter(exp => parseFloat(exp.amount || 0) < 100);
    if (smallExpenses.length > 20) {
      opportunities.push({
        id: 1,
        title: 'Bulk Purchase Opportunity',
        description: 'Consider bulk buying for frequent small purchases',
        potential_savings: 500,
      });
    }
    
    return opportunities;
  };

  // Main insights generation function
  const generateInsights = async (expenses) => {
    const periodData = filterExpensesByPeriod(expenses, selectedPeriod);
    
    return {
      spendingTrend: generateSpendingTrend(periodData),
      categoryBreakdown: generateCategoryBreakdown(periodData),
      predictions: generatePredictions(expenses),
      recommendations: generateRecommendations(expenses),
      achievements: generateAchievements(expenses),
      alerts: generateAlerts(expenses),
      financialScore: calculateFinancialScore(expenses),
      savingsOpportunities: findSavingsOpportunities(expenses),
    };
  };

  const PeriodSelector = () => (
    <View style={styles.periodSelector}>
      {['week', 'month', 'quarter', 'year'].map(period => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.activePeriodButton
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === period && styles.activePeriodButtonText
          ]}>
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const FinancialScoreCard = () => (
    <Animated.View style={[
      styles.scoreCard,
      { opacity: animatedValue }
    ]}>
      <View style={styles.scoreHeader}>
        <Brain color="#4A90E2" size={24} />
        <Text style={styles.scoreTitle}>Financial Health Score</Text>
      </View>
      
      <View style={styles.scoreDisplay}>
        <Text style={styles.scoreNumber}>{insights.financialScore}</Text>
        <Text style={styles.scoreOutOf}>/100</Text>
      </View>
      
      <View style={styles.scoreBar}>
        <View 
          style={[
            styles.scoreProgress,
            { 
              width: `${insights.financialScore}%`,
              backgroundColor: insights.financialScore >= 80 ? '#27AE60' :
                             insights.financialScore >= 60 ? '#F39C12' : '#E74C3C'
            }
          ]} 
        />
      </View>
      
      <Text style={styles.scoreDescription}>
        {insights.financialScore >= 80 ? 'Excellent financial habits! 🎉' :
         insights.financialScore >= 60 ? 'Good progress, keep improving! 👍' :
         'Consider reviewing your spending patterns 💡'}
      </Text>
    </Animated.View>
  );

  const RecommendationCard = ({ recommendation, index }) => (
    <Animated.View 
      style={[
        styles.recommendationCard,
        {
          opacity: animatedValue,
          transform: [{
            translateY: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          }],
        }
      ]}
    >
      <View style={styles.recommendationHeader}>
        <View style={[styles.recommendationIcon, { backgroundColor: recommendation.color }]}>
          <Lightbulb color="#fff" size={16} />
        </View>
        <View style={styles.recommendationMeta}>
          <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
          <Text style={styles.recommendationImpact}>
            {recommendation.impact} Impact
            {recommendation.savings > 0 && ` • Potential saving: ₹${recommendation.savings}`}
          </Text>
        </View>
      </View>
      
      <Text style={styles.recommendationDescription}>
        {recommendation.description}
      </Text>
      
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => {
          // Handle different recommendation types
          switch (recommendation.type) {
            case 'budget_creation':
              navigation.navigate('BudgetScreen');
              break;
            case 'reduce_spending':
            case 'subscription_audit':
              navigation.navigate('AllExpenses');
              break;
            default:
              // Show more details or generic action
              break;
          }
        }}
      >
        <Text style={styles.actionButtonText}>Take Action</Text>
        <Zap color="#4A90E2" size={16} />
      </TouchableOpacity>
    </Animated.View>
  );

  const SpendingTrendChart = () => {
    if (!insights.spendingTrend.length) return null;

    const chartData = {
      labels: insights.spendingTrend.map(item => item.date),
      datasets: [{
        data: insights.spendingTrend.map(item => item.amount),
        color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
        strokeWidth: 3,
      }],
    };

    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Spending Trend ({selectedPeriod})</Text>
        <LineChart
          data={chartData}
          width={width - 40}
          height={200}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#4A90E2',
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>
    );
  };

  const PredictionsCard = () => (
    <View style={styles.predictionsCard}>
      <View style={styles.predictionHeader}>
        <Brain color="#9B59B6" size={20} />
        <Text style={styles.predictionTitle}>AI Predictions</Text>
      </View>
      
      <View style={styles.predictionItem}>
        <TrendingUp color="#27AE60" size={16} />
        <Text style={styles.predictionText}>
          Next month's predicted spending: ₹{insights.predictions.nextMonth?.toLocaleString() || 0}
        </Text>
      </View>
      
      {insights.predictions.budgetOverrun > 0 && (
        <View style={styles.predictionItem}>
          <AlertTriangle color="#E74C3C" size={16} />
          <Text style={styles.predictionText}>
            Potential budget overrun: ₹{insights.predictions.budgetOverrun?.toLocaleString() || 0}
          </Text>
        </View>
      )}
      
      <View style={styles.predictionItem}>
        <Calendar color="#3498DB" size={16} />
        <Text style={styles.predictionText}>
          Track daily to improve predictions accuracy
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Analyzing your expenses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color="#1e293b" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Smart Insights</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchInsightsData}>
          <Brain color="#4A90E2" size={24} />
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
        <PeriodSelector />
        
        <FinancialScoreCard />
        
        <SpendingTrendChart />
        
        <PredictionsCard />
        
        {/* Recommendations Section */}
        <View style={styles.recommendationsSection}>
          <Text style={styles.sectionTitle}>
            💡 Smart Recommendations
          </Text>
          
          {insights.recommendations.length > 0 ? (
            insights.recommendations.map((recommendation, index) => (
              <RecommendationCard 
                key={recommendation.id}
                recommendation={recommendation}
                index={index}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Keep tracking expenses to get personalized recommendations!
              </Text>
            </View>
          )}
        </View>
        
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('BudgetScreen')}
          >
            <Target color="#4A90E2" size={20} />
            <Text style={styles.quickActionText}>Set Budget</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('AllExpenses')}
          >
            <DollarSign color="#4A90E2" size={20} />
            <Text style={styles.quickActionText}>View Expenses</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  refreshButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activePeriodButton: {
    backgroundColor: '#4A90E2',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activePeriodButtonText: {
    color: '#fff',
  },
  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 8,
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: '#4A90E2',
  },
  scoreOutOf: {
    fontSize: 18,
    color: '#64748b',
    marginLeft: 4,
  },
  scoreBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginBottom: 12,
  },
  scoreProgress: {
    height: '100%',
    borderRadius: 4,
  },
  scoreDescription: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  predictionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  predictionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 8,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  predictionText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
    flex: 1,
  },
  recommendationsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  recommendationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recommendationMeta: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  recommendationImpact: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    marginRight: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    marginLeft: 8,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
};