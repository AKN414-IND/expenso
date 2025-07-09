import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import * as SecureStore from "expo-secure-store";

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tryAutoLogin = async () => {
      const email = await SecureStore.getItemAsync("userEmail");
      const password = await SecureStore.getItemAsync("userPassword");
      if (email && password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (!error) {
          setSession(data.session);
          setLoading(false);
          return true;
        }
        await SecureStore.deleteItemAsync("userEmail");
        await SecureStore.deleteItemAsync("userPassword");
        setLoading(false);
        return false;
      }
      setLoading(false);
      return false;
    };

    if (!session && loading) {
      tryAutoLogin();
    }
  }, [session, loading]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);

      if (event === "SIGNED_OUT") {
        await clearStoredCredentials();
      }
      setLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const clearStoredCredentials = async () => {
    try {
      await SecureStore.deleteItemAsync("userEmail");
      await SecureStore.deleteItemAsync("userPassword");
    } catch (error) {
      console.log("Failed to clear stored credentials");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await clearStoredCredentials();
  };

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
