import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

/* ---------- LIGHT (unchanged except aliases) ---------- */
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
    // aliases
    appBg: '#f5f7fa',
    cardBg: '#ffffff',
    onPrimary: '#ffffff',
  }
};

/* ---------- DARK (improved readability/contrast) ---------- */
const darkTheme = {
  name: 'dark',
  colors: {
    background: '#0b1220',      // app bg (slightly warmer than pure black)
    surface: '#111827',         // header/sections
    card: '#1f2937',            // cards
    text: '#f8fafc',
    textSecondary: '#e2e8f0',
    textTertiary: '#94a3b8',
    primary: '#22d3ee',         // cyan-400
    primaryDark: '#06b6d4',     // cyan-500
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    border: 'rgba(148, 163, 184, 0.24)',
    borderLight: 'rgba(148, 163, 184, 0.12)',
    buttonSecondary: '#334155',
    buttonSecondaryText: '#e2e8f0',
    shadow: '#000000',
    overlay: 'rgba(2, 6, 23, 0.7)',
    // aliases
    appBg: '#0b1220',
    cardBg: '#1f2937',
    onPrimary: '#0b1220',       // dark ink over bright cyan for WCAG contrast
  }
};

/* ---------- MINT (less neon, more UI-friendly mint) ---------- */
const mintTheme = {
  name: 'mint',
  colors: {
    background: '#e8faf5',
    surface: '#d9f7ee',
    card: '#c9f2e6',
    text: '#064e3b',
    textSecondary: '#065f46',
    textTertiary: '#0e766e',
    primary: '#10b981',
    primaryDark: '#059669',
    success: '#059669',
    warning: '#a16207',
    error: '#b91c1c',
    border: 'rgba(5, 150, 105, 0.18)',
    borderLight: 'rgba(5, 150, 105, 0.10)',
    buttonSecondary: '#a7f3d0',
    buttonSecondaryText: '#065f46',
    shadow: '#065f46',
    overlay: 'rgba(16, 185, 129, 0.25)',
    // aliases
    appBg: '#e8faf5',
    cardBg: '#c9f2e6',
    onPrimary: '#064e3b',       // dark text on bright mint button
  },
};

/* ---------- SUNSET (warmer but toned for legibility) ---------- */
const sunsetTheme = {
  name: 'sunset',
  colors: {
    background: '#fff7ed',      // stone/peach bg
    surface: '#ffedd5',
    card: '#fed7aa',
    text: '#7c2d12',
    textSecondary: '#9a3412',
    textTertiary: '#b45309',
    primary: '#f59e0b',
    primaryDark: '#d97706',
    success: '#16a34a',
    warning: '#c2410c',
    error: '#b91c1c',
    border: 'rgba(251, 191, 36, 0.18)',
    borderLight: 'rgba(251, 191, 36, 0.10)',
    buttonSecondary: '#fdba74',
    buttonSecondaryText: '#7c2d12',
    shadow: '#7c2d12',
    overlay: 'rgba(124, 45, 18, 0.2)',
    // aliases
    appBg: '#fff7ed',
    cardBg: '#fed7aa',
    onPrimary: '#7c2d12',       // dark text on amber button
  },
};

/* ---------- CLASSIC (material-ish neutral with blue primary) ---------- */
const classicTheme = {
  name: 'classic',
  colors: {
    background: '#f1f5f9',
    surface: '#e2e8f0',
    card: '#ffffff',
    text: '#1e293b',
    textSecondary: '#475569',
    textTertiary: '#64748b',
    primary: '#2563eb',
    primaryDark: '#1d4ed8',
    success: '#15803d',
    warning: '#92400e',
    error: '#b91c1c',
    border: 'rgba(51, 65, 85, 0.13)',
    borderLight: 'rgba(51, 65, 85, 0.08)',
    buttonSecondary: '#e2e8f0',
    buttonSecondaryText: '#334155',
    shadow: '#0f172a',
    overlay: 'rgba(30, 41, 59, 0.17)',
    // aliases
    appBg: '#f1f5f9',
    cardBg: '#ffffff',
    onPrimary: '#ffffff',       // white text on blue
  },
};

/* ---------- NEON (dialed back for usability, still “neon”) ---------- */
const neonTheme = {
  name: 'neon',
  colors: {
    background: '#14151b',
    surface: '#1b1c27',
    card: '#171826',
    text: '#f8fbff',
    textSecondary: '#a6ffe0',   // softer neon accents
    textTertiary: '#8ee7ff',
    primary: '#fe00ff',         // neon magenta
    primaryDark: '#00e5ff',     // neon cyan
    success: '#0aff9d',
    warning: '#fff200',
    error: '#ff2975',
    border: 'rgba(255, 255, 255, 0.14)',
    borderLight: 'rgba(254, 0, 255, 0.16)',
    buttonSecondary: '#232546',
    buttonSecondaryText: '#e2e8f0',
    shadow: '#fe00ff',
    overlay: 'rgba(0, 229, 255, 0.12)',
    // aliases
    appBg: '#14151b',
    cardBg: '#171826',
    onPrimary: '#0b0b12',       // near-black text on neon primaries
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

  useEffect(() => { loadTheme(); }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('userTheme');
      if (savedTheme && themes[savedTheme]) setCurrentTheme(savedTheme);
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

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
