import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { supabase } from "../lib/supabase";
import Toast from "react-native-toast-message";
import { useTheme } from "../context/ThemeContext";

const { width, height } = Dimensions.get("window");

export default function AuthScreen({ navigation }) {
  const { theme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadSavedCredentials();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedEmail = await SecureStore.getItemAsync("userEmail");
      const savedPassword = await SecureStore.getItemAsync("userPassword");
      if (savedEmail) setEmail(savedEmail);
      if (savedPassword) setPassword(savedPassword);
    } catch (error) {
      console.log("No saved credentials found");
    }
  };

  const saveCredentials = async () => {
    if (rememberMe && email && password) {
      try {
        await SecureStore.setItemAsync("userEmail", email);
        await SecureStore.setItemAsync("userPassword", password);
      } catch (error) {
        console.log("Failed to save credentials");
      }
    }
  };

  const validateForm = () => {
    if (!email || !password) {
      Toast.show({
        type: "error",
        text1: "Missing Fields",
        text2: "Please fill in all required fields.",
        position: "top",
        visibilityTime: 4000,
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Toast.show({
        type: "error",
        text1: "Invalid Email",
        text2: "Please enter a valid email address.",
        position: "top",
        visibilityTime: 4000,
      });
      return false;
    }

    if (password.length < 6) {
      Toast.show({
        type: "error",
        text1: "Weak Password",
        text2: "Password must be at least 6 characters long.",
        position: "top",
        visibilityTime: 4000,
      });
      return false;
    }

    if (isSignup && password !== confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Password Mismatch",
        text2: "Passwords do not match.",
        position: "top",
        visibilityTime: 4000,
      });
      return false;
    }

    return true;
  };

  const handleAuth = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      let result;
      if (isSignup) {
        result = await supabase.auth.signUp({ email, password });
        if (result.error) {
          Toast.show({
            type: "error",
            text1: "Signup Error",
            text2: result.error.message,
            position: "top",
            visibilityTime: 5000,
          });
        } else if (!result.data.session) {
          Toast.show({
            type: "info",
            text1: "Check Your Email",
            text2:
              "We sent you a verification link. Please verify your email before logging in.",
            position: "top",
            visibilityTime: 6000,
          });
          setIsSignup(false);
        }
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) {
          Toast.show({
            type: "error",
            text1: "Login Error!",
            text2: result.error.message,
            position: "top",
            visibilityTime: 5000,
          });
        } else {
          await saveCredentials();
          Toast.show({
            type: "success",
            text1: "🎉 Welcome Back!",
            text2: "Login successful",
            position: "top",
            visibilityTime: 3000,
          });
        }
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message,
        position: "top",
        visibilityTime: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.5,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    setIsSignup(!isSignup);
    setConfirmPassword("");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar
        barStyle={
          theme.name === "dark" || theme.name === "neon"
            ? "light-content"
            : "dark-content"
        }
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View>
          <View style={styles.header}>
            <Text style={[styles.appName, { color: theme.colors.primary }]}>
              EXPENSO
            </Text>
            <Text
              style={[styles.tagline, { color: theme.colors.textSecondary }]}
            >
              Expense Management Made Simply Smart
            </Text>
          </View>

          <View
            style={[
              styles.formContainer,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.formTitle, { color: theme.colors.text }]}>
              {isSignup ? "Create Account" : "Welcome Back"}
            </Text>
            <Text
              style={[
                styles.formSubtitle,
                { color: theme.colors.textTertiary },
              ]}
            >
              {isSignup
                ? "Sign up to start tracking your expenses"
                : "Sign in to continue managing your finances"}
            </Text>

            {/* Email Input */}
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.borderLight,
                },
              ]}
            >
              <Ionicons
                name="mail"
                size={20}
                color={theme.colors.primary}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Email address"
                placeholderTextColor={theme.colors.textTertiary}
                style={[styles.input, { color: theme.colors.text }]}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Password Input */}
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.borderLight,
                },
              ]}
            >
              <Ionicons
                name="lock-closed"
                size={20}
                color={theme.colors.primary}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Password"
                placeholderTextColor={theme.colors.textTertiary}
                style={[styles.input, { color: theme.colors.text }]}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.colors.textTertiary}
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password (Signup only) */}
            {isSignup && (
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.borderLight,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed"
                  size={20}
                  color={theme.colors.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Confirm password"
                  placeholderTextColor={theme.colors.textTertiary}
                  style={[styles.input, { color: theme.colors.text }]}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={20}
                    color={theme.colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            )}

            {/* Remember Me & Forgot Password */}
            {!isSignup && (
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.rememberMe}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <Ionicons
                    name={rememberMe ? "checkbox" : "square-outline"}
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[
                      styles.rememberText,
                      { color: theme.colors.textTertiary },
                    ]}
                  >
                    Remember me
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.navigate("ForgotPassword")}
                >
                  <Text
                    style={[styles.forgotText, { color: theme.colors.primary }]}
                  >
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Auth Button */}
            <TouchableOpacity
              style={[
                styles.authButton,
                loading && styles.buttonDisabled,
                {
                  shadowColor: theme.colors.primary,
                },
              ]}
              onPress={handleAuth}
              disabled={loading}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryDark]}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <Animated.View style={styles.loadingSpinner}>
                      <Ionicons name="refresh" size={20} color="#FFF" />
                    </Animated.View>
                    <Text style={styles.buttonText}>Please wait...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>
                    {isSignup ? "Create Account" : "Sign In"}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Switch Mode */}
            <View style={styles.switchContainer}>
              <Text
                style={[
                  styles.switchText,
                  { color: theme.colors.textTertiary },
                ]}
              >
                {isSignup
                  ? "Already have an account?"
                  : "Don't have an account?"}
              </Text>
              <TouchableOpacity onPress={switchMode}>
                <Text
                  style={[styles.switchButton, { color: theme.colors.primary }]}
                >
                  {isSignup ? "Sign In" : "Sign Up"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    minHeight: height,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  appName: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    textAlign: "center",
  },
  formContainer: {
    borderRadius: 24,
    padding: 24,
    borderStyle: "dashed",
    borderWidth: 2,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  rememberMe: {
    flexDirection: "row",
    alignItems: "center",
  },
  rememberText: {
    marginLeft: 8,
    fontSize: 14,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: "500",
  },
  authButton: {
    borderRadius: 12,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingSpinner: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  switchText: {
    fontSize: 14,
    marginRight: 4,
  },
  switchButton: {
    fontSize: 14,
    fontWeight: "600",
  },
});
