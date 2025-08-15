// screens/AppearanceScreen.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { ArrowLeft, CheckCircle2 } from "lucide-react-native";

const themeOptions = [
  { key: "light", name: "Light" },
  { key: "dark", name: "Dark" },
  { key: "mint", name: "Mint" },
  { key: "sunset", name: "Sunset" },
  { key: "classic", name: "Classic" },
  { key: "neon", name: "Neon" },
];

const ThemeCard = ({ themeKey, name, selected, onPress, baseTheme }) => {
  // Use a temporary theme object for styling the card preview
  const previewTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      ...(themeKey === 'dark' ? { background: '#0a0f1c', primary: '#38bdf8', surface: '#1c2336' } :
          themeKey === 'mint' ? { background: '#e8faf5', primary: '#10b981', surface: '#c9f2e6' } :
          themeKey === 'sunset' ? { background: '#fdf8f2', primary: '#f97316', surface: '#ffffff' } :
          themeKey === 'classic' ? { background: '#f8fafc', primary: '#3b82f6', surface: '#ffffff' } :
          themeKey === 'neon' ? { background: '#0c0a0e', primary: '#7c3aed', surface: '#1f1c25' } :
          { background: '#f5f7fa', primary: '#127f73', surface: '#ffffff' }) // Light
    }
  };
  
  return (
    <TouchableOpacity
      style={[
        styles(baseTheme).card,
        { backgroundColor: previewTheme.colors.background, borderColor: selected ? baseTheme.colors.primary : baseTheme.colors.border },
      ]}
      onPress={onPress}
    >
      {selected && (
        <View style={styles(baseTheme).checkIcon}>
          <CheckCircle2 color="#fff" size={24} />
        </View>
      )}
      <View style={[styles(baseTheme).colorSwatch, { backgroundColor: previewTheme.colors.primary }]} />
      <View style={[styles(baseTheme).colorSwatch, { backgroundColor: previewTheme.colors.surface, borderWidth: 1, borderColor: previewTheme.colors.primary + '30' }]} />
      <Text style={[styles(baseTheme).cardText, { color: selected ? baseTheme.colors.primary : baseTheme.colors.text }]}>
        {name}
      </Text>
    </TouchableOpacity>
  );
};


export default function AppearanceScreen({ navigation }) {
  const { theme, currentTheme, setTheme } = useTheme();
  const s = styles(theme);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Appearance</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={s.scrollContent}>
        <Text style={s.infoText}>Choose a theme to personalize your experience.</Text>
        <View style={s.grid}>
          {themeOptions.map(({ key, name }) => (
            <ThemeCard
              key={key}
              themeKey={key}
              name={name}
              selected={currentTheme === key}
              onPress={() => setTheme(key)}
              baseTheme={theme}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 60 : 50,
      paddingBottom: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: { fontSize: 20, fontWeight: "bold", color: theme.colors.text },
    backButton: { padding: 8 },
    scrollContent: { padding: 16 },
    infoText: {
        textAlign: 'center',
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginBottom: 24
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    card: {
        width: '48%',
        aspectRatio: 1,
        borderRadius: 20,
        marginBottom: 16,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    checkIcon: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: theme.colors.primary,
        borderRadius: 16,
        padding: 2,
    },
    colorSwatch: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginBottom: 12,
    },
    cardText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});