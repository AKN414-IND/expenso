import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  BackHandler,
  ScrollView,
  Image,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Alert from "../components/Alert";
import { LogOut, FastForward } from "lucide-react-native";
import { useTheme } from "../context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

const onboardingData = [
  {
    id: 1,
    title: "Meet Your Smart Money Sidekick",
    description:
      "Ever wished you had a clever buddy to handle your bills? Snap a picture of any receipt, and your AI sidekick will read, extract, and organize all your spending details—instantly! No more manual entry, just more time for you.",
    image: require("../assets/onboarding1.png"),
  },
  {
    id: 2,
    title: "Your Personal Budget Planner",
    description:
      "Let’s make budgets easy! Set simple spending limits for things you care about—like food, shopping, and fun. Your AI assistant will give you a nudge before you overspend, so you’re always in control.",
    image: require("../assets/onboarding2.png"),
  },
  {
    id: 3,
    title: "Say Goodbye to Late Fees",
    description:
      "Life gets busy, but your assistant’s got your back! Add any bill or subscription, and get playful reminders before payment dates. No more “oops, I forgot!” moments.",
    image: require("../assets/onboarding3.png"),
  },
  {
    id: 4,
    title: "Your Money Journey, Visualized",
    description:
      "Get beautiful, easy-to-read reports that show exactly where your money goes. Spot trends, download summaries, and even share insights with friends or family—all in a tap.",
    image: require("../assets/onboarding4.png"),
  },
];

export default function OnboardingScreen({ onFinish }) {
  const { theme } = useTheme();
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showExitModal, setShowExitModal] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        setShowExitModal(true);
        return true;
      };
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );
      return () => subscription?.remove();
    }, [])
  );

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 900,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleScroll = (event) => {
    const slideSize = width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setActiveSlide(index);
  };

  const goToSlide = (index) => {
    scrollViewRef.current?.scrollTo({
      x: index * width,
      animated: true,
    });
  };

  const handleNext = () => {
    if (activeSlide < onboardingData.length - 1) {
      goToSlide(activeSlide + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (activeSlide > 0) {
      goToSlide(activeSlide - 1);
    }
  };

  const handleSkip = () => setShowSkipModal(true);

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem("hasCompletedOnboarding", "true");
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    } catch (error) {
      console.error("Failed to save onboarding completion state.", error);
    }
  };

  // Dynamic color tokens for better accessibility across themes
  const main = theme.colors.primary;
  const mainDark = theme.colors.primaryDark;
  const textMain = theme.colors.text;
  const textSecondary = theme.colors.textSecondary;
  const textTertiary = theme.colors.textTertiary;
  const card = theme.colors.card;
  const bg = theme.colors.background;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar
        barStyle={
          theme.name === "dark" || theme.name === "neon"
            ? "light-content"
            : "dark-content"
        }
        backgroundColor={bg}
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          {activeSlide > 0 ? (
            <TouchableOpacity
              onPress={handlePrevious}
              style={[
                styles.backButton,
                { backgroundColor: main, shadowColor: main },
              ]}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
          <View style={styles.spacer} />
          <TouchableOpacity
            onPress={handleSkip}
            style={[
              styles.skipButton,
              { backgroundColor: main, shadowColor: main },
            ]}
          >
            <Text style={[styles.skipText, { color: "#fff" }]}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Slides */}
        <View style={styles.slidesContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            scrollEventThrottle={16}
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
          >
            {onboardingData.map((item, index) => (
              <View
                key={item.id}
                style={[styles.slideContainer, { width: width }]}
              >
                <View
                  style={[
                    styles.slide,
                    {
                      paddingVertical: height < 700 ? 12 : 24,
                      minHeight: height * 0.6,
                    },
                  ]}
                >
                  {/* Image Container */}
                  <View style={styles.imageContainer}>
                    <Image
                      source={item.image}
                      style={styles.slideImage}
                      resizeMode="contain"
                    />
                  </View>
                  {/* Text Content */}
                  <View style={styles.textContent}>
                    <Text style={[styles.slideTitle, { color: textMain }]}>
                      {item.title}
                    </Text>
                    <Text
                      style={[styles.slideDescription, { color: textTertiary }]}
                    >
                      {item.description}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Pagination */}
        <View style={styles.paginationContainer}>
          {onboardingData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                {
                  backgroundColor:
                    index === activeSlide ? main : theme.colors.borderLight,
                  width: index === activeSlide ? 22 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: main, shadowColor: mainDark },
            ]}
            onPress={handleNext}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.nextButtonText}>
                {activeSlide === onboardingData.length - 1
                  ? "Get Started"
                  : "Next"}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Exit & Skip Alerts */}
        <Alert
          open={showExitModal}
          onConfirm={() => {
            setShowExitModal(false);
            BackHandler.exitApp();
          }}
          onCancel={() => setShowExitModal(false)}
          title="Exit App"
          message="Are you sure you want to exit the onboarding?"
          confirmText="Exit"
          cancelText="Stay"
          icon={<LogOut color="#fff" size={40} />}
          iconBg={theme.colors.error}
          confirmColor={theme.colors.error}
          confirmTextColor="#fff"
          cancelColor={theme.colors.buttonSecondary}
          cancelTextColor={theme.colors.text}
        />
        <Alert
          open={showSkipModal}
          onConfirm={() => {
            setShowSkipModal(false);
            handleFinish();
          }}
          onCancel={() => setShowSkipModal(false)}
          title="Skip Onboarding"
          message="Are you sure you want to skip the introduction?"
          confirmText="Skip"
          cancelText="Continue Tour"
          icon={<FastForward color="#fff" size={40} />}
          iconBg={theme.colors.warning}
          confirmColor={theme.colors.warning}
          confirmTextColor="#fff"
          cancelColor={theme.colors.buttonSecondary}
          cancelTextColor={theme.colors.text}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 80 : 60,
    paddingBottom: 16,
    paddingHorizontal: 18,
    minHeight: 70,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    marginRight: 4,
  },
  spacer: {
    flex: 1,
  },
  skipButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 90,
    height: 40,
    elevation: 2,
  },
  skipText: {
    fontSize: 16,
    fontWeight: "600",
  },
  slidesContainer: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
  },
  slideContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 0,
    flex: 1,
  },
  slide: {
    width: "92%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0,
    paddingHorizontal: 0,
    minHeight: 400,
  },
  imageContainer: {
    width: "95%",
    height: height * 0.32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    marginBottom: 8,
  },
  slideImage: {
    width: "100%",
    height: "100%",
  },
  textContent: {
    alignItems: "center",
    paddingHorizontal: 12,
    marginTop: 14,
    width: "100%",
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 10,
    lineHeight: 32,
    textAlign: "center",
  },
  slideDescription: {
    fontSize: 16,
    lineHeight: 23,
    paddingHorizontal: 2,
    textAlign: "center",
    marginBottom: 2,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  footer: {
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  nextButton: {
    borderRadius: 25,
    elevation: 7,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: 36,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginRight: 8,
  },
});
