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
    background: '#f5f7fa',        // light gray-blue background for clean contrast
    surface: '#ffffff',          // white surface for cards/modals
    card: '#ffffff',

    // Text colors
    text: '#1e293b',             // dark slate for primary text (high contrast)
    textSecondary: '#475569',    // muted dark gray for secondary text (less intense)
    textTertiary: '#5f7080',     // lighter gray-blue for tertiary/placeholder text

    // Primary colors
    primary: '#127f73',          // muted teal for brand accents (legible with light or dark text)
    primaryDark: '#0f6b63',      // a deeper teal for hover/active states

    // Status colors
    success: '#047857',          // deep emerald green for success messages/icons
    warning: '#c2410c',          // dark orange for warnings (better contrast than bright yellow):contentReference[oaicite:7]{index=7}
    error: '#dc2626',            // rich red for errors (more visible on light backgrounds)

    // Border colors
    border: 'rgba(148, 163, 184, 0.15)',    // light gray-blue border for subtle separators
    borderLight: 'rgba(148, 163, 184, 0.07)',

    // Button colors
    buttonSecondary: '#f1f5f9',            // pale gray secondary button background
    buttonSecondaryText: '#475569',        // dark gray text on secondary button

    // Special colors
    shadow: '#000000',                     // use black for shadows on light theme
    overlay: 'rgba(15, 23, 42, 0.7)',      // translucent dark overlay for modals
  }
};


// Define dark theme
const darkTheme = {
  name: 'dark',
  colors: {
    // Background colors
    background: '#0f172a',       // deep navy background (reduces eye strain in dark mode)
    surface: '#1e293b',         // dark slate surface
    card: '#334155',           // slightly lighter card background

    // Text colors
    text: '#f8fafc',            // near-white primary text for maximum contrast
    textSecondary: '#e2e8f0',   // light gray secondary text
    textTertiary: '#a0aec0',    // gray-blue tertiary text (slightly brighter for readability)

    // Primary colors
    primary: '#06b6d4',         // bright cyan accent for links/buttons (stands out on dark):contentReference[oaicite:12]{index=12}
    primaryDark: '#0891b2',     // slightly darker teal-blue for active states

    // Status colors
    success: '#10b981',         // bright emerald green (visible on dark background)
    warning: '#f59e0b',         // warm amber for warnings (high contrast on dark)
    error: '#ef4444',           // vivid red for errors (stands out against dark background)

    // Border colors
    border: 'rgba(148, 163, 184, 0.3)',    // semi-transparent slate for borders
    borderLight: 'rgba(148, 163, 184, 0.1)',

    // Button colors
    buttonSecondary: '#475569',           // mid-gray button background
    buttonSecondaryText: '#f8fafc',       // white text on secondary button

    // Special colors
    shadow: '#000000',                    // black shadow for depth on dark surfaces
    overlay: 'rgba(15, 23, 42, 0.8)',     // slightly opaque black overlay for modals
  }
};

const mintTheme = {
  name: 'mint',
  colors: {
    background: '#e8faf5',      // very light mint background (soft and clean)
    surface: '#d1fae5',         // pale mint surface
    card: '#baf7ce',            // light mint-green card (slightly less bright than before for contrast)

    text: '#064e3b',            // dark teal-green primary text (formerly emerald 900)
    textSecondary: '#065f46',   // deep green for secondary text (emerald 800)
    textTertiary: '#047857',    // medium emerald green for tertiary text (emerald 700)

    primary: '#10b981',         // mint green primary accent (muted from the original neon hue)
    primaryDark: '#059669',     // darker teal-green for primary dark

    success: '#059669',         // dark green for success (readable on light backgrounds)
    warning: '#a16207',         // dark goldenrod for warning (more contrast than bright yellow)
    error: '#b91c1c',           // deep red for error alerts (stands out against mint background)

    border: 'rgba(16, 185, 129, 0.15)',   // mint-green border with low opacity
    borderLight: 'rgba(16, 185, 129, 0.07)',

    buttonSecondary: '#a7f3d0',          // light mint button background
    buttonSecondaryText: '#065f46',      // dark green text on mint button

    shadow: '#065f46',                   // dark green shadow (subtle mint-tinted shadow)
    overlay: 'rgba(16, 185, 129, 0.3)',  // mint-tinted translucent overlay
  },
};


