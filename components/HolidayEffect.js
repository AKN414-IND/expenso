// components/HolidayEffect.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- NEW: Date Calculation Logic for Holidays ---

// Calculates the date of Easter Sunday for a given year
const getEaster = (year) => {
  const f = Math.floor,
    G = year % 19,
    C = f(year / 100),
    H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
    I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
    J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
    L = I - J,
    month = 3 + f((L + 40) / 44),
    day = L + 28 - 31 * f(month / 4);
  return new Date(year, month - 1, day);
};

// Checks for all holidays and returns the current one, or null.
const getCurrentHoliday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  const day = now.getDate();
  const easterDate = getEaster(year);

  // Easter (Just on the day)
  if (now.setHours(0,0,0,0) === easterDate.setHours(0,0,0,0)) {
    return { name: 'EASTER', type: 'EGG' };
  }

  // Christmas Week (Dec 24 - 31)
  if (month === 11 && day >= 24 && day <= 31) {
    return { name: 'CHRISTMAS', type: 'STAR' };
  }
  
  // Independence Day (Aug 15)
  if (month === 7 && day === 15) {
      return { name: 'INDEPENDENCE_DAY', type: 'CONFETTI', colors: ['#FF9933', '#138808'] };
  }
  
  // Onam Week 2025 (Sept 5 - 14) - NOTE: Dates are specific to 2025 for this example
  if (year === 2025 && month === 8 && day >= 5 && day <= 14) {
      return { name: 'ONAM', type: 'CONFETTI', colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#54A0FF', '#96CEB4'] };
  }
  
  return null;
};


// --- MODIFIED: Generic Animated Piece ---
const AnimatedPiece = ({ children, color }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get('window').height;
  const startX = useMemo(() => Math.random() * Dimensions.get('window').width, []);
  const duration = useMemo(() => 5000 + Math.random() * 3000, []);
  
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration,
      useNativeDriver: true,
    }).start();
  }, [anim, duration]);

  const pieceStyle = {
    transform: [
      { translateX: startX },
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-40, screenHeight] }) },
      { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
    ],
    opacity: anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
  };

  if (children) {
    return <Animated.View style={[styles.piece, pieceStyle]}>{children}</Animated.View>;
  }
  
  return <Animated.View style={[styles.piece, styles.confetti, pieceStyle, { backgroundColor: color }]} />;
};


// --- NEW: Component to render the correct animation type ---
const HolidayAnimation = ({ holiday }) => {
    const pieces = useMemo(() => Array.from({ length: 50 }).map((_, i) => ({ id: i })), []);

    const renderPiece = (piece) => {
        switch(holiday.type) {
            case 'STAR':
                return <AnimatedPiece key={piece.id}><Text style={styles.emoji}>⭐</Text></AnimatedPiece>;
            case 'EGG':
                 return <AnimatedPiece key={piece.id}><Text style={styles.emoji}>🥚</Text></AnimatedPiece>;
            case 'CONFETTI':
                const color = holiday.colors[piece.id % holiday.colors.length];
                return <AnimatedPiece key={piece.id} color={color} />;
            default:
                return null;
        }
    };

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {pieces.map(renderPiece)}
        </View>
    );
};


// --- MODIFIED: Main Wrapper with "Show Once" Logic ---
export const HolidayWrapper = ({ children }) => {
  const [activeHoliday, setActiveHoliday] = useState(null);

  useEffect(() => {
    const checkForHoliday = async () => {
      const holiday = getCurrentHoliday();
      if (!holiday) return;

      const year = new Date().getFullYear();
      const storageKey = `hasShown_${holiday.name}_${year}`;

      try {
        const hasBeenShown = await AsyncStorage.getItem(storageKey);
        if (hasBeenShown !== 'true') {
          setActiveHoliday(holiday);
          await AsyncStorage.setItem(storageKey, 'true');
        }
      } catch (error) {
        console.error("Failed to check holiday status from AsyncStorage", error);
      }
    };

    checkForHoliday();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {activeHoliday && <HolidayAnimation holiday={activeHoliday} />}
    </View>
  );
};


const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
  },
  confetti: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emoji: {
      fontSize: 24,
  }
});