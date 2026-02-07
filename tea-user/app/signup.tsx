// app/signup.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
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
import { auth, db } from "../lib/firebase";

export default function Signup() {
  const [name, setName] = useState("");
  const [routeId, setRouteId] = useState("R1");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSignup = async () => {
    if (!name.trim() || !routeId.trim() || !email.trim() || !password)
      return Alert.alert("Missing Fields", "Please complete all fields to create your account.");
    if (password.length < 6)
      return Alert.alert("Security Notice", "Your password must be at least 6 characters long.");

    try {
      setBusy(true);
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;

      await setDoc(
        doc(db, "users", uid),
        {
          uid,
          role: "user",
          name: name.trim(),
          email: email.trim(),
          routeId: routeId.trim(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      router.replace("/(tabs)/home");
    } catch (e: any) {
      Alert.alert("Registration Failed", e?.message ?? "An error occurred during signup. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen scroll>
        <View style={{ gap: 8, marginBottom: 24, marginTop: 20, alignItems: "center" }}>
          <View style={{ backgroundColor: theme.colors.white, padding: 16, borderRadius: 20, shadowColor: theme.colors.primary, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 }}>
            <Ionicons name="person-add" size={40} color={theme.colors.accent} />
          </View>
          <Text style={{ fontSize: 28, fontWeight: "900", color: theme.colors.primary, marginTop: 12 }}>
            Join the Network
          </Text>
          <Text style={{ color: theme.colors.muted, fontSize: 15, fontWeight: "500" }}>
            Create your logistics explorer account
          </Text>
        </View>

        <Card style={{ padding: 24, borderRadius: theme.radius.xl }}>
          <View style={{ gap: 16 }}>
            <View>
              <Text style={{ fontWeight: "800", color: theme.colors.primary, fontSize: 13, marginBottom: 6, marginLeft: 4 }}>Full Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ex: Chaminda Perera"
                placeholderTextColor={theme.colors.muted}
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.md,
                  padding: 14,
                  backgroundColor: theme.colors.bg,
                  color: theme.colors.text,
                  fontSize: 15,
                  fontWeight: "600"
                }}
              />
            </View>

            <View>
              <Text style={{ fontWeight: "800", color: theme.colors.primary, fontSize: 13, marginBottom: 6, marginLeft: 4 }}>Route ID</Text>
              <TextInput
                value={routeId}
                onChangeText={setRouteId}
                placeholder="Ex: R-102"
                placeholderTextColor={theme.colors.muted}
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.md,
                  padding: 14,
                  backgroundColor: theme.colors.bg,
                  color: theme.colors.text,
                  fontSize: 15,
                  fontWeight: "600"
                }}
              />
            </View>

            <View>
              <Text style={{ fontWeight: "800", color: theme.colors.primary, fontSize: 13, marginBottom: 6, marginLeft: 4 }}>Email Address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="name@company.com"
                placeholderTextColor={theme.colors.muted}
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.md,
                  padding: 14,
                  backgroundColor: theme.colors.bg,
                  color: theme.colors.text,
                  fontSize: 15,
                  fontWeight: "600"
                }}
              />
            </View>

            <View>
              <Text style={{ fontWeight: "800", color: theme.colors.primary, fontSize: 13, marginBottom: 6, marginLeft: 4 }}>Password</Text>
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
                  padding: 14,
                  backgroundColor: theme.colors.bg,
                  color: theme.colors.text,
                  fontSize: 15,
                  fontWeight: "600"
                }}
              />
            </View>

            <View style={{ marginTop: 8 }}>
              <PrimaryButton
                title={busy ? "Processing..." : "Create Account"}
                onPress={onSignup}
                disabled={busy}
              />
            </View>

            <Pressable onPress={() => router.back()} style={{ paddingVertical: 10 }}>
              <Text style={{ textAlign: "center", color: theme.colors.primary, fontWeight: "900", fontSize: 14 }}>
                Existing user? <Text style={{ color: theme.colors.accent }}>Sign In here</Text>
              </Text>
            </Pressable>
          </View>
        </Card>

        <View style={{ height: 20 }} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

