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

// Define light theme
const lightTheme = {
  name: 'light',
  colors: {
    // Background colors
    background: '#f5f7fa',
    surface: '#ffffff',
    card: '#ffffff',
    
    // Text colors
    text: '#1e293b',
    textSecondary: '#334155',
    textTertiary: '#64748b',
    
    // Primary colors
    primary: '#06b6d4',
    primaryDark: '#0891b2',
    
    // Status colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    
    // Border colors
    border: 'rgba(148, 163, 184, 0.1)',
    borderLight: 'rgba(148, 163, 184, 0.05)',
    
    // Button colors
    buttonSecondary: '#f1f5f9',
    buttonSecondaryText: '#334155',
    
    // Special colors
    shadow: '#000000',
    overlay: 'rgba(15, 23, 42, 0.7)',
  }
};

// Define dark theme
const darkTheme = {
  name: 'dark',
  colors: {
    // Background colors
    background: '#0f172a',
    surface: '#1e293b',
    card: '#334155',
    
    // Text colors
    text: '#f8fafc',
    textSecondary: '#e2e8f0',
    textTertiary: '#94a3b8',
    
    // Primary colors
    primary: '#06b6d4',
    primaryDark: '#0891b2',
    
    // Status colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    
    // Border colors
    border: 'rgba(148, 163, 184, 0.3)',
    borderLight: 'rgba(148, 163, 184, 0.1)',
    
    // Button colors
    buttonSecondary: '#475569',
    buttonSecondaryText: '#f8fafc',
    
    // Special colors
    shadow: '#000000',
    overlay: 'rgba(15, 23, 42, 0.8)',
  }
};

const mintTheme = {
  name: 'mint',
  colors: {
    background: '#e8faf5',
    surface: '#d1fae5',
    card: '#a7f3d0',
    text: '#064e3b',
    textSecondary: '#047857',
    textTertiary: '#10b981',
    primary: '#34d399',
    primaryDark: '#059669',
    success: '#059669',
    warning: '#fbbf24',
    error: '#ef4444',
    border: 'rgba(16, 185, 129, 0.15)',
    borderLight: 'rgba(16, 185, 129, 0.07)',
    buttonSecondary: '#a7f3d0',
    buttonSecondaryText: '#065f46',
    shadow: '#0e7490',
    overlay: 'rgba(16, 185, 129, 0.3)',
  },
};

const sunsetTheme = {
  name: 'sunset',
  colors: {
    background: '#fff7ed',
    surface: '#ffe4e6',
    card: '#fbcfe8',
    text: '#7c2d12',
    textSecondary: '#be123c',
    textTertiary: '#f472b6',
    primary: '#f59e42',
    primaryDark: '#d97706',
    success: '#eab308',
    warning: '#ea580c',
    error: '#be185d',
    border: 'rgba(251, 191, 36, 0.14)',
    borderLight: 'rgba(251, 191, 36, 0.07)',
    buttonSecondary: '#fdba74',
    buttonSecondaryText: '#7c2d12',
    shadow: '#be185d',
    overlay: 'rgba(251, 113, 133, 0.19)',
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
    textTertiary: '#64748b',
    primary: '#2563eb',
    primaryDark: '#1d4ed8',
    success: '#22c55e',
    warning: '#facc15',
    error: '#dc2626',
    border: 'rgba(51, 65, 85, 0.11)',
    borderLight: 'rgba(51, 65, 85, 0.07)',
    buttonSecondary: '#e0e7ef',
    buttonSecondaryText: '#334155',
    shadow: '#0f172a',
    overlay: 'rgba(30, 41, 59, 0.17)',
  },
};

const neonTheme = {
  name: 'neon',
  colors: {
    background: '#18181b',
    surface: '#27272a',
    card: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#a21caf',
    textTertiary: '#06b6d4',
    primary: '#a21caf',    // neon purple
    primaryDark: '#0ea5e9', // neon blue
    success: '#14f195',    // neon green
    warning: '#fde047',    // neon yellow
    error: '#fb7185',      // neon red/pink
    border: 'rgba(10, 132, 255, 0.22)',
    borderLight: 'rgba(10, 132, 255, 0.08)',
    buttonSecondary: '#a21caf',
    buttonSecondaryText: '#fff',
    shadow: '#0ea5e9',
    overlay: 'rgba(10, 132, 255, 0.32)',
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