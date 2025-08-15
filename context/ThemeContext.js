import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};

/* ---------- LIGHT (Unchanged as requested) ---------- */
const lightTheme = {
  name: "light",
  colors: {
    background: "#f5f7fa",
    surface: "#ffffff",
    card: "#ffffff",
    text: "#1e293b",
    textSecondary: "#475569",
    textTertiary: "#5f7080",
    primary: "#127f73",
    primaryDark: "#0f6b63",
    success: "#047857",
    warning: "#c2410c",
    error: "#dc2626",
    border: "rgba(148, 163, 184, 0.15)",
    borderLight: "rgba(148, 163, 184, 0.07)",
    buttonSecondary: "#f1f5f9",
    buttonSecondaryText: "#475569",
    shadow: "#000000",
    overlay: "rgba(15, 23, 42, 0.7)",
    appBg: "#f5f7fa",
    cardBg: "#ffffff",
    onPrimary: "#ffffff",
  },
};

/* ---------- DARK (Updated for deeper contrast and vibrancy) ---------- */
const darkTheme = {
  name: "dark",
  colors: {
    background: "#0a0f1c", // Deeper, less saturated navy for a premium feel
    surface: "#13192a", // A slightly lighter navy for headers and sections
    card: "#1c2336", // Cards are distinct to create depth
    text: "#f1f5f9", // Soft white for readability
    textSecondary: "#a8b5d1", // Muted cool gray for secondary info
    textTertiary: "#6e7a98",
    primary: "#38bdf8", // A vibrant "Sky Blue" for primary actions
    primaryDark: "#0ea5e9",
    success: "#22c55e", // Bright, clear green for income
    warning: "#f59e0b", // Standard amber/yellow for warnings
    error: "#f43f5e", // A modern, slightly softer red for expenses
    border: "rgba(49, 60, 87, 0.5)",
    borderLight: "rgba(49, 60, 87, 0.25)",
    buttonSecondary: "#303a54",
    buttonSecondaryText: "#e2e8f0",
    shadow: "#000000",
    overlay: "rgba(2, 6, 23, 0.7)",
    appBg: "#0a0f1c",
    cardBg: "#1c2336",
    onPrimary: "#0a0f1c", // Dark text on the bright blue button
  },
};

/* ---------- MINT (Unchanged as requested) ---------- */
const mintTheme = {
  name: "mint",
  colors: {
    background: "#e8faf5",
    surface: "#d9f7ee",
    card: "#c9f2e6",
    text: "#064e3b",
    textSecondary: "#065f46",
    textTertiary: "#0e766e",
    primary: "#10b981",
    primaryDark: "#059669",
    success: "#059669",
    warning: "#a16207",
    error: "#b91c1c",
    border: "rgba(5, 150, 105, 0.18)",
    borderLight: "rgba(5, 150, 105, 0.10)",
    buttonSecondary: "#a7f3d0",
    buttonSecondaryText: "#065f46",
    shadow: "#065f46",
    overlay: "rgba(16, 185, 129, 0.25)",
    appBg: "#e8faf5",
    cardBg: "#c9f2e6",
    onPrimary: "#064e3b",
  },
};

/* ---------- SUNSET (Updated for better readability, more "Latte" feel) ---------- */
const sunsetTheme = {
  name: "sunset",
  colors: {
    background: "#fdf8f2", // Softer, creamy background for high contrast
    surface: "#ffffff",
    card: "#ffffff",
    text: "#402e23", // Dark, rich brown for excellent readability
    textSecondary: "#6b4f42",
    textTertiary: "#8a6f62",
    primary: "#f97316", // A vibrant, warm orange for primary actions
    primaryDark: "#ea580c",
    success: "#16a34a", // A clear, earthy green
    warning: "#f59e0b",
    error: "#dc2626", // A classic, strong red
    border: "rgba(217, 206, 195, 0.5)",
    borderLight: "rgba(217, 206, 195, 0.25)",
    buttonSecondary: "#ffeadd",
    buttonSecondaryText: "#6b4f42",
    shadow: "#6b4f42",
    overlay: "rgba(107, 79, 66, 0.2)",
    appBg: "#fdf8f2",
    cardBg: "#ffffff",
    onPrimary: "#ffffff", // White text on the vibrant orange button
  },
};

/* ---------- CLASSIC (Updated for a more modern, professional feel) ---------- */
const classicTheme = {
  name: "classic",
  colors: {
    background: "#f8fafc", // A clean, almost-white background
    surface: "#ffffff",
    card: "#ffffff",
    text: "#0f172a", // Dark Slate for a professional, high-contrast text
    textSecondary: "#475569",
    textTertiary: "#64748b",
    primary: "#3b82f6", // A brighter, more modern "cornflower" blue
    primaryDark: "#2563eb",
    success: "#16a34a",
    warning: "#f59e0b",
    error: "#ef4444",
    border: "rgba(226, 232, 240, 0.7)",
    borderLight: "rgba(226, 232, 240, 0.4)",
    buttonSecondary: "#eef2ff",
    buttonSecondaryText: "#334155",
    shadow: "#0f172a",
    overlay: "rgba(30, 41, 59, 0.17)",
    appBg: "#f8fafc",
    cardBg: "#ffffff",
    onPrimary: "#ffffff",
  },
};

/* ---------- NEON (Updated for usability, focusing neon on accents) ---------- */
const neonTheme = {
  name: "neon",
  colors: {
    background: "#0c0a0e", // A deep, dark purple/charcoal background
    surface: "#15121a",
    card: "#1f1c25",
    text: "#fcfaff", // A bright off-white for main text
    textSecondary: "#a99ec2", // Muted purple-gray for secondary text
    textTertiary: "#71698a",
    primary: "#7c3aed", // A powerful, vibrant violet for primary actions
    primaryDark: "#6d28d9",
    success: "#4ade80", // Bright, electric lime for success
    warning: "#facc15", // Electric yellow for warnings
    error: "#fb7185", // A hot, neon-pink for errors/expenses
    border: "rgba(67, 56, 77, 0.8)",
    borderLight: "rgba(67, 56, 77, 0.4)",
    buttonSecondary: "#2d2836",
    buttonSecondaryText: "#e2e8f0",
    shadow: "#7c3aed",
    overlay: "rgba(0, 229, 255, 0.12)",
    appBg: "#0c0a0e",
    cardBg: "#1f1c25",
    onPrimary: "#ffffff", // White text is more readable on the violet button
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
  const [currentTheme, setCurrentTheme] = useState("light");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("userTheme");
      if (savedTheme && themes[savedTheme]) setCurrentTheme(savedTheme);
    } catch (error) {
      console.log("Error loading theme:", error);
    } finally {
      setLoading(false);
    }
  };

  const setTheme = async (themeName) => {
    try {
      if (themes[themeName]) {
        setCurrentTheme(themeName);
        await AsyncStorage.setItem("userTheme", themeName);
      }
    } catch (error) {
      console.log("Error saving theme:", error);
    }
  };

  const toggleTheme = () => {
    const newTheme = currentTheme === "light" ? "dark" : "light";
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
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
