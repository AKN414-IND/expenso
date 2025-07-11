import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Linking,
} from "react-native";
import {
  ArrowLeft,
  Brain,
  TrendingUp,
  Target,
  PieChart,
  Calendar,
  Bell,
  DollarSign,
  BarChart3,
  Lightbulb,
  MessageCircle,
  Sparkles,
} from "lucide-react-native";
import { useTheme } from "../context/ThemeContext";

const { width } = Dimensions.get("window");

export default function SmartInsightsScreen({ navigation }) {
  const { theme } = useTheme();

  const expectedFeatures = [
    {
      icon: <TrendingUp color={theme.colors.primary} size={24} />,
      title: "Spending Trends",
      description: "AI-powered analysis of your spending patterns and trends over time",
      color: "#4ECDC4",
    },
    {
      icon: <Target color={theme.colors.primary} size={24} />,
      title: "Budget Recommendations",
      description: "Smart budget suggestions based on your income and spending habits",
      color: "#FF6B6B",
    },
    {
      icon: <PieChart color={theme.colors.primary} size={24} />,
      title: "Category Insights",
      description: "Detailed breakdown of spending by category with optimization tips",
      color: "#45B7D1",
    },
    {
      icon: <Calendar color={theme.colors.primary} size={24} />,
      title: "Seasonal Patterns",
      description: "Identify recurring expenses and seasonal spending patterns",
      color: "#96CEB4",
    },
    {
      icon: <Bell color={theme.colors.primary} size={24} />,
      title: "Smart Alerts",
      description: "Proactive notifications about unusual spending or budget overruns",
      color: "#FECA57",
    },
    {
      icon: <DollarSign color={theme.colors.primary} size={24} />,
      title: "Savings Opportunities",
      description: "AI-identified areas where you can save money and reduce expenses",
      color: "#FF9FF3",
    },
    {
      icon: <BarChart3 color={theme.colors.primary} size={24} />,
      title: "Financial Health Score",
      description: "Overall financial wellness score with personalized improvement tips",
      color: "#54A0FF",
    },
    {
      icon: <Lightbulb color={theme.colors.primary} size={24} />,
      title: "Smart Recommendations",
      description: "Personalized financial advice based on your spending behavior",
      color: "#5F27CD",
    },
  ];

  const handleWhatsAppRedirect = () => {
    const phoneNumber = "918075648949"; // Replace with your WhatsApp number
    const message = encodeURIComponent(
      "Hi! I have some ideas here they are  " );
    
    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${message}`;
    const webWhatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    
    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          return Linking.openURL(webWhatsappUrl);
        }
      })
      .catch((err) => console.error("Error opening WhatsApp:", err));
  };

  const FeatureCard = ({ feature, index }) => (
    <View
      style={[
        styles.featureCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderLight,
          marginBottom: index === expectedFeatures.length - 1 ? 20 : 16,
        },
      ]}
    >
      <View style={styles.featureHeader}>
        <View style={[styles.featureIcon, { backgroundColor: feature.color + "15" }]}>
          {feature.icon}
        </View>
        <View style={styles.featureInfo}>
          <Text style={[styles.featureTitle, { color: theme.colors.text }]}>
            {feature.title}
          </Text>
          <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
            {feature.description}
          </Text>
        </View>
      </View>
      <View style={[styles.comingSoonBadge, { backgroundColor: theme.colors.warning + "15" }]}>
        <Text style={[styles.comingSoonText, { color: theme.colors.warning }]}>
          Coming Soon
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.colors.buttonSecondary }]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Smart Insights</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={[styles.heroSection, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.heroIcon, { backgroundColor: theme.colors.primary + "15" }]}>
            <Brain color={theme.colors.primary} size={48} />
          </View>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>
            AI-Powered Financial Insights
          </Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.textSecondary }]}>
            Get personalized insights and recommendations to optimize your financial health
          </Text>
          <View style={[styles.sparkleContainer]}>
            <Sparkles color={theme.colors.primary} size={20} />
            <Text style={[styles.sparkleText, { color: theme.colors.primary }]}>
              Powered by Advanced AI
            </Text>
          </View>
        </View>

        {/* Coming Soon Banner */}
        <View style={[styles.comingSoonBanner, { backgroundColor: theme.colors.warning + "10", borderColor: theme.colors.warning + "30" }]}>
          <Text style={[styles.comingSoonBannerTitle, { color: theme.colors.warning }]}>
            🚧 Under Development
          </Text>
          <Text style={[styles.comingSoonBannerText, { color: theme.colors.textSecondary }]}>
            We're working hard to bring you these amazing features. Stay tuned!
          </Text>
        </View>

        {/* Expected Features */}
        <View style={styles.featuresSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Expected Features
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
            Here's what you can expect from Smart Insights:
          </Text>
          
          {expectedFeatures.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </View>

        {/* CTA Section */}
        <View style={[styles.ctaSection, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.ctaTitle, { color: theme.colors.text }]}>
            Want to know more?
          </Text>
          <Text style={[styles.ctaSubtitle, { color: theme.colors.textSecondary }]}>
            Have questions or suggestions about these features? Let's chat!
          </Text>
          <TouchableOpacity
            style={[styles.whatsappButton, { backgroundColor: "#25D366" }]}
            onPress={handleWhatsAppRedirect}
          >
            <MessageCircle color="#fff" size={20} />
            <Text style={styles.whatsappButtonText}>Chat on WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    margin: 20,
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    elevation: 2,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 16,
  },
  sparkleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sparkleText: {
    fontSize: 14,
    fontWeight: "600",
  },
  comingSoonBanner: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  comingSoonBannerTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  comingSoonBannerText: {
    fontSize: 14,
    lineHeight: 20,
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  featureCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    elevation: 2,
  },
  featureHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  comingSoonBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  ctaSection: {
    margin: 20,
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    elevation: 2,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  ctaSubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  whatsappButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: "#25D366",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  whatsappButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});