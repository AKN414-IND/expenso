import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext({});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const lightTheme = {
  name: 'light',
  colors: {
    background: '#f5f7fa',
    surface: '#ffffff',
    card: '#ffffff',
    text: '#1e293b',
    textSecondary: '#475569',
    textTertiary: '#5f7080',
    primary: '#127f73',
    primaryDark: '#0f6b63',
    success: '#047857',
    warning: '#c2410c',
    error: '#dc2626',
    border: 'rgba(148, 163, 184, 0.15)',
    borderLight: 'rgba(148, 163, 184, 0.07)',
    buttonSecondary: '#f1f5f9',
    buttonSecondaryText: '#475569',
    shadow: '#000000',
    overlay: 'rgba(15, 23, 42, 0.7)',
  }
};

const darkTheme = {
  name: 'dark',
  colors: {
    background: '#0f172a',
    surface: '#1e293b',
    card: '#334155',
    text: '#f8fafc',
    textSecondary: '#e2e8f0',
    textTertiary: '#a0aec0',
    primary: '#06b6d4',
    primaryDark: '#0891b2',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    border: 'rgba(148, 163, 184, 0.3)',
    borderLight: 'rgba(148, 163, 184, 0.1)',
    buttonSecondary: '#475569',
    buttonSecondaryText: '#f8fafc',
    shadow: '#000000',
    overlay: 'rgba(15, 23, 42, 0.8)',
  }
};

const mintTheme = {
  name: 'mint',
  colors: {
    background: '#e8faf5',
    surface: '#d1fae5',
    card: '#baf7ce',
    text: '#064e3b',
    textSecondary: '#065f46',
    textTertiary: '#047857',
    primary: '#10b981',
    primaryDark: '#059669',
    success: '#059669',
    warning: '#a16207',
    error: '#b91c1c',
    border: 'rgba(16, 185, 129, 0.15)',
    borderLight: 'rgba(16, 185, 129, 0.07)',
    buttonSecondary: '#a7f3d0',
    buttonSecondaryText: '#065f46',
    shadow: '#065f46',
    overlay: 'rgba(16, 185, 129, 0.3)',
  },
};

const sunsetTheme = {
  name: 'sunset',
  colors: {
    background: '#fff7ed',
    surface: '#ffedd5',
    card: '#fed7aa',
    text: '#7c2d12',
    textSecondary: '#9a3412',
    textTertiary: '#b45309',
    primary: '#f59e0b',
    primaryDark: '#d97706',
    success: '#92400e',
    warning: '#c2410c',
    error: '#b91c1c',
    border: 'rgba(251, 191, 36, 0.14)',
    borderLight: 'rgba(251, 191, 36, 0.07)',
    buttonSecondary: '#fdba74',
    buttonSecondaryText: '#7c2d12',
    shadow: '#7c2d12',
    overlay: 'rgba(124, 45, 18, 0.2)',
  },
};

const classicTheme = {
  name: 'classic',
  colors: {
    background: '#f1f5f9',
    surface: '#e2e8f0',
    card: '#cbd5e1',
    text: '#1e293b',
    textSecondary: '#475569',
    textTertiary: '#5f7080',
    primary: '#2563eb',
    primaryDark: '#1d4ed8',
    success: '#15803d',
    warning: '#92400e',
    error: '#b91c1c',
    border: 'rgba(51, 65, 85, 0.11)',
    borderLight: 'rgba(51, 65, 85, 0.07)',
    buttonSecondary: '#e0e7ef',
    buttonSecondaryText: '#475569',
    shadow: '#0f172a',
    overlay: 'rgba(30, 41, 59, 0.17)',
  },
};

// --- Improved Neon Theme ---
const neonTheme = {
  name: 'neon',
  colors: {
    background: '#15151a', // true deep black-blue
    surface: '#222232',
    card: '#181827',
    text: '#f9f9ff', // almost white for high neon contrast
    textSecondary: '#39ff14', // neon green
    textTertiary: '#00e6ff',  // neon blue
    primary: '#fe00ff', // neon magenta
    primaryDark: '#00f0ff', // neon cyan (glow accent)
    success: '#0aff9d', // neon green for success
    warning: '#fff200', // neon yellow for warning
    error: '#ff2975', // neon pink/red for error
    border: 'rgba(255, 255, 255, 0.12)',
    borderLight: 'rgba(254, 0, 255, 0.16)', // subtle magenta glow
    buttonSecondary: '#151b3d', // dark indigo for contrast
    buttonSecondaryText: '#39ff14', // neon green text on button
    shadow: '#fe00ff', // magenta glow for "neon" shadow
    overlay: 'rgba(0,255,255,0.13)', // subtle cyan overlay
  },
};

const themes = {
  light: lightTheme,
  dark: darkTheme,
  mint: mintTheme,
  sunset: sunsetTheme,
  classic: classicTheme,
  neon: neonTheme,
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('light');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('userTheme');
      if (savedTheme && themes[savedTheme]) {
        setCurrentTheme(savedTheme);
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    } finally {
      setLoading(false);
    }
  };

  const setTheme = async (themeName) => {
    try {
      if (themes[themeName]) {
        setCurrentTheme(themeName);
        await AsyncStorage.setItem('userTheme', themeName);
      }
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };

  const toggleTheme = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const value = {
    theme: themes[currentTheme],
    currentTheme,
    setTheme,
    toggleTheme,
    loading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
