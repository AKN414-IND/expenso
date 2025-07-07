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

const themes = {
  light: lightTheme,
  dark: darkTheme,
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