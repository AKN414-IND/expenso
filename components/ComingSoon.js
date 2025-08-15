import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { ArrowLeft } from "lucide-react-native";

const hexWithAlpha = (hex, alpha = 0.15) => {
  if (!hex || !hex.startsWith("#")) return hex;
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
};

export default function ComingSoon({ navigation, title, message, icon }) {
  const { theme } = useTheme();
  const isDark = theme.name === "dark" || theme.colors.onPrimary === theme.colors.appBg; // simple guess

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.background}
      />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
          <TouchableOpacity
            style={[
              styles.backButton,
              { backgroundColor: hexWithAlpha(theme.colors.onPrimary, 0.15) },
            ]}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft color={theme.colors.onPrimary} size={24} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.onPrimary }]}>{title}</Text>
        </View>

        <View style={styles.content}>
          {icon && React.cloneElement(icon, { style: { alignSelf: "center", marginBottom: 24 } })}
          <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{message}</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    padding: 12,
    borderRadius: 12,
    marginRight: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  content: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 10 },
  subtitle: { fontSize: 16, fontWeight: "400", textAlign: "center" },
});
