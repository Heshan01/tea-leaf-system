// app/(tabs)/profile.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { addDoc, collection } from "firebase/firestore";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import theme from "../../constants/theme";
import { auth, db } from "../../lib/firebase";
import { useUserContext } from "../../lib/useUserContext";

export default function Profile() {
  const { uid, userName, email, routeId } = useUserContext();
  const [newRoute, setNewRoute] = useState("");

  const requestChange = async () => {
    if (!uid) return;
    if (!newRoute.trim()) return Alert.alert("Missing Info", "Please enter the new Route ID you wish to be assigned to.");

    await addDoc(collection(db, "routeChangeRequests"), {
      userId: uid,
      oldRouteId: routeId ?? null,
      newRouteId: newRoute.trim(),
      status: "pending",
      createdAtMs: Date.now(),
    });

    setNewRoute("");
    Alert.alert("Success", "Your route change request has been submitted to administration.");
  };

  const logout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
    >
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View style={{ alignItems: "center", marginVertical: 10 }}>
          <View style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: theme.colors.white,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 15,
            elevation: 5,
            borderWidth: 3,
            borderColor: theme.colors.border
          }}>
            <Ionicons name="person" size={50} color={theme.colors.primary} />
          </View>
          <Text style={{ fontSize: 24, fontWeight: "900", color: theme.colors.primary, marginTop: 16 }}>{userName ?? "User Profile"}</Text>
          <Text style={{ fontSize: 14, color: theme.colors.muted }}>Standard Access Account</Text>
        </View>

        <View style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.radius.lg,
          padding: 20,
          gap: 16,
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 2,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ backgroundColor: theme.colors.bg, borderRadius: 10, padding: 8 }}>
              <Ionicons name="mail-outline" size={20} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: "600" }}>Linked Email</Text>
              <Text style={{ fontWeight: "800", color: theme.colors.text, fontSize: 15 }}>{email ?? "-"}</Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: theme.colors.border }} />

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ backgroundColor: theme.colors.bg, borderRadius: 10, padding: 8 }}>
              <Ionicons name="map-outline" size={20} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: "600" }}>Assigned Route</Text>
              <Text style={{ fontWeight: "800", color: theme.colors.text, fontSize: 15 }}>{routeId ?? "None Assigned"}</Text>
            </View>
          </View>
        </View>

        <View style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.radius.lg,
          padding: 24,
          gap: 16,
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 2,
        }}>
          <View>
            <Text style={{ fontWeight: "900", color: theme.colors.primary, fontSize: 18 }}>Change Request</Text>
            <Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 2 }}>Need to switch routes? Submit a request.</Text>
          </View>

          <TextInput
            value={newRoute}
            onChangeText={setNewRoute}
            placeholder="Target Route ID (e.g. R-402)"
            placeholderTextColor={theme.colors.muted}
            style={{
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.md,
              padding: 16,
              backgroundColor: theme.colors.bg,
              fontSize: 16,
              fontWeight: "600",
              color: theme.colors.text
            }}
          />

          <Pressable
            onPress={requestChange}
            style={({ pressed }) => ({
              backgroundColor: pressed ? theme.colors.primary : theme.colors.accent,
              padding: 16,
              borderRadius: theme.radius.md,
              shadowColor: theme.colors.accent,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            })}
          >
            <Text style={{ color: "white", textAlign: "center", fontWeight: "900", fontSize: 16 }}>Submit Request</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={logout}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#FEE2E2" : theme.colors.white,
            padding: 16,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.danger,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            marginTop: 10
          })}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
          <Text style={{ color: theme.colors.danger, textAlign: "center", fontWeight: "900", fontSize: 16 }}>Sign Out</Text>
        </Pressable>

        <Text style={{ textAlign: "center", color: theme.colors.muted, fontSize: 12, marginTop: 10 }}>Tea Logistics User Client • 2026 Edition</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

