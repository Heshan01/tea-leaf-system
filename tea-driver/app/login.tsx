import { Ionicons } from "@expo/vector-icons";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { COLORS, SHADOWS } from "../constants/Theme";
import { auth, db } from "../lib/firebase";

export default function Login({ onDone }: { onDone: () => void }) {
  const { width } = useWindowDimensions();
  const isSmall = width < 360;
  const isTablet = width >= 768;

  const P = useMemo(() => (isTablet ? 24 : 20), [isTablet]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const login = async () => {
    try {
      setBusy(true);
      const res = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = res.user.uid;

      const snap = await getDoc(doc(db, "users", uid));
      const role = snap.exists() ? (snap.data() as any)?.role : null;

      if (role !== "driver") {
        Alert.alert("Access Denied", "මෙම App එක Driver සඳහා පමණයි.");
        return;
      }

      onDone();
    } catch (e: any) {
      Alert.alert("Login Failed", e?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "center" }}
      >
        <View style={{ padding: P, gap: 20 }}>
          {/* Logo / Header Area */}
          <View style={{ alignItems: "center", marginBottom: 10 }}>
            <View
              style={{
                width: 80,
                height: 80,
                backgroundColor: COLORS.primarySoft,
                borderRadius: 24,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="leaf" size={40} color={COLORS.primary} />
            </View>
            <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.text }}>
              Driver Login
            </Text>
            <Text style={{ color: COLORS.textLight, textAlign: "center", marginTop: 4 }}>
              Tea Leaf System • Driver App
            </Text>
          </View>

          {/* Login Card */}
          <View
            style={{
              backgroundColor: COLORS.card,
              borderRadius: 24,
              padding: 24,
              gap: 16,
              ...SHADOWS.medium,
            }}
          >
            <View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.text, marginBottom: 6 }}>
                Email Address
              </Text>
              <TextInput
                placeholder="driver@tealeaf.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor={COLORS.textLight}
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: COLORS.background,
                  color: COLORS.text,
                  fontSize: 16,
                }}
              />
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.text, marginBottom: 6 }}>
                Password
              </Text>
              <TextInput
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor={COLORS.textLight}
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: COLORS.background,
                  color: COLORS.text,
                  fontSize: 16,
                }}
              />
            </View>

            <Pressable
              onPress={login}
              disabled={busy}
              style={({ pressed }) => ({
                backgroundColor: busy ? COLORS.primarySoft : COLORS.primary,
                padding: 16,
                borderRadius: 14,
                alignItems: "center",
                marginTop: 8,
                opacity: pressed ? 0.9 : 1,
                ...SHADOWS.small,
              })}
            >
              <Text style={{ color: busy ? COLORS.primary : "white", fontWeight: "700", fontSize: 16 }}>
                {busy ? "Signing in..." : "Sign In"}
              </Text>
            </Pressable>
          </View>

          <Text style={{ textAlign: "center", color: COLORS.textLight, fontSize: 12 }}>
            Version 1.0.0
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
