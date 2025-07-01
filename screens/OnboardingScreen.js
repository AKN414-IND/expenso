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
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import  Alert from '../components/Alert';
import { LogOut, FastForward } from 'lucide-react-native'; 

const { width, height } = Dimensions.get('window');



const onboardingData = [
  {
    id: 1,
    title: 'Meet Your Smart Money Sidekick',
    description: 'Ever wished you had a clever buddy to handle your bills? Snap a picture of any receipt, and your AI sidekick will read, extract, and organize all your spending details—instantly! No more manual entry, just more time for you.',
    image: require('../assets/onboarding1.png'),
  },
  {
    id: 2,
    title: 'Your Personal Budget Planner',
    description: 'Let’s make budgets easy! Set simple spending limits for things you care about—like food, shopping, and fun. Your AI assistant will give you a nudge before you overspend, so you’re always in control.',
    image: require('../assets/onboarding2.png'), 
  },
  {
    id: 3,
    title: 'Say Goodbye to Late Fees',
    description: 'Life gets busy, but your assistant’s got your back! Add any bill or subscription, and get playful reminders before payment dates. No more “oops, I forgot!” moments.',
    image: require('../assets/onboarding3.png'), 
  },
  {
    id: 4,
    title: 'Your Money Journey, Visualized',
    description: 'Get beautiful, easy-to-read reports that show exactly where your money goes. Spot trends, download summaries, and even share insights with friends or family—all in a tap.',
    image: require('../assets/onboarding4.png'),
  },
];

  
export default function OnboardingScreen({ onFinish }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showExitModal, setShowExitModal] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);


  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        setShowExitModal(true);   // <-- Show custom modal!
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription?.remove();
    }, [])
  );
  
  // Handle Android back button
  
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
  setShowSkipModal(true);
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
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          {activeSlide > 0 && (
            <TouchableOpacity onPress={handlePrevious} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#ffffff" />
            </TouchableOpacity>
          )}
          
          <View style={styles.spacer} />
          
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
                    <Text style={styles.slideTitle}>{item.title}</Text>
                    <Text style={styles.slideDescription}>{item.description}</Text>
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
                  backgroundColor: index === activeSlide 
                    ? '#6366f1' 
                    : '#e5e7eb',
                  width: index === activeSlide ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.nextButton} 
            onPress={handleNext}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.nextButtonText}>
                {activeSlide === onboardingData.length - 1 ? 'Get Started' : 'Next'}
              </Text>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color="#fff" 
              />
            </View>
          </TouchableOpacity>
        </View>

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
  iconBg="#ef4444"
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
  iconBg="#f59e42"
  confirmColor="#f59e42"
  confirmTextColor="#fff"
  cancelColor="#f1f5f9"
  cancelTextColor="#334155"
/>


      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 20,
    paddingHorizontal: 24,
    height: 80,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  spacer: {
    flex: 1,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#6366f1',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    width:100,
    height:40,
  },
  skipText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  slidesContainer: {
    flex: 1,
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
    flex: 1,
  },
  imageContainer: {
    width: width * 0.8,
    height: height * 0.45,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  textContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    
    marginBottom: 10,
    lineHeight: 30,
  },
  slideDescription: {
    fontSize: 16,
    color: '#6b7280',
    
    lineHeight: 24,
    paddingHorizontal: 5,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 24,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    transition: 'all 0.3s ease',
  },
  footer: {
    paddingBottom: 40,
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  nextButton: {
    backgroundColor: '#6366f1',
    borderRadius: 25,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginRight: 8,
  },
});