const sunsetTheme = {
  name: 'sunset',
  colors: {
    background: '#fff7ed',    // light peach (sunset sky background)
    surface: '#ffedd5',       // soft apricot surface
    card: '#fed7aa',          // pale coral card background

    text: '#7c2d12',          // dark chestnut brown text (high contrast on peach):contentReference[oaicite:21]{index=21}
    textSecondary: '#9a3412', // rich brownish-orange for secondary text
    textTertiary: '#b45309',  // medium amber for tertiary text (subtle on light background)

    primary: '#f59e0b',       // warm amber-orange primary (playful yet not neon)
    primaryDark: '#d97706',   // darker burnt orange for primary dark

    success: '#92400e',       // dark gold for success (alternative to green, fits warm palette)
    warning: '#c2410c',       // robust orange for warning messages
    error: '#b91c1c',         // dark red for errors (more standard error color)

    border: 'rgba(251, 191, 36, 0.14)',   // amber-tinted border (subtle)
    borderLight: 'rgba(251, 191, 36, 0.07)',

    buttonSecondary: '#fdba74',         // warm orange button background
    buttonSecondaryText: '#7c2d12',     // dark brown text on secondary button

    shadow: '#7c2d12',                  // semi-transparent brown shadow (blends with theme)
    overlay: 'rgba(124, 45, 18, 0.2)',  // brown-tinted overlay for modals
  },
};


const classicTheme = {
  name: 'classic',
  colors: {
    background: '#f1f5f9',    // light gray-blue background (clean and neutral)
    surface: '#e2e8f0',       // slightly darker gray surface
    card: '#cbd5e1',          // gray card background

    text: '#1e293b',          // dark slate primary text
    textSecondary: '#475569', // gray-blue secondary text
    textTertiary: '#5f7080',  // lighter slate-gray tertiary text (improved contrast)

    primary: '#2563eb',       // corporate blue primary (trustworthy accent):contentReference[oaicite:26]{index=26}
    primaryDark: '#1d4ed8',   // dark blue for primary dark

    success: '#15803d',       // dark green for success (visible on light background)
    warning: '#92400e',       // dark amber for warning (more readable than bright yellow)
    error: '#b91c1c',         // dark red for error (high visibility)

    border: 'rgba(51, 65, 85, 0.11)',   // gray-blue border
    borderLight: 'rgba(51, 65, 85, 0.07)',

    buttonSecondary: '#e0e7ef',        // light gray-blue button background
    buttonSecondaryText: '#475569',    // dark gray text on secondary button

    shadow: '#0f172a',                // dark shadow for depth
    overlay: 'rgba(30, 41, 59, 0.17)', // dark overlay for modals
  },
};


const neonTheme = {
  name: 'neon',
  colors: {
    background: '#18181b',    // nearly black background
    surface: '#27272a',       // deep gray surface
    card: '#1e293b',          // dark slate card background

    text: '#f1f5f9',          // off-white primary text
    textSecondary: '#d946ef', // neon magenta text for secondary (high contrast on dark):contentReference[oaicite:30]{index=30}
    textTertiary: '#94a3b8',  // muted light gray for tertiary text (avoids too many neon colors)

    primary: '#a21caf',       // neon purple primary (for brand accents)
    primaryDark: '#0ea5e9',   // neon blue for secondary accent

    success: '#14f195',       // neon green success
    warning: '#fde047',       // neon yellow warning
    error: '#fb7185',         // neon pink error

    border: 'rgba(10, 132, 255, 0.22)',  // neon blue outline border
    borderLight: 'rgba(10, 132, 255, 0.08)',

    buttonSecondary: '#a21caf',        // neon purple secondary button background
    buttonSecondaryText: '#ffffff',    // white text on neon button (purple is dark enough for contrast)

    shadow: '#0ea5e9',                // neon blue shadow/glow
    overlay: 'rgba(10, 132, 255, 0.32)', // blue-tinted overlay
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