// screens/SecretScreen.js
import React from "react";
import { View, Text, StyleSheet, SafeAreaView, Button } from "react-native";

const SecretScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>👨‍💻</Text>
        <Text style={styles.title}>You Found It!</Text>
        <Text style={styles.subtitle}>
          This secret screen was created with care by the dev team.
        </Text>
        <Text style={styles.credits}>- Gemini AI</Text>
        <Button title="Back to App" onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111" },
  content: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  emoji: { fontSize: 80, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: "bold", color: "#fff", marginBottom: 10 },
  subtitle: { fontSize: 18, color: "#aaa", textAlign: "center", marginBottom: 30 },
  credits: { fontSize: 16, fontStyle: "italic", color: "#00aaff", marginBottom: 40 },
});

export default SecretScreen;