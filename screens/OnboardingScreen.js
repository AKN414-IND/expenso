// screens/OnboardingScreen.js
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  BackHandler,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const onboardingData = [
    {
      id: 1,
      icon: 'camera',
      title: 'Scan Receipts with AI',
      description: 'Upload or snap a bill. Our AI extracts merchant, amount, date, and more—automatically.',
      gradient: ['#667eea', '#764ba2'],
    },
    {
      id: 2,
      icon: 'pie-chart',
      title: 'Smart Categorization',
      description: 'Expenses are auto-tagged into categories like Food, Travel, and Utilities—no effort needed.',
      gradient: ['#764ba2', '#f093fb'],
    },
    {
      id: 3,
      icon: 'bar-chart',
      title: 'Visual Spending Insights',
      description: 'Track your budget, view monthly trends, and get breakdowns with clean charts.',
      gradient: ['#48bb78', '#38a169'],
    },
    {
      id: 4,
      icon: 'lock-closed',
      title: 'Private & Secure',
      description: 'Your data is stored securely with Supabase. You control your information—always.',
      gradient: ['#ed8936', '#dd6b20'],
    },
  ];
  
export default function OnboardingScreen({ onFinish }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Handle Android back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          'Exit App',
          'Are you sure you want to exit?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Exit', onPress: () => BackHandler.exitApp() },
          ]
        );
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription?.remove();
    }, [])
  );

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
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

  const handleSkip = () => {
    Alert.alert(
      'Skip Onboarding',
      'Are you sure you want to skip the introduction?',
      [
        { text: 'Continue Tour', style: 'cancel' },
        { text: 'Skip', onPress: handleFinish },
      ]
    );
  };

  const handleFinish = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onFinish();
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.appName}>ExpenseTracker</Text>
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Slides Container */}
          <View style={styles.slidesContainer}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
              scrollEventThrottle={16}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
            >
              {onboardingData.map((item, index) => (
                <View key={item.id} style={styles.slideContainer}>
                  <View style={styles.slide}>
                    <LinearGradient
                      colors={item.gradient}
                      style={styles.iconContainer}
                    >
                      <Ionicons name={item.icon} size={64} color="#FFF" />
                    </LinearGradient>
                    
                    <Text style={styles.slideTitle}>{item.title}</Text>
                    <Text style={styles.slideDescription}>{item.description}</Text>
                    
                    <View style={styles.progressContainer}>
                      <Text style={styles.progressText}>
                        {index + 1} of {onboardingData.length}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
            
            {/* Pagination */}
            <View style={styles.paginationContainer}>
              {onboardingData.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => goToSlide(index)}
                  style={[
                    styles.paginationDot,
                    {
                      backgroundColor: index === activeSlide 
                        ? '#FFF' 
                        : 'rgba(255,255,255,0.4)',
                      transform: [{ 
                        scale: index === activeSlide ? 1 : 0.6 
                      }],
                    },
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.navigationContainer}>
              {/* Previous Button */}
              {activeSlide > 0 && (
                <TouchableOpacity 
                  style={styles.prevButton} 
                  onPress={handlePrevious}
                >
                  <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.prevButtonText}>Back</Text>
                </TouchableOpacity>
              )}
              
              <View style={styles.spacer} />
              
              {/* Next/Get Started Button */}
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.nextButtonText}>
                    {activeSlide === onboardingData.length - 1 ? 'Get Started' : 'Next'}
                  </Text>
                  <Ionicons 
                    name={activeSlide === onboardingData.length - 1 ? 'checkmark' : 'arrow-forward'} 
                    size={20} 
                    color="#FFF" 
                  />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  skipText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  slidesContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  slideContainer: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    minHeight: 400,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  slideDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  footer: {
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  prevButtonText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 8,
    fontWeight: '500',
  },
  spacer: {
    flex: 1,
  },
  nextButton: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    minWidth: 140,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginRight: 8,
  },
});