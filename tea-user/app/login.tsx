// app/login.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import Screen from "../components/Screen";
import theme from "../constants/theme";
import { auth } from "../lib/firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onLogin = async () => {
    if (!email.trim() || !password) return Alert.alert("Missing Credentials", "Please enter both email and password to continue.");
    try {
      setBusy(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/(tabs)/home");
    } catch (e: any) {
      Alert.alert("Authentication Failed", e?.message ?? "Please check your credentials and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen scroll>
        <View style={{ gap: 8, marginBottom: 24, marginTop: 40, alignItems: "center" }}>
          <View style={{ backgroundColor: theme.colors.white, padding: 16, borderRadius: 20, shadowColor: theme.colors.primary, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 }}>
            <Ionicons name="leaf" size={40} color={theme.colors.accent} />
          </View>
          <Text style={{ fontSize: 32, fontWeight: "900", color: theme.colors.primary, marginTop: 12 }}>
            Tea Explorer
          </Text>
          <Text style={{ color: theme.colors.muted, fontSize: 16, fontWeight: "500" }}>
            User Portal v2.0
          </Text>
        </View>

        <Card style={{ padding: 24, borderRadius: theme.radius.xl }}>
          <View style={{ gap: 16 }}>
            <View>
              <Text style={{ fontWeight: "800", color: theme.colors.primary, fontSize: 14, marginBottom: 8, marginLeft: 4 }}>Email Address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="driver.logistics@tea.com"
                placeholderTextColor={theme.colors.muted}
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.md,
                  padding: 16,
                  backgroundColor: theme.colors.bg,
                  color: theme.colors.text,
                  fontSize: 16,
                  fontWeight: "600"
                }}
              />
            </View>

            <View>
              <Text style={{ fontWeight: "800", color: theme.colors.primary, fontSize: 14, marginBottom: 8, marginLeft: 4 }}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••••••"
                placeholderTextColor={theme.colors.muted}
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.md,
                  padding: 16,
                  backgroundColor: theme.colors.bg,
                  color: theme.colors.text,
                  fontSize: 16,
                  fontWeight: "600"
                }}
              />
            </View>

            <View style={{ marginTop: 10 }}>
              <PrimaryButton title={busy ? "Authenticating..." : "Sign In"} onPress={onLogin} disabled={busy} />
            </View>

            <Pressable onPress={() => router.push("/signup")} style={{ paddingVertical: 12 }}>
              <Text style={{ textAlign: "center", color: theme.colors.accent, fontWeight: "900", fontSize: 15 }}>
                New member? <Text style={{ textDecorationLine: "underline" }}>Create account</Text>
              </Text>
            </Pressable>
          </View>
        </Card>

        <View style={{ marginTop: 40, alignItems: "center" }}>
          <Text style={{ color: theme.colors.muted, fontWeight: "700", fontSize: 12, letterSpacing: 1 }}>
            2026 LOGISTICS SYSTEM
          </Text>
          <Text style={{ color: theme.colors.muted, fontSize: 10, marginTop: 4 }}>
            Secure Enterprise Encryption Active
          </Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

